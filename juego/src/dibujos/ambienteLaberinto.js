// Solo decoración y luz; el mapa y los controles no dependen de esta capa.
export function crearAmbienteLaberinto(escena) {
  escena.fondoPueblito = escena.add.image(0, 0, 'fondo-pueblito')
    .setScrollFactor(0).setDepth(-10)
  if (!escena.textures.exists('sombra-adobe')) {
    const textura = escena.textures.createCanvas('sombra-adobe', 128, 128)
    const lienzo = textura.getContext()
    lienzo.filter = 'blur(7px)'
    lienzo.fillStyle = 'rgba(72, 39, 24, 0.24)'
    lienzo.beginPath()
    lienzo.roundRect(12, 12, 104, 104, 15)
    lienzo.fill()
    textura.refresh()
  }
  if (!escena.textures.exists('vineta-laberinto')) {
    const textura = escena.textures.createCanvas('vineta-laberinto', 256, 256)
    const lienzo = textura.getContext()
    const gradiente = lienzo.createRadialGradient(128, 128, 75, 128, 128, 180)
    gradiente.addColorStop(0, 'rgba(67, 37, 20, 0)')
    gradiente.addColorStop(1, 'rgba(67, 37, 20, 0.14)')
    lienzo.fillStyle = gradiente
    lienzo.fillRect(0, 0, 256, 256)
    textura.refresh()
  }
  escena.vineta = escena.add.image(0, 0, 'vineta-laberinto')
    .setOrigin(0).setScrollFactor(0).setDepth(900)
}

export function ajustarAmbienteLaberinto(escena) {
  const { width, height } = escena.scale.gameSize
  const fondo = escena.fondoPueblito
  fondo.setPosition(width / 2, height / 2)
    .setScale(Math.max(width / fondo.width, height / fondo.height))
  escena.vineta.setDisplaySize(width, height)
}

export function decorarPradera(escena, caja) {
  const dibujo = escena.add.graphics().setDepth(0)
  const lugares = [
    [caja.x - 23, caja.y + caja.alto * 0.18, 'flor'],
    [caja.x - 21, caja.y + caja.alto * 0.51, 'piedra'],
    [caja.x + caja.ancho + 21, caja.y + caja.alto * 0.33, 'piedra'],
    [caja.x + caja.ancho + 22, caja.y + caja.alto * 0.72, 'flor'],
  ].filter(([x]) => x > 12 && x < 1268)
  for (const [x, y, tipo] of lugares) {
    if (tipo === 'piedra') {
      dibujo.fillStyle(0x746453, 0.12).fillEllipse(x + 2, y + 4, 17, 8)
      dibujo.fillStyle(0xb9ac92).fillEllipse(x, y, 16, 11)
      dibujo.fillStyle(0xd3c5a9).fillEllipse(x - 2, y - 2, 10, 5)
    } else {
      dibujo.lineStyle(3, 0x669947).lineBetween(x, y, x, y + 10)
      dibujo.fillStyle(0xf4d567)
      for (let petalo = 0; petalo < 5; petalo += 1) {
        const angulo = petalo * Math.PI * 2 / 5
        dibujo.fillCircle(x + Math.cos(angulo) * 4, y + Math.sin(angulo) * 4, 3)
      }
      dibujo.fillStyle(0xb67935).fillCircle(x, y, 2)
    }
  }
}

// Los adobes no se mueven. Se componen una vez por fila en lugar de enviar
// cientos de imágenes al renderizador en cada cuadro, especialmente en móvil.
// Cada fila conserva su propia profundidad; la puerta sigue siendo independiente.
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
    const dibujos = escena.muros.filter((muro) => muro.fila === fila).map((muro) => muro.dibujo)
    guardar(dibujos, dibujos[0]?.depth ?? 2)
  }
  const repintar = () => capas.forEach(({ capa, dibujos }) => capa.clear().draw(dibujos).render())
  repintar()
  // Un contexto gráfico recuperado debe reconstruir también las filas guardadas.
  escena.game.renderer.on('restorewebgl', repintar)
  escena.events.once('shutdown', () => escena.game.renderer.off('restorewebgl', repintar))
}
