// La familia laberinto tiene su propia escena y reutiliza la carga compartida.
import * as Phaser from 'phaser'
import { ANCHO, COLOR, NUMERO, estiloTexto } from '../../../kit/reproductor/medidas.js'
import { ajustarATamano } from '../../../kit/reproductor/dibujos/dibujos.js'
import { CuyAnimado } from '../../../kit/reproductor/dibujos/cuyAnimado.js'
import { ZorroAnimado } from '../../../kit/reproductor/dibujos/zorroAnimado.js'
import { crearBoton, desactivarBotones } from '../../../kit/reproductor/interfaz/piezas.js'
import { encajarTextoKusi } from '../../../kit/reproductor/interfaz/textoKusi.js'
import { JoystickLaberinto } from '../interfaz/JoystickLaberinto.js'
import { BarraFrutas } from '../interfaz/BarraFrutas.js'
import { crearManoLaberinto } from '../interfaz/ManoLaberinto.js'
import { avisos } from '../../../kit/reproductor/logica/avisos.js'
import { avisarPartida, crearPartidaLaberinto } from '../logica/partidaLaberinto.js'
import { crearRegla, comerEnCasilla } from '../logica/reglasLaberinto.js'
import {
  crearZorro, avanzarZorro, restablecerZorro, posicionEnCasillas, seAtrapan,
} from '../logica/zorrosLaberinto.js'
import { decir } from '../../../kit/reproductor/logica/voz.js'
import { crearHablaKusi, avanzarHablaKusi, iniciarHablaKusi } from '../../../kit/reproductor/logica/hablaKusi.js'
import {
  crearMovimiento, pedirDireccion, avanzarMovimiento, detenerEnCentro,
} from '../logica/movimientoLaberinto.js'
import { vidaActiva } from '../../../kit/reproductor/efectos/vida.js'
import { SonidosLaberinto, esCuadroDePisada } from '../../../kit/reproductor/efectos/SonidosLaberinto.js'
import { ParpadeoCuy } from '../../../kit/reproductor/efectos/ParpadeoCuy.js'
import { CuerpoVivo, PERFIL_CUY, PERFIL_ZORRO } from '../../../kit/reproductor/efectos/CuerpoVivo.js'
import { Polvito } from '../../../kit/reproductor/efectos/Polvito.js'
import { PopFruta } from '../../../kit/reproductor/efectos/PopFruta.js'
import { FrutasVivas } from '../../../kit/reproductor/efectos/FrutasVivas.js'
import { CapturaLaberinto } from '../efectos/CapturaLaberinto.js'
import { VidaChacra } from '../efectos/VidaChacra.js'
import { PortalVivo } from '../efectos/PortalVivo.js'
import { crearPatio } from '../dibujos/patioChacra.js'
import { leerSilencio, guardarSilencio } from '../../../kit/reproductor/efectos/silencio.js'
import { crearBotonSonido, BOTON_SONIDO } from '../../../kit/reproductor/interfaz/BotonSonido.js'
import { crearAmbienteLaberinto, ajustarAmbienteLaberinto, cachearAdobes } from '../dibujos/ambienteLaberinto.js'
import { repartirMuros, tituloDeBarra } from '../logica/presentacionLaberinto.js'
import { calcularDisposicion, distribuirGuia, ubicarSonidoSuperior } from '../logica/disposicionLaberinto.js'
import { leerRenderizador } from '../../../kit/reproductor/renderizador.js'
import { leerPuente, MENSAJE_PAQUETE, MENSAJE_REINICIAR, AVISO_CARGADO } from '../../../kit/reproductor/mensajes/puenteGuion.js'

// Velocidad en casillas por segundo, independiente del tamaño del dibujo.
export const CASILLAS_POR_SEGUNDO = 3
export const PROPORCION_VELOCIDAD_ZORRO = 0.6
export const SEGUNDOS_INVULNERABLE = 2
const PASO_SIMULACION = 1 / 60

// Tamaño de los personajes. El cuy mide 1,2 casillas de alto y el zorro un 30 %
// más; los pies apoyan 0,4 casillas por debajo del centro de la casilla.
const ALTURA_CUY = 1.2
const PROPORCION_ZORRO = 1.3
const DESFASE_PIES = 0.4

// Capa de vida: sombra de cada personaje, una elipse suave y translúcida bajo los
// pies. Las medidas van en casillas para seguir el tamaño del mapa y valen para un
// personaje del tamaño del cuy; el zorro las multiplica por PROPORCION_ZORRO.
// Con ?vida=0 no se crea ninguna sombra.
const SOMBRA = {
  color: 0x4b211b, // la tinta del juego
  opacidad: 0.15,
  ancho: 0.76,
  alto: 0.18,
  desfase: 0.3, // casillas por debajo del centro de la casilla, justo sobre los pies
  profundidad: 4, // sobre el piso y las frutas, bajo los personajes
}

const VISTAS = { arriba: 'espaldas', abajo: 'frente', izquierda: 'izquierda', derecha: 'derecha' }
const AVISO_PERSECUCION = {
  segundos: 0.8,
  radio: 0.24,
  tamanoTexto: 0.52,
  tamanoMinimo: 24,
  separacionCabeza: 8,
  relleno: 0xffe7a4,
  borde: 0x4b211b,
  grosorBorde: 2,
  profundidad: 6,
}

export class EscenaLaberinto extends Phaser.Scene {
  constructor() {
    super('laberinto')
  }

  init({ paquete, cuyAnimado, zorroAnimado, partida, indiceNivel = 0, iniciada = false, anunciarNivel = false }) {
    this.paquete = paquete
    // La capa de vida se decide una vez por nivel, leyendo ?vida de la dirección.
    this.vida = vidaActiva()
    this.anunciarNivel = anunciarNivel
    this.datosCuyAnimado = cuyAnimado
    this.datosZorroAnimado = zorroAnimado
    this.partida = partida
    this.indiceNivel = indiceNivel
    this.reto = paquete.retos[this.indiceNivel]
    this.indiceAyuda = 0
    this.botones = {}
    this.movimiento = crearMovimiento(this.reto.mapa)
    this.regla = crearRegla(this.reto)
    this.zorros = this.reto.enemigos.map((enemigo, indice) => crearZorro(enemigo, this.reto.mapa, {
      vivo: true, semilla: 307 + this.indiceNivel * 97 + indice * 65537,
    }))
    this.segundosInvulnerable = 0
    this.capturas = 0
    this.multiplicador = new URLSearchParams(window.location.search).get('rapido') === '1' ? 4 : 1
    this.iniciada = iniciada
    this.terminada = false
    this.cambiandoNivel = false
    this.mensajeCierre = ''
    this.mano = null
    this.modoControl = 'teclado'
  }

