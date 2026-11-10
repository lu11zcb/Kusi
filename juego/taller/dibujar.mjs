// El dibujante del taller, para una pieza quieta: un objeto o un fondo (nunca un personaje).
// El supervisor lo llama con:
//
//   node juego/taller/dibujar.mjs --carpeta <carpeta del trabajo> --id olla-de-barro \
//     --que "una olla de barro andina, para cocinar" [--apoyado] [--fondo] [--correccion "<motivos>"]
//
// Cada llamada es un intento: le pide el dibujo al rol «dibujante» (taller/roles.local.json),
// guarda lo que entregó en piezas/origen/<id>-intento-<n>.png, quita el fondo y prepara la
// pieza (kit/herramientas/preparar_pieza.mjs) y pasa el filtro del código
// (kit/herramientas/comprobar_pieza.mjs). Hay un intento y hasta 2 correcciones; si no
// pasa, la pieza no se entrega y el reproductor usa una figura simple (el respaldo).
// Responde un JSON en una línea.

import { appendFile, copyFile, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { parseArgs } from 'node:util'
import { CARPETA_JUEGO, CARPETA_TALLER } from './trabajador/configuracion.js'
import { armarComando, lanzar, leerRoles } from './trabajador/roles.js'
import { esIdTrabajo, PATRON_PIEZA } from '#kit/reproductor/datos/registroJuegos.js'
import { prepararPieza } from '#kit/herramientas/preparar_pieza.mjs'
import { comprobarPieza } from '#kit/herramientas/comprobar_pieza.mjs'

export const MAX_INTENTOS_PIEZA = 3 // 1 intento y hasta 2 correcciones
const LIMITE_IMAGEN_MS = 5 * 60 * 1000
const LAMINA = path.join(CARPETA_JUEGO, 'kit', 'estilo', 'lamina-modelos.png')

// El pedido a la herramienta de imágenes (guía de estilo, sección 13). Va en inglés: las
// piezas aprobadas del kit salieron de pedidos en inglés y estas frases ya funcionaron.
export function pedidoDeDibujo({ id, que, fondo, intento, correccion }) {
  const archivo = id + '-intento-' + intento + '.png'
  const partes = fondo
    ? [
        'Use your image generation tool to create ONE landscape 16:9 background image, then copy it into the current folder as ' + archivo + '.',
        'Subject: ' + que + '. Seen from directly above (top-down camera): no horizon, no sky, no building facades (only roofs).',
        'Keep the central 75% of the width and 80% of the height calm and empty, for the game. Small decorations only near the edges.',
        'No people, no animals, no food, no objects that look like something to tap, no text, no logos.',
        'Style: hand-painted cartoon style for children, softer and less saturated than the game objects, warm brown outlines on roofs and stones, dark green outlines on plants, not pixel art, not realistic 3D.',
      ]
    : [
        'Use your image generation tool to create ONE image, then copy it into the current folder as ' + archivo + '.',
        'Subject: a single ' + que + ', whole, seen from the front (only slightly from above).',
        'Style: hand-painted cartoon style for children, warm dark brown outlines (#4b210e), thick, even and closed all around,',
        'The outline must remain about 8 pixels thick (never below 6) after the whole silhouette is resized to 200 pixels; ' +
          'in the original, make it about 4 percent of the silhouette longest dimension, as thick as the strawberry reference.',
        'simple cel-like soft shading with one base color, one shadow and one highlight, light from the upper left,',
        'vivid warm colors, simple rounded shapes that are easy to recognize at 64 px. Not pixel art, not realistic 3D, no textures, no long gradients.',
        'Background: plain flat white. No ground, no shadow on the ground, no scenery, no other objects.',
        'No face, no mouth, no words, no labels, no letters, no numbers, no logos. If it is an animal, it stays still and has only simple eyes',
        '(two dark dots with a small highlight), no mouth and no expression.',
        'Do not copy any character, brand or style from other games or films.',
      ]
  if (existsSync(LAMINA)) partes.push('Use lamina-modelos.png in this folder only as a style reference; do not copy its pieces.')
  if (correccion) partes.push('This is a correction. The previous attempt was rejected because: ' + correccion + '. Fix only that.')
  partes.push('When the file is saved, answer with one line: GUARDADO ' + archivo)
  return partes.join(' ')
}

async function intentosPrevios(carpeta, id) {
  const origen = path.join(carpeta, 'piezas', 'origen')
  const patron = new RegExp('^' + id + '-intento-(\\d+)\\.png$')
  const archivos = existsSync(origen) ? await readdir(origen) : []
  const reservados = path.join(carpeta, 'piezas', '.intentos')
  if (existsSync(reservados)) archivos.push(...await readdir(reservados))
  // Cuenta el número mayor: borrar un original o fallar antes de recibirlo no
  // vuelve a regalar correcciones. Los marcadores no se hacen pasar por imágenes.
  return Math.max(0, ...archivos.map((nombre) => Number(patron.exec(nombre)?.[1] ?? 0)))
}

async function anotar(carpeta, id, datos) {
  const archivo = path.join(carpeta, 'piezas', 'registro.json')
  // Varias piezas pueden terminar a la vez. El bloqueo dura solo esta escritura,
  // para que ninguna sobrescriba el registro que acaba de dejar otra.
  const bloqueo = archivo + '.lock'
  const hasta = Date.now() + 10_000
  while (true) {
    try { await mkdir(bloqueo); break } catch (error) {
      if (error.code !== 'EEXIST' || Date.now() >= hasta) throw error
      await new Promise((listo) => setTimeout(listo, 20))
    }
  }
  try {
    let registro = {}
    try { registro = JSON.parse(await readFile(archivo, 'utf8')) } catch { registro = {} }
    const anterior = registro[id] ?? {}
    registro[id] = { ...anterior, ...datos,
      segundos: (anterior.segundos ?? 0) + datos.segundos,
      tokens: (anterior.tokens ?? 0) + datos.tokens,
      imagenes: (anterior.imagenes ?? 0) + datos.imagenes,
    }
    await writeFile(archivo, JSON.stringify(registro, null, 2) + '\n')
  } finally { await rm(bloqueo, { recursive: true, force: true }) }
}

// «lanzarRol» permite probarlo sin la herramienta de imágenes real.
export async function dibujar({ carpeta, id, que, apoyado = false, fondo = false, correccion = null }, { roles, lanzarRol = lanzar } = {}) {
  const inicio = Date.now()
  const carpetaReal = path.resolve(carpeta)
  if (!esIdTrabajo(path.basename(carpetaReal)) || !existsSync(path.join(carpetaReal, 'trabajo.json'))) {
    return { id, pasa: false, motivo: 'La carpeta no es la de un trabajo del taller.' }
  }
  if (!PATRON_PIEZA.test(id ?? '') || fondo !== id.startsWith('fondo-')) {
    return { id, pasa: false, motivo: 'El id debe ir en minúsculas, sin tildes y con guiones; un fondo se llama «fondo-<lugar>» y un objeto no.' }
  }
  if (!que || !String(que).trim()) return { id, pasa: false, motivo: 'Falta --que: qué es la pieza y para qué sirve en el juego.' }

  if (!roles?.dibujante) return { id, pasa: false, motivo: 'El archivo de roles no tiene el rol «dibujante».' }
  const reservas = path.join(carpetaReal, 'piezas', '.intentos')
  await mkdir(reservas, { recursive: true })
  let intento = (await intentosPrevios(carpetaReal, id)) + 1
  // La reserva es exclusiva incluso entre dos procesos del dibujante.
  while (intento <= MAX_INTENTOS_PIEZA) {
    try { await writeFile(path.join(reservas, id + '-intento-' + intento + '.png'), 'reservado\n', { flag: 'wx' }); break }
    catch (error) { if (error.code !== 'EEXIST') throw error; intento += 1 }
  }
  if (intento > MAX_INTENTOS_PIEZA) {
    return { id, pasa: false, intento: intento - 1, siguiente: 'respaldo',
      motivo: 'Ya se usaron las 2 correcciones de esta pieza: usa una pieza del kit o una figura simple.' }
  }

  const temporal = path.join(tmpdir(), 'kusi-dibujante', path.basename(carpetaReal) + '-' + id + '-' + intento)
  await rm(temporal, { recursive: true, force: true })
  await mkdir(temporal, { recursive: true })
  if (existsSync(LAMINA)) await copyFile(LAMINA, path.join(temporal, 'lamina-modelos.png'))
  const pedido = pedidoDeDibujo({ id, que, fondo, intento, correccion })
  const comando = armarComando(roles.dibujante, { pedido, temporal, carpeta: carpetaReal, juego: CARPETA_JUEGO, raiz: path.resolve(CARPETA_JUEGO, '..') })
  let ejecucion
  try {
    ejecucion = await lanzarRol(comando, { limiteMs: LIMITE_IMAGEN_MS })
  } catch {
    // Un fallo al arrancar también consume un intento y queda documentado.
    ejecucion = { codigo: -1, agotado: false, salida: '', errores: '' }
  }

  const archivo = id + '-intento-' + intento + '.png'
  const origen = path.join(carpetaReal, 'piezas', 'origen', archivo)
  const pieza = path.join(carpetaReal, 'piezas', id + '.png')
  await mkdir(path.dirname(origen), { recursive: true })
  await appendFile(path.join(carpetaReal, 'piezas', 'pedidos.md'),
    '## ' + id + ', intento ' + intento + '\n\n' + pedido + '\n\n')

  let resultado
  if (!existsSync(path.join(temporal, archivo))) {
    resultado = { pasa: false, motivo: ejecucion.agotado ? 'La herramienta de imágenes no terminó en 5 minutos.' : 'La herramienta de imágenes no entregó ' + archivo + '.' }
  } else {
    await copyFile(path.join(temporal, archivo), origen)
    try {
      await prepararPieza(origen, pieza, { apoyado, fondo })
      const filtro = comprobarPieza(pieza, { fondo })
      const noes = filtro.respuestas.filter((respuesta) => !respuesta.si)
      resultado = { pasa: filtro.pasa, respuestas: noes.map(({ pregunta, motivo }) => ({ pregunta, motivo })) }
      if (!filtro.pasa) resultado.motivo = noes.map((respuesta) => respuesta.motivo).join(' ')
    } catch (error) {
      resultado = { pasa: false, motivo: 'No se pudo preparar la pieza: ' + error.message }
    }
  }
  // Una pieza que no pasa el filtro no se entrega: si no se corrige, el juego usa el respaldo.
  if (!resultado.pasa) await rm(pieza, { force: true })
  const tokens = Number((/tokens used\s*\n?\s*([\d,.]+)/i.exec(ejecucion.salida + ejecucion.errores)?.[1] ?? '0').replace(/[,.]/g, ''))
  const segundos = Math.round((Date.now() - inicio) / 1000)
  await anotar(carpetaReal, id, { tipo: fondo ? 'fondo' : 'objeto', intentos: intento, pasa: resultado.pasa, imagenes: existsSync(origen) ? 1 : 0,
    tokens, costo_por_imagen_usd: roles.dibujante.costo_por_imagen_usd ?? null, segundos })
  await appendFile(path.join(carpetaReal, 'piezas', 'pedidos.md'),
    'Resultado: ' + (resultado.pasa ? 'pasa el filtro del código.' : 'no pasa (' + resultado.motivo + ').') + '\n\n')
  await rm(temporal, { recursive: true, force: true })

  const siguiente = resultado.pasa ? 'revisor' : intento < MAX_INTENTOS_PIEZA ? 'corregir' : 'respaldo'
  return { id, intento, ...resultado, archivo: resultado.pasa ? pieza : null, siguiente, segundos }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  const { values } = parseArgs({ options: {
    carpeta: { type: 'string' }, id: { type: 'string' }, que: { type: 'string' },
    apoyado: { type: 'boolean', default: false }, fondo: { type: 'boolean', default: false }, correccion: { type: 'string' },
  } })
  // El dibujante solo necesita su rol; las claves del buzón corresponden al trabajador.
  const roles = await leerRoles(process.env.TALLER_ROLES ?? path.join(CARPETA_TALLER, 'roles.local.json'))
  console.log(JSON.stringify(await dibujar(values, { roles })))
}
