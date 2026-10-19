// El mercado de Kusi: mundo de lado, puestos en fila, el cuy que camina y salta, y las compras.

import * as Phaser from 'phaser'
import {
  ANCHO, ALTO, COLOR, PROFUNDIDAD, estiloTexto,
  PISO_PERSONAJES, PISO_PUESTOS, INICIO_PISO, KUSI_X, CUY_INICIO_X,
  PRIMER_PUESTO_X, SEPARACION_PUESTOS, VELOCIDAD_MAXIMA, ALTURA_SALTO, DURACION_SALTO,
  DISTANCIA_PARA_HABLAR, MARGEN_BORDE, VELOCIDAD_CERROS, VELOCIDAD_CASAS, VELOCIDAD_PISO,
  NUMERO,
} from '../medidas.js'
import { ajustarATamano, claveIcono } from '../dibujos/dibujos.js'
import { ALTURA_MOSTRADOR } from '../dibujos/escenario.js'
import { palabraDelLetrero, textoSoles } from '../logica/nombres.js'
import { crearEstado, progresoLista, textoCartel, sumar } from '../logica/compras.js'
import { avisos } from '../logica/avisos.js'
import { Joystick } from '../interfaz/Joystick.js'
import { Cartel } from '../interfaz/Cartel.js'
import { VentanaPuesto } from '../interfaz/VentanaPuesto.js'
import { crearBoton, dibujarGlobo, fijarEnPantalla } from '../interfaz/piezas.js'

const ALTO_PUESTO = 320

export class EscenaMercado extends Phaser.Scene {
  constructor() {
    super('mercado')
  }

  init({ paquete }) {
    this.paquete = paquete
    this.estado = crearEstado(paquete)
    // Con ?rapido=1 en la dirección, el cuy camina 4 veces más rápido (para las pruebas automáticas)
    this.multiplicador = new URLSearchParams(window.location.search).get('rapido') === '1' ? 4 : 1
    this.velocidad = 0 // px por segundo; negativa = hacia la izquierda
    this.salto = { altura: 0 } // el tween del salto cambia esta altura
    this.saltando = false
    this.puedeMoverse = false // recién se mueve después de «¡Vamos!»
    this.ventana = null
    this.puestoCercano = null
    this.listaAvisada = false
    this.ultimoVuelto = null
  }

  create() {
    // El mundo: espacio para Kusi al principio, los puestos cada 600 px y un poco de espacio al final
    const cantidad = this.paquete.puestos.length
    this.anchoMundo = PRIMER_PUESTO_X + (cantidad - 1) * SEPARACION_PUESTOS + SEPARACION_PUESTOS

    this.crearFondo()
    this.crearPuestos()
    this.crearPersonajes()
    this.crearControles()
    this.cartel = new Cartel(this)
    this.actualizarCartel(false)

    // La cámara sigue al cuy con suavidad y no sale del mundo
    const camara = this.cameras.main
    camara.setBounds(0, 0, this.anchoMundo, ALTO)
    camara.startFollow(this.cuy, false, 0.08, 0.08)

    // En la computadora: flechas para caminar y barra espaciadora para saltar
    this.teclas = this.input.keyboard.createCursorKeys()
    this.input.keyboard.on('keydown-SPACE', () => this.saltar())

    this.exponerParaPruebas()
    this.mostrarHistoria()
  }

  update(tiempo, delta) {
    const segundos = Math.min(delta, 50) / 1000
    this.moverCuy(segundos, tiempo)
    this.revisarPuestoCercano()
  }

  // ---------- Fondo en tres capas ----------

  crearFondo() {
    this.crearCapa('fondo-cerros', VELOCIDAD_CERROS, 0, 500, PROFUNDIDAD.cerros)
    this.crearCapa('fondo-casas', VELOCIDAD_CASAS, 190, 330, PROFUNDIDAD.casas)
    this.crearCapa('fondo-piso', VELOCIDAD_PISO, INICIO_PISO, ALTO - INICIO_PISO, PROFUNDIDAD.piso)
  }

  // Repite un dibujo de lado a lado. Una capa que se mueve más lento que la cámara (factor < 1)
  // necesita menos ancho: solo lo que alcanza a verse mientras la cámara recorre el mundo.
  crearCapa(clave, factor, arriba, alto, profundidad) {
    const imagen = this.textures.get(clave).getSourceImage()
    const escala = alto / imagen.height
    const anchoPieza = imagen.width * escala
    const anchoNecesario = (this.anchoMundo - ANCHO) * factor + ANCHO
    // Las piezas se enciman 1 px para que no aparezcan rayitas entre ellas
    for (let x = 0; x < anchoNecesario; x += anchoPieza - 1) {
      this.add.image(x, arriba, clave).setOrigin(0, 0).setScale(escala).setScrollFactor(factor, 0).setDepth(profundidad)
    }
  }

  // ---------- Puestos ----------