  create() {
    this.cameras.main.setBackgroundColor(COLOR.crema)
    document.title = 'Kusi · El laberinto'
    this.calcularCuadricula()
    crearAmbienteLaberinto(this)
    this.actualizarEncuadre()
    this.alRedimensionar = () => { this.soltarJoystick(); this.actualizarEncuadre() }
    this.scale.on('resize', this.alRedimensionar)
    this.crearBarra()
    this.crearMapa()
    this.crearGuia()
    this.crearPersonajes()
    this.crearVida()
    this.crearControles()
    this.exponerParaPruebas()
    const primerAviso = avisarPartida(this.partida, 'listo', { familia: 'laberinto', nivel: this.indiceNivel + 1 })
    this.conectarPuente()
    // La página que contiene el juego (la vista previa del panel) se entera cuando el
    // guion ya está en pantalla. Pasa una vez por partida, no en cada nivel.
    if (primerAviso) this.puente?.avisar({ tipo: AVISO_CARGADO, niveles: this.paquete.retos.length })
    this.hablarKusi(this.reto.consigna)
    // La fanfarria de fin de nivel suena aquí y no en la escena anterior: esa se
    // destruye al reiniciarse y cortaría su propio sonido.
    if (this.anunciarNivel) this.sonidos.reproducir('nivel')
    this.events.once('shutdown', () => {
      this.puente?.desconectar(this.alRecibirOrden)
      this.sonidos.destruir()
      this.captura.destruir()
      this.input.keyboard.off('keydown', this.alPulsarFlecha)
      this.input.off('pointerdown', this.alIniciarToque)
      this.input.off('pointerup', this.alTerminarToque)
      this.input.off('pointerupoutside', this.alTerminarToque)
      this.input.off('pointermove', this.alMoverToque)
      this.game.events.off('blur', this.alPerderFoco)
      this.scale.off('resize', this.alRedimensionar)
      if (window.kusi?.estado === this.leerEstado) delete window.kusi
    })
  }

  // El laberinto acepta guiones por mensaje desde cualquier dirección de entrada;
  // esta escena atiende lo que mande la página que contiene el juego. Cada nivel es
  // una escena nueva: la anterior suelta su lugar al cerrarse y esta lo toma.
  conectarPuente() {
    this.puente = leerPuente(this.game)
    if (!this.puente) return
    this.alRecibirOrden = (orden) => this.atenderOrden(orden)
    this.puente.conectar(this.alRecibirOrden)
  }

  atenderOrden(orden) {
    if (orden.tipo === MENSAJE_PAQUETE) {
      // Un guion nuevo pasa otra vez por la carga: se comprueba, se piden los dibujos
      // que le falten (por ejemplo, una verdura que el anterior no tenía) y empieza
      // desde el primer nivel.
      this.scene.start('carga', { paquete: orden.paquete })
    } else if (orden.tipo === MENSAJE_REINICIAR) {
      // Igual que «Jugar otra vez»: el primer nivel del mismo guion, con una partida nueva.
      this.scene.restart(this.datosParaNivel(0, crearPartidaLaberinto()))
    }
  }

  // EXPAND deja espacio alrededor del mundo de diseño, sin recortar su barra ni
  // el mapa. Solo cambia la cámara: un giro del celular no reinicia la partida
  // ni sus efectos. Si el lienzo llega a ser más chico que el mundo (por ejemplo,
  // una ventana más angosta que cuando se abrió el nivel), la cámara se aleja lo
  // justo para que el mundo se siga viendo completo.
  actualizarEncuadre() {
    const { width, height } = this.scale.gameSize
    const { diseno } = this.disposicion
    const ajuste = Math.min(width / diseno.ancho, height / diseno.alto)
    this.cameras.main.setZoom(ajuste >= 0.999 ? 1 : ajuste)
    this.desplazamientoPantalla = { x: (diseno.ancho - width) / 2, y: (diseno.alto - height) / 2 }
    this.encuadrarCamara()
    ajustarAmbienteLaberinto(this)
    this.ajustarBotonSonido()
  }

  encuadrarCamara() {
    const temblor = this.captura?.scroll ?? { x: 0, y: 0 }
    this.cameras.main.setScroll(this.desplazamientoPantalla.x + temblor.x,
      this.desplazamientoPantalla.y + temblor.y)
  }

  // Dónde cae en la página un punto del mundo. La cámara acerca o aleja alrededor
  // del centro del lienzo, después de restar lo que se corrió.
  proyectar(x, y) {
    const lienzo = this.game.canvas.getBoundingClientRect()
    const camara = this.cameras.main
    const enLienzoX = camara.width / 2 + (x - camara.scrollX - camara.width / 2) * camara.zoom
    const enLienzoY = camara.height / 2 + (y - camara.scrollY - camara.height / 2) * camara.zoom
    return {
      x: lienzo.left + enLienzoX * lienzo.width / this.scale.width,
      y: lienzo.top + enLienzoY * lienzo.height / this.scale.height,
    }
  }

  calcularCuadricula() {
    const { width, height } = this.scale.gameSize
    this.disposicion = calcularDisposicion({
      ancho: width, alto: height, filas: this.reto.mapa.length, columnas: this.reto.mapa[0].length,
    })
    this.casilla = this.disposicion.casilla
    this.origenMapa = { ...this.disposicion.origen }
    this.cajaMapa = { ...this.disposicion.mapa }
  }

  centroCasilla(fila, columna) {
    return {
      x: this.origenMapa.x + (columna + 0.5) * this.casilla,
      y: this.origenMapa.y + (fila + 0.5) * this.casilla,
    }
  }

