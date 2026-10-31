// Suelo y tejados comparten la cámara cenital del laberinto.
// VidaChacra añade la vegetación animada con sus hojas de sprites.
export function crearAmbienteLaberinto(e) {
  e.fondoPueblito = e.add.image(0, 0, 'fondo-cenital').setOrigin(0).setDepth(-30)
}
export function ajustarAmbienteLaberinto(e) {
  const c = e.cameras.main, w = e.scale.width / c.zoom, h = e.scale.height / c.zoom
  e.fondoPueblito.setPosition(c.scrollX + e.scale.width / 2 - w / 2, c.scrollY + e.scale.height / 2 - h / 2).setDisplaySize(w,h)
}

export function cachearAdobes(escena) {
  const capas = []
  const guardar = (dibujos, profundidad) => {
    if (!dibujos.length) return
    const cajas = dibujos.map((dibujo) => dibujo.getBounds())
    const x = Math.floor(Math.min(...cajas.map((caja) => caja.x))) - 2
    const y = Math.floor(Math.min(...cajas.map((caja) => caja.y))) - 2
    const ancho = Math.ceil(Math.max(...cajas.map((caja) => caja.right)) - x) + 2
    const alto = Math.ceil(Math.max(...cajas.map((caja) => caja.bottom)) - y) + 2
    const capa = escena.add.renderTexture(x, y, ancho, alto).setOrigin(0).setDepth(profundidad)
    capa.camera.setScroll(x, y)
    capas.push({ capa, dibujos })
    dibujos.forEach((dibujo) => dibujo.setVisible(false))
  }
  guardar(escena.sombrasMuros, 1.5)
  for (let fila = 0; fila < escena.reto.mapa.length; fila += 1) {
    const dibujos = escena.muros.filter((muro) => muro.fila === fila)
      .flatMap((muro) => [muro.dibujo, muro.matas].filter(Boolean))
    guardar(dibujos, dibujos[0]?.depth ?? 2)
  }
  const repintar = () => capas.forEach(({ capa, dibujos }) => capa.clear().draw(dibujos).render())
  repintar()
  // Un contexto gráfico recuperado debe reconstruir también las filas guardadas.
  escena.game.renderer.on('restorewebgl', repintar)
  escena.events.once('shutdown', () => escena.game.renderer.off('restorewebgl', repintar))
}
