// Graba las frases de un trabajo con una voz instalada de macOS.
// node taller/grabar_voz.mjs --carpeta <carpeta del trabajo> [--voz "<nombre>"]
import { execFile } from 'node:child_process'
import { mkdir, readdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs, promisify } from 'node:util'
import { elegirVozDeMac, frasesDelJuego, juntarFrases, planearGrabaciones } from './vozGrabada.mjs'

const ejecutar = promisify(execFile)
const decirEnMac = (argumentos) => ejecutar('say', argumentos)
const convertirEnMac = (argumentos) => ejecutar('afconvert', argumentos)

async function leerOpcional(archivo) {
  try {
    return await readFile(archivo, 'utf8')
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
    return null
  }
}

export async function grabarVoz({ carpeta, voz }, { say = decirEnMac, afconvert = convertirEnMac } = {}) {
  const carpetaJuego = path.resolve(carpeta, 'juego')
  const guion = JSON.parse(await readFile(path.join(carpetaJuego, 'guion-ejemplo.json'), 'utf8'))
  const frases = juntarFrases(guion, await frasesDelJuego(carpetaJuego))
  if (!voz) voz = elegirVozDeMac((await say(['-v', '?'])).stdout)

  const carpetaVoz = path.resolve(carpeta, 'voz')
  await mkdir(carpetaVoz, { recursive: true })
  const bloqueo = path.join(carpetaVoz, '.grabando')
  try {
    await mkdir(bloqueo)
  } catch (error) {
    if (error.code !== 'EEXIST') throw error
    throw new Error('Ya se está grabando la voz de este trabajo: ' + carpetaVoz)
  }

  try {
    const rutaIndice = path.join(carpetaVoz, 'voz.json')
    const anterior = JSON.parse(await leerOpcional(rutaIndice))
    const entradas = await readdir(carpetaVoz, { withFileTypes: true })
    const presentes = await Promise.all(entradas.filter((entrada) => entrada.isFile() && entrada.name.endsWith('.m4a'))
      .map(async ({ name }) => (await stat(path.join(carpetaVoz, name))).size > 0 ? name : null))
    const { indice, faltan } = planearGrabaciones(frases, voz, anterior, new Set(presentes))

    // Prepara todos los archivos antes de reemplazar los audios publicados. Si falla
    // say o afconvert, el índice anterior y las grabaciones que apunta siguen disponibles.
    for (const [frase, archivo] of faltan) {
      const aiff = path.join(bloqueo, archivo.replace(/\.m4a$/, '.aiff'))
      const audio = path.join(bloqueo, archivo)
      await say(['-v', voz, '-o', aiff, '--', frase])
      await afconvert([aiff, '-f', 'm4af', '-d', 'aac', audio])
      await rm(aiff)
    }
    const nuevoIndice = path.join(bloqueo, 'voz.json')
    await writeFile(nuevoIndice, JSON.stringify(indice, null, 2) + '\n')
    for (const [, archivo] of faltan) await rename(path.join(bloqueo, archivo), path.join(carpetaVoz, archivo))
    await rename(nuevoIndice, rutaIndice)
    return { voz, grabadas: faltan.length, ya_estaban: frases.length - faltan.length, total: frases.length }
  } finally {
    await rm(bloqueo, { recursive: true, force: true })
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const { values } = parseArgs({ options: { carpeta: { type: 'string' }, voz: { type: 'string' } } })
    if (!values.carpeta?.trim() || (values.voz !== undefined && !values.voz.trim())) {
      throw new Error('Uso: node taller/grabar_voz.mjs --carpeta <carpeta del trabajo> [--voz "<nombre>"]')
    }
    console.log(JSON.stringify(await grabarVoz(values)))
  } catch (error) {
    console.error('No se pudo grabar la voz de Kusi: ' + error.message)
    process.exitCode = 1
  }
}
