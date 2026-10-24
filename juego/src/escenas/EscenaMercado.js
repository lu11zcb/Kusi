// El mercado de Kusi: una plaza vista desde arriba con los puestos alrededor de la pileta.
// El cuy camina en todas las direcciones (tocando el piso o un puesto, con el joystick o con las flechas)
// y compra en los puestos. La plaza (lo que no se pisa, Kusi y los puestos) sale de src/datos/plaza.json.

import * as Phaser from 'phaser'
import {
  COLOR, NUMERO, PROFUNDIDAD, estiloTexto, ANCHO, ALTO,
  ANCHO_PUESTO, ALTO_PUESTO, FRENTE_PUESTO, PATITAS_CUY, ADELANTO_CAMARA,
  VELOCIDAD_MAXIMA, DISTANCIA_FRENADO, DISTANCIA_PARA_HABLAR,
} from '../medidas.js'
import plaza from '../datos/plaza.json'
import { ajustarATamano, claveIcono } from '../dibujos/dibujos.js'
import { CuyAnimado } from '../dibujos/cuyAnimado.js'
import { ALTURA_MOSTRADOR } from '../dibujos/escenario.js'
import { palabraDelLetrero, textoSoles } from '../logica/nombres.js'
import { crearEstado, progresoLista, textoCartel, sumar } from '../logica/compras.js'
import { avisos } from '../logica/avisos.js'
import { Piso } from '../logica/piso.js'
import { Joystick } from '../interfaz/Joystick.js'
import { Cartel, BORDE_CARTEL } from '../interfaz/Cartel.js'
import { VentanaPuesto } from '../interfaz/VentanaPuesto.js'
import { crearBoton, dibujarGlobo, fijarEnPantalla } from '../interfaz/piezas.js'

const TAMANO_KUSI = { ancho: 124, alto: 140 }
const FUERZA_MINIMA = 0.15 // al frenar llegando a un punto, nunca va más lento que esto (de la velocidad máxima)
const DOMINA = 1.5 // una dirección domina cuando es una vez y media la otra: recién ahí el cuy cambia de vista
const KUSI = plaza.kusi
const PILETA = plaza.noSePisa.find((forma) => forma.tipo === 'pileta' && forma.forma === 'elipse')

// Colores del modo depurar, según el tipo de cosa que no se pisa.
const COLORES_DEPURAR = {
  casas: 0xe53935,
  iglesia: 0xe53935,
  techo: 0xff7043,
  muro: 0x8d6e63,
  pileta: 0x1e88e5,
  banca: 0xfdd835,
  maceta: 0x43a047,
  farol: 0x212121,
  propio: 0x8e24aa, // puestos y Kusi, que se agregan desde el código
}

export class EscenaMercado extends Phaser.Scene {
  constructor() {
    super('mercado')
  }

  init({ paquete, cuyAnimado }) {
    this.paquete = paquete
    this.datosCuyAnimado = cuyAnimado
    this.estado = crearEstado(paquete)
    const parametros = new URLSearchParams(window.location.search)
    // Con ?rapido=1 el cuy camina 4 veces más rápido (para las pruebas automáticas)
    this.multiplicador = parametros.get('rapido') === '1' ? 4 : 1
    // Con ?depurar=1 se dibuja encima de la plaza lo que no se pisa
    this.depurar = parametros.get('depurar') === '1'
    this.velocidad = { x: 0, y: 0 } // px por segundo
    this.camino = null // { puntos, puesto } mientras camina solo hacia donde se tocó
    this.mirando = 'frente' // frente, espaldas, derecha o izquierda
    this.kusiMirando = 'frente'
    this.puedeMoverse = false // recién se mueve después de «¡Vamos!»
    this.ventana = null
    this.puestoCercano = null
    this.listaAvisada = false
    this.ultimoVuelto = null
  }

