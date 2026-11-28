// La música de los juegos, sin Phaser (se prueba con node --test).
//
// Cada ánimo es una lista de pistas de kit/recursos/musica/ (ORIGEN.md dice de dónde sale cada una y su
// licencia). El juego elige el ánimo del fondo y el de la fiesta; la fiesta suena un momento al ganar.
//
//   andina         arpa cusqueña, tranquila: suena de fondo mientras se juega
//   fiesta_andina  sikus y bombo de Puno: solo para celebrar, porque es rápida y tiene mucho bombo

export const MUSICA = Object.freeze({
  andina: Object.freeze([
    'arpa-pispita-canastachapi', 'arpa-pirhuayani', 'arpa-chullalla-sarachamanta', 'arpa-la-nueva-alianza', 'arpa-peras-peras',
  ]),
  fiesta_andina: Object.freeze(['sikus-mula-lunthata', 'sikus-29-de-setiembre']),
})

// Volúmenes de Phaser (0 a 1) sobre pistas igualadas a -18 LUFS. La música acompaña: Kusi siempre se oye
// por encima (reglas 14.1, «un sonido a la vez»), así que mientras habla baja a menos de la mitad.
export const VOLUMEN = Object.freeze({ fondo: 0.28, fiesta: 0.4, bajoLaVoz: 0.1 })

export function rutaPista(nombre) {
  return 'musica/' + nombre + '.m4a'
}

// La pista que sigue: al azar, pero nunca la misma que acaba de sonar (si hay más de una).
export function siguientePista(lista, anterior = null, azar = Math.random) {
  if (!Array.isArray(lista) || lista.length === 0) throw new Error('La lista de música está vacía.')
  const opciones = lista.length > 1 ? lista.filter((pista) => pista !== anterior) : lista
  return opciones[Math.min(opciones.length - 1, Math.floor(azar() * opciones.length))]
}

// El volumen al que debe ir una pista ahora mismo.
export function volumenDeMusica({ base, hablando = false, silenciado = false }) {
  if (silenciado) return 0
  return hablando ? Math.min(base, VOLUMEN.bajoLaVoz) : base
}

// Un paso del fundido: acerca el volumen al objetivo sin pasarse. «duracionMs» es lo que tarda en ir de 0 a 1.
export function acercarVolumen(actual, objetivo, deltaMs, duracionMs) {
  const paso = Math.max(0, deltaMs) / duracionMs
  if (Math.abs(objetivo - actual) <= paso) return objetivo
  return actual + Math.sign(objetivo - actual) * paso
}