  // La barra de progreso y los botones de Escuchar y Ayuda. Dónde va cada pieza
  // lo decide la disposición de la fila superior.
  crearBarra() {
    this.barraFrutas = new BarraFrutas(this, this.disposicion, this.reto.regla,
      { activo: this.vida, objetos: this.reto.objetos })
    this.casilleros = this.barraFrutas.fichas
    this.cajaBarra = { ...this.barraFrutas.caja }
    this.tituloBarra = tituloDeBarra(this.reto.regla)
    const { escuchar, ayuda } = this.barraFrutas.datos.botones
    this.botones = {
      sonido: this.crearBotonPanel(escuchar, 'boton-voz', () => this.hablarKusi(this.reto.consigna)),
      ayuda: this.crearBotonPanel(ayuda, 'boton-ayuda', () => this.mostrarAyuda()),
    }
  }

  crearBotonPanel(caja, textura, accion) {
    const boton = this.add.image(caja.x, caja.y, textura).setDisplaySize(caja.ancho, caja.alto)
      .setDepth(1003).setInteractive({ useHandCursor: true })
    boton.on('pointerdown', (puntero, x, y, evento) => { evento.stopPropagation(); accion() })
    return boton
  }

  actualizarBarra() {
    if (this.frutasVivas) this.frutasVivas.siguiente = this.reto.regla.tipo === 'orden' && !this.regla.completada
      ? this.reto.regla.secuencia[this.regla.recogidos] : null
    this.barraFrutas.actualizar(this.regla.recogidos, this.regla.objetos)
  }

  crearMapa() {
    const { mapa } = this.reto
    const { ancho, alto } = this.cajaMapa
    this.piso = crearPatio(this)
    this.semillaMuros = this.paquete.titulo + ':' + (this.reto.id ?? this.indiceNivel)
    this.muros = repartirMuros(mapa, this.semillaMuros)
    this.sombrasMuros = []
    this.muros.forEach((muro) => {
      const punto = this.centroCasilla(muro.fila, muro.columna)
      muro.dibujo = this.crearBloque(punto, muro.textura, muro.fila)
    })
    mapa.forEach((filaTexto, fila) => {
      for (let columna = 0; columna < filaTexto.length; columna += 1) {
        const simbolo = filaTexto[columna]
        const punto = this.centroCasilla(fila, columna)
        if (simbolo === 'P') {
          this.puerta = this.add.image(punto.x, punto.y, 'portal-cerrado')
            .setDisplaySize(this.casilla, this.casilla).setDepth(2.7)
        }
        if (simbolo === 'C') this.inicio = { fila, columna }
      }
    })
    cachearAdobes(this)
    this.apoyosFrutas = []
    this.dibujosObjetos = this.reto.objetos.map((objeto) => {
      const punto = this.centroCasilla(objeto.fila, objeto.columna)
      // Este apoyo de contraste pertenece al arte, también cuando vida=0.
      this.apoyosFrutas.push(this.add.image(punto.x, punto.y, 'destellos-siguiente', 0)
        .setDisplaySize(this.casilla * 1.1, this.casilla * 1.1).setAlpha(0).setDepth(2.8))
      return this.add.image(punto.x, punto.y, objeto.tipo)
        .setDisplaySize(this.casilla * 1.05, this.casilla * 1.05).setDepth(3).setData('tipo', objeto.tipo)
    })
  }

  crearBloque(punto, textura, fila) {
    // La cara del frente cae un poco sobre la siguiente fila del piso.
    return this.add.image(punto.x, punto.y, textura)
      .setDisplaySize(this.casilla, this.casilla)
      .setDepth(2 + fila / (this.reto.mapa.length + 1) * 0.5)
  }

  // Kusi de cuerpo entero y el globo ocupan su columna. El texto del guion
  // determina la altura de la pieza ilustrada, que crece hacia arriba.
  crearGuia() {
    this.guia = distribuirGuia(this.disposicion, this.reto.consigna)
    const { guia } = this
    this.cajaGuia = { ...guia.caja }
    this.dibujoFranja = this.add.image(guia.globo.x, guia.globo.y, 'globo-dialogo-232').setOrigin(0).setFlipX(true)
    this.dibujoKusi = this.add.image(guia.kusi.x, guia.kusi.y, 'kusi-animado', 9).setOrigin(0)
      .setDisplaySize(guia.kusi.ancho, guia.kusi.alto)
    this.textoGlobo = this.add.text(guia.globo.x + 32, guia.globo.y + 24, this.reto.consigna,
      estiloTexto(24, '#4b210e', { align: 'left', wordWrap: { width: 266 } }))
    this.panelKusi = this.add.container(0, 0, [this.dibujoFranja, this.dibujoKusi, this.textoGlobo]).setDepth(1010)
    this.hablaKusi = crearHablaKusi(this.vida)
    this.ajustarTextoKusi()
  }

  ajustarTextoKusi() {
    const globo = this.guia.globo
    this.ajusteTextoKusi = encajarTextoKusi(this.textoGlobo, globo)
    globo.y = this.ajusteTextoKusi.y; globo.alto = this.ajusteTextoKusi.alto
    this.dibujoFranja.setTexture('globo-dialogo-' + globo.alto).setPosition(globo.x, globo.y)
  }

  hablarKusi(texto) {
    this.textoGlobo.setText(texto)
    this.ajustarTextoKusi()
    iniciarHablaKusi(this.hablaKusi, texto)
    const turno = this.turnoVoz = (this.turnoVoz ?? 0) + 1
    decir(texto, { alEmpezar: () => {
        if (this.turnoVoz !== turno) return
        iniciarHablaKusi(this.hablaKusi, texto)
        // La voz web informa su final. El puente Android conserva su duración estimada.
        this.hablaKusi.vozActiva = typeof window.KusiPuente?.decir !== 'function'
      },
      alTerminar: () => {
        if (this.turnoVoz !== turno) return
        this.hablaKusi.vozActiva = false
        this.hablaKusi.restante = 0
      } })
  }

