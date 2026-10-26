// La familia laberinto tiene su propia escena y reutiliza la carga compartida.
import * as Phaser from 'phaser'
import { ANCHO, COLOR, NUMERO, estiloTexto } from '../medidas.js'
import { ajustarATamano } from '../dibujos/dibujos.js'
import { CuyAnimado } from '../dibujos/cuyAnimado.js'
import { ZorroAnimado } from '../dibujos/zorroAnimado.js'
import { crearBoton, dibujarGlobo } from '../interfaz/piezas.js'
import { crearManoLaberinto } from '../interfaz/ManoLaberinto.js'
import { avisos } from '../logica/avisos.js'
import { avisarPartida, crearPartidaLaberinto } from '../logica/partidaLaberinto.js'
import { crearRegla, comerEnCasilla } from '../logica/reglasLaberinto.js'
import {
  crearZorro, avanzarZorro, restablecerZorro, posicionEnCasillas, seAtrapan,
} from '../logica/zorrosLaberinto.js'
import { decir } from '../logica/voz.js'
import {
  crearMovimiento, pedirDireccion, avanzarMovimiento, iniciarRecorrido,
} from '../logica/movimientoLaberinto.js'
import { planearRuta } from '../logica/rutaLaberinto.js'
import { vidaActiva } from '../efectos/vida.js'
import { SonidosLaberinto, esCuadroDePisada } from '../efectos/SonidosLaberinto.js'
import { ParpadeoCuy } from '../efectos/ParpadeoCuy.js'
import { CuerpoVivo, PERFIL_CUY, PERFIL_ZORRO } from '../efectos/CuerpoVivo.js'
import { Polvito } from '../efectos/Polvito.js'
import { PopFruta } from '../efectos/PopFruta.js'
import { FrutasVivas } from '../efectos/FrutasVivas.js'
import { CapturaLaberinto } from '../efectos/CapturaLaberinto.js'
import { PuertaViva } from '../efectos/PuertaViva.js'
import { leerSilencio, guardarSilencio } from '../efectos/silencio.js'
import { crearBotonSonido, BOTON_SONIDO } from '../interfaz/BotonSonido.js'
import { crearAmbienteLaberinto, ajustarAmbienteLaberinto, decorarPradera, cachearAdobes } from '../dibujos/ambienteLaberinto.js'
import { repartirMuros, tituloDeBarra } from '../logica/presentacionLaberinto.js'
import { calcularDisposicion, distribuirBarra, distribuirGuia } from '../logica/disposicionLaberinto.js'
import { leerRenderizador } from '../renderizador.js'
import { leerPuente, MENSAJE_PAQUETE, MENSAJE_REINICIAR, AVISO_CARGADO } from '../mensajes/puenteGuion.js'

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
const TOQUE = { tolerancia: 12, radioDestino: 0.22, grosorDestino: 4, colorDestino: 0xb4611f, profundidad: 4 }
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
    this.movimiento = crearMovimiento(this.reto.mapa)
    this.regla = crearRegla(this.reto)
    this.zorros = this.reto.enemigos.map((enemigo) => crearZorro(enemigo, this.reto.mapa))
    this.nivelIniciado = false
    this.segundosInvulnerable = 0
    this.capturas = 0
    this.multiplicador = new URLSearchParams(window.location.search).get('rapido') === '1' ? 4 : 1
    this.iniciada = iniciada
    this.terminada = false
    this.cambiandoNivel = false
    this.mensajeCierre = ''
    this.mano = null
    this.iniciosToque = new Map()
    this.modoControl = 'teclado'
    this.destino = null
    this.ruta = []
    this.frutaObjetivo = null
  }

  create() {
    this.cameras.main.setBackgroundColor(COLOR.crema)
    document.title = 'Kusi · El laberinto'
    crearAmbienteLaberinto(this)
    // La disposición se elige una vez por nivel, según la forma de la pantalla.
    this.calcularCuadricula()
    this.actualizarEncuadre()
    this.alRedimensionar = () => this.actualizarEncuadre()
    this.scale.on('resize', this.alRedimensionar)
    this.crearBarra()
    this.crearMapa()
    this.crearGuia()
    this.crearPersonajes()
    this.crearVida()
    this.crearControles()
    if (this.indiceNivel === 0) {
      const fruta = this.reto.objetos[0]
      if (fruta) this.mano = crearManoLaberinto(this, this.centroCasilla(fruta.fila, fruta.columna))
    }
    this.exponerParaPruebas()
    const primerAviso = avisarPartida(this.partida, 'listo', { familia: 'laberinto', nivel: this.indiceNivel + 1 })
    this.conectarPuente()
    // La página que contiene el juego (la vista previa del panel) se entera cuando el
    // guion ya está en pantalla. Pasa una vez por partida, no en cada nivel.
    if (primerAviso) this.puente?.avisar({ tipo: AVISO_CARGADO, niveles: this.paquete.retos.length })
    decir(this.reto.consigna)
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
      this.input.off('pointerupoutside', this.alCancelarToque)
      this.iniciosToque.clear()
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
  // lo decide la disposición: una tira arriba o una tarjeta en el panel lateral.
  crearBarra() {
    this.casilleros = []
    const regla = this.reto.regla
    const barra = distribuirBarra(this.disposicion, regla)
    const { caja } = barra
    this.cajaBarra = { ...caja }
    this.add.rectangle(caja.x + caja.ancho / 2, caja.y + caja.alto / 2, caja.ancho, caja.alto, NUMERO.papel)
      .setRounded(24).setStrokeStyle(3, 0xd8b990).setDepth(1000)
    this.tituloBarra = tituloDeBarra(regla)
    this.add.text(barra.titulo.x, barra.titulo.y, this.tituloBarra, estiloTexto(30)).setDepth(1001)
    this.add.text(barra.subtitulo.x, barra.subtitulo.y, 'Nivel ' + (this.indiceNivel + 1) + ' de ' + this.paquete.retos.length,
      estiloTexto(23, COLOR.tintaSuave)).setDepth(1001)

    if (regla.tipo === 'orden') {
      barra.fichas.forEach((ficha, indice) => {
        const fondo = this.add.rectangle(ficha.x, ficha.y, ficha.ancho, ficha.alto, indice === 0 ? 0xffe0a3 : 0xf6ebd8)
          .setRounded(16).setStrokeStyle(indice === 0 ? 4 : 2, indice === 0 ? 0xb4611f : 0xd8b990)
          .setDepth(1001)
        ajustarATamano(this.add.image(ficha.imagen.x, ficha.imagen.y, regla.secuencia[indice]),
          ficha.imagen.lado, ficha.imagen.lado).setDepth(1002)
        this.casilleros.push({ fondo, marca: this.crearMarca(ficha.marca.x, ficha.marca.y) })
      })
    } else {
      ajustarATamano(this.add.image(barra.icono.x, barra.icono.y, 'clase-' + regla.clase),
        barra.icono.lado, barra.icono.lado).setDepth(1002)
      barra.fichas.forEach((ficha) => {
        const fondo = this.add.rectangle(ficha.x, ficha.y, ficha.ancho, ficha.alto, 0xf6ebd8)
          .setRounded(12).setStrokeStyle(3, 0xb99a70).setDepth(1001)
        this.casilleros.push({ fondo, marca: this.crearMarca(ficha.marca.x, ficha.marca.y) })
      })
    }

    const { escuchar, ayuda } = barra.botones
    this.botones = {
      sonido: crearBoton(this, escuchar.x, escuchar.y, {
        ancho: escuchar.ancho, alto: escuchar.alto, texto: 'Escuchar', tamano: escuchar.tamano,
        alTocar: () => {
          decir(this.reto.consigna)
        },
      }).setDepth(1003),
      ayuda: crearBoton(this, ayuda.x, ayuda.y, {
        ancho: ayuda.ancho, alto: ayuda.alto, texto: 'Ayuda', tamano: ayuda.tamano,
        alTocar: () => {
          this.mostrarAyuda()
        },
      }).setDepth(1003),
    }
  }

  crearMarca(x, y) {
    const marca = this.add.graphics().setPosition(x, y).setDepth(1004).setVisible(false)
    marca.fillStyle(0x326b39).fillCircle(0, 0, 13)
    marca.lineStyle(4, 0xffffff).beginPath().moveTo(-7, 0).lineTo(-2, 5).lineTo(7, -6).strokePath()
    return marca
  }

  actualizarBarra() {
    this.casilleros.forEach(({ fondo, marca }, indice) => {
      const recogido = indice < this.regla.recogidos
      const siguiente = !this.regla.completada && indice === this.regla.recogidos
      fondo.setFillStyle(recogido ? 0xdceac4 : siguiente ? 0xffe0a3 : 0xf6ebd8)
        .setStrokeStyle(siguiente ? 4 : 2, siguiente ? 0xb4611f : 0xb99a70)
      marca.setVisible(recogido)
    })
  }

  crearMapa() {
    const { mapa } = this.reto
    const { ancho, alto } = this.cajaMapa
    // Una sola superficie continua: la textura no vuelve a empezar en cada casilla.
    this.piso = this.add.tileSprite(this.origenMapa.x, this.origenMapa.y, ancho, alto, 'piso-tierra')
      .setOrigin(0).setDepth(1)
    this.piso.setTileScale(this.casilla * 5 / this.textures.get('piso-tierra').getSourceImage().width)
    decorarPradera(this, this.disposicion.decoracion)
    this.semillaMuros = this.paquete.titulo + ':' + (this.reto.id ?? this.indiceNivel)
    this.muros = repartirMuros(mapa, this.semillaMuros)
    this.sombrasMuros = []
    this.muros.forEach((muro) => {
      const punto = this.centroCasilla(muro.fila, muro.columna)
      this.crearSombraMuro(punto)
      muro.dibujo = this.crearBloque(punto, muro.variante, muro.fila)
    })
    mapa.forEach((filaTexto, fila) => {
      for (let columna = 0; columna < filaTexto.length; columna += 1) {
        const simbolo = filaTexto[columna]
        const punto = this.centroCasilla(fila, columna)
        if (simbolo === 'P') {
          this.crearSombraMuro(punto)
          this.puerta = this.crearBloque(punto, 'puerta-cerrada', fila)
        }
        if (simbolo === 'C') this.inicio = { fila, columna }
      }
    })
    cachearAdobes(this)
    this.apoyosFrutas = []
    this.dibujosObjetos = this.reto.objetos.map((objeto) => {
      const punto = this.centroCasilla(objeto.fila, objeto.columna)
      // Este apoyo de contraste pertenece al arte, también cuando vida=0.
      this.apoyosFrutas.push(this.add.ellipse(punto.x, punto.y + this.casilla * 0.13,
        this.casilla * 0.78, this.casilla * 0.50, 0xfffcf0, 0.55).setDepth(2.8))
      return ajustarATamano(this.add.image(punto.x, punto.y, objeto.tipo),
        this.casilla * 0.82, this.casilla * 0.82).setDepth(3)
    })
    this.marcadorDestino = this.add.circle(0, 0, this.casilla * TOQUE.radioDestino, 0, 0)
      .setStrokeStyle(TOQUE.grosorDestino, TOQUE.colorDestino).setDepth(TOQUE.profundidad).setVisible(false)
  }

  crearBloque(punto, textura, fila) {
    // La cara del frente cae un poco sobre la siguiente fila del piso.
    return this.add.image(punto.x, punto.y + this.casilla * 0.02, textura)
      .setDisplaySize(this.casilla * 1.02, this.casilla * 1.18)
      .setDepth(2 + fila / (this.reto.mapa.length + 1) * 0.5)
  }

  crearSombraMuro(punto) {
    this.sombrasMuros.push(this.add.image(punto.x + this.casilla * 0.075,
      punto.y + this.casilla * 0.10, 'sombra-adobe')
      .setDisplaySize(this.casilla * 1.08, this.casilla * 1.08).setDepth(1.5))
  }

  // La columna de Kusi: cómo moverse, la consigna en un globo y Kusi abajo a la
  // izquierda. En la disposición lateral se corre junto con el panel.
  crearGuia() {
    this.guia = distribuirGuia(this.disposicion)
    const { guia } = this
    this.cajaGuia = { ...guia.caja }
    // Un fondo claro y suave detrás del letrero: sobre el follaje del pueblito el
    // texto oscuro se perdía.
    this.add.rectangle(guia.etiqueta.x, guia.etiqueta.y, guia.etiqueta.ancho, guia.etiqueta.alto,
      NUMERO.crema, 0.8).setRounded(18)
    this.add.text(guia.etiqueta.x, guia.etiqueta.y, 'Toca un lugar\no usa las flechas', estiloTexto(22)).setOrigin(0.5)
    const globo = dibujarGlobo(this.add.graphics(), guia.globo.ancho, guia.globo.alto)
    globo.setPosition(guia.globo.x, guia.globo.y)
    this.textoGlobo = this.add.text(guia.globo.x, guia.globo.y, this.reto.consigna,
      estiloTexto(22, COLOR.tinta, { wordWrap: { width: 172 }, lineSpacing: 1 })).setOrigin(0.5)
    this.add.ellipse(guia.sombraKusi.x, guia.sombraKusi.y, guia.sombraKusi.ancho, guia.sombraKusi.alto, 0x4b211b, 0.12)
    this.dibujoKusi = ajustarATamano(this.add.image(guia.kusi.x, guia.kusi.y, 'kusi-frente').setOrigin(0.5, 1),
      guia.kusi.ancho, guia.kusi.alto)
  }

  mostrarAyuda(numero = null) {
    if (this.terminada || this.cambiandoNivel) return
    const indice = numero === null ? Math.min(this.indiceAyuda, this.reto.ayudas.length - 1) : numero - 1
    this.textoGlobo.setText(this.reto.ayudas[indice])
    this.indiceAyuda += 1
    avisarPartida(this.partida, 'ayuda', { nivel: this.indiceNivel + 1, ayuda: indice + 1 })
    decir(this.textoGlobo.text)
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
      const texto = this.add.text(0, 0, '!', estiloTexto(
        Math.max(AVISO_PERSECUCION.tamanoMinimo, this.casilla * AVISO_PERSECUCION.tamanoTexto),
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
        aviso.restante = AVISO_PERSECUCION.segundos
        aviso.apariciones += 1
      } else {
        aviso.restante = Math.max(0, aviso.restante - segundos)
      }
      aviso.ultimoInicio = zorro.iniciosPersecucion
      if (!zorro.persiguiendo) aviso.restante = 0
      const cuerpo = this.dibujosZorros[indice]
      aviso.dibujo.setPosition(cuerpo.x,
        cuerpo.y - this.casilla * ALTURA_CUY * PROPORCION_ZORRO - AVISO_PERSECUCION.separacionCabeza)
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
    // El silencio que se eligió antes, en este nivel o en otro, se conserva.
    this.sonidos = new SonidosLaberinto(this, { activo: this.vida, silenciado: leerSilencio() })
    this.parpadeo = new ParpadeoCuy(this.cuy, { activo: this.vida })
    // El cuerpo guarda la escala que la escena ya fijó a cada sprite y le suma
    // el rebote de cada paso; el zorro usa un perfil más pesado.
    this.cuerpoCuy = new CuerpoVivo(this.cuy, PERFIL_CUY, { casilla: this.casilla, activo: this.vida })
    this.cuerposZorros = this.dibujosZorros.map((dibujo) =>
      new CuerpoVivo(dibujo, PERFIL_ZORRO, { casilla: this.casilla, activo: this.vida }))
    this.polvito = new Polvito(this, { casilla: this.casilla, activo: this.vida })
    this.popFruta = new PopFruta(this, { casilla: this.casilla, activo: this.vida })
    // Cada fruta flota alrededor del centro de su casilla, con su propio desfase.
    const basesDeLasFrutas = this.reto.objetos.map((objeto) => this.centroCasilla(objeto.fila, objeto.columna))
    this.frutasVivas = new FrutasVivas(this, this.dibujosObjetos, basesDeLasFrutas,
      { casilla: this.casilla, activo: this.vida })
    // Al ser atrapado, los zorros se detienen junto con todo lo demás.
    this.captura = new CapturaLaberinto(this, {
      ancho: ANCHO, congelables: this.dibujosZorros, activo: this.vida,
      // El temblor se suma al encuadre de la pantalla y vuelve a él al apagarse.
      desfase: () => this.desplazamientoPantalla,
    })
    this.puertaViva = new PuertaViva(this, this.puerta, { casilla: this.casilla, activo: this.vida })
    this.ultimosCuadros = new Map()
    // Sin vida no hay sonidos que apagar y tampoco botón.
    if (this.vida) {
      this.botones.altavoz = crearBotonSonido(this, {
        silenciado: this.sonidos.silenciado,
        alTocar: () => {
          this.alternarSonido()
        },
      }).setPosition(this.guia.altavoz.x, this.guia.altavoz.y)
    }
  }

  // El altavoz apaga todos los sonidos de golpe, también el que esté sonando, y
  // vuelve a encenderlos; la elección se guarda para los niveles siguientes.
  alternarSonido() {
    const silenciado = this.sonidos.cambiarSilencio()
    guardarSilencio(silenciado)
    this.botones.altavoz.mostrar(silenciado)
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
  alPisar(clave, sonido, centro, direccion, tamano) {
    this.sonidos.reproducir(sonido)
    this.polvito.alPisar(clave, centro.x, centro.y + this.casilla * DESFASE_PIES, direccion, tamano)
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

    // Cada dedo conserva su propio toque. Un arrastre se ignora: no se interpreta
    // como rumbo ni como destino. Los botones tampoco envían al cuy al mapa.
    this.alIniciarToque = (puntero, objetosTocados) => {
      this.iniciosToque.set(puntero.id, {
        ...this.puntoEnPantalla(puntero), sobreControl: objetosTocados.length > 0,
      })
    }
    this.alTerminarToque = (puntero, objetosTocados) => {
      const inicio = this.iniciosToque.get(puntero.id)
      this.iniciosToque.delete(puntero.id)
      if (!inicio || inicio.sobreControl || objetosTocados.length > 0) return
      const fin = this.puntoEnPantalla(puntero)
      if (Math.hypot(fin.x - inicio.x, fin.y - inicio.y) > TOQUE.tolerancia) return
      const mundo = this.cameras.main.getWorldPoint(puntero.x, puntero.y)
      this.caminarHasta({
        fila: (mundo.y - this.origenMapa.y) / this.casilla - 0.5,
        columna: (mundo.x - this.origenMapa.x) / this.casilla - 0.5,
      })
    }
    this.alCancelarToque = (puntero) => this.iniciosToque.delete(puntero.id)
    this.input.on('pointerdown', this.alIniciarToque)
    this.input.on('pointerup', this.alTerminarToque)
    this.input.on('pointerupoutside', this.alCancelarToque)
  }

  puntoEnPantalla(puntero) {
    const lienzo = this.game.canvas.getBoundingClientRect()
    return { x: puntero.x * lienzo.width / this.scale.width, y: puntero.y * lienzo.height / this.scale.height }
  }

  cancelarDestino() {
    this.destino = null
    this.ruta = []
    this.frutaObjetivo = null
    this.marcadorDestino?.setVisible(false)
  }

  elegirRumbo(direccion) {
    if (this.terminada || this.cambiandoNivel || this.captura.congelado) return
    this.cancelarDestino()
    this.modoControl = 'teclado'
    pedirDireccion(this.movimiento, direccion)
    this.iniciarNivel()
  }

  iniciarNivel() {
    this.mano?.ocultar()
    this.nivelIniciado = true
    if (!this.iniciada) {
      this.iniciada = true
      avisarPartida(this.partida, 'inicio', { nivel: this.indiceNivel + 1 })
    }
  }

  caminarHasta(toque) {
    if (this.terminada || this.cambiandoNivel || this.captura.congelado) return
    const plan = planearRuta(this.reto.mapa, this.movimiento, toque, this.regla.objetos)
    if (!plan.destino) return
    this.modoControl = 'toque'
    this.destino = plan.destino
    this.ruta = plan.pasos
    this.frutaObjetivo = plan.frutaObjetivo
    const punto = this.centroCasilla(this.destino.fila, this.destino.columna)
    this.marcadorDestino.setPosition(punto.x, punto.y).setVisible(true)
    this.iniciarNivel()
    iniciarRecorrido(this.movimiento, this.ruta)
    // Tocar la fruta bajo los pies también es una decisión, aunque el recorrido
    // tenga cero pasos. No hace falta alejarse y volver para recogerla.
    if (this.movimiento.progreso === 0 && this.ruta.length === 0) this.procesarCasilla(this.movimiento)
  }

  continuarRecorrido(fila, columna) {
    if (this.modoControl !== 'toque' || !this.destino) return true
    if (fila === this.destino.fila && columna === this.destino.columna) {
      this.cancelarDestino()
      return false
    }
    // Al cambiar de destino entre centros puede llegar primero al origen del
    // nuevo plan. Solo se consume un paso si coincide con la casilla alcanzada.
    if (this.ruta[0]?.fila === fila && this.ruta[0]?.columna === columna) this.ruta.shift()
    if (this.ruta.length === 0) {
      this.cancelarDestino()
      return false
    }
    pedirDireccion(this.movimiento, this.ruta[0].direccion)
    return true
  }

  procesarCasilla({ fila, columna }) {
    // Las flechas conservan la recolección al pasar. Con toques solo cuenta el
    // objeto elegido; las frutas de paso no producen errores, ayudas ni avisos.
    const objetoElegido = this.regla.objetos[this.frutaObjetivo]
    const puedeComer = this.modoControl === 'teclado' || (objetoElegido
      && objetoElegido.fila === fila && objetoElegido.columna === columna)
    const resultado = puedeComer ? comerEnCasilla(this.regla, this.reto.regla, fila, columna) : null
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
          this.puerta.setTexture('puerta-abierta')
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
        // Además del rebote de la fruta, el cuy se sacude un poquito de lado a lado.
        this.cuerpoCuy.sacudir()
        this.mostrarAyuda(resultado.ayuda)
      }
    }
    if (this.reto.mapa[fila][columna] === 'P' && this.regla.completada) {
      this.completarNivel()
      return false
    }
    return this.continuarRecorrido(fila, columna)
  }

  datosParaNivel(indiceNivel, partida = this.partida) {
    return {
      paquete: this.paquete, cuyAnimado: this.datosCuyAnimado, zorroAnimado: this.datosZorroAnimado,
      partida, indiceNivel, iniciada: partida === this.partida && this.iniciada,
    }
  }

  completarNivel() {
    if (this.cambiandoNivel || this.terminada) return
    this.cancelarDestino()
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
    this.botones.sonido.fondo.disableInteractive()
    this.botones.ayuda.fondo.disableInteractive()
    this.botones.altavoz?.fondo.disableInteractive()
    // La cortina es mucho más grande que el mundo: también tapa las franjas que
    // EXPAND añade en una pantalla alargada, y la despedida queda centrada.
    const centro = { x: this.disposicion.diseno.ancho / 2, y: this.disposicion.diseno.alto / 2 }
    this.add.rectangle(centro.x, centro.y, 8000, 6000, NUMERO.crema, 0.97).setDepth(2000)
    ajustarATamano(this.add.image(centro.x, 300, 'kusi-frente').setOrigin(0.5, 1), 180, 204).setDepth(2001)
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
    this.cancelarDestino()
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
    this.cancelarDestino()
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
      if (this.terminada || this.cambiandoNivel || !this.nivelIniciado) continue
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
        .animarMovimiento('frente', distanciaZorro * this.casilla, segundos, tiempo)
      if (this.sombrasZorros[indice]) this.colocarSombra(this.sombrasZorros[indice], centro)
      if (this.detectarPisada(dibujoZorro)) {
        this.alPisar('zorro' + indice, 'paso_zorro', centro, zorro.direccion, PROPORCION_ZORRO)
      }
      this.cuerposZorros[indice].actualizar(segundos)
    })
    this.actualizarAvisosPersecucion(segundos)
    this.frutasVivas.actualizar(segundos)
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
          x: this.fondoPueblito.x - this.fondoPueblito.displayWidth / 2 + this.cameras.main.scrollX,
          y: this.fondoPueblito.y - this.fondoPueblito.displayHeight / 2 + this.cameras.main.scrollY,
          ancho: this.fondoPueblito.displayWidth, alto: this.fondoPueblito.displayHeight,
        },
        disposicion: this.disposicion.tipo, zoom: this.cameras.main.zoom,
        barra: { ...this.cajaBarra }, mapa: { ...this.cajaMapa }, guia: { ...this.cajaGuia },
        // El globo con su colita, que sobresale por debajo.
        globo: { x: this.guia.globo.x - this.guia.globo.ancho / 2, y: this.guia.globo.y - this.guia.globo.alto / 2,
          ancho: this.guia.globo.ancho, alto: this.guia.globo.alto + this.guia.globo.cola },
        kusi: { x: this.dibujoKusi.x - this.dibujoKusi.displayWidth / 2,
          y: this.dibujoKusi.y - this.dibujoKusi.displayHeight,
          ancho: this.dibujoKusi.displayWidth, alto: this.dibujoKusi.displayHeight },
        piso: { tipo: this.piso.type, cantidad: 1, textura: this.piso.texture.key },
        semillaMuros: this.semillaMuros,
        muros: this.muros.map(({ fila, columna, variante, dibujo }) => ({ fila, columna, variante, profundidad: dibujo.depth })),
        sombrasMuros: this.sombrasMuros.length, vineta: this.vineta.visible,
        puerta: this.puerta.texture.key,
      },
      casilla: this.casilla, origenMapa: { ...this.origenMapa },
      inicio: { ...this.inicio }, consigna: this.textoGlobo.text,
      movimiento: { ...this.movimiento }, velocidad: CASILLAS_POR_SEGUNDO * this.multiplicador,
      modoControl: this.modoControl, destino: this.destino ? { ...this.destino } : null,
      ruta: this.ruta.map((paso) => ({ ...paso })),
      marcadorDestino: { visible: this.marcadorDestino.visible, x: this.marcadorDestino.x, y: this.marcadorDestino.y },
      regla: { ...this.regla, objetos: this.regla.objetos.map((objeto) => ({ ...objeto })) },
      // La regla del nivel tal como la escribe el guion, y lo que muestra la barra de arriba.
      reglaDelReto: structuredClone(this.reto.regla),
      barra: { titulo: this.tituloBarra, fichas: this.casilleros.length },
      puertaAbierta: this.regla.completada, terminada: this.terminada, mensajeCierre: this.mensajeCierre,
      manoVisible: Boolean(this.mano?.visible),
      invulnerable: this.segundosInvulnerable > 0, segundosInvulnerable: this.segundosInvulnerable,
      capturas: this.capturas,
      zorros: this.zorros.map((zorro, indice) => ({
        ...zorro, inicio: { ...zorro.inicio }, mirando: this.dibujosZorros[indice].direccionAnimada,
        avisoPersecucion: {
          visible: this.avisosPersecucion[indice].dibujo.visible,
          x: this.avisosPersecucion[indice].dibujo.x, y: this.avisosPersecucion[indice].dibujo.y,
          texto: '!', apariciones: this.avisosPersecucion[indice].apariciones,
        },
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
