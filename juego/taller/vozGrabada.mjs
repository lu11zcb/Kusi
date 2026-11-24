import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { partirHistoria } from '../kit/reproductor/logica/historia.js'
import { normalizarFrase, PATRON_VOZ_NATURAL } from '../kit/reproductor/logica/textoVoz.js'

export function juntarFrases(guion, frasesDelJuego = []) {
  const retos = guion.retos ?? []
  const frases = [
    ...partirHistoria(guion.historia), guion.consigna,
    ...retos.flatMap((reto) => [reto.consigna, ...(reto.ayudas ?? [])]),
    guion.cierre?.mensaje, ...frasesDelJuego,
  ]
  return [...new Set(frases.map(normalizarFrase).filter(Boolean))]
}

// Las frases que el juego arma por su cuenta (contar objetos, dar pistas, responder
// al niño) viven en juego/frases.js. Un juego puede no tener ese archivo.
export async function frasesDelJuego(carpetaJuego) {
  const archivo = path.join(carpetaJuego, 'frases.js')
  let existe = true
  try {
    await readFile(archivo, 'utf8')
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
    existe = false
  }
  if (!existe) return []
  const { frasesDeKusi } = await import(pathToFileURL(archivo).href)
  if (typeof frasesDeKusi !== 'function') throw new Error('juego/frases.js debe exportar frasesDeKusi().')
  const frases = await frasesDeKusi()
  if (!Array.isArray(frases) || frases.some((frase) => typeof frase !== 'string')) {
    throw new Error('frasesDeKusi() debe devolver una lista de textos.')
  }
  return frases
}

export function archivoDeFrase(texto) {
  return createHash('sha1').update(normalizarFrase(texto)).digest('hex').slice(0, 12) + '.m4a'
}

export function planearGrabaciones(frases, voz, indice, archivosPresentes) {
  const entradas = frases.map((frase) => [frase, archivoDeFrase(frase)])
  const faltan = entradas.filter(([frase, archivo]) =>
    indice?.voz !== voz || !Object.hasOwn(indice.frases ?? {}, frase)
    || indice.frases[frase] !== archivo || !archivosPresentes.has(archivo))
  return { indice: { voz, frases: Object.fromEntries(entradas) }, faltan }
}

export function elegirVozDeMac(listado) {
  const voces = listado.split('\n').flatMap((linea) => {
    const coincidencia = linea.match(/^(.+?)\s+es(?:[_-][a-z0-9]+)*\s+#/i)
    return coincidencia ? [coincidencia[1].trim()] : []
  })
  const voz = voces.find((nombre) => PATRON_VOZ_NATURAL.test(nombre))
  if (voz) return voz
  throw new Error('No hay una voz en español Premium, Mejorada o Enhanced instalada. ' +
    'Descárgala en Ajustes del Sistema → Accesibilidad → Contenido leído → Voz del sistema → Gestionar voces… → Español. ' +
    'Voces en español disponibles: ' + (voces.join(', ') || 'ninguna') + '.')
}