  actualizarKusi(segundos) {
    const gesto = avanzarHablaKusi(this.hablaKusi, segundos)
    this.dibujoKusi.setFrame(gesto.cuadro)
  }

  mostrarAyuda(numero = null) {
    if (this.terminada || this.cambiandoNivel) return
    const indice = numero === null ? Math.min(this.indiceAyuda, this.reto.ayudas.length - 1) : numero - 1
    this.textoGlobo.setText(this.reto.ayudas[indice])
    this.indiceAyuda += 1
    avisarPartida(this.partida, 'ayuda', { nivel: this.indiceNivel + 1, ayuda: indice + 1 })
    this.hablarKusi(this.textoGlobo.text)
  }

  crearPersonajes() {
    const punto = this.centroCasilla(this.inicio.fila, this.inicio.columna)
    // Con ?vida=0 no hay sombras y el laberinto se ve como antes de la capa de vida.
    this.sombraCuy = this.vida ? this.crearSombra(1, punto) : null
    // La escala se calcula desde la línea de apoyo del manifiesto. Conserva su
    // anclaje original y deja al cuy de unas 1,2 casillas de alto a cualquier tamaño.
    this.cuy = new CuyAnimado(this, this.datosCuyAnimado)
      .setScale(this.casilla * ALTURA_CUY / this.datosCuyAnimado.anclaje.y)
      .setPosition(punto.x, punto.y + this.casilla * DESFASE_PIES).setDepth(5)
    this.auraProteccion = this.add.ellipse(punto.x, punto.y + this.casilla * 0.3,
      this.casilla * 0.95, this.casilla * 0.35, 0xffd56d, 0.2)
      .setStrokeStyle(3, 0xb2731c).setDepth(4).setVisible(false)
    this.sombrasZorros = []
    this.dibujosZorros = this.zorros.map((enemigo) => {
      const posicion = this.centroCasilla(enemigo.fila, enemigo.columna)
      // El zorro es más grande que el cuy y su sombra crece en la misma proporción.
      if (this.vida) this.sombrasZorros.push(this.crearSombra(PROPORCION_ZORRO, posicion))
      return new ZorroAnimado(this, this.datosZorroAnimado)
        .setScale(this.casilla * ALTURA_CUY * PROPORCION_ZORRO / this.datosZorroAnimado.anclaje.y)
        .setPosition(posicion.x, posicion.y + this.casilla * DESFASE_PIES).setDepth(5)
    })
    // El signo explica un cambio de conducta; se conserva también con vida=0.
    // Su posición se calcula después del rebote del cuerpo, siempre sobre la
    // cabeza, sin modificar el dibujo ni girar al personaje.
    this.avisosPersecucion = this.zorros.map(() => {
      const fondo = this.add.circle(0, 0, this.casilla * AVISO_PERSECUCION.radio, AVISO_PERSECUCION.relleno)
        .setStrokeStyle(AVISO_PERSECUCION.grosorBorde, AVISO_PERSECUCION.borde)
      const texto = this.add.text(0, 0, this.vida ? '❗' : '!', estiloTexto(
        Math.max(AVISO_PERSECUCION.tamanoMinimo, this.casilla * AVISO_PERSECUCION.tamanoTexto) * (this.vida ? 1.3 : 1),
      )).setOrigin(0.5)
      return {
        dibujo: this.add.container(0, 0, [fondo, texto]).setDepth(AVISO_PERSECUCION.profundidad).setVisible(false),
        ultimoInicio: 0, restante: 0, apariciones: 0,
      }
    })
  }

  actualizarAvisosPersecucion(segundos) {
    this.zorros.forEach((zorro, indice) => {
      const aviso = this.avisosPersecucion[indice]
      if (zorro.iniciosPersecucion > aviso.ultimoInicio) {
        aviso.restante = this.vida ? zorro.segundosAlerta : AVISO_PERSECUCION.segundos
        if (this.vida) this.sonidos.reproducir('alerta')
        aviso.apariciones += 1
      } else {
        aviso.restante = Math.max(0, aviso.restante - segundos)
      }
      aviso.ultimoInicio = zorro.iniciosPersecucion
      if (this.vida) aviso.restante = zorro.fase === 'alerta' ? zorro.segundosAlerta : 0
      else if (!zorro.persiguiendo) aviso.restante = 0
      const salto = this.vida && aviso.restante > 0
        ? Math.sin((0.6 - aviso.restante) / 0.6 * Math.PI) * this.casilla * 0.22 : 0
      const cuerpo = this.dibujosZorros[indice]
      aviso.dibujo.setPosition(cuerpo.x,
        cuerpo.y - this.casilla * ALTURA_CUY * PROPORCION_ZORRO - AVISO_PERSECUCION.separacionCabeza - salto)
        .setVisible(aviso.restante > 0)
    })
  }

  // Una sombra es una elipse suave y translúcida bajo los pies. El cuy y los
  // zorros usan la misma receta; solo cambia la proporción con su tamaño.
  // «centro» es el centro de la casilla que pisa el personaje.
  crearSombra(proporcion, centro) {
    const sombra = this.add.ellipse(0, 0, this.casilla * SOMBRA.ancho * proporcion,
      this.casilla * SOMBRA.alto * proporcion, SOMBRA.color, SOMBRA.opacidad)
      .setDepth(SOMBRA.profundidad)
    return this.colocarSombra(sombra, centro)
  }

  colocarSombra(sombra, centro) {
    return sombra.setPosition(centro.x, centro.y + this.casilla * SOMBRA.desfase)
  }

