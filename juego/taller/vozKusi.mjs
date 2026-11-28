// La voz de Kusi grabada con la muestra de referencia del equipo.
//
// El juego no habla en vivo: reproduce archivos. Este módulo convierte cada frase
// en un .m4a con la voz de Kusi y escribe voz/voz.json y voz/revisar.json.
// La diferencia es el motor: en vez de las voces de la Mac (que solo existen en
// esta Mac y sonaban a robot), usa la muestra de referencia y un motor de voz
// clonada. Los archivos resultantes suenan igual en cualquier dispositivo.
//
// Requisitos: el entorno local en taller/voz/.entorno, y la muestra y el
// modelo de voz en taller/voz/referencia/. Nada de eso se sube al repositorio.

import { execFile, spawn } from 'node:child_process'
import { mkdir, readdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs, promisify } from 'node:util'
import { frasesDelJuego, juntarFrases, planearGrabaciones } from './vozGrabada.mjs'

const ejecutar = promisify(execFile)
const AQUI = path.dirname(fileURLToPath(import.meta.url))

// Todo lo local del motor vive aquí y está en .gitignore: la muestra es la voz de
// una persona real y el entorno pesa más de mil megabytes.
export const CARPETA_VOZ = path.join(AQUI, 'voz')
export const REFERENCIA = path.join(CARPETA_VOZ, 'referencia', 'voz-kusi.wav')
export const TEXTO_REFERENCIA = path.join(CARPETA_VOZ, 'referencia', 'voz-kusi.txt')
export const ARCHIVO_MODELO = path.join(CARPETA_VOZ, 'referencia', 'modelo.txt')
export const NOMBRE_VOZ = 'Kusi'

export const PYTHON = path.join(CARPETA_VOZ, '.entorno', 'bin', 'python')
const GUION_DEL_MOTOR = path.join(CARPETA_VOZ, 'decir.py')
const MAX_INTENTOS_DURACION = 3
const MAX_REINTENTOS_FALLO = 3

// El motor escribe su avance («[voz] 12/95 …») en la salida de este proceso: así el trabajador ve que
// sigue vivo y solo lo corta si se queda callado (taller/trabajador/voz.js), sin un tiempo límite.
function ejecutarConAvance(programa, argumentos) {
  return new Promise((resolver, rechazar) => {
    const proceso = spawn(programa, argumentos, { stdio: ['ignore', 'inherit', 'inherit'] })
    proceso.on('error', rechazar)
    proceso.on('close', (codigo) => codigo === 0 ? resolver()
      : rechazar(new Error('El motor de voz terminó con código ' + codigo + '.')))
  })
}

// Un proceso por tanda: cargar el modelo de voz tarda más que decir una frase.
// El JSON de salida distingue un fallo de una frase de un fallo de todo el proceso.
export async function decirConPython({ trabajos, referencia = REFERENCIA, textoReferencia = TEXTO_REFERENCIA,
  archivoModelo = ARCHIVO_MODELO, carpeta = path.dirname(trabajos[0]?.salida ?? '.'), ejecutarPython = ejecutarConAvance }) {
  const modelo = (await readFile(archivoModelo, 'utf8').catch((error) => {
    if (error.code === 'ENOENT') return ''
    throw error
  })).trim()
  if (!modelo) throw new Error('Falta el modelo de voz. Indícalo en ' + archivoModelo)

  const lista = path.join(carpeta, 'frases.json')
  const informe = path.join(carpeta, 'fallos.json')
  await writeFile(lista, JSON.stringify(trabajos, null, 2) + '\n')
  await rm(informe, { force: true })
  await ejecutarPython(PYTHON, [
    GUION_DEL_MOTOR,
    '--lista', lista,
    '--informe', informe,
    '--referencia', referencia,
    '--referencia-texto', textoReferencia,
    '--modelo', modelo,
  ])
  return JSON.parse(await readFile(informe, 'utf8'))
}

const convertirEnMac = (argumentos) => ejecutar('afconvert', argumentos)
const inspeccionarEnMac = (argumentos) => ejecutar('afinfo', argumentos)

// Seis letras le dan al motor una señal más estable para sostener una vocal.
// Conservamos la mayúscula inicial de casos como «Iiiiiii.».
export function textoParaElMotor(frase) {
  return frase.replace(/([aeiouáéíóúü])\1{2,}/giu, (vocales) => vocales.slice(0, 6).padEnd(6, vocales.at(-1)))
}

async function medirDuracion(audio, afinfo) {
  const { stdout } = await afinfo([audio])
  const coincidencia = stdout.match(/^\s*estimated duration:\s*(\d+(?:\.\d+)?)\s+sec\b/im)
  if (!coincidencia) throw new Error('No se pudo leer la duración de ' + path.basename(audio))
  return Number(coincidencia[1])
}

