// Lo que el trabajador comprueba con código, sin IA, antes de entregar un juego:
// que estén los archivos de entrega.md, que el código no haga nada de lo prohibido
// (reglas.md, regla 9) ni nombre al cuy, que solo importe lo permitido, que pasen
// sus pruebas con node --test y que el reproductor lo abra con el validar de su ficha.

import { execFile, spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { readFile, readdir, realpath } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { promisify } from 'node:util'
import { CARPETA_JUEGO } from './configuracion.js'
import { comprobarPieza } from '#kit/herramientas/comprobar_pieza.mjs'
import { partirHistoria } from '#kit/reproductor/logica/historia.js'
import { huellasAprobadas } from './carpeta.js'
import { motivosDePantalla } from './pantalla.js'

// Regla 9: red, almacenamiento, texto como código y tocar la página o la app.
// Las APIs que pueden enviar audio también se comprueban por referencia (14.13).
export const PROHIBIDO = [
  [/\bfetch\s*\(/, 'se conecta a la red (fetch)', 'fetch'],
  [/\bXMLHttpRequest\b/, 'se conecta a la red (XMLHttpRequest)', 'XMLHttpRequest'],
  [/\bWebSocket\b/, 'se conecta a la red (WebSocket)'],
  [/\bEventSource\b/, 'se conecta a la red (EventSource)'],
  [/\bsendBeacon\b/, 'se conecta a la red (sendBeacon)', 'sendBeacon'],
  [/\blocalStorage\b|\bsessionStorage\b|\bindexedDB\b|document\.cookie/, 'guarda datos en el navegador'],
  [/\beval\s*\(|\bnew\s+Function\b/, 'ejecuta texto como código'],
  [/\bset(?:Timeout|Interval)\s*\(\s*['"`]/, 'ejecuta texto como código (un temporizador con texto)'],
  [/\bimport\s*\(/, 'importa código con una ruta calculada'],
  [/\bwindow\.(?:parent|top|opener)\b|\bKusiPuente\b/, 'toca la página o la app directamente'],
  [/document\.write|\.innerHTML\b|\.outerHTML\b/, 'escribe en la página directamente'],
]

// Las cadenas y los comentarios se recorren completos para que una barra escrita
// en ellos siga siendo texto. Una barra al comenzar una expresión puede abrir
// un literal de RegExp, como el de una lista de palabras prohibidas.
const CADENAS_COMENTARIOS_Y_PATRONES = new RegExp(
  String.raw`(['"\x60])(?:\\[\s\S]|(?!\1)[^\\])*\1|\/\/[^\r\n]*|\/\*[\s\S]*?\*\/|` +
  String.raw`(?<=^\s*|[=(:,;\[!&|?~{]\s*|\b(?:return|throw|case|yield)\s+)` +
  String.raw`(\/(?:\\[^\r\n]|\[(?:\\[^\r\n]|[^\]\\\r\n])*\]|[^/\[\\\r\n])+\/[dgimsuvy]*)`, 'g')

// «cuy» como nombre (cuy, cuyAnimado, paso_cuy), pero no «cuyo» ni «cuya».
export function nombraAlCuy(texto) {
  if (!/cuy/i.test(texto)) return false
  const sinPatrones = texto.replace(CADENAS_COMENTARIOS_Y_PATRONES, (parte, _comilla, patron) => patron ? ' ' : parte)
  for (const encontrado of sinPatrones.matchAll(/cuy/gi)) {
    const siguiente = sinPatrones[encontrado.index + 3]
    if (siguiente !== 'o' && siguiente !== 'a') return true
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

const NOMBRE_KUSI = /(?<![\p{L}\p{N}_])kusi(?![\p{L}\p{N}_])/iu
const SONIDO_SUELTO = /^(?:[aeiou]|(\p{L})\1+)$/iu
const PROMESA_FUTURA = /(?<![\p{L}\p{N}_])(?:aprender|sabr|entender|comprender)[aá]n?(?![\p{L}\p{N}_])/iu
const PROMESA_AL_TERMINAR = /\bal\s+(?:terminar|finalizar|final)(?:\s+(?:el|la)\s+(?:juego|actividad|partida|reto))?\s*,?\s+(?:(?:el|la|los|las)\s+(?:niños?|niñas?|estudiantes?|alumnos?|alumnas?)\s+)?(?:ya\s+)?(?:saben?|entienden?|aprenden?|comprenden?)\b/iu
const ejecutar = promisify(execFile)
const LIMITE_FRASES_MS = 3000
const PERMISOS_NODE = process.allowedNodeEnvironmentFlags.has('--permission') ? '--permission' : '--experimental-permission'

// El módulo puede construir sus frases con datos del juego. Se importa en otro
// proceso para poder cortarlo aunque su carga o su función no terminen.
async function revisarFrases(archivo, motivos) {
  const referencia = ' (reglas.md, regla 14.1).'
  try {
    const carpeta = await realpath(path.dirname(archivo))
    const ruta = await realpath(archivo)
    if (!ruta.startsWith(carpeta + path.sep)) throw new Error('el archivo debe estar dentro de juego/')
    const { stdout } = await ejecutar(process.execPath, [
      PERMISOS_NODE, '--allow-fs-read=' + carpeta,
      '--allow-fs-read=' + path.join(CARPETA_JUEGO, 'package.json'),
      '--allow-fs-read=' + path.join(CARPETA_JUEGO, 'kit'), '--input-type=module', '--eval',
      `
        import { Console } from 'node:console'
        import { pathToFileURL } from 'node:url'
        // Los mensajes del módulo no se mezclan con el resultado de la revisión.
        globalThis.console = new Console(process.stderr)
        try {
          const { frasesDeKusi } = await import(pathToFileURL(process.argv[1]).href)
          if (typeof frasesDeKusi !== 'function') throw new Error('debe exportar frasesDeKusi()')
          const frases = await frasesDeKusi()
          if (!Array.isArray(frases) || [...frases].some((frase) => typeof frase !== 'string')) {
            throw new Error('frasesDeKusi() debe devolver una lista de textos')
          }
          process.stdout.write(JSON.stringify({ frases }))
        } catch (error) {
          process.stdout.write(JSON.stringify({ error: String(error?.message ?? error).slice(0, 300) }))
        }
      `, ruta,
    ], { cwd: CARPETA_JUEGO, env: {}, timeout: LIMITE_FRASES_MS, killSignal: 'SIGKILL', maxBuffer: 256 * 1024 })
    const resultado = JSON.parse(stdout)
    if (resultado.error !== undefined) throw new Error(resultado.error)
    for (const [indice, frase] of resultado.frases.entries()) {
      const origen = 'juego/frases.js, frase ' + (indice + 1)
      const largo = [...frase].length
      // Los signos y las tildes no le dan contexto a una vocal o un sonido grabado.
      const contenido = frase.normalize('NFD').replace(/[\p{M}\p{P}\s]/gu, '')
      if (largo > 60) motivos.push(origen + ' tiene ' + largo + ' caracteres. Acórtala a 60 como máximo' + referencia)
      else if (!contenido) motivos.push(origen + ' está vacía. Escribe una frase que se pueda decir' + referencia)
      else if (SONIDO_SUELTO.test(contenido)) {
        motivos.push(origen + ' es una vocal o un sonido suelto. Dale contexto, como «La A: aaa.» (reglas.md, reglas 14.1 y 14.11).')
      }
      if (NOMBRE_KUSI.test(frase)) motivos.push(origen + ' dice «Kusi». Escribe lo que dice en primera persona' + referencia)
    }
  } catch (error) {
    const detalle = error.killed ? 'superó el límite de ' + LIMITE_FRASES_MS / 1000 + ' s'
      : error.cmd ? 'el proceso de lectura no pudo terminar correctamente' : error.message
    motivos.push('No se pudo revisar juego/frases.js: ' + detalle + referencia)
  }
}

function promesaDeAprendizaje(valor) {
  if (typeof valor === 'string') return valor.match(PROMESA_FUTURA)?.[0] ?? valor.match(PROMESA_AL_TERMINAR)?.[0]
  if (valor && typeof valor === 'object') {
    for (const campo of Object.values(valor)) {
      const promesa = promesaDeAprendizaje(campo)
      if (promesa) return promesa
    }
  }
}

function revisarPromesas(archivo, contenido, motivos) {
  const promesa = promesaDeAprendizaje(contenido)
  if (promesa) {
    motivos.push('juego/' + archivo + ' promete aprendizaje con «' + promesa + '». ' +
      'Di qué presenta, practica y comprueba el juego (reglas.md, regla 14.2).')
  }
}

function revisarGuion(texto, motivos) {
  let guion
  try {
    guion = JSON.parse(texto)
  } catch {
    return // comprobarJuego informa el error de formato del guion.
  }
  revisarPromesas('guion-ejemplo.json', guion, motivos)
  const revisarTexto = (frase, ruta) => {
    if (typeof frase === 'string' && NOMBRE_KUSI.test(frase)) {
      motivos.push('juego/guion-ejemplo.json, «' + ruta + '», dice «Kusi». ' +
        'Escribe lo que dice en primera persona (reglas.md, reglas 7 y 14.1).')
    }
  }
  revisarTexto(guion?.consigna, 'consigna')
  if (Array.isArray(guion?.retos)) {
    for (const [indice, reto] of guion.retos.entries()) {
      const ruta = 'retos[' + indice + ']'
      revisarTexto(reto?.consigna, ruta + '.consigna')
      if (Array.isArray(reto?.ayudas)) {
        reto.ayudas.forEach((ayuda, orden) => revisarTexto(ayuda, ruta + '.ayudas[' + orden + ']'))
      }
    }
  }
  revisarTexto(guion?.cierre?.mensaje, 'cierre.mensaje')
}

function limpiarCodigo(texto, conservarCadenas) {
  // Mantiene las posiciones para cotejar rutas y propiedades entre las dos lecturas.
  return texto.replace(CADENAS_COMENTARIOS_Y_PATRONES,
    (parte, comilla) => comilla && conservarCadenas ? parte : parte.replace(/[^\r\n]/g, ' '))
}

function usaApiDelNavegador(conCadenas, sinCadenas, nombre) {
  if (new RegExp('\\b' + nombre + '\\b').test(sinCadenas)) return true
  const propiedad = new RegExp(String.raw`\[\s*(['"])` + nombre + String.raw`\1\s*\]`, 'g')
  return [...conCadenas.matchAll(propiedad)].some(({ index }) => sinCadenas[index] === '[')
}

function llamaFuncionDelKit(conCadenas, sinCadenas, modulo, funcion) {
  // Importar una función sin llamarla deja al niño sin tutorial o sin escucha.
  const importaciones = conCadenas.matchAll(/\bimport\s+(?:[\w$]+\s*,\s*)?(\{[^{}]*\}|\*\s+as\s+[\w$]+)\s*from\s*(['"])([^'"]+)\2/g)
  for (const { 1: enlace, 3: ruta, index } of importaciones) {
    if (ruta !== modulo || !sinCadenas.startsWith('import', index)) continue
    if (enlace.startsWith('*')) {
      const espacio = enlace.match(/[\w$]+$/)[0].replaceAll('$', '\\$')
      if (new RegExp('(?<![\\w$.])' + espacio + '\\s*\\.\\s*' + funcion + '\\s*\\(').test(sinCadenas)) return true
    } else {
      for (const nombre of enlace.slice(1, -1).split(',')) {
        const [exportado, , local = exportado] = nombre.trim().split(/\s+/)
        if (exportado === funcion && new RegExp('(?<![\\w$.])' + local.replaceAll('$', '\\$') + '\\s*\\(').test(sinCadenas)) return true
      }
    }
  }
  return false
}

function revisarInterfaz(texto, archivo, avisos) {
  // Una forma interactiva puede ser una pieza del mundo. Un texto de interfaz
  // cerca es una pista para que el revisor confirme en pantalla qué hace.
  const formas = texto.matchAll(/\badd\s*\.\s*(?:circle|rectangle)\s*\([\s\S]{0,350}?\.\s*setInteractive\s*\(/g)
  for (const forma of formas) {
    const cerca = texto.slice(Math.max(0, forma.index - 300), forma.index + forma[0].length + 300)
    const etiqueta = cerca.match(/\badd\s*\.\s*text\s*\([\s\S]{0,160}?(['"`])(Volver|Soltar|Empezar|Escuchar)\1/i)?.[2]
    if (etiqueta) {
      avisos.push('juego/' + archivo + ' puede estar dibujando un botón de «' + etiqueta + '» con una forma interactiva. ' +
        'Confírmalo en el juego y, si es un botón, usa las imágenes boton-* del kit o hud.botonSoltar (reglas.md, regla 14.8).')
      return
    }
  }
}

// Revisa el código. Los motivos impiden la entrega y los avisos requieren una mirada del revisor.
export async function revisarCodigo(carpetaJuego) {
  const motivos = []
  const avisos = []
  for (const necesario of ['juego.js', 'guion-ejemplo.json', 'README.md']) {
    if (!existsSync(path.join(carpetaJuego, necesario))) motivos.push('Falta juego/' + necesario + ' (entrega.md §2).')
  }
  const frases = path.join(carpetaJuego, 'frases.js')
  const tieneFrases = existsSync(frases)
  if (!tieneFrases) motivos.push('Falta juego/frases.js. Exporta frasesDeKusi() con las frases del juego (reglas.md, regla 14.1).')
  const codigo = []
  const archivosConCapturaDirecta = []
  let llevaObjetos = false
  let usaSoltar = false
  let usaMicrofono = false
  let usaEscuchaDelKit = false
  let usaTutorial = false
  let mueveProtagonista = false
  let usaControles = false
  let hayCodigoProhibido = false
  for (const archivo of await archivosDe(carpetaJuego, ['.js', '.mjs', '.json'])) {
    const relativo = path.relative(carpetaJuego, archivo)
    const texto = await readFile(archivo, 'utf8')
    const esPrueba = relativo.startsWith('pruebas' + path.sep)
    const esCodigo = !archivo.endsWith('.json')
    if (!esPrueba) {
      const conCadenas = esCodigo ? limpiarCodigo(texto, true) : texto
      const sinCadenas = esCodigo ? limpiarCodigo(texto, false) : texto
      for (const [patron, motivo, api] of PROHIBIDO) {
        if (patron.test(texto) || (api && esCodigo && usaApiDelNavegador(conCadenas, sinCadenas, api))) {
          const regla = api ? '9 y regla 14.13' : '9'
          motivos.push('juego/' + relativo + ' ' + motivo + ' (reglas.md, regla ' + regla + ').')
          hayCodigoProhibido = true
        }
      }
      if (relativo === 'guion-ejemplo.json') revisarGuion(texto, motivos)
      if (esCodigo) {
        codigo.push(texto)
        llevaObjetos ||= /\bcargad[ao]\b|\bcargar\s*\(/.test(sinCadenas)
        usaSoltar ||= /\.\s*botonSoltar\s*\(/.test(sinCadenas)
        usaTutorial ||= llamaFuncionDelKit(conCadenas, sinCadenas, '#kit/reproductor/interfaz/tutorial.js', 'crearTutorial')
        usaEscuchaDelKit ||= llamaFuncionDelKit(conCadenas, sinCadenas, '#kit/reproductor/interfaz/microfono.js', 'escucharVocal')
        // Solo los pasos que desplazan al protagonista requieren joystick. Crear
        // un cuerpo o calcular el alcance de un salto no mueve al personaje.
        mueveProtagonista ||= /\b(?:moverConColisiones|avanzarVehiculo|avanzarCuerpo)\s*\(/.test(sinCadenas) ||
          llamaFuncionDelKit(conCadenas, sinCadenas, '#kit/reproductor/logica/exploracion.js', 'moverConColisiones') ||
          llamaFuncionDelKit(conCadenas, sinCadenas, '#kit/reproductor/logica/vehiculo.js', 'avanzarVehiculo') ||
          llamaFuncionDelKit(conCadenas, sinCadenas, '#kit/reproductor/logica/plataformas.js', 'avanzarCuerpo')
        usaControles ||= /\bcrearControles\s*\(/.test(sinCadenas) ||
          llamaFuncionDelKit(conCadenas, sinCadenas, '#kit/reproductor/interfaz/controles.js', 'crearControles')
        if (relativo === 'juego.js') {
          const campos = conCadenas.matchAll(/[,{]\s*(?:usaMicrofono|(['"])usaMicrofono\1)\s*:\s*true\s*[,}]/g)
          usaMicrofono = [...campos].some(({ index }) => /[,{]/.test(sinCadenas[index]))
        }
        for (const api of ['SpeechRecognition', 'webkitSpeechRecognition']) {
          if (usaApiDelNavegador(conCadenas, sinCadenas, api)) {
            motivos.push('juego/' + relativo + ' usa ' + api + '. Escucha con escucharVocal del kit para que el audio ' +
              'se analice en el equipo (reglas.md, regla 14.13).')
            hayCodigoProhibido = true
          }
        }
        if (usaApiDelNavegador(conCadenas, sinCadenas, 'getUserMedia')) archivosConCapturaDirecta.push(relativo)
        if (/\.\s*setTintFill\s*(?:\?\.\s*)?\(/.test(sinCadenas) || /\[\s*['"]setTintFill['"]\s*\]\s*\(/.test(conCadenas)) {
          motivos.push('juego/' + relativo + ' usa setTintFill, retirado en Phaser 4. Usa ' +
            'setTint(color).setTintMode(Phaser.TintModes.FILL) (reglas.md, regla 2).')
        }
        revisarInterfaz(conCadenas, relativo, avisos)
      }
    }
    if (nombraAlCuy(texto)) motivos.push('juego/' + relativo + ' nombra al cuy: usa el protagonista (reglas.md, regla 3).')
    if (esCodigo) {
      for (const encontrado of texto.matchAll(/\b(?:import|export)\b[^'"`;]*?\bfrom\s*['"]([^'"]+)['"]|\bimport\s*['"]([^'"]+)['"]/g)) {
        const especificador = encontrado[1] ?? encontrado[2]
        if (!importacionPermitida(especificador, archivo, carpetaJuego)) {
          motivos.push('juego/' + relativo + ' importa «' + especificador + '»: solo se puede importar de #kit/, phaser o la carpeta del juego.')
          hayCodigoProhibido = true
        }
      }
    }
  }
  if (!usaTutorial) motivos.push('El juego no tiene tutorial al empezar (regla 14.10).')
  if (usaMicrofono) {
    if (!usaEscuchaDelKit) {
      motivos.push('juego/juego.js declara usaMicrofono: true. Llama a escucharVocal de ' +
        '#kit/reproductor/interfaz/microfono.js (reglas.md, regla 14.13).')
    }
    for (const archivo of archivosConCapturaDirecta) {
      motivos.push('juego/' + archivo + ' usa getUserMedia directamente. Usa escucharVocal del kit (reglas.md, regla 14.13).')
      hayCodigoProhibido = true
    }
  }
  const readme = path.join(carpetaJuego, 'README.md')
  if (existsSync(readme)) revisarPromesas('README.md', await readFile(readme, 'utf8'), motivos)
  // Las frases pueden importar otros archivos del juego. Si el filtro de
  // seguridad ya detectó código prohibido, se corrige antes de ejecutarlas.
  if (tieneFrases && !hayCodigoProhibido) await revisarFrases(frases, motivos)
  // El joystick acompaña al movimiento por el mundo. La interfaz común vale
  // también para los juegos que se juegan desde un punto fijo.
  const todo = codigo.join('\n')
  if (llevaObjetos && !usaSoltar) {
    motivos.push('El juego parece cargar objetos y falta hud.botonSoltar. Usa ese botón para dejar el objeto ' +
      'a los pies del protagonista (reglas.md, regla 14.5).')
  }
  if (mueveProtagonista && !usaControles) motivos.push('El juego mueve al protagonista y no usa los controles del kit: llama a crearControles de ' +
    '#kit/reproductor/interfaz/controles.js (el joystick; reglas.md, regla 13.16).')
  if (!/\bcrearHud\s*\(/.test(todo)) motivos.push('El juego no usa la interfaz común del kit: llama a crearHud de #kit/reproductor/interfaz/hud.js (reglas.md, 13.17).')
  // Un mundo que se ve y se mueve (reglas.md, 13.22): decorado repartido, cosas que se mueven y ambiente.
  if (!/\brepartirYColocar\s*\(|\brepartirDecorado\s*\(/.test(todo)) motivos.push('El juego no reparte el decorado del mundo: usa repartirYColocar de #kit/reproductor/efectos/mundoVivo.js para llenar el lugar (reglas.md, 13.22).')
  if (!/\bdarVida\s*\(/.test(todo)) motivos.push('Nada del mundo se mueve: usa darVida de #kit/reproductor/efectos/mundoVivo.js en las piezas y los personajes (reglas.md, 13.22).')
  if (!/\bambiente\s*\(/.test(todo)) motivos.push('Falta el ambiente del mundo: usa ambiente de #kit/reproductor/efectos/mundoVivo.js para cosas que flotan o pasan (reglas.md, 13.22).')
  // El zoom de la cámara agranda la interfaz del kit y deja franjas del color del lienzo: el mundo se dibuja a su
  // escala y cubre toda la pantalla (reglas.md, 13.17).
  if (/\.setZoom\s*\(|\bcameras\.main\.zoom\b|\bzoom\s*[:=]\s*[^0\s]/.test(todo)) {
    motivos.push('El juego usa zoom de cámara: no lo uses. Dibuja el mundo a su escala y que cubra toda la pantalla; el zoom agranda la interfaz del kit y deja franjas azules (reglas.md, 13.17).')
  }
  // El mundo llena la pantalla y la interfaz flota encima: recortar la cámara a una franja (setViewport) o sumar una
  // segunda cámara deja bandas del color del lienzo y reduce el juego a una tira. Y los textos del kit (los botones
  // Sonido, Escuchar y Ayuda) no se agrandan en bloque: se encimaban entre sí (reglas.md, 13.14 y 13.17).
  if (/\.setViewport\s*\(|\bcameras\.add\s*\(/.test(todo)) {
    motivos.push('El juego recorta la cámara (setViewport o una cámara extra): no lo hagas. El mundo llena toda la pantalla y la interfaz flota encima; mantén lo importante fuera de las franjas con la cámara que sigue al protagonista (reglas.md, 13.17).')
  }
  if (/children\.list[\s\S]{0,400}?\.setFontSize\s*\(/.test(todo)) {
    motivos.push('El juego cambia el tamaño de todos los textos de la escena, incluidos los del kit: no lo hagas. Solo agranda los textos que el propio juego crea; los del kit ya vienen con su tamaño (reglas.md, 13.14).')
  }
  // Una criatura animada que el dibujante dejó en piezas/ se reproduce con crearCriatura (kit/reproductor/dibujos/criaturaAnimada.js):
  // si no, se vería la tira de 3 cuadros entera, uno al lado del otro (reglas.md, 13.25).
  const carpetaPiezas = path.join(path.dirname(carpetaJuego), 'piezas')
  if (existsSync(carpetaPiezas)) {
    const criaturas = (await readdir(carpetaPiezas)).filter((nombre) => /^criatura-.+\.png$/.test(nombre))
    if (criaturas.length > 0 && !/\bcrearCriatura\s*\(/.test(todo)) {
      motivos.push('Hay criaturas animadas en piezas/ (' + criaturas.join(', ') + ') y el juego no las usa: llama a crearCriatura de ' +
        '#kit/reproductor/dibujos/criaturaAnimada.js para cada una (si no, se ve la tira de 3 cuadros entera; reglas.md, 13.25).')
    }
  }
  for (const ajeno of ['index.html', 'vite.config.js', 'package.json', 'kit']) {
    if (existsSync(path.join(carpetaJuego, ajeno))) motivos.push('juego/' + ajeno + ' no debe estar: el reproductor abre el juego, no se arma otro entorno ni se copia el kit.')
  }
  return { motivos, avisos }
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
  // Una pieza reutilizada de la biblioteca (misma huella que una aprobada) ya pasó los
  // tres filtros con otro docente: no necesita otra revisión.
  const aprobadas = await huellasAprobadas(carpeta)
  for (const archivo of (await readdir(piezas)).filter((nombre) => nombre.endsWith('.png')).sort()) {
    const id = archivo.slice(0, -'.png'.length)
    const resultado = comprobarPieza(path.join(piezas, archivo), { fondo: id.startsWith('fondo-'), figura: id.startsWith('figura-'), criatura: id.startsWith('criatura-') })
    if (!resultado.pasa) {
      motivos.push('La pieza «' + id + '» no pasa el filtro del código: ' +
        resultado.respuestas.filter((respuesta) => !respuesta.si).map((respuesta) => respuesta.motivo).join(' '))
    }
    // El segundo filtro corresponde a estos bytes: una corrección nunca hereda la
    // aprobación visual de otro dibujo. El informe queda dentro de revision/.
    const huella = createHash('sha256').update(await readFile(path.join(piezas, archivo))).digest('hex')
    if (aprobadas.has(huella)) continue
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
    const motivos = await revisarApertura(navegador, trabajo, juegoUrl, { limiteMs, conVida: false })
    if (motivos.length) return motivos
    return await revisarApertura(navegador, trabajo, juegoUrl, { limiteMs, conVida: true })
  } finally {
    await navegador.close()
  }
}

// Chromium sin pantalla puede no tener voces instaladas. La síntesis de prueba
// deja que el kit reciba el inicio y el fin sin depender de audio del equipo.
function instalarSintesisDePrueba() {
  let pendiente
  Object.defineProperty(window, 'SpeechSynthesisUtterance', {
    value: class { constructor(texto) { this.text = texto } },
  })
  Object.defineProperty(window, 'speechSynthesis', { value: {
    getVoices: () => [{ name: 'Voz de prueba', lang: 'es-PE', localService: true }],
    speak(frase) {
      pendiente = setTimeout(() => {
        pendiente = setTimeout(() => frase.onend?.(), 50)
        frase.onstart?.()
      }, 0)
    },
    cancel: () => clearTimeout(pendiente),
  } })
}

async function revisarApertura(navegador, trabajo, juegoUrl, { limiteMs, conVida }) {
  const pagina = await navegador.newPage({ viewport: { width: 1280, height: 720 }, hasTouch: true })
  const motivos = new Set()
  const modo = conVida ? 'con efectos' : 'sin efectos'
  const errorDeConsola = (tipo, texto) => {
    motivos.add('Error en el navegador ' + modo + ' (' + tipo + '). ' + texto + ' (reglas.md, regla 14.6).')
  }
  let probandoElToque = false
  let sonoVoz = false
  pagina.on('pageerror', (error) => errorDeConsola('pageerror', error.message))
  pagina.on('console', (mensaje) => {
    const texto = mensaje.text()
    if (mensaje.type() === 'error') errorDeConsola('console.error', texto)
    if (/^\[Kusi\] voz (?:sin sonido|trabada)\b/.test(texto)) {
      motivos.add('La voz de Kusi falló ' + modo + '. ' + texto + ' (reglas.md, regla 14.1).')
    }
    if (probandoElToque && texto.startsWith('[Kusi] voz:')) sonoVoz = true
  })
  try {
    await pagina.addInitScript(instalarSintesisDePrueba)
    const url = new URL('?juego=' + trabajo + '&historia=0' + (conVida ? '' : '&vida=0'), juegoUrl).href
    await pagina.goto(url, { timeout: limiteMs })
    await pagina.waitForFunction((id) => window.kusi?.juego?.trabajo === id ||
      window.kusi?.avisos?.some((aviso) => aviso.tipo === 'fallo'), trabajo, { timeout: limiteMs })
    const fallo = await pagina.evaluate(() => window.kusi?.avisos?.find((aviso) => aviso.tipo === 'fallo')?.motivo)
    if (fallo) {
      motivos.add('El reproductor no pudo abrir el juego ' + modo + '. ' + fallo + ' (reglas.md, regla 14.6).')
    } else {
      probandoElToque = true
      await pagina.touchscreen.tap(640, 360)
      // Da tiempo a que la consigna arranque y a que se manifiesten los errores de inicio.
      await pagina.waitForTimeout(3000)
      if (conVida) {
        for (const motivo of await revisarPantalla(pagina)) motivos.add(motivo)
      }
      if (!sonoVoz) {
        motivos.add('No apareció «[Kusi] voz:» después de tocar la pantalla ' + modo +
          '. Usa la voz del kit para decir la consigna (reglas.md, regla 14.1).')
      }
    }
  } catch (error) {
    const paso = probandoElToque ? 'No se pudo probar el inicio del juego ' : 'No se pudo abrir el juego '
    motivos.add(paso + modo + '. ' +
      (error.name === 'TimeoutError' ? 'Tiempo de espera de ' + Math.round(limiteMs / 1000) + ' s agotado.' : error.message) +
      ' (reglas.md, regla 14.6).')
  } finally {
    await pagina.close()
  }
  return [...motivos]
}

// La pantalla reducida a 320 × 180 como píxeles RGBA, para revisarla por código (pantalla.js).
export async function capturar(pagina) {
  const png = (await pagina.screenshot({ type: 'png' })).toString('base64')
  const base64 = await pagina.evaluate(async (datos) => {
    const imagen = new Image()
    imagen.src = 'data:image/png;base64,' + datos
    await imagen.decode()
    const lienzo = document.createElement('canvas')
    lienzo.width = 320
    lienzo.height = 180
    const contexto = lienzo.getContext('2d', { willReadFrequently: true })
    contexto.drawImage(imagen, 0, 0, 320, 180)
    const bytes = contexto.getImageData(0, 0, 320, 180).data
    let texto = ''
    for (let i = 0; i < bytes.length; i += 8192) texto += String.fromCharCode(...bytes.subarray(i, i + 8192))
    return btoa(texto)
  }, png)
  return { ancho: 320, alto: 180, datos: Buffer.from(base64, 'base64') }
}

// Con los efectos encendidos se toman tres capturas: al empezar, un momento
// después sin tocar nada y tras mover el joystick. Los errores de consola se
// conservan en revisarApertura aunque falle una captura.
async function revisarPantalla(pagina) {
  try {
    const inicio = await capturar(pagina)
    await pagina.waitForTimeout(1500)
    const reposo = await capturar(pagina)
    await pagina.keyboard.down('ArrowRight')
    await pagina.keyboard.down('ArrowUp')
    await pagina.waitForTimeout(900)
    await pagina.keyboard.up('ArrowRight')
    await pagina.keyboard.up('ArrowUp')
    await pagina.waitForTimeout(150)
    const conFlechas = await capturar(pagina)
    return motivosDePantalla({ inicio, reposo, conFlechas })
  } catch {
    return []
  }
}

// Todo junto. Devuelve { motivos, avisos, paquete }: el paquete es el guion de ejemplo con el
// id del trabajo, listo para entregarlo a Spring.
export async function comprobarJuego({ carpeta, trabajo, juegoUrl }) {
  const carpetaJuego = path.join(carpeta, 'juego')
  const { motivos, avisos } = await revisarCodigo(carpetaJuego)
  motivos.push(...await revisarPiezas(carpeta))
  let paquete = null
  try {
    paquete = JSON.parse(await readFile(path.join(carpetaJuego, 'guion-ejemplo.json'), 'utf8'))
    paquete.trabajo = trabajo
    // La historia de apertura la cuenta el reproductor (reglas.md, 13.1): sin ella el juego
    // empezaría sin explicar por qué se juega.
    if (partirHistoria(paquete.historia).length === 0) {
      motivos.push('Falta la historia del guion (campo «historia» de guion-ejemplo.json): de 1 a 3 frases cortas que expliquen por qué se juega (reglas.md, 13.1).')
    }
  } catch (error) {
    if (existsSync(path.join(carpetaJuego, 'guion-ejemplo.json'))) motivos.push('guion-ejemplo.json no es un JSON válido: ' + error.message)
  }
  // Sin los archivos básicos no tiene sentido abrirlo: se corrige primero eso.
  if (motivos.length) return { motivos, avisos, paquete }
  motivos.push(...await correrPruebas(carpetaJuego))
  motivos.push(...await abrirEnNavegador(trabajo, { juegoUrl }))
  return { motivos, avisos, paquete }
}