  // Efectos que viven encima de las animaciones por cuadros. Con ?vida=0 se crean
  // apagados: la escena sigue llamándolos igual, pero no hacen nada.
  crearVida() {
    this.vidaChacra = new VidaChacra(this, { activo: this.vida })
    // El silencio que se eligió antes, en este nivel o en otro, se conserva.
    this.sonidos = new SonidosLaberinto(this, { activo: this.vida, silenciado: leerSilencio() })
    this.parpadeo = new ParpadeoCuy(this.cuy, { activo: this.vida })
    // Conserva la geometría fija de las poses ilustradas; el cuerpo no las deforma.
    this.cuerpoCuy = new CuerpoVivo(this.cuy, PERFIL_CUY, { casilla: this.casilla, activo: false })
    this.cuerposZorros = this.dibujosZorros.map((dibujo) =>
      new CuerpoVivo(dibujo, PERFIL_ZORRO, { casilla: this.casilla, activo: false }))
    this.polvito = new Polvito(this, { casilla: this.casilla, activo: this.vida })
    this.popFruta = new PopFruta(this, { casilla: this.casilla, activo: this.vida })
    // Cada fruta flota alrededor del centro de su casilla, con su propio desfase.
    const basesDeLasFrutas = this.reto.objetos.map((objeto) => this.centroCasilla(objeto.fila, objeto.columna))
    this.frutasVivas = new FrutasVivas(this, this.dibujosObjetos, basesDeLasFrutas,
      { casilla: this.casilla, activo: this.vida, brillos: this.apoyosFrutas })
    this.actualizarBarra()
    // Al ser atrapado, los zorros se detienen junto con todo lo demás.
    this.captura = new CapturaLaberinto(this, {
      ancho: ANCHO, congelables: this.dibujosZorros, activo: this.vida,
      // El temblor se suma al encuadre de la pantalla y vuelve a él al apagarse.
      desfase: () => this.desplazamientoPantalla,
    })
    this.puertaViva = new PortalVivo(this, this.puerta, { casilla: this.casilla, activo: this.vida })
    this.ultimosCuadros = new Map()
    // Sin vida no hay sonidos que apagar y tampoco botón.
    if (this.vida) {
      this.botones.altavoz = crearBotonSonido(this, {
        silenciado: this.sonidos.silenciado,
        alTocar: () => {
          this.alternarSonido()
        },
      })
      this.ajustarBotonSonido()
    }
  }

  // El altavoz apaga todos los sonidos de golpe, también el que esté sonando, y
  // vuelve a encenderlos; la elección se guarda para los niveles siguientes.
  alternarSonido() {
    const silenciado = this.sonidos.cambiarSilencio()
    guardarSilencio(silenciado)
    this.botones.altavoz.mostrar(silenciado)
  }

  ajustarBotonSonido() {
    if (!this.botones?.altavoz) return
    const punto = ubicarSonidoSuperior({ mundoAncho: this.disposicion.diseno.ancho }, BOTON_SONIDO)
    this.botones.altavoz.setPosition(punto.x, punto.y)
  }

  // ¿Se apoyó un pie en este cuadro? El ciclo de caminar apoya un pie en el primer
  // y el tercer cuadro; el cuadro se compara con el anterior para que cada apoyo
  // cuente una sola vez. Una expresión (feliz, asustado) no cuenta como caminar
  // aunque el personaje se esté desplazando.
  detectarPisada(dibujo) {
    const caminando = dibujo.estadoMovimiento === 'caminar' && !dibujo.estadoExpresivo
    const cuadro = caminando ? dibujo.anims.currentFrame : null
    if (cuadro === this.ultimosCuadros.get(dibujo)) return false
    this.ultimosCuadros.set(dibujo, cuadro)
    return esCuadroDePisada(cuadro)
  }

  // Cada pisada suena y, cada dos pasos, levanta una nubecita de polvo detrás de
  // los pies. «centro» es el centro de la casilla que pisa el personaje; el
  // polvo sale de su línea de apoyo, sin el rebote del cuerpo.
  alPisar(clave, sonido, centro, direccion, tamano, polvo = true) {
    this.sonidos.reproducir(sonido)
    if (polvo) this.polvito.alPisar(clave, centro.x, centro.y + this.casilla * DESFASE_PIES, direccion, tamano)
  }

  // Una pulsación elige el rumbo y no exige sostener la tecla. Ignorar la
  // repetición del sistema evita que una tecla sostenida borre un giro guardado.
  crearControles() {
    const direcciones = {
      ArrowUp: 'arriba', ArrowDown: 'abajo', ArrowLeft: 'izquierda', ArrowRight: 'derecha',
    }
    this.input.keyboard.addCapture(Object.keys(direcciones))
    this.alPulsarFlecha = (evento) => {
      const direccion = direcciones[evento.key]
      if (!direccion || evento.repeat) return
      evento.preventDefault()
      this.elegirRumbo(direccion)
    }
    this.input.keyboard.on('keydown', this.alPulsarFlecha)

    this.joystick = new JoystickLaberinto(this)
    this.mano = crearManoLaberinto(this, this.guia.joystick)
    this.alIniciarToque = (puntero, objetosTocados = []) => {
      if (objetosTocados.length || this.terminada || this.cambiandoNivel || this.captura.congelado) return
      if (!this.joystick.iniciar(puntero)) return
      this.modoControl = 'joystick'
      detenerEnCentro(this.movimiento)
      this.alMoverToque(puntero)
    }
    this.alMoverToque = (puntero) => {
      const gesto = this.joystick.mover(puntero)
      if (!gesto) return
      if (gesto.direccion) {
        pedirDireccion(this.movimiento, gesto.direccion)
        this.iniciarNivel()
      } else detenerEnCentro(this.movimiento)
    }
    this.alTerminarToque = (puntero) => this.soltarJoystick(puntero)
    this.alPerderFoco = () => this.soltarJoystick()
    this.game.events.on('blur', this.alPerderFoco)
    this.input.on('pointerdown', this.alIniciarToque)
    this.input.on('pointermove', this.alMoverToque)
    this.input.on('pointerup', this.alTerminarToque)
    this.input.on('pointerupoutside', this.alTerminarToque)
  }

  puntoEnPantalla(puntero) {
    const lienzo = this.game.canvas.getBoundingClientRect()
    return { x: puntero.x * lienzo.width / this.scale.width, y: puntero.y * lienzo.height / this.scale.height }
  }

  soltarJoystick(puntero = null) {
    if (this.joystick?.soltar(puntero)) detenerEnCentro(this.movimiento)
  }

  elegirRumbo(direccion) {
    if (this.terminada || this.cambiandoNivel || this.captura.congelado) return
    this.soltarJoystick()
    this.modoControl = 'teclado'
    pedirDireccion(this.movimiento, direccion)
    this.iniciarNivel()
  }