  create() {
    // Lo que el cuy no puede pisar: lo de plaza.json y Kusi, hasta el muro para que no se le ponga
    // delante (los puestos se agregan al crearlos)
    const { ancho, alto } = PATITAS_CUY
    this.piso = new Piso({ izquierda: ancho / 2, derecha: plaza.ancho - ancho / 2, arriba: alto / 2, abajo: plaza.alto - alto / 2 }, PATITAS_CUY)
    for (const forma of plaza.noSePisa) this.piso.agregarForma(forma)
    this.cajasPropias = [] // las que agrega el código, para el modo depurar
    this.noPisar(KUSI.x - 44, KUSI.y - 26, KUSI.x + 44, plaza.alto)

    this.crearFondo()
    this.crearPuestos()
    this.crearPersonajes()
    this.crearControles()
    this.cartel = new Cartel(this)
    this.actualizarCartel(false)

    // La cámara sigue al cuy con suavidad, mirando un poco por delante, y no sale de la plaza
    const camara = this.cameras.main
    camara.setBounds(0, 0, plaza.ancho, plaza.alto)
    camara.startFollow(this.cuy, false, 0.08, 0.08, 0, ADELANTO_CAMARA)

    // En la computadora: las flechas caminan en 8 direcciones
    this.teclas = this.input.keyboard.createCursorKeys()

    // Tocar el piso: el cuy camina solo hasta ahí. Si el toque cayó sobre algo que se puede tocar
    // (un puesto, un botón, el joystick), eso manda.
    this.input.on('pointerdown', (puntero, tocados) => {
      if (tocados.length || !this.puedeMoverse) return
      this.caminarHacia({ x: puntero.worldX, y: puntero.worldY })
    })

    if (this.depurar) this.crearDepurar()
    this.exponerParaPruebas()
    this.mostrarHistoria()
  }

  update(tiempo, delta) {
    const segundos = Math.min(delta, 50) / 1000
    this.moverCuy(segundos, tiempo)
    this.voltearKusi()
    this.transparentarPuestos(segundos)
    this.revisarPuestoCercano()
    this.patitasDepurar?.setPosition(this.cuy.x, this.cuy.y)
  }

  // ---------- Plaza ----------

  // Un solo dibujo para toda la plaza, a su tamaño: la plaza mide lo mismo que el dibujo.
  crearFondo() {
    const fondo = this.add.image(0, 0, plaza.dibujo).setOrigin(0, 0).setDepth(PROFUNDIDAD.fondo)
    if (fondo.width !== plaza.ancho || fondo.height !== plaza.alto) {
      console.warn(`[plaza] ${plaza.dibujo}.png mide ${fondo.width} x ${fondo.height}, pero plaza.json dice ${plaza.ancho} x ${plaza.alto}`)
    }
  }

  // Una caja que el cuy no puede pisar, agregada desde el código (puestos y Kusi).
  noPisar(izquierda, arriba, derecha, abajo) {
    this.piso.agregarCaja(izquierda, arriba, derecha, abajo)
    this.cajasPropias.push({ izquierda, arriba, derecha, abajo })
  }

  // ---------- Puestos ----------

