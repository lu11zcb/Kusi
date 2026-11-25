// El dibujante del taller prepara objetos, fondos, láminas del cuento, figuras y sus animaciones.
// El supervisor lo llama con:
//
//   node juego/taller/dibujar.mjs --carpeta <carpeta del trabajo> --id olla-de-barro \
//     --que "una olla de barro andina, para cocinar" [--apoyado] [--fondo | --cuento | --figura | --criatura | --tira <2-4>] [--mundo "<el mundo de la aventura>"] [--correccion "<motivos>"]
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
import { limiteDe, resultadoDePausa } from './trabajador/pausa.js'
import { esIdTrabajo, PATRON_PIEZA } from '#kit/reproductor/datos/registroJuegos.js'
import { prepararPieza } from '#kit/herramientas/preparar_pieza.mjs'
import { prepararCriatura, prepararTiraFigura } from '#kit/herramientas/preparar_criatura.mjs'
import { cantidadValidaDeCuadros, comprobarPieza } from '#kit/herramientas/comprobar_pieza.mjs'

export const MAX_INTENTOS_PIEZA = 3 // 1 intento y hasta 2 correcciones
// Las láminas del cuento de apertura: fondo-cuento-1, fondo-cuento-2…
export const PATRON_LAMINA = /^fondo-cuento-[1-9]$/
const LIMITE_IMAGEN_MS = 5 * 60 * 1000
const LAMINA = path.join(CARPETA_JUEGO, 'kit', 'estilo', 'lamina-modelos.png')

