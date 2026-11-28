// El cuy que el niño armó en la app (su pelaje y sus prendas), para jugar con él. Sin Phaser, para probarlo con node --test.
//
// La app lo manda en la dirección del juego, con los mismos nombres que usa su vestidor (AparienciaCuy.kt):
//
//   ?cuy=crema.GORRA_CELESTE.LENTES_CUADRADOS.POLERON_MENTA
//
// El juego arma la hoja del protagonista con capas (dibujos/protagonista.js): el cuy del niño en café
// (dibujos/personajes/cuy-nino.png), encima cada prenda (dibujos/personajes/prendas-cuy/<prenda>.png, con su
// <prenda>-quita.png, lo que la prenda tapa del cuy) y al final el color del pelaje. Una prenda que todavía no está
// dibujada para el juego se omite con un aviso en la consola: el niño juega igual, con lo demás puesto.

// Tono, saturación y brillo del pelaje en el vestidor de la app (medidos en sus dibujos). El café es el del dibujo.
export const PELAJES = Object.freeze({
  cafe: null,
  crema: Object.freeze({ tono: 0.089, saturacion: 0.43, brillo: 0.97 }),
  caramelo: Object.freeze({ tono: 0.075, saturacion: 0.71, brillo: 0.94 }),
})

// Las prendas dibujadas para el juego y en qué orden se ponen: primero la ropa, después los lentes y al final lo
// de la cabeza (la gorra va encima de todo).
export const PRENDAS_CUY = Object.freeze({
  POLERON_MENTA: Object.freeze({ archivo: 'poleron_menta', capa: 1 }),
  LENTES_CUADRADOS: Object.freeze({ archivo: 'lentes_cuadrados', capa: 2 }),
  GORRA_CELESTE: Object.freeze({ archivo: 'gorra_celeste', capa: 3 }),
})

export const CARPETA_PRENDAS = 'dibujos/personajes/prendas-cuy/'

// Lee el pedido de la dirección. Devuelve { apariencia, avisos }; apariencia es null si no hay pedido.
export function leerApariencia(texto) {
  if (typeof texto !== 'string' || texto.trim() === '') return { apariencia: null, avisos: [] }
  const [pelajePedido, ...piezas] = texto.trim().split('.')
  const avisos = []
  let pelaje = pelajePedido.toLowerCase()
  if (!Object.hasOwn(PELAJES, pelaje)) {
    avisos.push('El pelaje «' + pelajePedido + '» todavía no está para el juego: se usa el café.')
    pelaje = 'cafe'
  }
  const prendas = []
  for (const pieza of piezas) {
    if (!pieza) continue
    if (!Object.hasOwn(PRENDAS_CUY, pieza)) avisos.push('La prenda «' + pieza + '» todavía no está dibujada para el juego.')
    else if (!prendas.includes(pieza)) prendas.push(pieza)
  }
  prendas.sort((a, b) => PRENDAS_CUY[a].capa - PRENDAS_CUY[b].capa)
  return { apariencia: { pelaje, prendas }, avisos }
}

// El pelaje del dibujo, medido en la hoja café del cuy del niño.
const CAFE = Object.freeze({ tono: 0.061, saturacion: 0.63, brillo: 0.73 })
const rampa = (x, desde, hasta) => Math.min(1, Math.max(0, (x - desde) / (hasta - desde)))

// Cambia el pelaje café por otro, píxel por píxel (datos RGBA de un canvas), y conserva las sombras, el contorno,
// lo crema, lo rosado y las prendas: solo cambia lo que tiene el tono café del pelaje.
export function teñirPelaje(datos, pelaje) {
  const destino = PELAJES[pelaje]
  if (!destino) return datos
  for (let i = 0; i < datos.length; i += 4) {
    if (datos[i + 3] === 0) continue
    const r = datos[i] / 255
    const g = datos[i + 1] / 255
    const b = datos[i + 2] / 255
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    const delta = max - min
    if (delta < 1e-9) continue
    let tono = max === r ? ((g - b) / delta) % 6 : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4
    tono = ((tono / 6) % 1 + 1) % 1
    const saturacion = delta / max
    const peso = rampa(tono, 0.025, 0.045) * (1 - rampa(tono, 0.11, 0.13)) * rampa(saturacion, 0.28, 0.4) * rampa(max, 0.28, 0.42)
    if (peso === 0) continue
    const nuevo = hsvARgb(destino.tono + (tono - CAFE.tono) * 0.5,
      Math.min(1, saturacion * destino.saturacion / CAFE.saturacion), Math.min(1, max * destino.brillo / CAFE.brillo))
    datos[i] = Math.round((r * (1 - peso) + nuevo[0] * peso) * 255)
    datos[i + 1] = Math.round((g * (1 - peso) + nuevo[1] * peso) * 255)
    datos[i + 2] = Math.round((b * (1 - peso) + nuevo[2] * peso) * 255)
  }
  return datos
}

function hsvARgb(tono, saturacion, brillo) {
  const h = ((tono % 1) + 1) % 1 * 6
  const sector = Math.floor(h) % 6
  const f = h - Math.floor(h)
  const p = brillo * (1 - saturacion)
  const q = brillo * (1 - f * saturacion)
  const t = brillo * (1 - (1 - f) * saturacion)
  return [[brillo, t, p], [q, brillo, p], [p, brillo, t], [p, q, brillo], [t, p, brillo], [brillo, p, q]][sector]
}
