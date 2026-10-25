// Ventana del puesto: el vendedor, sus 5 productos y la cartera del niño para pagar.
// Mientras está abierta, el cuy no se mueve.

import { ANCHO, ALTO, COLOR, NUMERO, PROFUNDIDAD, estiloTexto } from '../medidas.js'
import { ajustarATamano, claveDinero } from '../dibujos/dibujos.js'
import { ZorroAnimado } from '../dibujos/zorroAnimado.js'
import { nombreVisible, textoSoles } from '../logica/nombres.js'
import { pagar, sumar } from '../logica/compras.js'
import { crearBoton, dibujarGlobo, fijarEnPantalla } from './piezas.js'

// Dónde va cada parte (en px de la pantalla de 1280 x 720)
const PANEL = { x: 640, y: 406, ancho: 1160, alto: 588 }
const RETRATO = { x: 160, y: 196 }
const FILA_PRODUCTOS_Y = 350
const SEPARACION_TARJETAS = 214
const FILA_CARTERA_Y = 614
const CARTERA_DESDE_X = 220 // primera ficha de plata
const CARTERA_HASTA_X = 930 // última ficha de plata
const PAGAR = { x: 1088, y: 614 }
const SUBIDA_MARCADA = 26 // cuánto se levanta una ficha marcada

export class VentanaPuesto {
  constructor(escena, { puesto, estado, alComprar, alCerrar }) {
    this.escena = escena
    this.puesto = puesto
    this.estado = estado
    this.alComprar = alComprar
    this.alCerrar = alCerrar
    this.productoElegido = null
    this.fichas = [] // billetes y monedas en el mismo orden que estado.cartera
    this.ocupada = false // true mientras se anima un pago
    this.ultimoVuelto = null

    this.capa = escena.add.container(0, 0).setDepth(PROFUNDIDAD.ventana)
    this.crearFondo()
    this.crearVendedor()
    this.crearProductos()
    this.crearCartera()
    fijarEnPantalla(this.capa)

    // Aparece suave, deslizándose un poquito hacia arriba
    this.capa.setAlpha(0).setY(18)
    escena.tweens.add({ targets: this.capa, alpha: 1, y: 0, duration: 160, ease: 'Quad.easeOut' })
  }

  agregar(...objetos) {
    this.capa.add(objetos)
    return objetos[0]
  }

  // Sombra que tapa el mercado (y atrapa los toques) y el panel de papel.
  crearFondo() {
    const bloqueo = this.escena.add.rectangle(ANCHO / 2, ALTO / 2, ANCHO, ALTO, 0x2f1d17, 0.55).setInteractive()
    const panel = this.escena.add
      .rectangle(PANEL.x, PANEL.y, PANEL.ancho, PANEL.alto, NUMERO.papel)
      .setRounded(30)
      .setStrokeStyle(5, NUMERO.tinta)
    this.agregar(bloqueo, panel)
  }

  // Retrato del vendedor, su globo con la frase y el botón «Listo».
  crearVendedor() {
    const { escena, puesto } = this
    // Marco cuadrado: el vendedor se apoya en el borde de abajo, como asomado en una ventanita
    const marco = escena.add.rectangle(RETRATO.x, RETRATO.y, 150, 150, NUMERO.arena).setRounded(24).setStrokeStyle(4, NUMERO.tinta)
    // El retrato del zorro toma el mismo cuadro quieto que el vendedor del mapa;
    // el marco ajusta su tamaño sin introducir una segunda imagen del personaje.
    const retrato = puesto.vendedor.recurso === 'zorro'
      ? ajustarATamano(new ZorroAnimado(escena, escena.datosZorroAnimado).setPosition(RETRATO.x, RETRATO.y + 73), 140, 140)
      : ajustarATamano(
        escena.add.image(RETRATO.x, RETRATO.y + 73, puesto.vendedor.recurso).setOrigin(0.5, 1),
        140,
        140,
      )
    this.globo = dibujarGlobo(escena.add.graphics({ x: 560, y: RETRATO.y }), 600, 104, { cola: 'izquierda', colaY: 10 })
    this.dicho = escena.add
      .text(560, RETRATO.y, puesto.vendedor.frase, estiloTexto(34, COLOR.tinta, { wordWrap: { width: 560 } }))
      .setOrigin(0.5)
    this.botonListo = crearBoton(escena, 1098, RETRATO.y, {
      ancho: 190, alto: 88, texto: 'Listo', tamano: 34, relleno: 0xfff1d6,
      alTocar: () => this.cerrar(),
    })
    this.agregar(marco, retrato, this.globo, this.dicho, this.botonListo)
  }