function revisionDeAudio(archivo, texto, duracion, intentos) {
  // Los espacios y los signos no cuentan como letras. Los límites se calculan en
  // milisegundos antes de pasarlos a segundos para incluir los dos extremos.
  const letras = (texto.match(/\p{L}/gu) ?? []).length
  const minimo = (45 * letras + 300) / 1000
  const maximo = (110 * letras + 300) / 1000
  return { archivo, duracion, intentos, revisar: duracion < minimo || duracion > maximo }
}

async function existe(archivo) {
  try {
    const datos = await stat(archivo)
    return datos.size > 0
  } catch {
    return false
  }
}

// Prepara y revisa las grabaciones en una carpeta de bloqueo. Si la tanda entera
// falla o se interrumpe, los archivos de la voz anterior siguen disponibles.
export async function grabarFrases({ frases, carpetaVoz, nombre = NOMBRE_VOZ,
  motor = decirConPython, convertir = convertirEnMac, afinfo = inspeccionarEnMac, senal }) {
  senal?.throwIfAborted()
  const frasesLimpias = [...new Set(frases.filter((frase) => typeof frase === 'string' && frase.trim()))]
  if (!frasesLimpias.length) return { voz: nombre, grabadas: 0, ya_estaban: 0, total: 0, para_revisar: 0, fallidas: 0 }

  await mkdir(carpetaVoz, { recursive: true })
  const bloqueo = path.join(carpetaVoz, '.generando')
  try {
    await mkdir(bloqueo)
  } catch (error) {
    if (error.code !== 'EEXIST') throw error
    throw new Error('Ya se está grabando la voz de esta carpeta: ' + carpetaVoz)
  }

  try {
    const rutaIndice = path.join(carpetaVoz, 'voz.json')
    const rutaRevision = path.join(carpetaVoz, 'revisar.json')
    const anterior = await leerJsonOpcional(rutaIndice)
    const revisionAnterior = await leerJsonOpcional(rutaRevision)
    const entradas = await readdir(carpetaVoz, { withFileTypes: true })
    const presentes = new Set()
    for (const entrada of entradas) {
      if (!entrada.isFile() || !entrada.name.endsWith('.m4a')) continue
      if (await existe(path.join(carpetaVoz, entrada.name))) presentes.add(entrada.name)
    }

    const { indice, faltan } = planearGrabaciones(frasesLimpias, nombre, anterior, presentes)
    const faltantes = new Set(faltan.map(([frase]) => frase))
    const revisiones = new Map()
    const porGrabar = []
    for (const [frase, archivo] of Object.entries(indice.frases)) {
      senal?.throwIfAborted()
      const texto = textoParaElMotor(frase)
      let intentos = 0
      if (!faltantes.has(frase)) {
        const guardada = revisionAnterior?.voz === nombre ? revisionAnterior.frases?.[frase] : null
        if (guardada?.archivo === archivo) {
          revisiones.set(frase, guardada)
          continue
        }
        // Un audio anterior sin revisión sirve como primer intento si su texto
        // sigue siendo el mismo. Las vocales corregidas requieren un audio nuevo.
        if (texto === frase) {
          intentos = 1
          const duracion = await medirDuracion(path.join(carpetaVoz, archivo), afinfo)
          const revision = revisionDeAudio(archivo, texto, duracion, intentos)
          if (!revision.revisar) {
            revisiones.set(frase, revision)
            continue
          }
        }
      }
      porGrabar.push({ frase, archivo, texto, intentos, salida: path.join(bloqueo, archivo.replace(/\.m4a$/, '.wav')) })
    }

    // Juntamos las frases en tandas porque el motor se carga una vez por tanda.
    // En la siguiente solo entran las que todavía necesitan otro intento.
    let pendientes = porGrabar
    while (pendientes.length) {
      senal?.throwIfAborted()
      const trabajos = pendientes.map(({ texto, salida }) => ({ texto, salida }))
      const informeMotor = await motor({ trabajos, carpeta: bloqueo })
      const fallos = new Map((informeMotor?.fallos ?? []).map(({ salida, motivo }) => [salida, motivo]))
      const reintentos = []
      for (const trabajo of pendientes) {
        senal?.throwIfAborted()
        const { frase, archivo, texto, salida } = trabajo
        const audio = path.join(bloqueo, archivo)
        trabajo.intentos += 1
        if (fallos.has(salida) || !(await existe(salida))) {
          await rm(salida, { force: true })
          if (trabajo.intentos <= MAX_REINTENTOS_FALLO) {
            reintentos.push(trabajo)
          } else {
            // El juego consulta el índice por frase: sin entrada recurrirá a
            // la voz del navegador, y el informe conserva el motivo del fallo.
            revisiones.set(frase, { fallo: true, intentos: trabajo.intentos, motivo: fallos.get(salida) ?? 'El motor no dejó audio.' })
            delete indice.frases[frase]
          }
          continue
        }
        await convertir([salida, '-f', 'm4af', '-d', 'aac', audio])
        await rm(salida, { force: true })
        const duracion = await medirDuracion(audio, afinfo)
        const revision = revisionDeAudio(archivo, texto, duracion, trabajo.intentos)
        if (revision.revisar && trabajo.intentos < MAX_INTENTOS_DURACION) {
          await rm(audio)
          reintentos.push(trabajo)
        } else {
          revisiones.set(frase, revision)
        }
      }
      pendientes = reintentos
    }

    const nuevoIndice = path.join(bloqueo, 'voz.json')
    const nuevaRevision = path.join(bloqueo, 'revisar.json')
    const informe = { voz: nombre, frases: Object.fromEntries(frasesLimpias.map((frase) => [frase, revisiones.get(frase)])) }
    await writeFile(nuevoIndice, JSON.stringify(indice, null, 2) + '\n')
    await writeFile(nuevaRevision, JSON.stringify(informe, null, 2) + '\n')
    senal?.throwIfAborted()
    const grabadas = porGrabar.filter(({ frase }) => Object.hasOwn(indice.frases, frase))
    for (const { archivo } of grabadas) await rename(path.join(bloqueo, archivo), path.join(carpetaVoz, archivo))
    senal?.throwIfAborted()
    await rename(nuevaRevision, rutaRevision)
    senal?.throwIfAborted()
    await rename(nuevoIndice, rutaIndice)
    return {
      voz: nombre,
      grabadas: grabadas.length,
      ya_estaban: frasesLimpias.length - porGrabar.length,
      total: frasesLimpias.length,
      para_revisar: [...revisiones.values()].filter(({ revisar }) => revisar).length,
      fallidas: porGrabar.length - grabadas.length,
    }
  } finally {
    await rm(bloqueo, { recursive: true, force: true })
  }
}

