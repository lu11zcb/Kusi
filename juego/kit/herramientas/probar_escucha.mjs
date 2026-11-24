import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { analizarCuadro, decidir, SEGUNDOS_POR_CUADRO } from '../reproductor/logica/escucharVocal.js'

const VOCALES = [...'aeiou']

function leerWav(ruta) {
  const wav = readFileSync(ruta)
  if (wav.toString('ascii', 0, 4) !== 'RIFF' || wav.toString('ascii', 8, 12) !== 'WAVE') {
    throw new Error('se esperaba un archivo RIFF/WAVE')
  }

  // Los WAV pueden traer bloques de metadatos y un byte de relleno por bloque impar.
  let formato, datos
  for (let inicio = 12; inicio + 8 <= wav.length;) {
    const nombre = wav.toString('ascii', inicio, inicio + 4)
    const longitud = wav.readUInt32LE(inicio + 4)
    const fin = inicio + 8 + longitud
    if (fin > wav.length) throw new Error('bloque WAV incompleto')
    if (nombre === 'fmt ') formato = wav.subarray(inicio + 8, fin)
    if (nombre === 'data') datos = wav.subarray(inicio + 8, fin)
    inicio = fin + longitud % 2
  }
  if (!formato || formato.length < 16 || formato.readUInt16LE(0) !== 1 ||
      formato.readUInt16LE(2) !== 1 || formato.readUInt16LE(14) !== 16) {
    throw new Error('se esperaba audio PCM mono de 16 bits')
  }
  const frecuencia = formato.readUInt32LE(4)
  if (frecuencia < 8000 || !datos?.length || datos.length % 2) throw new Error('datos de audio inválidos')
  const muestras = Float32Array.from({ length: datos.length / 2 }, (_, indice) =>
    datos.readInt16LE(indice * 2) / 32768)
  return { muestras, frecuencia }
}

function probar(carpeta) {
  const archivos = readdirSync(carpeta, { withFileTypes: true })
    .filter(entrada => entrada.isFile() && /\.wav$/i.test(entrada.name))
    .map(entrada => entrada.name).sort()
  if (!archivos.length) throw new Error('la carpeta no contiene archivos WAV')
  const columnas = [...VOCALES, 'sin vocal', 'sin voz']
  const confusion = Object.fromEntries(VOCALES.map(vocal =>
    [vocal, Object.fromEntries(columnas.map(columna => [columna, 0]))]))
  let aciertos = 0, seguros = 0, aciertosSeguros = 0, sinVoz = 0
  for (const archivo of archivos) {
    try {
      const esperada = archivo.match(/-([aeiou])\.wav$/i)?.[1].toLowerCase()
      if (!esperada) throw new Error('el nombre debe terminar en -a.wav, -e.wav, -i.wav, -o.wav o -u.wav')
      const { muestras, frecuencia } = leerWav(join(carpeta, archivo))
      const longitud = Math.round(frecuencia * SEGUNDOS_POR_CUADRO)
      const cuadros = []
      for (let inicio = 0; inicio + longitud <= muestras.length; inicio += longitud) {
        cuadros.push(analizarCuadro(muestras.subarray(inicio, inicio + longitud), frecuencia))
      }
      const { oyo, vocal, seguro } = decidir(cuadros)
      const acerto = vocal === esperada
      confusion[esperada][oyo ? (vocal ?? 'sin vocal') : 'sin voz']++
      aciertos += Number(acerto)
      sinVoz += Number(!oyo)
      if (seguro && vocal) {
        seguros++
        aciertosSeguros += Number(acerto)
      }
      console.log(archivo + '  esperada=' + esperada + '  oyo=' + oyo +
        '  vocal=' + (vocal ?? '—') + '  seguro=' + seguro + '  ' + (acerto ? 'acierto' : 'fallo'))
    } catch (error) {
      throw new Error(archivo + ' · ' + error.message)
    }
  }
  const proporcion = (parte, total) => parte + '/' + total + (total ? ' (' + (100 * parte / total).toFixed(1) + ' %)' : '')
  console.log('\nAciertos ' + proporcion(aciertos, archivos.length))
  console.log('Aciertos cuando seguro=true ' + proporcion(aciertosSeguros, seguros))
  console.log('Archivos sin voz ' + sinVoz + '/' + archivos.length)
  console.log('\nTabla de confusión (filas esperadas, columnas reconocidas)')
  console.table(confusion)
}

try {
  if (process.argv.length !== 3) throw new Error('uso: node kit/herramientas/probar_escucha.mjs <carpeta de WAV>')
  probar(process.argv[2])
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}
