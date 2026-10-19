// Cartel fijo arriba de la pantalla: la lista de Kusi, la plata y los choclitos.

import { ANCHO, NUMERO, PROFUNDIDAD, estiloTexto } from '../medidas.js'
import { ajustarATamano } from '../dibujos/dibujos.js'
import { fijarEnPantalla } from './piezas.js'

const Y = 50
const ALTO = 76
// Borde de abajo del cartel: en la pantalla, lo que queda más arriba está tapado por él.
export const BORDE_CARTEL = Y + ALTO / 2
const MARGEN = 16
const ESPACIO = 12
const RELLENO = 18

export class Cartel {
  constructor(escena) {
    this.escena = escena
    this.lista = this.crearPildora('kusi-frente', 56, 62)
    this.plata = this.crearPildora('cartera', 50, 50)
    this.choclitos = this.crearPildora('choclito', 46, 46)
  }

  // Una "píldora": fondo redondeado, un dibujito a la izquierda y un texto.
  crearPildora(claveIcono, anchoIcono, altoIcono) {
    const fondo = this.escena.add.rectangle(0, 0, 100, ALTO, 0xfff1d6).setRounded(24).setStrokeStyle(4, NUMERO.tinta)
    const icono = ajustarATamano(this.escena.add.image(0, 0, claveIcono), anchoIcono, altoIcono)
    const texto = this.escena.add.text(0, 0, '', estiloTexto(28)).setOrigin(0, 0.5)
    const pildora = this.escena.add.container(0, Y, [fondo, icono, texto])
    pildora.fondo = fondo
    pildora.icono = icono
    pildora.texto = texto
    pildora.anchoIcono = anchoIcono
    fijarEnPantalla(pildora).setDepth(PROFUNDIDAD.cartel)
    return pildora
  }

  // Cambia el texto de una píldora y la acomoda con su borde derecho en `derecha`.
  // Si el texto cambió, la píldora da un saltito para que el niño lo note.
  escribir(pildora, contenido, derecha, conSaltito) {
    const cambio = pildora.texto.text !== contenido
    pildora.texto.setText(contenido)
    const ancho = RELLENO + pildora.anchoIcono + 10 + pildora.texto.width + RELLENO
    pildora.fondo.setSize(ancho, ALTO)
    pildora.icono.x = -ancho / 2 + RELLENO + pildora.anchoIcono / 2
    pildora.texto.x = pildora.icono.x + pildora.anchoIcono / 2 + 10
    pildora.x = derecha - ancho / 2
    if (cambio && conSaltito) {
      this.escena.tweens.add({ targets: pildora, scale: 1.08, duration: 140, yoyo: true, ease: 'Quad.easeOut' })
    }
    return ancho
  }

  // Se llama al empezar y después de cada compra.
  actualizar({ textoLista, textoPlata, choclitos }, conSaltito = true) {
    // De derecha a izquierda: choclitos, plata y, en el espacio que queda, la lista centrada.
    let derecha = ANCHO - MARGEN
    derecha -= this.escribir(this.choclitos, String(choclitos), derecha, conSaltito) + ESPACIO
    derecha -= this.escribir(this.plata, textoPlata, derecha, conSaltito) + ESPACIO
    const anchoLista = this.escribir(this.lista, textoLista, derecha, conSaltito)
    const centroLibre = (MARGEN + derecha) / 2
    this.lista.x = Math.max(MARGEN + anchoLista / 2, Math.min(centroLibre, derecha - anchoLista / 2))
  }

  get textoLista() {
    return this.lista.texto.text
  }

  get textoPlata() {
    return this.plata.texto.text
  }
}
