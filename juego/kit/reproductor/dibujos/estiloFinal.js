// Contrato del arte aprobado. Las poses se ilustran: el motor solo cambia el cuadro.
// Los recursos anteriores permanecen en el proyecto. La escena nueva carga
// el paisaje cenital y sus cuatro tiras de poses ilustradas.
export const SPRITES_CENITALES = Object.freeze(Object.fromEntries(
  ['pasto', 'arbusto', 'margaritas', 'flores'].map((nombre, i) => ['cenital-' + nombre, {
    ancho: 320, alto: 320, cuadros: 4, periodo: i === 1 ? .48 : .3 + i * .04,
    secuencia: [0, 1, 2, 3, 2, 1],
  }]),
))
export function pedirEstiloFinal(escena) {
  // El fondo y las plantas son del mundo; Kusi es un personaje; la mano y los destellos, interfaz.
  escena.load.image('fondo-cenital', 'dibujos/mundo/fondo-patio.png')
  for (const [clave, sprite] of Object.entries(SPRITES_CENITALES)) escena.load.spritesheet(clave,
    'dibujos/mundo/' + clave.replace('cenital-', '') + '.png', {
    frameWidth: sprite.ancho, frameHeight: sprite.alto,
  })
  escena.load.spritesheet('kusi-animado', 'dibujos/personajes/kusi.png', { frameWidth: 256, frameHeight: 256 })
  escena.load.spritesheet('mano-tutorial', 'dibujos/interfaz/mano-tutorial.png', { frameWidth: 128, frameHeight: 160 })
  escena.load.spritesheet('destellos-siguiente', 'dibujos/interfaz/destellos-siguiente.png', { frameWidth: 256, frameHeight: 256 })
}
export function cuadroIlustrado(tiempo, datos, desfase = 0) {
  const secuencia = datos.secuencia ?? Array.from({ length: datos.cuadros }, (_, i) => i)
  return secuencia[Math.floor(Math.max(0, tiempo + desfase) / datos.periodo) % secuencia.length]
}