  crearPuestos() {
    this.puestos = this.paquete.puestos.map((datos, i) => {
      const x = PRIMER_PUESTO_X + i * SEPARACION_PUESTOS
      const arriba = PISO_PUESTOS - ALTO_PUESTO
      const mostrador = arriba + ALTURA_MOSTRADOR

      // El vendedor va detrás del puesto: se ve por el hueco entre el toldo y el mostrador,
      // con la cara por encima de los productos
      ajustarATamano(this.add.image(x, mostrador + 4, datos.vendedor.recurso).setOrigin(0.5, 1), 150, 150)
        .setDepth(PROFUNDIDAD.vendedor)
      ajustarATamano(this.add.image(x, PISO_PUESTOS, datos.recurso).setOrigin(0.5, 1), 360, ALTO_PUESTO)
        .setDepth(PROFUNDIDAD.puesto)

      // Sus productos, en fila sobre el mostrador
      const cantidad = datos.productos.length
      datos.productos.forEach((producto, j) => {
        ajustarATamano(this.add.image(x + (j - (cantidad - 1) / 2) * 62, mostrador + 6, producto.recurso).setOrigin(0.5, 1), 52, 52)
          .setDepth(PROFUNDIDAD.producto)
      })

      this.crearLetrero(x, arriba, datos.recurso)
      const globo = this.crearGloboHablar(x, arriba + 30)
      const puesto = { datos, x, globo }
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
    for (const parte of [patas, tabla, icono, palabra]) parte.setDepth(PROFUNDIDAD.letrero)
  }

  // Globo «Hablar» sobre el vendedor; solo se ve cuando el cuy está frente al puesto.
  crearGloboHablar(x, y) {
    const dibujo = dibujarGlobo(this.add.graphics(), 184, 78, { cola: 'abajo' })
    const texto = this.add.text(0, -1, 'Hablar', estiloTexto(34)).setOrigin(0.5)
    const zona = this.add.rectangle(0, 0, 184, 78).setInteractive({ useHandCursor: true })
    const globo = this.add.container(x, y, [dibujo, texto, zona]).setDepth(PROFUNDIDAD.globoHablar).setVisible(false)
    globo.zona = zona
    // Sube y baja despacito para llamar la atención
    this.tweens.add({ targets: [dibujo, texto], y: '-=5', duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })
    return globo
  }

  // ---------- Kusi y el cuy ----------

  crearPersonajes() {
    this.add.ellipse(KUSI_X, PISO_PERSONAJES, 100, 16, 0x000000, 0.16).setDepth(PROFUNDIDAD.personajes)
    this.kusi = ajustarATamano(this.add.image(KUSI_X, PISO_PERSONAJES + 2, 'kusi').setOrigin(0.5, 1), 130, 140)
      .setDepth(PROFUNDIDAD.personajes)
    // Kusi respira: se estira apenitas hacia arriba
    this.tweens.add({ targets: this.kusi, scaleY: this.kusi.scaleY * 1.03, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })

    // El cuy del niño: un contenedor con su sombra y su dibujo (el dibujo sube al saltar)
    this.sombraCuy = this.add.ellipse(0, 0, 86, 16, 0x000000, 0.18)
    this.dibujoCuy = ajustarATamano(this.add.image(0, 0, 'cuy-nino').setOrigin(0.5, 1), 120, 112)
    this.cuy = this.add.container(CUY_INICIO_X, PISO_PERSONAJES, [this.sombraCuy, this.dibujoCuy])
      .setDepth(PROFUNDIDAD.personajes + 1)
  }

  moverCuy(segundos, tiempo) {
    // Hacia dónde quiere ir: joystick o flechas (las flechas van a toda velocidad)
    let objetivo = 0
    if (this.puedeMoverse) {
      objetivo = this.joystick.valor
      if (this.teclas.left.isDown) objetivo = -1
      else if (this.teclas.right.isDown) objetivo = 1
    }
    objetivo *= VELOCIDAD_MAXIMA * this.multiplicador

    // La velocidad se acerca al objetivo de a poco: arranca y frena suave, nunca de golpe
    const suavidad = objetivo === 0 ? 6 : 9
    this.velocidad += (objetivo - this.velocidad) * (1 - Math.exp(-suavidad * segundos))
    if (objetivo === 0 && Math.abs(this.velocidad) < 3) this.velocidad = 0

    // El cuy no sale de los bordes del mundo
    const minimo = MARGEN_BORDE
    const maximo = this.anchoMundo - MARGEN_BORDE
    this.cuy.x = Phaser.Math.Clamp(this.cuy.x + this.velocidad * segundos, minimo, maximo)
    if ((this.cuy.x === minimo && this.velocidad < 0) || (this.cuy.x === maximo && this.velocidad > 0)) this.velocidad = 0

    // Mira hacia donde camina (el dibujo mira a la derecha)
    if (this.velocidad > 8) this.dibujoCuy.setFlipX(false)
    else if (this.velocidad < -8) this.dibujoCuy.setFlipX(true)

    // Pasitos: rebota un poco mientras camina; encima se suma la altura del salto
    const rapidez = Math.min(1, Math.abs(this.velocidad) / VELOCIDAD_MAXIMA)
    const rebote = this.saltando ? 0 : Math.abs(Math.sin(tiempo / 85)) * 6 * rapidez
    this.dibujoCuy.y = -this.salto.altura - rebote
    this.sombraCuy.setScale(1 - this.salto.altura / 200)
  }

  // Sube 80 px y baja en medio segundo. En el aire no puede volver a saltar.
  saltar() {
    if (!this.puedeMoverse || this.saltando) return
    this.saltando = true
    this.tweens.add({
      targets: this.salto,
      altura: ALTURA_SALTO,
      duration: DURACION_SALTO / 2,
      ease: 'Quad.easeOut',
      yoyo: true,
      onComplete: () => {
        this.salto.altura = 0
        this.saltando = false
      },
    })
  }

  // Si el cuy está frente a un puesto (a menos de 120 px de su centro), aparece «Hablar».
  revisarPuestoCercano() {
    const puedeHablar = this.puedeMoverse && !this.ventana
    const cercano = puedeHablar
      ? this.puestos.find((puesto) => Math.abs(this.cuy.x - puesto.x) < DISTANCIA_PARA_HABLAR) ?? null
      : null
    if (cercano === this.puestoCercano) return
    if (this.puestoCercano) this.esconderGlobo(this.puestoCercano.globo)
    if (cercano) this.mostrarGlobo(cercano.globo)
    this.puestoCercano = cercano
  }

  mostrarGlobo(globo) {
    this.tweens.killTweensOf(globo)
    globo.setVisible(true).setAlpha(1).setScale(0.6)
    this.tweens.add({ targets: globo, scale: 1, duration: 220, ease: 'Back.easeOut' })
  }

  esconderGlobo(globo) {
    this.tweens.killTweensOf(globo)
    this.tweens.add({ targets: globo, scale: 0.6, alpha: 0, duration: 120, onComplete: () => globo.setVisible(false) })
  }

  // ---------- Controles en pantalla ----------

  crearControles() {
    // Joystick abajo a la izquierda
    this.joystick = new Joystick(this, 172, 646)

    // Botón «Saltar» abajo a la derecha (136 px). Salta apenas se toca, sin esperar a soltar.
    const sombra = this.add.circle(0, 6, 68, NUMERO.terracota)
    const circulo = this.add.circle(0, 0, 68, NUMERO.naranja).setStrokeStyle(5, NUMERO.tinta)
    const texto = this.add.text(0, 0, 'Saltar', estiloTexto(34)).setOrigin(0.5)
    const boton = this.add.container(1160, 638, [sombra, circulo, texto]).setDepth(PROFUNDIDAD.controles)
    const hundir = (hundido) => {
      circulo.y = hundido ? 4 : 0
      texto.y = hundido ? 4 : 0
    }
    circulo.setInteractive({ useHandCursor: true })
    circulo.on('pointerdown', () => {
      hundir(true)
      this.saltar()
    })
    circulo.on('pointerup', () => hundir(false))
    circulo.on('pointerout', () => hundir(false))
    fijarEnPantalla(boton)
    this.botonSaltar = circulo
  }

  // ---------- Globos de Kusi ----------

  // Al empezar, Kusi cuenta la historia del paquete. Recién con «¡Vamos!» el niño se puede mover.
  mostrarHistoria() {
    this.joystick.desactivar()
    const dibujo = dibujarGlobo(this.add.graphics(), 700, 290, { cola: 'izquierda', colaY: 96 })
    const texto = this.add
      .text(0, -46, this.paquete.historia, estiloTexto(32, COLOR.tinta, { wordWrap: { width: 620 } }))
      .setOrigin(0.5)
    const vamos = crearBoton(this, 0, 84, { ancho: 240, alto: 92, texto: '¡Vamos!', tamano: 38, alTocar: () => this.empezar() })
    this.globoHistoria = this.add.container(660, 330, [dibujo, texto, vamos]).setDepth(PROFUNDIDAD.globoKusi)
    this.globoHistoria.vamos = vamos
    fijarEnPantalla(this.globoHistoria)
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
    const cara = ajustarATamano(this.add.image(84, 196, 'kusi'), 104, 112)
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
    this.velocidad = 0
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
      velocidad: Math.round(this.velocidad),
      saltando: this.saltando,
      puedeMoverse: this.puedeMoverse,
      puestoCercano: this.puestoCercano?.datos.id ?? null,
      ventanaAbierta: Boolean(this.ventana),
      ventanaOcupada: this.ventana?.ocupada ?? false,
      ultimoVuelto: this.ultimoVuelto,
      puestos: this.puestos.map((puesto) => ({ id: puesto.datos.id, x: puesto.x })),
    }
  }

  buscarObjetivo(nombre) {
    if (nombre === 'vamos') return this.globoHistoria?.vamos.fondo ?? null
    if (nombre === 'hablar') return this.puestoCercano?.globo.zona ?? null
    if (nombre === 'saltar') return this.botonSaltar
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
