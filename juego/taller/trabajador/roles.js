// Los roles del taller y cómo se lanzan. Qué programa hace cada rol, y con qué
// opciones, está en un archivo local que no se sube (taller/roles.local.json): así este
// código no nombra a ningún programa y sirve igual con otros, o con claves de API.
//
// El archivo dice, por cada rol, { programa, argumentos, carpeta? }. Los argumentos
// pueden llevar marcadores que el trabajador reemplaza:
//   {pedido}        lo que se le pide en este intento
//   {instrucciones} el texto de taller/agentes/<rol>.md
//   {agentes}       los subagentes del rol, en JSON: { nombre: { description, prompt } }
//   {carpeta}       la carpeta del trabajo        {juego}  la carpeta juego/
//   {raiz}          la raíz del proyecto          {temporal}  una carpeta vacía fuera del proyecto

import { spawn } from 'node:child_process'
import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { CARPETA_TALLER } from './configuracion.js'

const MARCADOR = /\{([a-z_]+)\}/g

// Lee taller/agentes/*.md: la cabecera (rol y descripción) y el cuerpo (las instrucciones).
export async function leerAgentes(carpeta = path.join(CARPETA_TALLER, 'agentes')) {
  const agentes = {}
  for (const archivo of (await readdir(carpeta)).filter((nombre) => nombre.endsWith('.md')).sort()) {
    const texto = await readFile(path.join(carpeta, archivo), 'utf8')
    const cabecera = /^---\n([\s\S]*?)\n---\n/.exec(texto)
    const datos = {}
    for (const linea of (cabecera?.[1] ?? '').split('\n')) {
      const separador = linea.indexOf(':')
      if (separador > 0) datos[linea.slice(0, separador).trim()] = linea.slice(separador + 1).trim()
    }
    const rol = datos.rol ?? archivo.slice(0, -'.md'.length)
    // El rol trabaja desde otra carpeta: se le dice desde dónde parten sus enlaces.
    const instrucciones = (cabecera ? texto.slice(cabecera[0].length) : texto).trim() +
      '\n\n---\nEstas instrucciones están en ' + path.join(carpeta, archivo) + ': sus enlaces relativos parten de esa carpeta.\n'
    agentes[rol] = { rol, descripcion: datos.descripcion ?? '', instrucciones }
  }
  return agentes
}

// Los subagentes de un rol, en el formato { nombre: { description, prompt } }.
export function subagentes(agentes, nombres) {
  return JSON.stringify(Object.fromEntries(nombres.map((nombre) => {
    if (!agentes[nombre]) throw new Error('No hay instrucciones para el rol «' + nombre + '» en taller/agentes/.')
    return [nombre, { description: agentes[nombre].descripcion, prompt: agentes[nombre].instrucciones }]
  })))
}

export async function leerRoles(archivo) {
  let roles
  try {
    roles = JSON.parse(await readFile(archivo, 'utf8'))
  } catch (error) {
    throw new Error('No se pudo leer el archivo de roles ' + archivo + ': ' + error.message)
  }
  if (!roles?.supervisor?.programa || !Array.isArray(roles.supervisor.argumentos)) {
    throw new Error('El archivo de roles necesita «supervisor» con «programa» y «argumentos».')
  }
  return roles
}

// Reemplaza los marcadores. Un marcador sin valor es un error: no se lanza un programa
// con una opción a medias.
export function armarComando(rol, valores) {
  const reemplazar = (texto) => String(texto).replace(MARCADOR, (entero, nombre) => {
    if (!(nombre in valores)) throw new Error('El marcador ' + entero + ' no tiene valor.')
    return String(valores[nombre])
  })
  return {
    programa: reemplazar(rol.programa),
    argumentos: rol.argumentos.map(reemplazar),
    carpeta: rol.carpeta ? reemplazar(rol.carpeta) : valores.carpeta,
    // Si el rol informa su avance por la salida (eventos JSON), «silencio_seg» es cuántos
    // segundos sin ninguna salida se toman como un cuelgue. Sin el campo, no se vigila.
    silencioMs: Number(rol.silencio_seg) > 0 ? Number(rol.silencio_seg) * 1000 : null,
  }
}

// Los grupos de procesos que siguen vivos. Cada rol corre en su propio grupo (detached), así que
// al cerrar el taller con Ctrl+C no se enteraban y quedaban huérfanos: un supervisor gastando la
// suscripción y un navegador sin pantalla jugando con sonido. «cortarActivos» los corta al salir.
const activos = new Set()

export function cortarActivos(senal = 'SIGTERM') {
  const cortados = [...activos]
  for (const pid of cortados) {
    try { process.kill(-pid, senal) } catch { /* ya terminó */ }
  }
  activos.clear()
  return cortados.length
}