  crearPuestos() {
    const { puestos } = this.paquete
    const lugares = plaza.puestos
    if (puestos.length > lugares.length) {
      console.warn(`[mercado] La plaza tiene lugar para ${lugares.length} puestos y el paquete trae ${puestos.length}`)
    }
    this.puestos = puestos.slice(0, lugares.length).map((datos, i) => {
      const { x, y: piso } = lugares[i]
      const arriba = piso - ALTO_PUESTO
      const mostrador = arriba + ALTURA_MOSTRADOR

      // El vendedor va detrás del puesto: se ve por el hueco entre el toldo y el mostrador,
      // con la cara por encima de los productos, que van en fila sobre el mostrador. El letrero
      // va en el frente del mostrador. Todo el puesto es un grupo con la profundidad de su piso.
      const vendedor = ajustarATamano(this.add.image(x, mostrador + 4, datos.vendedor.recurso).setOrigin(0.5, 1), 150, 150)
      const dibujo = ajustarATamano(this.add.image(x, piso, datos.recurso).setOrigin(0.5, 1), ANCHO_PUESTO, ALTO_PUESTO)
      const cantidad = datos.productos.length
      const productos = datos.productos.map((producto, j) =>
        ajustarATamano(this.add.image(x + (j - (cantidad - 1) / 2) * 62, mostrador + 6, producto.recurso).setOrigin(0.5, 1), 52, 52))
      const letrero = this.crearLetrero(x, piso, datos.recurso)
      const grupo = this.add.container(0, 0, [vendedor, dibujo, ...productos, ...letrero]).setDepth(piso)

      // El cuy no atraviesa el mostrador, pero puede pasar por detrás de los puestos
      this.noPisar(x - 165, piso - 150, x + 165, piso + 5)

      // Tocar el puesto lleva al cuy hasta su frente
      const zona = this.add.zone(x, piso - ALTO_PUESTO / 2, ANCHO_PUESTO, ALTO_PUESTO)
        .setInteractive({ useHandCursor: true })
        .setDepth(piso)

      const globo = this.crearGloboHablar(x, arriba + 50)
      const puesto = { datos, x, piso, arriba, grupo, zona, globo, frente: { x, y: piso + FRENTE_PUESTO } }
      zona.on('pointerdown', () => {
        if (this.puedeMoverse) this.caminarHacia(puesto.frente, puesto)
      })
      globo.zona.on('pointerup', () => this.abrirVentana(puesto))
      return puesto
    })
  }

  // Letrero en el frente del mostrador, como en la pantalla aprobada: un dibujito y una palabra
  // (Pan, Frutas, Verduras...). Así no sobresale del puesto ni tapa al de atrás.
  crearLetrero(x, piso, clavePuesto) {
    const y = piso - 38
    const tabla = this.add.rectangle(x, y, 200, 56, 0xfff1d6).setRounded(14).setStrokeStyle(4, NUMERO.tinta)
    const icono = ajustarATamano(this.add.image(x - 66, y, claveIcono(clavePuesto)), 40, 40)
    const palabra = this.add.text(x + 20, y, palabraDelLetrero(clavePuesto), estiloTexto(28)).setOrigin(0.5)
    if (palabra.width > 124) palabra.setScale(124 / palabra.width)
    return [tabla, icono, palabra]
  }

  // Globo «Hablar» sobre el vendedor; solo se ve (y se puede tocar) cuando el cuy está frente al puesto.
  crearGloboHablar(x, y) {
    const dibujo = dibujarGlobo(this.add.graphics(), 184, 78, { cola: 'abajo' })
    const texto = this.add.text(0, -1, 'Hablar', estiloTexto(34)).setOrigin(0.5)
    const zona = this.add.rectangle(0, 0, 184, 78).setInteractive({ useHandCursor: true })
    zona.disableInteractive()
    const globo = this.add.container(x, y, [dibujo, texto, zona]).setDepth(PROFUNDIDAD.globoHablar).setVisible(false)
    globo.zona = zona
    // Sube y baja despacito para llamar la atención
    this.tweens.add({ targets: [dibujo, texto], y: '-=5', duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })
    return globo
  }

  // Si el cuy pasa por detrás de un puesto, el puesto se vuelve medio transparente para no perderlo de vista.
  transparentarPuestos(segundos) {
    const ajuste = 1 - Math.exp(-10 * segundos)
    for (const puesto of this.puestos) {
      const detras = this.cuy.y < puesto.piso
        && this.cuy.y > puesto.arriba
        && Math.abs(this.cuy.x - puesto.x) < ANCHO_PUESTO / 2 + 20
      const alfa = detras ? 0.5 : 1
      puesto.grupo.alpha += (alfa - puesto.grupo.alpha) * ajuste
    }
  }

  // Si el cuy está parado frente a un puesto, aparece «Hablar».
  revisarPuestoCercano() {
    let cercano = null
    if (this.puedeMoverse && !this.ventana) {
      let menor = DISTANCIA_PARA_HABLAR
      for (const puesto of this.puestos) {
        const distancia = Math.hypot(this.cuy.x - puesto.frente.x, this.cuy.y - puesto.frente.y)
        if (distancia < menor) {
          menor = distancia
          cercano = puesto
        }
      }
    }
    if (cercano === this.puestoCercano) return
    if (this.puestoCercano) this.esconderGlobo(this.puestoCercano.globo)
    if (cercano) this.mostrarGlobo(cercano.globo)
    this.puestoCercano = cercano
  }