async function leerJsonOpcional(ruta) {
  try {
    return JSON.parse(await readFile(ruta, 'utf8'))
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
    return null
  }
}

// La voz de un trabajo del taller: sus frases salen del guion de ejemplo y, si el
// juego arma frases propias, de su juego/frases.js.
export async function grabarVozKusi({ carpeta, ...opciones } = {}) {
  const carpetaJuego = path.resolve(carpeta, 'juego')
  const guion = JSON.parse(await readFile(path.join(carpetaJuego, 'guion-ejemplo.json'), 'utf8'))
  const frases = juntarFrases(guion, await frasesDelJuego(carpetaJuego))
  return grabarFrases({ ...opciones, frases, carpetaVoz: path.resolve(carpeta, 'voz') })
}

// La voz del laberinto de ejemplo: su guion está en el kit y su carpeta de voz se
// sirve junto con los dibujos (kit/recursos/voz-laberinto/).
export async function grabarVozDelLaberinto({ recursos = path.join(AQUI, '..', 'kit', 'recursos'), senal } = {}) {
  const guion = JSON.parse(await readFile(path.join(recursos, 'paquete-laberinto-ejemplo.json'), 'utf8'))
  const frases = juntarFrases(guion, [])
  return grabarFrases({ frases, carpetaVoz: path.join(recursos, 'voz-laberinto'), senal })
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const controlador = new AbortController()
  // El trabajador corta el grupo entero al vencer el plazo. Damos al grabador
  // ocasión de limpiar su bloqueo cuando se detiene el motor o el conversor.
  process.once('SIGTERM', () => controlador.abort(new Error('Se interrumpió la grabación.')))
  try {
    const { values } = parseArgs({ options: {
      carpeta: { type: 'string' },
      laberinto: { type: 'boolean' },
    } })
    if (!values.carpeta && !values.laberinto) {
      throw new Error('Uso: node taller/vozKusi.mjs --carpeta <carpeta del trabajo> | --laberinto')
    }
    const resultado = values.laberinto
      ? await grabarVozDelLaberinto({ senal: controlador.signal })
      : await grabarVozKusi({ carpeta: values.carpeta, senal: controlador.signal })
    console.log(JSON.stringify(resultado))
  } catch (error) {
    console.error('No se pudo grabar la voz de Kusi: ' + error.message)
    process.exitCode = 1
  }
}
