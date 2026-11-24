const ANCHOS_DE_BANDA = [80, 100, 130]
// Los formantes altos reciben más ganancia relativa porque la sierra trae
// armónicos más débiles cuanto más lejos están de la nota fundamental.
const GANANCIAS = [0.75, 1, 0.85]

function formantesDe(...frecuencias) {
  return Object.freeze(frecuencias.map((frecuencia, indice) => Object.freeze({
    frecuencia, ancho: ANCHOS_DE_BANDA[indice], ganancia: GANANCIAS[indice],
  })))
}

export const FORMANTES = Object.freeze({
  a: formantesDe(750, 1250, 2550),
  e: formantesDe(480, 1950, 2600),
  i: formantesDe(290, 2300, 3000),
  o: formantesDe(500, 880, 2450),
  u: formantesDe(320, 780, 2350),
})

function perfil(frecuencia, escala) {
  return Object.freeze({ frecuencia, escala, vibrato: Object.freeze({ frecuencia: 5.5, profundidad: 0.015 }) })
}

export const VOCES = Object.freeze({
  grave: perfil(196, 1),
  media: perfil(330, 1.1),
  aguda: perfil(523, 1.25),
})

const SEMITONOS = { do: 0, re: 2, mi: 4, fa: 5, sol: 7, la: 9, si: 11 }

export function frecuenciaDeNota(nota) {
  if (typeof nota !== 'string') return null
  const partes = /^(do|re|mi|fa|sol|la|si)([#b]?)([0-8])$/.exec(nota.trim().toLowerCase())
  if (!partes) return null
  const [, nombre, alteracion, octava] = partes
  const ajuste = alteracion === '#' ? 1 : alteracion === 'b' ? -1 : 0
  const semitono = 12 * (Number(octava) - 4) + SEMITONOS[nombre] + ajuste - SEMITONOS.la
  return 440 * 2 ** (semitono / 12)
}

export function planDeCanto(vocal, { voz = 'media', nota, duracion = 0.7 } = {}) {
  if (typeof vocal !== 'string') return null
  const letra = vocal.trim().toLowerCase()
  if (!Object.hasOwn(FORMANTES, letra) || !Number.isFinite(duracion) || duracion <= 0) return null
  const personaje = Object.hasOwn(VOCES, voz) ? VOCES[voz] : VOCES.media

  return {
    frecuencia: frecuenciaDeNota(nota) ?? personaje.frecuencia,
    // Al cambiar el tamaño de la voz, se desplazan las resonancias sin
    // cambiar su ancho en Hz. Q expresa ese ancho respecto a cada frecuencia.
    filtros: FORMANTES[letra].map(({ frecuencia, ancho, ganancia }) => ({
      frecuencia: frecuencia * personaje.escala,
      q: frecuencia * personaje.escala / ancho,
      ganancia,
    })),
    vibrato: personaje.vibrato,
    envolvente: {
      duracion,
      // En notas cortas el ataque y la caída deben dejar espacio al sostén.
      ataque: Math.min(0.08, duracion / 4),
      caida: Math.min(0.2, duracion / 2),
    },
  }
}