  mostrarGlobo(globo) {
    this.tweens.killTweensOf(globo)
    globo.setVisible(true).setAlpha(1).setScale(0.6)
    globo.zona.setInteractive()
    this.tweens.add({ targets: globo, scale: 1, duration: 220, ease: 'Back.easeOut' })
  }

  esconderGlobo(globo) {
    this.tweens.killTweensOf(globo)
    globo.zona.disableInteractive()
    this.tweens.add({ targets: globo, scale: 0.6, alpha: 0, duration: 120, onComplete: () => globo.setVisible(false) })
  }

  // ---------- Kusi y el cuy ----------

  crearPersonajes() {
    // Kusi espera en la entrada y respira: se estira apenitas hacia arriba
    this.dibujoKusi = ajustarATamano(this.add.image(0, 2, 'kusi-frente').setOrigin(0.5, 1), TAMANO_KUSI.ancho, TAMANO_KUSI.alto)
    this.kusi = this.add.container(KUSI.x, KUSI.y, [this.add.ellipse(0, 0, 96, 18, 0x000000, 0.16), this.dibujoKusi])
      .setDepth(KUSI.y)
    this.tweens.add({ targets: this.kusi, scaleY: 1.03, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })

    // El apoyo de los pies coincide con la posición física; la sombra queda separada.
    const { x, y } = plaza.cuyInicio
    this.sombraCuy = this.add.ellipse(0, 0, 80, 16, 0x000000, 0.18)
    this.dibujoCuy = new CuyAnimado(this, this.datosCuyAnimado)
    this.cuy = this.add.container(x, y, [this.sombraCuy, this.dibujoCuy]).setDepth(y)

    // Marca en el piso donde se tocó; se ve mientras el cuy camina hacia ahí
    this.marca = this.add.ellipse(0, 0, 60, 26, 0xffffff, 0.25)
      .setStrokeStyle(4, 0xffffff, 0.9)
      .setDepth(PROFUNDIDAD.marca)
      .setVisible(false)
    this.tweens.add({ targets: this.marca, scale: 0.75, duration: 420, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })
  }

  // Flechas (en 8 direcciones, siempre a toda velocidad) o, si no se usan, el joystick.
  direccionDeControles() {
    const x = (this.teclas.right.isDown ? 1 : 0) - (this.teclas.left.isDown ? 1 : 0)
    const y = (this.teclas.down.isDown ? 1 : 0) - (this.teclas.up.isDown ? 1 : 0)
    if (!x && !y) return this.joystick.valor
    const largo = Math.hypot(x, y)
    return { x: x / largo, y: y / largo }
  }

