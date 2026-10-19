// El mercado de Kusi: una plaza vista desde arriba con los puestos alrededor de la pileta.
// El cuy camina en todas las direcciones (tocando el piso o un puesto, con el joystick o con las flechas)
// y compra en los puestos.

import * as Phaser from 'phaser'
import {
  COLOR, NUMERO, PROFUNDIDAD, estiloTexto, ANCHO, ALTO,
  ANCHO_PLAZA, ALTO_PLAZA, ZONA_CAMINABLE, PILETA, KUSI, CUY_INICIO, LUGARES_PUESTOS, FRENTE_PUESTO,
  PATITAS_CUY, ADELANTO_CAMARA, VELOCIDAD_MAXIMA, DISTANCIA_FRENADO, DISTANCIA_PARA_HABLAR,
} from '../medidas.js'
import { ajustarATamano, claveIcono } from '../dibujos/dibujos.js'
import { ALTURA_MOSTRADOR } from '../dibujos/escenario.js'
import { palabraDelLetrero, textoSoles } from '../logica/nombres.js'
import { crearEstado, progresoLista, textoCartel, sumar } from '../logica/compras.js'
import { avisos } from '../logica/avisos.js'
import { Piso } from '../logica/piso.js'
import { Joystick } from '../interfaz/Joystick.js'
import { Cartel } from '../interfaz/Cartel.js'
import { VentanaPuesto } from '../interfaz/VentanaPuesto.js'
import { crearBoton, dibujarGlobo, fijarEnPantalla } from '../interfaz/piezas.js'

const ALTO_PUESTO = 320
const ALTO_LETRERO = 84 // lo que sobresale el letrero por encima del toldo
const TAMANO_KUSI = { ancho: 124, alto: 140 }
const TAMANO_CUY = { ancho: 110, alto: 120 }
const FUERZA_MINIMA = 0.15 // al frenar llegando a un punto, nunca va más lento que esto (de la velocidad máxima)

export class EscenaMercado extends Phaser.Scene {
  constructor() {
    super('mercado')
  }

  init({ paquete }) {
    this.paquete = paquete
    this.estado = crearEstado(paquete)
    // Con ?rapido=1 en la dirección, el cuy camina 4 veces más rápido (para las pruebas automáticas)
    this.multiplicador = new URLSearchParams(window.location.search).get('rapido') === '1' ? 4 : 1
    this.velocidad = { x: 0, y: 0 } // px por segundo
    this.camino = null // { puntos, puesto } mientras camina solo hacia donde se tocó
    this.mirando = 'frente' // el cuy: 'frente' o 'espaldas'
    this.kusiMirando = 'frente'
    this.puedeMoverse = false // recién se mueve después de «¡Vamos!»
    this.ventana = null
    this.puestoCercano = null
    this.listaAvisada = false
    this.ultimoVuelto = null
  }

  create() {
    // Lo que el cuy no puede pisar: la pileta y Kusi, hasta el muro para que no se le ponga delante
    // (los puestos se agregan al crearlos)
    this.piso = new Piso(ZONA_CAMINABLE, PATITAS_CUY)
    this.piso.agregarElipse(PILETA.x, PILETA.y + 8, PILETA.radioX, PILETA.radioY + 8)
    this.piso.agregarCaja(KUSI.x - 44, KUSI.y - 26, KUSI.x + 44, ZONA_CAMINABLE.abajo)

    this.crearFondo()
    this.crearPuestos()
    this.crearPersonajes()
    this.crearControles()
    this.cartel = new Cartel(this)
    this.actualizarCartel(false)

    // La cámara sigue al cuy con suavidad, mirando un poco por delante, y no sale de la plaza
    const camara = this.cameras.main
    camara.setBounds(0, 0, ANCHO_PLAZA, ALTO_PLAZA)
    camara.startFollow(this.cuy, false, 0.08, 0.08, 0, ADELANTO_CAMARA)

    // En la computadora: las flechas caminan en 8 direcciones
    this.teclas = this.input.keyboard.createCursorKeys()

    // Tocar el piso: el cuy camina solo hasta ahí. Si el toque cayó sobre algo que se puede tocar
    // (un puesto, un botón, el joystick), eso manda.
    this.input.on('pointerdown', (puntero, tocados) => {
      if (tocados.length || !this.puedeMoverse) return
      this.caminarHacia({ x: puntero.worldX, y: puntero.worldY })
    })

    this.exponerParaPruebas()
    this.mostrarHistoria()
  }

