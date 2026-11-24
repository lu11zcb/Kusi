import { statSync } from 'node:fs'
import path from 'node:path'
import { ARCHIVO_MODELO, PYTHON, REFERENCIA } from '../vozKusi.mjs'
import { CARPETA_JUEGO, CARPETA_TALLER } from './configuracion.js'
import { lanzar } from './roles.js'

const LIMITE_VOZ_MS = 12 * 60 * 1000

export async function grabarVozDelTrabajo({ carpeta, restanteMs, registrar,
  lanzarVoz = lanzar, archivosMotor = [PYTHON, REFERENCIA, ARCHIVO_MODELO] }) {
  const sinGrabacion = { grabadas: 0, para_revisar: 0, fallidas: 0 }
  const limiteMs = Math.min(LIMITE_VOZ_MS, restanteMs)
  if (limiteMs <= 0) {
    return { ...sinGrabacion, estado: 'omitida', motivo: 'Se acabó el tiempo del trabajo.' }
  }

  try {
    if (!archivosMotor.every((archivo) => statSync(archivo, { throwIfNoEntry: false })?.isFile())) {
      return {
        ...sinGrabacion, estado: 'omitida',
        motivo: 'Falta el entorno del motor de voz, la muestra de referencia o el archivo del modelo de voz.',
      }
    }
    registrar('Grabando la voz de Kusi.')
    // El comando llama a grabarVozKusi en un grupo que se puede detener entero:
    // así el motor y los conversores también se cortan al vencer el plazo.
    const ejecucion = await lanzarVoz({
      programa: process.execPath,
      argumentos: [path.join(CARPETA_TALLER, 'vozKusi.mjs'), '--carpeta', path.resolve(carpeta)],
      carpeta: CARPETA_JUEGO,
    }, { limiteMs })
    if (ejecucion.agotado) throw new Error('La grabación superó el tiempo disponible (' + Math.ceil(limiteMs / 1000) + ' s).')
    if (ejecucion.codigo !== 0) {
      throw new Error(ejecucion.errores.trim().slice(-500) || 'El grabador terminó con código ' + ejecucion.codigo + '.')
    }
    // Un módulo de frases puede escribir en consola. El grabador imprime su
    // resumen como última línea cuando termina de publicar los archivos.
    const resumen = JSON.parse(ejecucion.salida.trim().split('\n').at(-1))
    return { ...resumen, estado: 'terminada' }
  } catch (error) {
    return { ...sinGrabacion, estado: 'falló', motivo: String(error.message ?? error) }
  }
}
