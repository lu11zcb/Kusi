// El silenciador usa las dos ilustraciones aprobadas, sin figuras de reemplazo.
export const BOTON_SONIDO = Object.freeze({ x: 1548, y: 35, ancho: 45, alto: 45, radio: 22.5, profundidad: 1003 })
export function crearBotonSonido(escena, { silenciado, alTocar }) {
  const boton = escena.add.image(BOTON_SONIDO.x, BOTON_SONIDO.y, 'boton-sonido')
    .setDisplaySize(45, 45).setDepth(BOTON_SONIDO.profundidad).setInteractive({ useHandCursor: true })
  boton.on('pointerdown', (p, x, y, evento) => { evento.stopPropagation(); alTocar() })
  boton.mostrar = apagado => { boton.setTexture(apagado ? 'boton-silencio' : 'boton-sonido'); boton.silenciado = apagado }
  boton.mostrar(silenciado)
  return boton
}