  // Una tarjeta por producto: dibujo, nombre y precio. Se toca para elegirlo.
  crearProductos() {
    const { escena } = this
    const cantidad = this.puesto.productos.length
    this.tarjetas = this.puesto.productos.map((producto, i) => {
      const x = PANEL.x + (i - (cantidad - 1) / 2) * SEPARACION_TARJETAS
      const fondo = escena.add.rectangle(0, 0, 196, 186, NUMERO.crema).setRounded(22).setStrokeStyle(4, 0xe6c9a4)
      const dibujo = ajustarATamano(escena.add.image(0, -36, producto.recurso), 96, 96)
      const nombre = escena.add.text(0, 32, nombreVisible(producto.recurso), estiloTexto(28)).setOrigin(0.5)
      if (nombre.width > 184) nombre.setScale(184 / nombre.width)
      const precio = escena.add.text(0, 68, textoSoles(producto.precio), estiloTexto(26, COLOR.terracota)).setOrigin(0.5)
      const tarjeta = escena.add.container(x, FILA_PRODUCTOS_Y, [fondo, dibujo, nombre, precio])
      tarjeta.producto = producto
      tarjeta.fondo = fondo
      fondo.setInteractive({ useHandCursor: true }).on('pointerup', () => this.elegir(tarjeta))
      return this.agregar(tarjeta)
    })
    this.ayuda = this.agregar(
      escena.add.text(PANEL.x, 560, 'Toca lo que quieres comprar', estiloTexto(32, COLOR.tintaSuave)).setOrigin(0.5),
    )
  }

  // La cartera (sus billetes y monedas), cuánto da y el botón «Pagar». Aparece al elegir un producto.
  crearCartera() {
    const { escena } = this
    this.seccionCartera = escena.add.container(0, 0).setVisible(false)
    const etiqueta = escena.add.text(96, 512, 'Tu cartera', estiloTexto(28)).setOrigin(0, 0.5)
    const icono = ajustarATamano(escena.add.image(132, FILA_CARTERA_Y, 'cartera'), 72, 72)
    this.textoDas = escena.add.text(PAGAR.x, 512, '', estiloTexto(28)).setOrigin(0.5)
    this.botonPagar = crearBoton(escena, PAGAR.x, PAGAR.y, {
      ancho: 230, alto: 96, texto: 'Pagar', tamano: 38,
      alTocar: () => this.pagarElegido(),
    })
    this.seccionCartera.add([etiqueta, icono, this.textoDas, this.botonPagar])
    this.agregar(this.seccionCartera)

    const posiciones = this.posicionesFichas(this.estado.cartera)
    this.fichas = this.estado.cartera.map((valor, i) => this.crearFicha(valor, posiciones[i], FILA_CARTERA_Y))
    this.actualizarDas()
  }

