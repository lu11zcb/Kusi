// Solo decoración y luz; el mapa y los controles no dependen de esta capa.

// La sombra de un adobe es un cuadrado redondeado difuminado. Se arma con capas
// de transparencia en vez de la propiedad filter del lienzo, que no existe en
// todos los navegadores de los celulares. Medidas en píxeles de la textura.
const SOMBRA_ADOBE = Object.freeze({
  lado: 128, margen: 12, radio: 15, desenfoque: 9, capas: 19,
  color: '72, 39, 24', opacidad: 0.24,
})

function trazarRectanguloRedondeado(lienzo, x, y, ancho, alto, radio) {
  const esquina = Math.max(0, Math.min(radio, ancho / 2, alto / 2))
  lienzo.beginPath()
  lienzo.moveTo(x + esquina, y)
  lienzo.arcTo(x + ancho, y, x + ancho, y + alto, esquina)
  lienzo.arcTo(x + ancho, y + alto, x, y + alto, esquina)
  lienzo.arcTo(x, y + alto, x, y, esquina)
  lienzo.arcTo(x, y, x + ancho, y, esquina)
  lienzo.closePath()
}

function dibujarSombraAdobe(lienzo) {
  const { lado, margen, radio, desenfoque, capas, color, opacidad } = SOMBRA_ADOBE
  // Cada capa es el cuadrado «inflado» entre -desenfoque y +desenfoque píxeles. Un
  // punto del borde queda cubierto por las capas más grandes que él; si el peso
  // de cada capa sigue una campana, la transparencia sube suave como un
  // desenfoque gaussiano y en el centro llega a «opacidad».
  const sigma = desenfoque / 2
  const inflados = Array.from({ length: capas }, (_, indice) => -desenfoque + (indice * 2 * desenfoque) / (capas - 1))
  const pesos = inflados.map((inflado) => Math.exp(-(inflado * inflado) / (2 * sigma * sigma)))
  const total = pesos.reduce((suma, peso) => suma + peso, 0)
  const absorcion = -Math.log(1 - opacidad)
  inflados.forEach((inflado, indice) => {
    // Las transparencias se multiplican: así el centro suma justo «opacidad».
    lienzo.fillStyle = 'rgba(' + color + ', ' + (1 - Math.exp(-absorcion * pesos[indice] / total)) + ')'
    trazarRectanguloRedondeado(lienzo, margen - inflado, margen - inflado,
      lado - 2 * margen + 2 * inflado, lado - 2 * margen + 2 * inflado, radio + inflado)
    lienzo.fill()
  })
}

export function crearAmbienteLaberinto(escena) {
  escena.fondoPueblito = escena.add.image(0, 0, 'fondo-pueblito')
    .setScrollFactor(0).setDepth(-10)
  if (!escena.textures.exists('sombra-adobe')) {
    const textura = escena.textures.createCanvas('sombra-adobe', SOMBRA_ADOBE.lado, SOMBRA_ADOBE.lado)
    dibujarSombraAdobe(textura.getContext())
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
  // Centrada: así sigue cubriendo la pantalla aunque la cámara se aleje.
  escena.vineta = escena.add.image(0, 0, 'vineta-laberinto')
    .setScrollFactor(0).setDepth(900)
}

// El fondo y la viñeta van fijos a la pantalla y la cubren entera. Si la cámara
// se aleja para que quepa el mundo, se agrandan lo mismo para seguir cubriéndola.
export function ajustarAmbienteLaberinto(escena) {
  const { width, height } = escena.scale.gameSize
  const zoom = escena.cameras.main.zoom
  const ancho = width / zoom
  const alto = height / zoom
  const fondo = escena.fondoPueblito
  fondo.setPosition(width / 2, height / 2)
    .setScale(Math.max(ancho / fondo.width, alto / fondo.height))
  escena.vineta.setPosition(width / 2, height / 2).setDisplaySize(ancho, alto)
}

// Flores y piedritas en el pasto, solo en los lugares que la disposición señala:
// ninguno cae sobre el camino. Cada lugar es { x, y, tipo: 'flor' | 'piedra' }.
export function decorarPradera(escena, lugares) {
  const dibujo = escena.add.graphics().setDepth(0)
  for (const { x, y, tipo } of lugares) {
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