// El pedido a la herramienta de imágenes (guía de estilo, sección 13). Va en inglés: las
// piezas aprobadas del kit salieron de pedidos en inglés y estas frases ya funcionaron.
export function pedidoDeDibujo({ id, que, fondo, cuento = false, portada = false, figura = false, criatura = false, tira = null, mundo = null, intento, correccion }) {
  const archivo = id + '-intento-' + intento + '.png'
  const partes = tira !== null
    ? [
        'Use your image generation tool to create ONE wide image with a ' + tira + ':1 landscape ratio and ' + tira +
          ' equally sized square panels in a single horizontal row. Then copy it into the current folder as ' + archivo + '.',
        'Subject: ' + que + '. Draw the SAME full character in every panel as sequential frames of the gesture. Keep the design, clothes, colors, point of view and scale consistent across frames. The body and face change with the action, and the hands actually hold any prop they use.',
        'Center each complete drawing in its panel with wide blank gutters and a margin on every side. Align the feet on one shared imaginary ground line across all panels.',
        'Style: hand-painted cartoon for children, warm dark brown outlines (#4b210e), simple rounded shapes, soft shading and warm colors.',
        'Background: plain flat white. No ground, ground shadow, scenery, dividers, text or logos. Do not copy characters from other games or films.',
      ]
    : criatura
    ? [
        'Use your image generation tool to create ONE wide image with a 3:1 landscape ratio (for example 2304 by 768 pixels), then copy it into the current folder as ' + archivo + '.',
        'Subject: ' + que + '. It is a friendly cartoon character for a children game, drawn THREE times side by side in one row, as the 3 frames of a short looping movement cycle (a walk, a hop or a flap), seen from the side and facing RIGHT.',
        'The three drawings are the SAME character with exactly the same design, colors and size; only the pose changes a little: frame 1 one step forward, frame 2 the neutral pose with the body slightly lower, frame 3 the opposite step forward. Keep the feet (or the bottom of the body) on the same imaginary ground line in all three frames.',
        'Layout: each drawing is centered inside its own third of the image, with a wide empty white space between the drawings, and nothing touches the edges of the image or crosses into another third. Each drawing is complete and fills about 80 percent of the height of the image.',
        'Style: hand-painted cartoon style for children, warm dark brown outlines (#4b210e), thick, even and closed all around, simple cel-like soft shading with one base color, one shadow and one highlight, light from the upper left, vivid warm colors, simple rounded shapes. Not pixel art, not realistic 3D, no textures.',
        'Face: big simple round eyes with a small highlight and, if it fits, a small simple smile. Friendly and a bit funny, never scary: no teeth, no angry look, no weapons, no blood.',
        'Background: plain flat white. No ground, no shadow on the ground, no scenery, no other objects. No words, no labels, no letters, no numbers, no logos.',
        'Do not copy any character, brand or style from other games or films.',
      ]
    : figura
    ? [
        'Use your image generation tool to create ONE image, then copy it into the current folder as ' + archivo + '.',
        'Subject: ' + que + ', drawn COMPLETE and in one piece, as one large character-like figure seen from the front (only slightly from above), in a calm symmetrical pose with its parts clearly apart from each other: arms slightly away from the body, legs slightly apart, nothing hidden behind another part. The game will cut it into pieces, so each part must be easy to tell from the next by its shape and by a clear outline.',
        'Style: hand-painted cartoon style for children, warm dark brown outlines (#4b210e), thick, even and closed all around, simple cel-like soft shading with one base color, one shadow and one highlight, light from the upper left, vivid warm colors, simple rounded shapes. Make it charming, expressive and creative, with a bit of personality (decorations, patterns, a friendly simple face with two dark dot eyes and a small smile if it is a doll or a creature), not a plain boring shape. Not pixel art, not realistic 3D, no textures, no long gradients.',
        'Background: plain flat white. No ground, no shadow on the ground, no scenery, no other objects. No words, no labels, no letters, no numbers, no logos.',
        'Do not copy any character, brand or style from other games or films.',
      ]
    : portada
    // La portada del juego: lo que ve el niño en la lista de la app para reconocerlo. Sin
    // personajes (un Kusi dibujado aquí no saldría igual al de verdad) y sin letras (el
    // título lo pone la app y los niños de 1.º todavía no leen).
    ? [
        'Use your image generation tool to create ONE landscape 16:9 cover illustration for a children game, then copy it into the current folder as ' + archivo + '.',
        'Scene: ' + que + '. The place of the adventure with its two or three most important objects, big and easy to recognize at a glance, bright, cheerful and inviting, so a 6 year old child wants to play it.',
        'No people, no animals and no characters at all: show the place and the objects of the game.',
        'One clear center of interest, simple background, strong friendly colors; it must still read well when shown small on a phone.',
        'No text, no letters, no numbers, no logos, no signs with words.',
        'Style: hand-painted cartoon style for children, warm and cozy colors, warm brown outlines on buildings and objects, dark green outlines on plants, soft shading, not pixel art, not realistic 3D.',
      ]
    : cuento
    ? [
        'Use your image generation tool to create ONE landscape 16:9 storybook illustration for a children book page, then copy it into the current folder as ' + archivo + '.',
        'Scene: ' + que + '. A warm, friendly, easy to understand picture that tells this moment of the story at a glance.',
        'No people, no animals and no characters at all (a friendly mascot is added later by the game): show the place and the objects of the story.',
        'Keep the lower-left corner and the bottom 25% of the picture calm and simple, with no important details, because the game puts the mascot and a line of text there.',
        'No text, no letters, no numbers, no logos, no signs with words.',
        'Style: hand-painted cartoon style for children, warm and cozy colors, warm brown outlines on buildings and objects, dark green outlines on plants, soft shading, not pixel art, not realistic 3D.',
      ]
    : fondo
    ? [
        'Use your image generation tool to create ONE landscape 16:9 background image, then copy it into the current folder as ' + archivo + '.',
        'Subject: ' + que + '. Seen from directly above (top-down camera): no horizon, no sky, no building facades (only roofs).',
        // Un suelo «vacío en el centro» salió liso y de un solo color (pareció un desierto, correcciones.md, 25): el
        // suelo se trabaja en toda la imagen y solo se deja libre lo alto, que lo pone el juego.
        'The ground fills the WHOLE picture and is varied and alive, never one flat color: areas of grass, paths, patches of soil and soft shadow, ' +
          'with small flat details lying on the ground (tiny flowers, pebbles, leaves) spread everywhere, also in the middle.',
        'In the central 75% of the width and 80% of the height there is nothing tall standing up (no trees, walls, furniture or buildings): the game places those.',
        'Use clean flat color areas with soft shapes, without fine noise or grain.',
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
  // El mundo de la aventura (reglas.md, 13.10): todo lo que se dibuja pertenece a él.
  if (mundo && String(mundo).trim()) {
    partes.push('World of this game: ' + String(mundo).trim() + '. Everything in the image must belong to this world and look made of its material and palette; ' +
      'do not add anything from another world (for example no grass, soil, mud or wood if the world is not made of them).')
  }
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
export async function dibujar({ carpeta, id, que, apoyado = false, fondo = false, cuento = false, portada = false, figura = false, criatura = false, tira = null, mundo = null, correccion = null }, { roles, lanzarRol = lanzar } = {}) {
  const inicio = Date.now()
  const carpetaReal = path.resolve(carpeta)
  if (!esIdTrabajo(path.basename(carpetaReal)) || !existsSync(path.join(carpetaReal, 'trabajo.json'))) {
    return { id, pasa: false, motivo: 'La carpeta no es la de un trabajo del taller.' }
  }
  // Las tiras de figura se reconocen por sus medidas y pueden tener nombres como
  // «comer-manzana» o «figura-inti-baila». Fondo y criatura conservan sus prefijos.
  const esTira = tira !== null
  if (esTira && !cantidadValidaDeCuadros(tira)) {
    return { id, pasa: false, motivo: '--tira necesita un número entero de cuadros entre 2 y 4.' }
  }
  const esLamina = PATRON_LAMINA.test(id ?? '')
  const nombre = id ?? ''
  const exclusivos = [fondo, cuento, portada, figura, criatura, esTira].filter(Boolean).length
  // La portada del juego se llama siempre «portada» (el trabajador la dibuja al terminar).
  const tipoEsperado = portada ? nombre === 'portada'
    : nombre === 'portada' ? false
    : cuento ? esLamina
    : fondo ? nombre.startsWith('fondo-') && !esLamina
      : figura ? nombre.startsWith('figura-') && nombre.length > 'figura-'.length
        : criatura ? nombre.startsWith('criatura-') && nombre.length > 'criatura-'.length
          : !nombre.startsWith('fondo-') && !nombre.startsWith('criatura-') && (esTira || !nombre.startsWith('figura-'))
  if (!PATRON_PIEZA.test(nombre) || exclusivos > 1 || !tipoEsperado) {
    return { id, pasa: false, motivo: 'Usa un solo tipo por pieza. El id va en minúsculas, sin tildes y con guiones. Una lámina del cuento (--cuento) se llama «fondo-cuento-<n>», una figura entera (--figura) «figura-<nombre>», una criatura animada (--criatura) «criatura-<nombre>» y un fondo (--fondo) «fondo-<lugar>». Usa un nombre como «comer-manzana» para un objeto o una tira de figura (--tira).' }
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
  const pedido = pedidoDeDibujo({ id, que, fondo, cuento, portada, figura, criatura, tira, mundo, intento, correccion })
  const comando = armarComando(roles.dibujante, { pedido, temporal, carpeta: carpetaReal, juego: CARPETA_JUEGO, raiz: path.resolve(CARPETA_JUEGO, '..') })
  let ejecucion
  try {
    ejecucion = await lanzarRol(comando, { limiteMs: LIMITE_IMAGEN_MS })
  } catch (error) {
    // Un fallo al arrancar también consume un intento y queda documentado.
    ejecucion = { codigo: -1, agotado: false, salida: '', errores: String(error?.message ?? error) }
  }

  const archivo = id + '-intento-' + intento + '.png'
  const pausa = limiteDe(ejecucion, 'dibujante', Date.now())
  if (pausa) {
    // La reserva solo coordina el lanzamiento. Con un límite se devuelve este turno y se conserva la pieza anterior.
    await rm(temporal, { recursive: true, force: true })
    await rm(path.join(reservas, archivo), { force: true })
    return { id, ...resultadoDePausa(pausa) }
  }
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
      if (esTira) await prepararTiraFigura(origen, pieza, tira)
      else if (criatura) await prepararCriatura(origen, pieza)
      else await prepararPieza(origen, pieza, { apoyado, fondo: fondo || cuento || portada, figura })
      const filtro = comprobarPieza(pieza, { fondo: fondo || cuento || portada, figura, criatura })
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
  const tipo = esTira ? 'tira-figura' : criatura ? 'criatura' : figura ? 'figura' : portada ? 'portada' : cuento ? 'cuento' : fondo ? 'fondo' : 'objeto'
  await anotar(carpetaReal, id, { tipo, intentos: intento, pasa: resultado.pasa, imagenes: existsSync(origen) ? 1 : 0,
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
    apoyado: { type: 'boolean', default: false }, fondo: { type: 'boolean', default: false }, cuento: { type: 'boolean', default: false }, portada: { type: 'boolean', default: false }, figura: { type: 'boolean', default: false }, criatura: { type: 'boolean', default: false }, mundo: { type: 'string' }, correccion: { type: 'string' },
    tira: { type: 'string' },
  } })
  // El dibujante solo necesita su rol; las claves del buzón corresponden al trabajador.
  const roles = await leerRoles(process.env.TALLER_ROLES ?? path.join(CARPETA_TALLER, 'roles.local.json'))
  console.log(JSON.stringify(await dibujar({ ...values, tira: values.tira === undefined ? null : Number(values.tira) }, { roles })))
}