  // Un billete o una moneda que se puede tocar para marcarlo (dar) o desmarcarlo.
  crearFicha(valor, x, y) {
    const { escena } = this
    const esBillete = valor >= 10
    const imagen = ajustarATamano(escena.add.image(0, 0, claveDinero(valor)), esBillete ? 132 : 84, esBillete ? 70 : 84)
    const resalte = (esBillete
      ? escena.add.rectangle(0, 0, 152, 90, NUMERO.naranja).setRounded(16)
      : escena.add.circle(0, 0, 54, NUMERO.naranja)
    ).setVisible(false)
    const ficha = escena.add.container(x, y, [resalte, imagen])
    ficha.valor = valor
    ficha.marcada = false
    ficha.imagen = imagen
    ficha.resalte = resalte
    imagen.setInteractive({ useHandCursor: true }).on('pointerup', () => this.alternarFicha(ficha))
    this.seccionCartera.add(ficha)
    return fijarEnPantalla(ficha)
  }

  // Dónde va cada ficha en la fila: juntas desde la izquierda; si no caben, se enciman un poco.
  posicionesFichas(valores) {
    const anchos = valores.map((valor) => (valor >= 10 ? 140 : 92))
    const espacio = 22
    const total = anchos.reduce((suma, ancho) => suma + ancho, 0) + espacio * Math.max(0, valores.length - 1)
    const disponible = CARTERA_HASTA_X - CARTERA_DESDE_X
    const ultimo = anchos[anchos.length - 1] ?? 0
    const apretar = total > disponible ? (disponible - ultimo) / (total - ultimo) : 1
    let avance = 0
    return anchos.map((ancho) => {
      const x = CARTERA_DESDE_X + avance * apretar + ancho / 2
      avance += ancho + espacio
      return x
    })
  }

  elegir(tarjeta) {
    if (this.ocupada) return
    this.productoElegido = tarjeta.producto
    for (const otra of this.tarjetas) {
      const elegida = otra === tarjeta
      otra.fondo.setFillStyle(elegida ? NUMERO.arena : NUMERO.crema)
      otra.fondo.setStrokeStyle(elegida ? 6 : 4, elegida ? NUMERO.naranja : 0xe6c9a4)
      this.escena.tweens.add({ targets: otra, scale: elegida ? 1.06 : 1, duration: 140, ease: 'Quad.easeOut' })
    }
    this.ayuda.setVisible(false)
    this.seccionCartera.setVisible(true)
  }

  alternarFicha(ficha) {
    if (this.ocupada) return
    this.marcar(ficha, !ficha.marcada)
    this.actualizarDas()
  }

  // Una ficha marcada sube y se ilumina; al desmarcarla vuelve a su lugar.
  marcar(ficha, marcada) {
    ficha.marcada = marcada
    ficha.resalte.setVisible(marcada)
    this.escena.tweens.add({
      targets: ficha,
      y: FILA_CARTERA_Y - (marcada ? SUBIDA_MARCADA : 0),
      duration: 140,
      ease: 'Quad.easeOut',
    })
  }

  actualizarDas() {
    const das = sumar(this.fichas.filter((ficha) => ficha.marcada).map((ficha) => ficha.valor))
    this.textoDas.setText(`Das: ${textoSoles(das)}`)
  }

  // El vendedor dice algo; si es un problema, el globo se sacude.
  decir(contenido, color = COLOR.tinta, sacudir = false) {
    this.dicho.setText(contenido).setColor(color)
    if (sacudir) {
      this.escena.tweens.add({ targets: [this.globo, this.dicho], x: '+=10', duration: 50, yoyo: true, repeat: 3 })
    }
  }

  pagarElegido() {
    if (this.ocupada || !this.productoElegido) return
    const marcadas = this.fichas.filter((ficha) => ficha.marcada)
    const posiciones = marcadas.map((ficha) => this.fichas.indexOf(ficha))
    const resultado = pagar(this.estado, this.puesto, this.productoElegido, posiciones)

    if (!resultado.alcanza) {
      // No alcanza: el vendedor avisa y la plata vuelve a su lugar. No se pierde nada.
      this.decir('¡Te falta plata!', COLOR.rojo, true)
      this.escena.time.delayedCall(350, () => {
        marcadas.forEach((ficha) => this.marcar(ficha, false))
        this.actualizarDas()
      })
      return
    }

    this.ultimoVuelto = resultado.vuelto
    this.animarCompra(marcadas, resultado)
  }

