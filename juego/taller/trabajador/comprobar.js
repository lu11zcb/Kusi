// Lo que el trabajador comprueba con código, sin IA, antes de entregar un juego:
// que estén los archivos de entrega.md, que el código no haga nada de lo prohibido
// (reglas.md, regla 9) ni nombre al cuy, que solo importe lo permitido, que pasen
// sus pruebas con node --test y que el reproductor lo abra con el validar de su ficha.

import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { readFile, readdir, realpath } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { CARPETA_JUEGO } from './configuracion.js'
import { comprobarPieza } from '#kit/herramientas/comprobar_pieza.mjs'

// Regla 9: red, almacenamiento, texto como código y tocar la página o la app.
export const PROHIBIDO = [
  [/\bfetch\s*\(/, 'se conecta a la red (fetch)'],
  [/\bXMLHttpRequest\b/, 'se conecta a la red (XMLHttpRequest)'],
  [/\bWebSocket\b/, 'se conecta a la red (WebSocket)'],
  [/\bEventSource\b/, 'se conecta a la red (EventSource)'],
  [/\bsendBeacon\b/, 'se conecta a la red (sendBeacon)'],
  [/\blocalStorage\b|\bsessionStorage\b|\bindexedDB\b|document\.cookie/, 'guarda datos en el navegador'],
  [/\beval\s*\(|\bnew\s+Function\b/, 'ejecuta texto como código'],
  [/\bset(?:Timeout|Interval)\s*\(\s*['"`]/, 'ejecuta texto como código (un temporizador con texto)'],
  [/\bimport\s*\(/, 'importa código con una ruta calculada'],
  [/\bwindow\.(?:parent|top|opener)\b|\bKusiPuente\b/, 'toca la página o la app directamente'],
  [/document\.write|\.innerHTML\b|\.outerHTML\b/, 'escribe en la página directamente'],
]

// «cuy» como nombre (cuy, cuyAnimado, paso_cuy), pero no «cuyo» ni «cuya».
export function nombraAlCuy(texto) {
  for (const encontrado of texto.matchAll(/cuy/gi)) {
    const siguiente = texto[encontrado.index + 3] ?? ''
    if (siguiente === 'o' || siguiente === 'a') continue
    return true
  }
  return false
}

// Las importaciones permitidas: el kit (#kit/), Phaser, la propia carpeta del juego y,
// solo en las pruebas, los módulos de Node.
export function importacionPermitida(especificador, archivo, carpetaJuego) {
  if (especificador.startsWith('#kit/') || especificador === 'phaser') return true
  if (especificador.startsWith('node:')) return archivo.includes(path.sep + 'pruebas' + path.sep)
  if (especificador.startsWith('./') || especificador.startsWith('../')) {
    const destino = path.resolve(path.dirname(archivo), especificador)
    return destino === carpetaJuego || destino.startsWith(carpetaJuego + path.sep)
  }
  return false
}

async function archivosDe(carpeta, extensiones) {
  const encontrados = []
  if (!existsSync(carpeta)) return encontrados
  for (const entrada of await readdir(carpeta, { withFileTypes: true, recursive: true })) {
    if (entrada.isFile() && extensiones.some((extension) => entrada.name.endsWith(extension))) {
      encontrados.push(path.join(entrada.parentPath ?? entrada.path, entrada.name))
    }
  }
  return encontrados.sort()
}

// Revisa el código del juego. Devuelve los motivos, en español, para el supervisor.
export async function revisarCodigo(carpetaJuego) {
  const motivos = []
  for (const necesario of ['juego.js', 'guion-ejemplo.json', 'README.md']) {
    if (!existsSync(path.join(carpetaJuego, necesario))) motivos.push('Falta juego/' + necesario + ' (entrega.md §2).')
  }
  for (const archivo of await archivosDe(carpetaJuego, ['.js', '.mjs', '.json'])) {
    const relativo = path.relative(carpetaJuego, archivo)
    const texto = await readFile(archivo, 'utf8')
    const esPrueba = relativo.startsWith('pruebas' + path.sep)
    if (!esPrueba) {
      for (const [patron, motivo] of PROHIBIDO) {
        if (patron.test(texto)) motivos.push('juego/' + relativo + ' ' + motivo + ' (reglas.md, regla 9).')
      }
    }
    if (nombraAlCuy(texto)) motivos.push('juego/' + relativo + ' nombra al cuy: usa el protagonista (reglas.md, regla 3).')
    if (!archivo.endsWith('.json')) {
      for (const encontrado of texto.matchAll(/\b(?:import|export)\b[^'"`;]*?\bfrom\s*['"]([^'"]+)['"]|\bimport\s*['"]([^'"]+)['"]/g)) {
        const especificador = encontrado[1] ?? encontrado[2]
        if (!importacionPermitida(especificador, archivo, carpetaJuego)) {
          motivos.push('juego/' + relativo + ' importa «' + especificador + '»: solo se puede importar de #kit/, phaser o la carpeta del juego.')
        }
      }
    }
  }
  return motivos
}

// El primer filtro de cada pieza de piezas/ (kit/estilo/comprobacion.md): una pieza que no
// pasa no se entrega. El dibujante ya lo pasó; aquí se confirma lo que quedó en la carpeta.
export async function revisarPiezas(carpeta) {
  const motivos = []
  const piezas = path.join(carpeta, 'piezas')
  if (!existsSync(piezas)) return motivos
  let revisiones = []
  try {
    const registro = JSON.parse(await readFile(path.join(carpeta, 'revision', 'piezas.json'), 'utf8'))
    revisiones = Array.isArray(registro.piezas) ? registro.piezas : []
  } catch { /* Sin informe no se aprueba ninguna pieza nueva. */ }
  for (const archivo of (await readdir(piezas)).filter((nombre) => nombre.endsWith('.png')).sort()) {
    const id = archivo.slice(0, -'.png'.length)
    const resultado = comprobarPieza(path.join(piezas, archivo), { fondo: id.startsWith('fondo-') })
    if (!resultado.pasa) {
      motivos.push('La pieza «' + id + '» no pasa el filtro del código: ' +
        resultado.respuestas.filter((respuesta) => !respuesta.si).map((respuesta) => respuesta.motivo).join(' '))
    }
    // El segundo filtro corresponde a estos bytes: una corrección nunca hereda la
    // aprobación visual de otro dibujo. El informe queda dentro de revision/.
    const huella = createHash('sha256').update(await readFile(path.join(piezas, archivo))).digest('hex')
    const revision = revisiones.find((pieza) => pieza.id === id && pieza.sha256 === huella && pieza.veredicto === 'aprobado')
    let tieneInforme = false
    if (typeof revision?.informe === 'string' && revision.informe.trim()) {
      try {
        const raiz = await realpath(path.join(carpeta, 'revision'))
        const informe = await realpath(path.resolve(raiz, revision.informe))
        tieneInforme = informe.startsWith(raiz + path.sep) && (await readFile(informe, 'utf8')).trim().length > 0
      } catch { /* Un informe ausente o fuera de revision/ no sirve. */ }
    }
    if (!tieneInforme) motivos.push('La pieza «' + id + '» necesita la aprobación del revisor para su archivo final, ' +
      'con sha256 e informe en revision/piezas.json (revision.md, filtro 2).')
  }
  return motivos
}

// Corre las pruebas del juego con node --test. Sin pruebas no se entrega.
export async function correrPruebas(carpetaJuego, { limiteMs = 60_000 } = {}) {
  const pruebas = (await archivosDe(path.join(carpetaJuego, 'pruebas'), ['.test.js', '.test.mjs']))
  if (pruebas.length === 0) return ['Faltan las pruebas del juego (juego/pruebas/*.test.js, entrega.md §2).']
  return new Promise((resolver) => {
    const proceso = spawn(process.execPath, ['--test', ...pruebas], { cwd: CARPETA_JUEGO, stdio: ['ignore', 'pipe', 'pipe'] })
    let texto = ''
    proceso.stdout.on('data', (parte) => { texto += parte })
    proceso.stderr.on('data', (parte) => { texto += parte })
    const temporizador = setTimeout(() => proceso.kill('SIGKILL'), limiteMs)
    proceso.on('close', (codigo) => {
      clearTimeout(temporizador)
      if (codigo === 0) return resolver([])
      // Solo lo que sirve para corregir: las pruebas que fallaron y su error.
      const resumen = texto.split('\n').filter((linea) => /not ok|Error|expected|actual|✖/.test(linea)).slice(0, 25).join('\n')
      resolver(['Las pruebas del juego no pasan (node --test):\n' + (resumen || texto.slice(-2000))])
    })
  })
}

// Abre el juego en un navegador sin pantalla, como lo abrirá el panel: el reproductor
// trae la ficha, revisa el guion de ejemplo con su validar y abre la escena.
export async function abrirEnNavegador(trabajo, { juegoUrl, limiteMs = 30_000 }) {
  const { chromium } = await import('@playwright/test')
  const navegador = await chromium.launch()
  try {
    const pagina = await navegador.newPage({ viewport: { width: 1280, height: 720 } })
    const errores = []
    pagina.on('pageerror', (error) => errores.push(error.message))
    await pagina.goto(new URL('?juego=' + trabajo + '&vida=0', juegoUrl).href)
    try {
      await pagina.waitForFunction((id) => window.kusi?.juego?.trabajo === id ||
        window.kusi?.avisos?.some((aviso) => aviso.tipo === 'fallo'), trabajo, { timeout: limiteMs })
    } catch {
      return ['El juego no abrió en ' + Math.round(limiteMs / 1000) + ' s en ' + juegoUrl + '?juego=' + trabajo + '.']
    }
    const fallo = await pagina.evaluate(() => window.kusi.avisos.find((aviso) => aviso.tipo === 'fallo')?.motivo ?? null)
    if (fallo) return ['El reproductor no pudo abrir el juego: ' + fallo]
    // Un momento más, por si la escena se cae justo después de empezar.
    await pagina.waitForTimeout(1000)
    if (errores.length) return ['El juego tiene errores en el navegador: ' + errores.slice(0, 3).join(' | ')]
    return []
  } finally {
    await navegador.close()
  }
}

// Todo junto. Devuelve { motivos, paquete }: el paquete es el guion de ejemplo con el
// id del trabajo, listo para entregarlo a Spring.
export async function comprobarJuego({ carpeta, trabajo, juegoUrl }) {
  const carpetaJuego = path.join(carpeta, 'juego')
  const motivos = [...await revisarCodigo(carpetaJuego), ...await revisarPiezas(carpeta)]
  let paquete = null
  try {
    paquete = JSON.parse(await readFile(path.join(carpetaJuego, 'guion-ejemplo.json'), 'utf8'))
    paquete.trabajo = trabajo
  } catch (error) {
    if (existsSync(path.join(carpetaJuego, 'guion-ejemplo.json'))) motivos.push('guion-ejemplo.json no es un JSON válido: ' + error.message)
  }
  // Sin los archivos básicos no tiene sentido abrirlo: se corrige primero eso.
  if (motivos.length) return { motivos, paquete }
  motivos.push(...await correrPruebas(carpetaJuego))
  motivos.push(...await abrirEnNavegador(trabajo, { juegoUrl }))
  return { motivos, paquete }
}
