// Piezas de interfaz que se repiten: botones grandes, globos de diálogo y cosas fijas en la pantalla.

import { COLOR, NUMERO, estiloTexto } from '../medidas.js'

// Deja un objeto (y todo lo que tiene dentro) quieto en la pantalla aunque la cámara se mueva.
// Se aplica también a los hijos para que los toques caigan donde se ve el dibujo.
export function fijarEnPantalla(objeto) {
  objeto.setScrollFactor(0)
  if (objeto.list) objeto.list.forEach(fijarEnPantalla)
  return objeto
}

// Botón grande y redondeado, con sombra, que se hunde al tocarlo.
// La acción ocurre al soltar el dedo sobre el botón. En vez de texto puede llevar
// un «icono»: un dibujo de Graphics centrado en (0, 0) que se hunde con el botón.
export function crearBoton(escena, x, y, {
  ancho, alto, texto, tamano = 32, radio = 22,
  relleno = NUMERO.naranja, colorTexto = COLOR.tinta, alTocar, icono = null,
}) {
  const sombra = escena.add.rectangle(0, 6, ancho, alto, NUMERO.terracota).setRounded(radio)
  const fondo = escena.add.rectangle(0, 0, ancho, alto, relleno).setRounded(radio).setStrokeStyle(4, NUMERO.tinta)
  const etiqueta = escena.add.text(0, 0, texto, estiloTexto(tamano, colorTexto)).setOrigin(0.5)
  const piezas = [sombra, fondo, etiqueta]
  if (icono) piezas.push(icono)
  const boton = escena.add.container(x, y, piezas)
  boton.setSize(ancho, alto)
  boton.fondo = fondo
  boton.etiqueta = etiqueta
  boton.icono = icono
  boton.activo = true

  let presionado = false
  const hundir = (hundido) => {
    fondo.y = hundido ? 4 : 0
    etiqueta.y = hundido ? 4 : 0
    if (icono) icono.y = hundido ? 4 : 0
  }
  fondo.setInteractive({ useHandCursor: true })
  fondo.on('pointerdown', () => {
    presionado = true
    hundir(true)
  })
  fondo.on('pointerout', () => {
    presionado = false
    hundir(false)
  })
  fondo.on('pointerup', () => {
    const tocado = presionado
    presionado = false
    hundir(false)
    if (tocado && boton.activo) alTocar?.()
  })
  return boton
}

// Dibuja un globo de diálogo blanco centrado en (0, 0), con la colita hacia abajo o hacia la izquierda.
export function dibujarGlobo(graficos, ancho, alto, { cola = 'abajo', colaX = 0, colaY = 0, relleno = 0xffffff } = {}) {
  const x = -ancho / 2
  const y = -alto / 2
  graficos.clear()
  graficos.fillStyle(relleno, 1)
  graficos.lineStyle(4, NUMERO.tinta, 1)
  graficos.fillRoundedRect(x, y, ancho, alto, 24)
  graficos.strokeRoundedRect(x, y, ancho, alto, 24)

  // La colita se dibuja encima y tapa el pedacito de borde donde se une con el globo.
  let puntos
  if (cola === 'izquierda') {
    puntos = [[x + 2, colaY - 16], [x + 2, colaY + 16], [x - 30, colaY + 34]]
  } else {
    puntos = [[colaX - 16, y + alto - 2], [colaX + 16, y + alto - 2], [colaX - 6, y + alto + 28]]
  }
  const [a, b, punta] = puntos
  graficos.fillTriangle(a[0], a[1], b[0], b[1], punta[0], punta[1])
  graficos.lineBetween(a[0], a[1], punta[0], punta[1])
  graficos.lineBetween(b[0], b[1], punta[0], punta[1])
  return graficos
}