  update(tiempo, delta) {
    const segundos = Math.min(delta, 50) / 1000
    this.moverCuy(segundos, tiempo)
    this.voltearKusi()
    this.transparentarPuestos(segundos)
    this.revisarPuestoCercano()
  }

  // ---------- Plaza ----------

  // Un solo dibujo para todo el piso. Si el PNG tiene otra proporción, cubre la plaza sin deformarse.
  crearFondo() {
    const fondo = this.add.image(0, 0, 'fondo-plaza').setOrigin(0, 0).setDepth(PROFUNDIDAD.fondo)
    fondo.setScale(Math.max(ANCHO_PLAZA / fondo.width, ALTO_PLAZA / fondo.height))
  }

  // ---------- Puestos ----------

  crearPuestos() {
    const { puestos } = this.paquete
    if (puestos.length > LUGARES_PUESTOS.length) {
      console.warn(`[mercado] La plaza tiene lugar para ${LUGARES_PUESTOS.length} puestos y el paquete trae ${puestos.length}`)
    }
    this.puestos = puestos.slice(0, LUGARES_PUESTOS.length).map((datos, i) => {
      const { x, y: piso } = LUGARES_PUESTOS[i]
      const arriba = piso - ALTO_PUESTO
      const mostrador = arriba + ALTURA_MOSTRADOR

      // El vendedor va detrás del puesto: se ve por el hueco entre el toldo y el mostrador,
      // con la cara por encima de los productos, que van en fila sobre el mostrador.
      // Todo el puesto es un grupo con la profundidad de su piso.
      const vendedor = ajustarATamano(this.add.image(x, mostrador + 4, datos.vendedor.recurso).setOrigin(0.5, 1), 150, 150)
      const dibujo = ajustarATamano(this.add.image(x, piso, datos.recurso).setOrigin(0.5, 1), 360, ALTO_PUESTO)
      const cantidad = datos.productos.length
      const productos = datos.productos.map((producto, j) =>
        ajustarATamano(this.add.image(x + (j - (cantidad - 1) / 2) * 62, mostrador + 6, producto.recurso).setOrigin(0.5, 1), 52, 52))
      const letrero = this.crearLetrero(x, arriba, datos.recurso)
      const grupo = this.add.container(0, 0, [vendedor, dibujo, ...productos, ...letrero]).setDepth(piso)

      // El cuy no atraviesa el mostrador, pero puede pasar por detrás de los puestos de abajo
      this.piso.agregarCaja(x - 175, piso - 150, x + 175, piso + 5)

      // Tocar el puesto o su letrero lleva al cuy hasta el frente del puesto
      const zona = this.add.zone(x, (arriba - ALTO_LETRERO + piso) / 2, 360, ALTO_PUESTO + ALTO_LETRERO)
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

  // Letrero arriba del toldo: un dibujito y una palabra (Pan, Frutas, Verduras...).
  // Dos palitos lo sostienen sobre el toldo, que empieza en `arribaPuesto`.
  crearLetrero(x, arribaPuesto, clavePuesto) {
    const y = arribaPuesto - 50
    const patas = this.add.graphics()
      .lineStyle(5, NUMERO.tinta)
      .lineBetween(x - 70, y + 34, x - 70, arribaPuesto + 10)
      .lineBetween(x + 70, y + 34, x + 70, arribaPuesto + 10)
    const tabla = this.add.rectangle(x, y, 236, 68, 0xfff1d6).setRounded(16).setStrokeStyle(4, NUMERO.tinta)
    const icono = ajustarATamano(this.add.image(x - 78, y, claveIcono(clavePuesto)), 50, 50)
    const palabra = this.add.text(x + 24, y, palabraDelLetrero(clavePuesto), estiloTexto(32)).setOrigin(0.5)
    if (palabra.width > 150) palabra.setScale(150 / palabra.width)
    return [patas, tabla, icono, palabra]
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
        && this.cuy.y > puesto.arriba - ALTO_LETRERO
        && Math.abs(this.cuy.x - puesto.x) < 200
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

    // El cuy del niño: un contenedor con su sombra y su dibujo (el dibujo rebota al caminar)
    this.sombraCuy = this.add.ellipse(0, 0, 80, 16, 0x000000, 0.18)
    this.dibujoCuy = ajustarATamano(this.add.image(0, 0, 'cuy-nino-frente').setOrigin(0.5, 1), TAMANO_CUY.ancho, TAMANO_CUY.alto)
    this.cuy = this.add.container(CUY_INICIO.x, CUY_INICIO.y, [this.sombraCuy, this.dibujoCuy]).setDepth(CUY_INICIO.y)

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

    // Mira hacia donde camina: de frente si baja, de espaldas si sube; de lado se queda como estaba
    const rapidez = Math.hypot(this.velocidad.x, this.velocidad.y)
    if (Math.abs(this.velocidad.y) > 20 && Math.abs(this.velocidad.y) > rapidez * 0.35) {
      this.mirar(this.velocidad.y > 0 ? 'frente' : 'espaldas')
    }

    // Pasitos: rebota un poco mientras camina y se inclina hacia el lado al que va
    const empuje = Math.min(1, rapidez / rapidezMaxima)
    this.dibujoCuy.y = -Math.abs(Math.sin(tiempo / 85)) * 6 * empuje
    this.dibujoCuy.rotation = Phaser.Math.Clamp(this.velocidad.x / rapidezMaxima, -1, 1) * 0.1
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

  // Cambia el dibujo del cuy: 'frente' o 'espaldas'.
  mirar(lado) {
    if (lado === this.mirando) return
    this.mirando = lado
    ajustarATamano(this.dibujoCuy.setTexture(`cuy-nino-${lado}`), TAMANO_CUY.ancho, TAMANO_CUY.alto)
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
      kusiMirando: this.kusiMirando,
      puedeMoverse: this.puedeMoverse,
      puestoCercano: this.puestoCercano?.datos.id ?? null,
      ventanaAbierta: Boolean(this.ventana),
      ventanaOcupada: this.ventana?.ocupada ?? false,
      ultimoVuelto: this.ultimoVuelto,
      puestos: this.puestos.map((puesto) => ({ id: puesto.datos.id, x: puesto.x, y: puesto.piso, frente: { ...puesto.frente } })),
    }
  }

  buscarObjetivo(nombre) {
    if (nombre === 'vamos') return this.globoHistoria?.vamos.fondo ?? null
    if (nombre === 'hablar') return this.puestoCercano?.globo.zona ?? null
    if (nombre.startsWith('puesto:')) return this.puestos.find((puesto) => puesto.datos.id === nombre.slice(7))?.zona ?? null
    return this.ventana?.objetivo(nombre) ?? null
  }

  // Centro del objeto en coordenadas de la página (para hacer clic de verdad sobre el lienzo).
  ubicar(nombre) {
    const objeto = this.buscarObjetivo(nombre)
    if (!objeto?.active) return null
    const caja = objeto.getBounds()
    const camara = this.cameras.main
    const x = caja.centerX - camara.scrollX * objeto.scrollFactorX
    const y = caja.centerY - camara.scrollY * objeto.scrollFactorY
    const lienzo = this.game.canvas.getBoundingClientRect()
    return { x: lienzo.left + (x / ANCHO) * lienzo.width, y: lienzo.top + (y / ALTO) * lienzo.height }
  }
}