  moverCuy(segundos, tiempo) {
    const rapidezMaxima = VELOCIDAD_MAXIMA * this.multiplicador

    // Hacia dónde quiere ir: flechas o joystick. Si no los usa, sigue el camino que eligió tocando.
    let deseo = this.puedeMoverse ? this.direccionDeControles() : { x: 0, y: 0 }
    if ((deseo.x || deseo.y) && this.camino) this.terminarCamino()
    const punto = this.camino?.puntos[0]
    if (punto) {
      const distancia = Math.hypot(punto.x - this.cuy.x, punto.y - this.cuy.y) || 1
      // Frena al acercarse al último punto
      const ultimo = this.camino.puntos.length === 1
      const fuerza = ultimo ? Phaser.Math.Clamp(distancia / DISTANCIA_FRENADO, FUERZA_MINIMA, 1) : 1
      deseo = { x: ((punto.x - this.cuy.x) / distancia) * fuerza, y: ((punto.y - this.cuy.y) / distancia) * fuerza }
    }

    // La velocidad se acerca a la deseada de a poco: arranca y frena suave, nunca de golpe
    const quieto = !deseo.x && !deseo.y
    const ajuste = 1 - Math.exp(-(quieto ? 6 : 9) * segundos)
    this.velocidad.x += (deseo.x * rapidezMaxima - this.velocidad.x) * ajuste
    this.velocidad.y += (deseo.y * rapidezMaxima - this.velocidad.y) * ajuste
    if (quieto && Math.hypot(this.velocidad.x, this.velocidad.y) < 3) this.velocidad = { x: 0, y: 0 }

    let dx = this.velocidad.x * segundos
    let dy = this.velocidad.y * segundos
    // Siguiendo un camino no se pasa del punto: si este paso lo alcanza, llega justo y sigue con el próximo
    if (punto && Math.hypot(dx, dy) >= Math.hypot(punto.x - this.cuy.x, punto.y - this.cuy.y)) {
      dx = punto.x - this.cuy.x
      dy = punto.y - this.cuy.y
      this.camino.puntos.shift()
    }

    // Avanza sin atravesar nada; si choca de un lado, pierde esa parte de la velocidad
    const antes = { x: this.cuy.x, y: this.cuy.y }
    const paso = this.piso.mover(antes.x, antes.y, dx, dy)
    if (paso.x === antes.x) this.velocidad.x = 0
    if (paso.y === antes.y) this.velocidad.y = 0
    this.cuy.setPosition(paso.x, paso.y).setDepth(paso.y)

    if (this.camino) {
      // Si quedó trabado contra algo un ratito, deja de intentar
      const trabado = (dx || dy) && paso.x === antes.x && paso.y === antes.y
      this.camino.trabado = trabado ? (this.camino.trabado ?? 0) + segundos : 0
      if (!this.camino.puntos.length) this.llegar()
      else if (this.camino.trabado > 0.3) this.terminarCamino()
    }

    // Mira hacia donde camina: de lado si va más hacia los costados, de frente si baja, de espaldas
    // si sube. Solo cambia cuando una dirección domina claramente; en las diagonales se queda como
    // estaba, para que no parpadee.
    const rapidez = Math.hypot(this.velocidad.x, this.velocidad.y)
    const deLado = Math.abs(this.velocidad.x)
    const vertical = Math.abs(this.velocidad.y)
    if (rapidez > 20) {
      if (deLado > vertical * DOMINA) this.mirar(this.velocidad.x < 0 ? 'izquierda' : 'derecha')
      else if (vertical > deLado * DOMINA) this.mirar(this.velocidad.y > 0 ? 'frente' : 'espaldas')
    }

    const distancia = Math.hypot(paso.x - antes.x, paso.y - antes.y)
    this.dibujoCuy.animarMovimiento(this.mirando, distancia, segundos, tiempo)
  }

  // El cuy camina solo hasta `destino`, rodeando los puestos y la pileta.
  // Si va hacia un puesto, al llegar se queda mirándolo.
  caminarHacia(destino, puesto = null) {
    const puntos = this.piso.camino(this.cuy, destino)
    if (!puntos) return
    this.camino = { puntos, puesto }
    const meta = puntos[puntos.length - 1]
    this.marca.setPosition(meta.x, meta.y).setVisible(true)
  }

  llegar() {
    const { puesto } = this.camino
    this.terminarCamino()
    this.velocidad = { x: 0, y: 0 }
    if (puesto) this.mirar('espaldas')
  }

  terminarCamino() {
    this.camino = null
    this.marca.setVisible(false)
  }

  // La red de seguridad usa los mismos cuadros frontales en cada dirección;
  // CuyAnimado voltea el dibujo al mirar a la izquierda, sin mover el anclaje.
  mirar(vista) {
    this.mirando = vista
  }

  // Kusi mira hacia el cuy: de espaldas si el cuy está más arriba (hacia los puestos), de frente si no.
  // Entre las dos líneas no cambia, para que no parpadee cuando el cuy camina a su lado.
  voltearKusi() {
    let lado = this.kusiMirando
    if (this.cuy.y < KUSI.y - 40) lado = 'espaldas'
    else if (this.cuy.y > KUSI.y - 10) lado = 'frente'
    if (lado === this.kusiMirando) return
    this.kusiMirando = lado
    ajustarATamano(this.dibujoKusi.setTexture(`kusi-${lado}`), TAMANO_KUSI.ancho, TAMANO_KUSI.alto)
  }