  iniciarNivel() {
    this.mano?.ocultar()
    if (!this.iniciada) {
      this.iniciada = true
      avisarPartida(this.partida, 'inicio', { nivel: this.indiceNivel + 1 })
    }
  }

  procesarCasilla({ fila, columna }) {
    // Joystick y flechas usan la misma regla al entrar en cada casilla.
    const resultado = comerEnCasilla(this.regla, this.reto.regla, fila, columna)
    if (resultado) {
      avisarPartida(this.partida, 'accion', {
        nivel: this.indiceNivel + 1, objeto: resultado.objeto, correcto: resultado.correcto,
      })
      const dibujo = this.dibujosObjetos[resultado.indice]
      if (resultado.correcto) {
        this.apoyosFrutas[resultado.indice].setVisible(false)
        // Con vida la fruta hace pop y salen estrellitas; sin ella solo desaparece.
        this.popFruta.comer(dibujo)
        this.actualizarBarra()
        this.cuy.mostrarEstado('feliz', 'frente')
        this.sonidos.reproducir('comer')
        if (this.regla.completada) {
          this.puerta.setTexture('portal-abierto')
          this.sonidos.reproducir('puerta')
          // Con vida la puerta además rebota y suelta confeti.
          this.puertaViva.abrir()
        }
      } else {
        // Solo rebota la fruta. El cuy conserva su posición, velocidad y giro
        // guardado; cruzar otra vez esta casilla permite intentar de nuevo.
        const objeto = this.regla.objetos[resultado.indice]
        const base = this.centroCasilla(objeto.fila, objeto.columna)
        this.tweens.killTweensOf(dibujo)
        dibujo.setPosition(base.x, base.y)
        this.tweens.add({ targets: dibujo, y: base.y - this.casilla * 0.2,
          duration: 110, yoyo: true, ease: 'Sine.easeOut' })
        this.sonidos.reproducir('error')
        this.mostrarAyuda(resultado.ayuda)
      }
    }
    if (this.reto.mapa[fila][columna] === 'P' && this.regla.completada) {
      this.completarNivel()
      return false
    }
    return true
  }

  datosParaNivel(indiceNivel, partida = this.partida) {
    return {
      paquete: this.paquete, cuyAnimado: this.datosCuyAnimado, zorroAnimado: this.datosZorroAnimado,
      partida, indiceNivel, iniciada: partida === this.partida && this.iniciada,
    }
  }

  completarNivel() {
    if (this.cambiandoNivel || this.terminada) return
    this.soltarJoystick()
    // El cierre se observa en este mismo cuadro, antes de que el callback de
    // movimiento termine. No puede quedar una dirección activa bajo la cortina.
    detenerEnCentro(this.movimiento)
    avisarPartida(this.partida, 'reto_completado', { nivel: this.indiceNivel + 1 })
    if (this.indiceNivel + 1 < this.paquete.retos.length) {
      this.cambiandoNivel = true
      this.scene.restart({ ...this.datosParaNivel(this.indiceNivel + 1), anunciarNivel: true })
    } else {
      this.terminada = true
      this.mensajeCierre = this.paquete.cierre?.mensaje ?? '¡Lo lograste! Gracias por ayudar a Kusi.'
      this.sonidos.reproducir('nivel')
      decir(this.mensajeCierre)
      avisarPartida(this.partida, 'fin', { niveles: this.paquete.retos.length })
      this.mostrarCierre()
    }
  }

  mostrarCierre() {
    // Los controles cubiertos por el cierre dejan de recibir toques. El último
    // aviso de la partida es fin; Jugar otra vez crea un identificador nuevo.
    desactivarBotones(this.botones)
    // La cortina es mucho más grande que el mundo: también tapa las franjas que
    // EXPAND añade en una pantalla alargada, y la despedida queda centrada.
    const centro = { x: this.disposicion.diseno.ancho / 2, y: this.disposicion.diseno.alto / 2 }
    this.add.rectangle(centro.x, centro.y, 8000, 6000, NUMERO.crema, 1).setDepth(2000)
    ajustarATamano(this.add.image(centro.x, 300, 'kusi-animado', 9).setOrigin(0.5, 1), 180, 204).setDepth(2001)
    this.add.text(centro.x, 386, this.mensajeCierre, estiloTexto(40, COLOR.tinta, {
      wordWrap: { width: 820 }, lineSpacing: 8,
    })).setOrigin(0.5).setDepth(2001)
    this.botones.repetir = crearBoton(this, centro.x, 554, {
      ancho: 320, alto: 82, texto: 'Jugar otra vez', tamano: 32,
      alTocar: () => this.scene.restart(this.datosParaNivel(0, crearPartidaLaberinto())),
    }).setDepth(2002)
  }

  posicionMovimiento() {
    const posicion = posicionEnCasillas(this.movimiento)
    return this.centroCasilla(posicion.fila, posicion.columna)
  }

  capturarCuy() {
    this.soltarJoystick()
    this.movimiento = crearMovimiento(this.reto.mapa)
    this.zorros.forEach(restablecerZorro)
    this.avisosPersecucion.forEach((aviso) => {
      aviso.ultimoInicio = 0
      aviso.restante = 0
      aviso.dibujo.setVisible(false)
    })
    this.segundosInvulnerable = SEGUNDOS_INVULNERABLE
    this.capturas += 1
    // Se restablece solo el movimiento. La regla y sus dibujos conservan todas
    // las frutas recogidas y la puerta permanece abierta si ya estaba completa.
    this.cuy.mostrarEstado('asustado', 'frente')
    avisarPartida(this.partida, 'accion', { nivel: this.indiceNivel + 1, atrapado: true })
  }

  // El zorro toca al cuy. Con vida, suena el quejido, el juego se congela un
  // instante y la pantalla tiembla muy suave; la captura de verdad (volver al
  // inicio y asustarse) se aplica al terminar ese instante. Sin vida ocurre de
  // golpe, como antes de la capa de vida.
  alTocarElZorro() {
    this.soltarJoystick()
    this.sonidos.reproducir('captura')
    if (!this.captura.iniciar()) this.capturarCuy()
  }

