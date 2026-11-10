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
  }
}

// Lanza el programa sin pantalla y espera a que termine, como máximo «limiteMs». Corre
// en su propio grupo de procesos: si se pasa del tiempo, se corta él y todo lo que abrió.
export function lanzar({ programa, argumentos, carpeta }, { limiteMs, entorno = process.env }) {
  return new Promise((resolver) => {
    const inicio = Date.now()
    const salida = []
    const errores = []
    let agotado = false
    const proceso = spawn(programa, argumentos, { cwd: carpeta, detached: true, stdio: ['ignore', 'pipe', 'pipe'], env: entorno })
    proceso.stdout.on('data', (parte) => guardar(salida, parte))
    proceso.stderr.on('data', (parte) => guardar(errores, parte))
    const cortar = (senal) => { try { process.kill(-proceso.pid, senal) } catch { /* ya terminó */ } }
    const temporizador = setTimeout(() => {
      agotado = true
      cortar('SIGTERM')
      setTimeout(() => cortar('SIGKILL'), 5000).unref()
    }, Math.max(0, limiteMs))
    const terminar = (codigo, error = null) => {
      clearTimeout(temporizador)
      resolver({
        codigo, agotado, segundos: Math.round((Date.now() - inicio) / 1000),
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
