import { createHash } from 'node:crypto'
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