  // ---------- Controles en pantalla ----------

  crearControles() {
    // Joystick redondo abajo a la izquierda
    this.joystick = new Joystick(this, 150, 566)
  }

  // ---------- Modo depurar (?depurar=1) ----------

  // Dibuja encima de la plaza, con colores transparentes, lo que no se pisa (con su nombre), los puestos,
  // Kusi, el lugar para hablar con cada puesto y las patitas del cuy. La tecla Z muestra toda la plaza.
  crearDepurar() {
    const capa = this.add.graphics().setDepth(PROFUNDIDAD.depurar)
    const pintar = (color) => capa.fillStyle(color, 0.35).lineStyle(2, color, 0.95)
    for (const forma of plaza.noSePisa) {
      pintar(COLORES_DEPURAR[forma.tipo] ?? 0xff00ff)
      if (forma.forma === 'elipse') {
        capa.fillEllipse(forma.x, forma.y, forma.radioX * 2, forma.radioY * 2)
        capa.strokeEllipse(forma.x, forma.y, forma.radioX * 2, forma.radioY * 2)
      } else if (forma.forma === 'poligono') {
        const puntos = forma.puntos.map(([x, y]) => ({ x, y }))
        capa.fillPoints(puntos, true)
        capa.strokePoints(puntos, true)
      } else {
        capa.fillRect(forma.x, forma.y, forma.ancho, forma.alto)
        capa.strokeRect(forma.x, forma.y, forma.ancho, forma.alto)
      }
    }
    pintar(COLORES_DEPURAR.propio)
    for (const { izquierda, arriba, derecha, abajo } of this.cajasPropias) {
      capa.fillRect(izquierda, arriba, derecha - izquierda, abajo - arriba)
      capa.strokeRect(izquierda, arriba, derecha - izquierda, abajo - arriba)
    }
    capa.fillStyle(0xffffff, 1)
    for (const puesto of this.puestos) capa.fillCircle(puesto.frente.x, puesto.frente.y, 9)

    // El nombre de las cosas grandes, para encontrarlas en plaza.json
    for (const forma of plaza.noSePisa) {
      if (!forma.nota) continue
      const x = forma.puntos ? forma.puntos.reduce((suma, [px]) => suma + px, 0) / forma.puntos.length : forma.x
      const y = forma.puntos ? forma.puntos.reduce((suma, [, py]) => suma + py, 0) / forma.puntos.length : forma.y
      this.add.text(x, y, forma.nota, { fontFamily: 'sans-serif', fontSize: '14px', color: '#ffffff', backgroundColor: '#000000aa' })
        .setOrigin(0.5)
        .setDepth(PROFUNDIDAD.depurar)
    }

    this.patitasDepurar = this.add.rectangle(0, 0, PATITAS_CUY.ancho, PATITAS_CUY.alto)
      .setStrokeStyle(2, 0x00e5ff)
      .setDepth(PROFUNDIDAD.depurar)
    this.input.keyboard.on('keydown-Z', () => this.verTodaLaPlaza())
  }

  // Alterna entre seguir al cuy y ver toda la plaza de una vez (solo en el modo depurar).
  // En la vista completa se esconde lo que está fijo en la pantalla (cartel, joystick, ventanas).
  verTodaLaPlaza() {
    const camara = this.cameras.main
    this.vistaCompleta = !this.vistaCompleta
    for (const objeto of this.children.list) {
      if (objeto.scrollFactorX === 0) objeto.setVisible(!this.vistaCompleta)
    }
    if (this.vistaCompleta) {
      camara.stopFollow()
      camara.setZoom(Math.min(ANCHO / plaza.ancho, ALTO / plaza.alto))
      camara.centerOn(plaza.ancho / 2, plaza.alto / 2)
    } else {
      camara.setZoom(1)
      camara.startFollow(this.cuy, false, 0.08, 0.08, 0, ADELANTO_CAMARA)
    }
  }