  avanzarPartida(segundos) {
    let restante = segundos
    while (restante > 0.000000001 && !this.terminada && !this.cambiandoNivel) {
      const paso = Math.min(PASO_SIMULACION, restante)
      restante -= paso
      // La protección usa segundos reales; rapido acelera los desplazamientos,
      // pero no acorta los dos segundos para recuperarse después de una captura.
      this.segundosInvulnerable = Math.max(0, this.segundosInvulnerable - paso)
      avanzarMovimiento(this.movimiento, this.reto.mapa, paso, CASILLAS_POR_SEGUNDO * this.multiplicador,
        (casilla) => this.procesarCasilla(casilla))
      // El zorro explora desde que aparece el nivel, aunque el niño esté quieto.
      if (this.terminada || this.cambiandoNivel) continue
      for (const zorro of this.zorros) {
        avanzarZorro(zorro, this.reto.mapa, this.movimiento, paso,
          CASILLAS_POR_SEGUNDO * PROPORCION_VELOCIDAD_ZORRO * this.multiplicador)
      }
      // Los pasos pequeños también detectan personajes que se cruzan entre dos
      // centros, sin depender de la velocidad de dibujo ni saltarse al zorro.
      if (this.segundosInvulnerable === 0 && this.zorros.some((zorro) => seAtrapan(this.movimiento, zorro))) {
        this.alTocarElZorro()
        break
      }
    }
  }

  update(tiempo, delta) {
    if (!this.cuy || delta <= 0) return
    // Una pestaña que vuelve de segundo plano no debe teletransportar al niño.
    // La lógica pura sí consume deltas completos; la escena limita la pausa visual.
    const segundos = Math.min(delta, 100) / 1000
    // Captura: mientras el juego está congelado no avanza nada (ni los personajes ni
    // sus animaciones); el temblor de la pantalla sí sigue. Al terminar el congelado
    // se aplica la captura, antes de medir cuánto se movió cada personaje.
    const captura = this.captura.actualizar(segundos)
    if (captura.congelado) return
    if (captura.termino) this.capturarCuy()
    const anterior = this.posicionMovimiento()
    const anterioresZorros = this.zorros.map(posicionEnCasillas)
    if (!this.terminada && !this.cambiandoNivel) {
      this.avanzarPartida(segundos)
    }
    const punto = this.posicionMovimiento()
    this.cuy.setPosition(punto.x, punto.y + this.casilla * DESFASE_PIES)
    if (this.sombraCuy) this.colocarSombra(this.sombraCuy, punto)
    this.auraProteccion.setPosition(punto.x, punto.y + this.casilla * 0.3)
      .setVisible(this.segundosInvulnerable > 0)
    const distancia = this.movimiento.moviendose ? Math.hypot(punto.x - anterior.x, punto.y - anterior.y) : 0
    // El parpadeo decide antes de animar: si el cuy empieza a caminar, corta el
    // parpadeo y animarMovimiento pone el caminar en este mismo cuadro.
    this.parpadeo.actualizar(segundos, distancia > 0.01)
    this.cuy.animarMovimiento(VISTAS[this.movimiento.direccion], distancia, segundos, tiempo)
    if (this.detectarPisada(this.cuy)) this.alPisar('cuy', 'paso_cuy', punto, this.movimiento.direccion, 1)
    this.cuerpoCuy.actualizar(segundos)
    this.zorros.forEach((zorro, indice) => {
      const posicion = posicionEnCasillas(zorro)
      const centro = this.centroCasilla(posicion.fila, posicion.columna)
      const anteriorZorro = anterioresZorros[indice]
      const distanciaZorro = Math.hypot(posicion.fila - anteriorZorro.fila, posicion.columna - anteriorZorro.columna)
      const dibujoZorro = this.dibujosZorros[indice]
      dibujoZorro.setPosition(centro.x, centro.y + this.casilla * DESFASE_PIES)
      if (this.vida && (zorro.fase === 'alerta' || zorro.fase === 'cansado')) {
        // Estos ciclos mandan mientras el zorro está detenido. No se pasa por
        // quieto en cada cuadro: así la expresión puede avanzar sin reiniciarse.
        dibujoZorro.estadoMovimiento = 'reposo'
        dibujoZorro.mostrarEstado(zorro.fase, 'frente')
      } else dibujoZorro.animarMovimiento(VISTAS[zorro.direccion], distanciaZorro * this.casilla, segundos, tiempo)
      if (this.sombrasZorros[indice]) this.colocarSombra(this.sombrasZorros[indice], centro)
      if (this.detectarPisada(dibujoZorro)) {
        this.alPisar('zorro' + indice, 'paso_zorro', centro, zorro.direccion, PROPORCION_ZORRO, zorro.fase === 'perseguir')
      }
      this.cuerposZorros[indice].actualizar(segundos)
    })
    this.actualizarAvisosPersecucion(segundos)
    this.vidaChacra.actualizar(segundos)
    this.actualizarKusi(segundos)
    this.barraFrutas.animar(segundos)
    this.mano?.actualizar(segundos)
    this.frutasVivas.actualizar(segundos)
    this.puertaViva.actualizar(segundos)
  }

  leerSombra(sombra) {
    if (!sombra) return null
    return {
      x: sombra.x, y: sombra.y, ancho: sombra.width, alto: sombra.height,
      opacidad: sombra.fillAlpha, profundidad: sombra.depth,
    }
  }

