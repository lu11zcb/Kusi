// Suelo y borde son ilustraciones independientes; la tierra cubre todo el mapa.
export function crearPatio(escena) {
  const { x, y, ancho, alto } = escena.cajaMapa
  escena.bordePatio = escena.add.image(x - 20, y - 12, 'borde-pasto').setOrigin(0)
    .setDisplaySize(ancho + 40, alto + 24).setDepth(.5)
  return escena.add.image(x, y, 'tierra-patio').setOrigin(0).setDisplaySize(ancho, alto).setDepth(1)
}