// Lanza el programa sin pantalla y espera a que termine, como máximo «limiteMs». Corre
// en su propio grupo de procesos: si se pasa del tiempo, se corta él y todo lo que abrió.
export function lanzar({ programa, argumentos, carpeta, silencioMs = null }, { limiteMs, entorno = process.env }) {
  return new Promise((resolver) => {
    const inicio = Date.now()
    const salida = []
    const errores = []
    let agotado = false
    const proceso = spawn(programa, argumentos, { cwd: carpeta, detached: true, stdio: ['ignore', 'pipe', 'pipe'], env: entorno })
    if (proceso.pid) activos.add(proceso.pid)
    let ultimaSalida = Date.now()
    let silencio = false
    proceso.stdout.on('data', (parte) => { ultimaSalida = Date.now(); guardar(salida, parte) })
    proceso.stderr.on('data', (parte) => { ultimaSalida = Date.now(); guardar(errores, parte) })
    const cortar = (senal) => { try { process.kill(-proceso.pid, senal) } catch { /* ya terminó */ } }
    let abandonar = null
    const temporizador = setTimeout(() => {
      agotado = true
      cortar('SIGTERM')
      setTimeout(() => cortar('SIGKILL'), 5000).unref()
      // Un proceso hijo que se salió del grupo puede dejar abiertas las tuberías y entonces
      // «close» nunca llega: el rol quedaría colgado para siempre (pasó con un programador que
      // no contestó). Pasados unos segundos más, se da por cortado y se sigue.
      abandonar = setTimeout(() => {
        proceso.stdout.destroy()
        proceso.stderr.destroy()
        terminar(null)
      }, 8000)
      abandonar.unref()
    }, Math.max(0, limiteMs))
    // El rol dejó de responder (la conexión con su modelo se quedó esperando, por ejemplo):
    // se corta antes de gastar todo el tiempo del trabajo, y quien lo lanzó puede reintentar.
    const vigia = silencioMs ? setInterval(() => {
      if (Date.now() - ultimaSalida < silencioMs) return
      silencio = true
      clearInterval(vigia)
      clearTimeout(temporizador)
      agotado = true
      cortar('SIGTERM')
      setTimeout(() => cortar('SIGKILL'), 5000).unref()
      abandonar = setTimeout(() => { proceso.stdout.destroy(); proceso.stderr.destroy(); terminar(null) }, 8000)
      abandonar.unref()
    }, Math.min(5000, silencioMs)) : null
    vigia?.unref()
    const terminar = (codigo, error = null) => {
      activos.delete(proceso.pid)
      clearTimeout(temporizador)
      clearTimeout(abandonar)
      clearInterval(vigia)
      resolver({
        codigo, agotado, silencio, segundos: Math.round((Date.now() - inicio) / 1000),
        salida: Buffer.concat(salida).toString('utf8'),
        errores: error ? String(error.message ?? error) : Buffer.concat(errores).toString('utf8'),
      })
    }
    proceso.on('error', (error) => terminar(-1, error))
    proceso.on('close', (codigo) => terminar(codigo))
  })
}

// Se guarda lo último (hasta 1 MB): lo que cuenta es cómo terminó.
function guardar(lista, parte) {
  lista.push(parte)
  let total = lista.reduce((suma, trozo) => suma + trozo.length, 0)
  while (total > 1024 * 1024 && lista.length > 1) total -= lista.shift().length
}

// Si el programa devolvió un resumen en JSON con su consumo, se toma para la evidencia.
// Los nombres de los campos son los que usa el programa; aquí se pasan a los de Kusi.
export function consumoDe(salida) {
  // También se admiten eventos JSON por línea: el rol puede informar mensajes,
  // consumo y fallos en eventos distintos. Se usa el último mensaje terminado;
  // los errores nunca se confunden con una entrega correcta.
  const eventos = salida.trim().split('\n').flatMap((linea) => {
    try { return [JSON.parse(linea)] } catch { return [] }
  })
  if (eventos.some((evento) => ['turn.completed', 'turn.failed', 'item.completed'].includes(evento.type))) {
    const mensajes = eventos.filter((evento) => evento.type === 'item.completed' && evento.item?.type === 'agent_message')
    const fallos = eventos.filter((evento) => evento.type === 'turn.failed' || evento.type === 'error')
    const consumos = eventos.filter((evento) => evento.type === 'turn.completed').map((evento) => evento.usage ?? {})
    return {
      tokens_entrada: consumos.reduce((suma, uso) => suma + Number(uso.input_tokens ?? 0), 0),
      tokens_salida: consumos.reduce((suma, uso) => suma + Number(uso.output_tokens ?? 0), 0),
      costo_estimado_usd: 0,
      respuesta: fallos.length ? String(fallos.at(-1).error?.message ?? fallos.at(-1).message ?? 'El rol informó un fallo.')
        : mensajes.at(-1)?.item?.text ?? null,
      con_error: fallos.length > 0,
    }
  }
  try {
    const datos = JSON.parse(salida.trim().split('\n').at(-1))
    const uso = datos.usage ?? {}
    return {
      tokens_entrada: Number(uso.input_tokens ?? 0) + Number(uso.cache_read_input_tokens ?? 0) + Number(uso.cache_creation_input_tokens ?? 0),
      tokens_salida: Number(uso.output_tokens ?? 0),
      costo_estimado_usd: Number(datos.total_cost_usd ?? 0),
      respuesta: typeof datos.result === 'string' ? datos.result : null,
      con_error: datos.is_error === true,
    }
  } catch {
    return { tokens_entrada: 0, tokens_salida: 0, costo_estimado_usd: 0, respuesta: salida.trim().slice(-2000) || null, con_error: false }
  }
}

// Lo que el programa se negó a ejecutar por permisos (lista `permission_denials` de su
// resumen en JSON), en una línea cada uno. Sirve para saber qué comando se negó y para
// no tomar como «imposible» un trabajo que solo chocó con un permiso.
export function negadosDe(salida) {
  try {
    const datos = JSON.parse(salida.trim().split('\n').at(-1))
    return (Array.isArray(datos.permission_denials) ? datos.permission_denials : []).map((negado) => {
      const entrada = negado?.tool_input ?? {}
      const detalle = entrada.command ?? entrada.file_path ?? entrada.pattern ?? JSON.stringify(entrada)
      return String(negado?.tool_name ?? 'herramienta') + ': ' + String(detalle).slice(0, 300)
    })
  } catch {
    return []
  }
}