  exponerParaPruebas() {
    // Solo lectura. Las pruebas realizan las acciones
    // con teclado y puntero reales; no existe un atajo para mover al personaje.
    this.leerEstado = () => ({
      familia: 'laberinto', nivel: this.indiceNivel + 1, mapa: this.reto.mapa.map((fila) => fila),
      pantalla: {
        renderizador: leerRenderizador(this.game),
        ancho: this.scale.width, alto: this.scale.height,
        escala: this.game.canvas.getBoundingClientRect().width / this.scale.width,
        fps: this.game.loop.actualFps,
        desplazamiento: { ...this.desplazamientoPantalla },
      },
      presentacion: {
        fondo: {
          x: this.fondoPueblito.x,
          y: this.fondoPueblito.y,
          ancho: this.fondoPueblito.displayWidth, alto: this.fondoPueblito.displayHeight,
        },
        disposicion: this.disposicion.tipo, zoom: this.cameras.main.zoom,
        barra: { ...this.cajaBarra }, mapa: { ...this.cajaMapa }, guia: { ...this.cajaGuia },
        // El globo con su colita, que sobresale por debajo.
        globo: { x: this.guia.globo.x, y: this.guia.globo.y, ancho: this.guia.globo.ancho, alto: this.guia.globo.alto },
        kusi: { x: this.dibujoKusi.x,
          y: this.dibujoKusi.y,
          ancho: this.dibujoKusi.displayWidth, alto: this.dibujoKusi.displayHeight },
        piso: { tipo: this.piso.type, cantidad: 1, textura: this.piso.texture.key },
        semillaMuros: this.semillaMuros,
        muros: this.muros.map(({ fila, columna, variante, dibujo, matas }) => ({ fila, columna, variante, textura: dibujo.texture.key, matas: Boolean(matas), profundidad: dibujo.depth })),
        sombrasMuros: this.sombrasMuros.length, vineta: Boolean(this.vineta?.visible),
        puerta: this.puerta.texture.key,
        textoKusi: this.ajusteTextoKusi,
      },
      casilla: this.casilla, origenMapa: { ...this.origenMapa },
      inicio: { ...this.inicio }, consigna: this.textoGlobo.text,
      movimiento: { ...this.movimiento }, velocidad: CASILLAS_POR_SEGUNDO * this.multiplicador,
      modoControl: this.modoControl, joystick: this.joystick.estado(),
      regla: { ...this.regla, objetos: this.regla.objetos.map((objeto) => ({ ...objeto })) },
      // La regla del nivel tal como la escribe el guion, y lo que muestra la barra de arriba.
      reglaDelReto: structuredClone(this.reto.regla),
      barra: { titulo: this.tituloBarra, indicacion: this.barraFrutas.etiqueta.text,
        fichas: this.casilleros.length, estados: this.barraFrutas.estado() },
      kusiAnimado: { cuadro: this.dibujoKusi.frame.name, animacion: this.hablaKusi.animacion, hablando: this.hablaKusi.restante > 0 },
      puertaAbierta: this.regla.completada, terminada: this.terminada, mensajeCierre: this.mensajeCierre,
      manoVisible: Boolean(this.mano?.visible),
      invulnerable: this.segundosInvulnerable > 0, segundosInvulnerable: this.segundosInvulnerable,
      capturas: this.capturas,
      zorros: this.zorros.map((zorro, indice) => ({
        ...zorro, inicio: { ...zorro.inicio }, visitas: { ...zorro.visitas },
        mirando: this.dibujosZorros[indice].direccionAnimada,
        avisoPersecucion: {
          visible: this.avisosPersecucion[indice].dibujo.visible,
          x: this.avisosPersecucion[indice].dibujo.x, y: this.avisosPersecucion[indice].dibujo.y,
          texto: this.vida ? '❗' : '!', apariciones: this.avisosPersecucion[indice].apariciones,
        },
        animacion: this.dibujosZorros[indice].anims.currentAnim?.key,
        flipX: this.dibujosZorros[indice].flipX, fotograma: this.dibujosZorros[indice].frame.name,
        // Posición real del zorro, sin el rebote de sus pasos.
        x: this.dibujosZorros[indice].x - this.cuerposZorros[indice].desplazamiento.x,
        y: this.dibujosZorros[indice].y - this.cuerposZorros[indice].desplazamiento.y,
      })),
      // Posición real del cuy, sin el rebote ni la sacudida que se le suman al dibujo.
      cuyX: this.cuy.x - this.cuerpoCuy.desplazamiento.x, cuyY: this.cuy.y - this.cuerpoCuy.desplazamiento.y,
      vida: {
        activa: this.vida,
        sombras: {
          cuy: this.leerSombra(this.sombraCuy),
          zorros: this.sombrasZorros.map((sombra) => this.leerSombra(sombra)),
        },
        cuerpos: { cuy: this.cuerpoCuy.estado(), zorros: this.cuerposZorros.map((cuerpo) => cuerpo.estado()) },
        polvito: this.polvito.estado(),
        pop: this.popFruta.estado(),
        frutasVivas: this.frutasVivas.estado(),
        puerta: this.puertaViva.estado(),
        chacra: this.vidaChacra.estado(),
        botonSonido: this.botones.altavoz ? {
          x: this.botones.altavoz.x, y: this.botones.altavoz.y, ancho: BOTON_SONIDO.ancho, alto: BOTON_SONIDO.alto,
          silenciado: this.botones.altavoz.silenciado,
        } : null,
        captura: {
          ...this.captura.estado(),
          camara: {
            scrollX: this.cameras.main.scrollX, scrollY: this.cameras.main.scrollY,
            rotacion: this.cameras.main.rotation, zoom: this.cameras.main.zoom,
          },
        },
        frutas: this.dibujosObjetos.map((dibujo) => ({
          x: dibujo.x, y: dibujo.y, visible: dibujo.visible, alpha: dibujo.alpha,
          textura: dibujo.texture.key, cuadro: dibujo.frame.name,
          escalaX: dibujo.scaleX, escalaY: dibujo.scaleY,
        })),
        parpadeos: this.parpadeo.parpadeos,
        sonidos: this.sonidos.estado(),
      },
      animacionCuy: {
        clave: this.cuy.anims.currentAnim?.key, fotograma: this.cuy.frame.name,
        estado: this.cuy.estadoMovimiento, flipX: this.cuy.flipX,
      },
    })
    window.kusi = {
      listo: true, avisos, estado: this.leerEstado,
      proyectar: (x, y) => this.proyectar(x, y),
      ubicarCasilla: (fila, columna) => {
        const punto = this.centroCasilla(fila, columna)
        return this.proyectar(punto.x, punto.y)
      },
      ubicar: (nombre) => {
        const boton = this.botones[nombre]
        if (!boton) return null
        return this.proyectar(boton.x, boton.y)
      },
    }
  }
}