  // Lo que pagó vuela al vendedor; después el vuelto vuela desde el vendedor a la cartera.
  animarCompra(marcadas, resultado) {
    const { escena } = this
    this.ocupada = true
    const vuelto = sumar(resultado.vuelto)
    this.decir(vuelto > 0 ? `¡Gracias! Tu vuelto: ${textoSoles(vuelto)}` : '¡Gracias! Pagaste justo')

    marcadas.forEach((ficha, i) => {
      escena.tweens.add({
        targets: ficha,
        x: RETRATO.x,
        y: RETRATO.y,
        scale: 0.4,
        alpha: 0,
        duration: 420,
        delay: i * 90,
        ease: 'Quad.easeIn',
        onComplete: () => ficha.destroy(),
      })
    })
    const finPago = 420 + marcadas.length * 90

    // La cartera nueva: lo que quedó más el vuelto, del más grande al más chico (igual que estado.cartera).
    const quedan = this.fichas.filter((ficha) => !ficha.marcada).map((ficha) => ({ valor: ficha.valor, ficha }))
    const llegan = resultado.vuelto.map((valor) => ({ valor, ficha: null }))
    const nuevas = [...quedan, ...llegan].sort((a, b) => b.valor - a.valor)
    const posiciones = this.posicionesFichas(nuevas.map(({ valor }) => valor))

    let fin = finPago + 200
    let orden = 0
    this.fichas = nuevas.map(({ valor, ficha }, i) => {
      if (ficha) {
        escena.tweens.add({ targets: ficha, x: posiciones[i], duration: 260, delay: finPago, ease: 'Quad.easeOut' })
        return ficha
      }
      const nueva = this.crearFicha(valor, RETRATO.x, RETRATO.y).setScale(0.4).setAlpha(0)
      const retraso = finPago + 150 + orden * 220
      orden += 1
      fin = retraso + 560
      escena.tweens.add({
        targets: nueva,
        x: posiciones[i],
        y: FILA_CARTERA_Y,
        scale: 1,
        alpha: 1,
        duration: 560,
        delay: retraso,
        ease: 'Back.easeOut',
        onComplete: () => this.mostrarMas(valor, posiciones[i]),
      })
      return nueva
    })
    this.actualizarDas()

    escena.time.delayedCall(fin + 50, () => {
      this.ocupada = false
      this.actualizarDas()
      this.alComprar?.(resultado)
    })
  }

  // "+2" que sube y se desvanece donde llegó una moneda del vuelto.
  mostrarMas(valor, x) {
    const mas = this.escena.add.text(x, FILA_CARTERA_Y - 60, `+${valor}`, estiloTexto(32, COLOR.verde)).setOrigin(0.5)
    this.agregar(fijarEnPantalla(mas))
    this.escena.tweens.add({ targets: mas, y: '-=40', alpha: 0, duration: 700, onComplete: () => mas.destroy() })
  }

  cerrar() {
    if (this.ocupada) return
    this.ocupada = true
    this.escena.tweens.add({
      targets: this.capa,
      alpha: 0,
      duration: 120,
      onComplete: () => {
        this.capa.destroy()
        this.alCerrar?.()
      },
    })
  }

  // Para las pruebas automáticas: el objeto que hay que tocar para cada nombre.
  objetivo(nombre) {
    if (nombre === 'listo') return this.botonListo.fondo
    if (nombre === 'pagar') return this.botonPagar.fondo
    if (nombre.startsWith('producto:')) {
      return this.tarjetas.find((tarjeta) => tarjeta.producto.recurso === nombre.slice(9))?.fondo ?? null
    }
    if (nombre.startsWith('dinero:')) {
      const valor = Number(nombre.slice(7))
      return this.fichas.find((ficha) => ficha.valor === valor && !ficha.marcada)?.imagen ?? null
    }
    return null
  }
}