  // ---------- Globos de Kusi ----------

  // Al empezar, Kusi cuenta la historia del paquete. Recién con «¡Vamos!» el niño se puede mover.
  mostrarHistoria() {
    this.joystick.desactivar()
    const dibujo = dibujarGlobo(this.add.graphics(), 700, 290, { cola: 'abajo' })
    const texto = this.add
      .text(0, -46, this.paquete.historia, estiloTexto(32, COLOR.tinta, { wordWrap: { width: 620 } }))
      .setOrigin(0.5)
    const vamos = crearBoton(this, 0, 84, { ancho: 240, alto: 92, texto: '¡Vamos!', tamano: 38, alTocar: () => this.empezar() })
    // Encima de Kusi, con la colita apuntando a su cabeza
    const y = KUSI.y - TAMANO_KUSI.alto - 10 - 290 / 2 - 28
    this.globoHistoria = this.add.container(KUSI.x, y, [dibujo, texto, vamos]).setDepth(PROFUNDIDAD.globoKusi)
    this.globoHistoria.vamos = vamos
  }

  empezar() {
    const globo = this.globoHistoria
    this.globoHistoria = null
    this.tweens.add({ targets: globo, scale: 0.8, alpha: 0, duration: 160, onComplete: () => globo.destroy() })
    this.puedeMoverse = true
    this.joystick.activar()
  }

  // Globo de Kusi fijo en la pantalla (Kusi puede haber quedado lejos). Se cierra al tocarlo o solo.
  decirKusi(contenido) {
    const cara = ajustarATamano(this.add.image(84, 196, 'kusi-frente'), 104, 112)
    const dibujo = dibujarGlobo(this.add.graphics(), 480, 96, { cola: 'izquierda', colaY: 8 })
    const texto = this.add.text(0, 0, contenido, estiloTexto(32)).setOrigin(0.5)
    const globo = this.add.container(410, 186, [dibujo, texto])
    const zona = this.add.rectangle(0, 0, 480, 96).setInteractive({ useHandCursor: true })
    globo.add(zona)
    const grupo = this.add.container(0, 0, [cara, globo]).setDepth(PROFUNDIDAD.globoKusi)
    fijarEnPantalla(grupo)

    grupo.setAlpha(0)
    this.tweens.add({ targets: grupo, alpha: 1, duration: 200 })
    const cerrar = () => {
      if (!grupo.active) return
      this.tweens.add({ targets: grupo, alpha: 0, duration: 200, onComplete: () => grupo.destroy() })
    }
    zona.on('pointerup', cerrar)
    this.time.delayedCall(7000, cerrar)
  }

  // ---------- Ventana del puesto ----------

  abrirVentana(puesto) {
    if (this.ventana || !this.puedeMoverse) return
    this.puedeMoverse = false
    this.velocidad = { x: 0, y: 0 }
    this.terminarCamino()
    this.joystick.desactivar()
    this.ventana = new VentanaPuesto(this, {
      puesto: puesto.datos,
      estado: this.estado,
      alComprar: (resultado) => {
        this.ultimoVuelto = resultado.vuelto
        this.actualizarCartel()
      },
      alCerrar: () => this.cerrarVentana(),
    })
  }

  // «Listo»: el cuy se queda donde estaba. Si la lista ya está completa, Kusi lo llama.
  cerrarVentana() {
    this.ventana = null
    this.puedeMoverse = true
    this.joystick.activar()
    if (this.estado.listaCompleta && !this.listaAvisada) {
      this.listaAvisada = true
      this.decirKusi('¡Ya tienes todo! Vuelve conmigo')
    }
  }

  actualizarCartel(conSaltito = true) {
    const progreso = progresoLista(this.estado.lista, this.estado.compras)
    this.cartel.actualizar({
      textoLista: textoCartel(progreso),
      textoPlata: textoSoles(sumar(this.estado.cartera)),
      choclitos: this.estado.choclitos,
    }, conSaltito)
  }

  // ---------- Para las pruebas automáticas ----------

  // window.kusi deja leer el estado y saber dónde tocar cada cosa en la página.
  exponerParaPruebas() {
    window.kusi = {
      listo: true,
      avisos,
      estado: () => this.estadoParaPruebas(),
      ubicar: (nombre) => this.ubicar(nombre),
    }
  }

  estadoParaPruebas() {
    return {
      plata: sumar(this.estado.cartera),
      cartera: [...this.estado.cartera],
      compras: { ...this.estado.compras },
      cartel: this.cartel.textoLista,
      textoPlata: this.cartel.textoPlata,
      cuyX: Math.round(this.cuy.x),
      cuyY: Math.round(this.cuy.y),
      velocidad: Math.round(Math.hypot(this.velocidad.x, this.velocidad.y)),
      caminando: Boolean(this.camino),
      mirando: this.mirando,
      animacionCuy: {
        recurso: this.dibujoCuy.texture.key,
        clave: this.dibujoCuy.anims.currentAnim?.key,
        estado: this.dibujoCuy.estadoMovimiento,
        fotograma: this.dibujoCuy.frame.name,
        anclaje: { x: this.dibujoCuy.displayOriginX, y: this.dibujoCuy.displayOriginY },
        escala: this.dibujoCuy.scaleX,
        flipX: this.dibujoCuy.flipX,
      },
      kusiMirando: this.kusiMirando,
      puedeMoverse: this.puedeMoverse,
      puestoCercano: this.puestoCercano?.datos.id ?? null,
      ventanaAbierta: Boolean(this.ventana),
      ventanaOcupada: this.ventana?.ocupada ?? false,
      ultimoVuelto: this.ultimoVuelto,
      puestos: this.puestos.map((puesto) => ({ id: puesto.datos.id, x: puesto.x, y: puesto.piso, frente: { ...puesto.frente } })),
      pileta: { x: PILETA.x, y: PILETA.y, radioX: PILETA.radioX, radioY: PILETA.radioY },
    }
  }

  buscarObjetivo(nombre) {
    if (nombre === 'vamos') return this.globoHistoria?.vamos.fondo ?? null
    if (nombre === 'hablar') return this.puestoCercano?.globo.zona ?? null
    if (nombre.startsWith('puesto:')) return this.puestos.find((puesto) => puesto.datos.id === nombre.slice(7))?.zona ?? null
    if (nombre === 'pileta') return { x: PILETA.x, y: PILETA.y } // un punto de la plaza
    return this.ventana?.objetivo(nombre) ?? null
  }

  // Dónde hacer clic de verdad sobre el lienzo para tocar `nombre`, en coordenadas de la página.
  // De lo que está en la plaza cuenta solo la parte que se ve, debajo del cartel.
  ubicar(nombre) {
    const objetivo = this.buscarObjetivo(nombre)
    if (!objetivo) return null
    const camara = this.cameras.main
    let x
    let y
    if (!objetivo.getBounds) {
      x = objetivo.x - camara.scrollX
      y = objetivo.y - camara.scrollY
      if (x < 0 || x > ANCHO || y < BORDE_CARTEL || y > ALTO) return null
    } else {
      if (!objetivo.active) return null
      const caja = objetivo.getBounds()
      if (objetivo.scrollFactorX === 0) {
        x = caja.centerX
        y = caja.centerY
      } else {
        const izquierda = Math.max(caja.left - camara.scrollX, 0)
        const derecha = Math.min(caja.right - camara.scrollX, ANCHO)
        const arriba = Math.max(caja.top - camara.scrollY, BORDE_CARTEL)
        const abajo = Math.min(caja.bottom - camara.scrollY, ALTO)
        if (izquierda >= derecha || arriba >= abajo) return null
        x = (izquierda + derecha) / 2
        y = (arriba + abajo) / 2
      }
    }
    const lienzo = this.game.canvas.getBoundingClientRect()
    return { x: lienzo.left + (x / ANCHO) * lienzo.width, y: lienzo.top + (y / ALTO) * lienzo.height }
  }
}
