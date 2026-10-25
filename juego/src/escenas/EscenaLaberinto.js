// La familia laberinto tiene su propia escena y reutiliza la carga compartida.
import * as Phaser from 'phaser'
import { ANCHO, ALTO, COLOR, NUMERO, estiloTexto } from '../medidas.js'
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
  crearMovimiento, pedirDireccion, avanzarMovimiento, direccionDelDeslizamiento,
} from '../logica/movimientoLaberinto.js'
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

// La barra y el espacio de Kusi se reservan antes de medir el mapa. Incluso
// los niveles más grandes quedan completos dentro de la pantalla 1280 × 720.
const ZONA_MAPA = { x: 302, y: 168, ancho: 940, alto: 478 }
const VISTAS = { arriba: 'espaldas', abajo: 'frente', izquierda: 'izquierda', derecha: 'derecha' }

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
    this.iniciosDeslizamiento = new Map()
  }

  create() {
    this.cameras.main.setBackgroundColor(COLOR.crema)
    document.title = 'Kusi · Laberinto'
    this.calcularCuadricula()
    this.crearBarra()
    this.crearMapa()
    this.crearGuia()
    this.crearPersonajes()
    this.crearVida()
    this.crearControles()
    if (this.indiceNivel === 0) this.mano = crearManoLaberinto(this)
    this.exponerParaPruebas()
    avisarPartida(this.partida, 'listo', { familia: 'laberinto', nivel: this.indiceNivel + 1 })
    decir(this.reto.consigna)
    // La fanfarria de fin de nivel suena aquí y no en la escena anterior: esa se
    // destruye al reiniciarse y cortaría su propio sonido.
    if (this.anunciarNivel) this.sonidos.reproducir('nivel')
    this.events.once('shutdown', () => {
      this.sonidos.destruir()
      this.captura.destruir()
      this.input.keyboard.off('keydown', this.alPulsarFlecha)
      this.input.off('pointerdown', this.alIniciarDeslizamiento)
      this.input.off('pointerup', this.alTerminarDeslizamiento)
      this.input.off('pointerupoutside', this.alTerminarDeslizamiento)
      this.iniciosDeslizamiento.clear()
      if (window.kusi?.estado === this.leerEstado) delete window.kusi
    })
  }

  calcularCuadricula() {
    const filas = this.reto.mapa.length
    const columnas = this.reto.mapa[0].length
    this.casilla = Math.floor(Math.min(ZONA_MAPA.ancho / columnas, ZONA_MAPA.alto / filas))
    this.origenMapa = {
      x: ZONA_MAPA.x + (ZONA_MAPA.ancho - columnas * this.casilla) / 2,
      y: ZONA_MAPA.y + (ZONA_MAPA.alto - filas * this.casilla) / 2,
    }
  }

  centroCasilla(fila, columna) {
    return {
      x: this.origenMapa.x + (columna + 0.5) * this.casilla,
      y: this.origenMapa.y + (fila + 0.5) * this.casilla,
    }
  }

  crearBarra() {
    this.casilleros = []
    this.add.rectangle(ANCHO / 2, 76, ANCHO - 40, 112, NUMERO.papel)
      .setRounded(24).setStrokeStyle(3, 0xd8b990).setDepth(1000)
    this.add.text(48, 38, this.reto.regla.tipo === 'orden' ? 'Sigue el orden' : 'Busca frutas',
      estiloTexto(32)).setDepth(1001)
    this.add.text(48, 82, 'Nivel ' + (this.indiceNivel + 1) + ' de ' + this.paquete.retos.length,
      estiloTexto(23, COLOR.tintaSuave)).setDepth(1001)

    const regla = this.reto.regla
    if (regla.tipo === 'orden') {
      const espacio = Math.min(110, 600 / regla.secuencia.length)
      const lado = Math.min(78, espacio - 10)
      regla.secuencia.forEach((tipo, indice) => {
        const x = 346 + indice * espacio
        const fondo = this.add.rectangle(x, 74, lado, lado, indice === 0 ? 0xffe0a3 : 0xf6ebd8)
          .setRounded(16).setStrokeStyle(indice === 0 ? 4 : 2, indice === 0 ? 0xb4611f : 0xd8b990)
          .setDepth(1001)
        ajustarATamano(this.add.image(x, 73, tipo), lado - 10, lado - 10).setDepth(1002)
        this.casilleros.push({ fondo, marca: this.crearMarca(x + lado * 0.34, 74 + lado * 0.34) })
      })
    } else {
      ajustarATamano(this.add.image(344, 74, 'clase-' + regla.clase), 78, 78).setDepth(1002)
      const espacio = Math.min(70, 480 / regla.meta)
      for (let indice = 0; indice < regla.meta; indice += 1) {
        const x = 432 + indice * espacio
        const fondo = this.add.rectangle(x, 75, espacio - 12, 58, 0xf6ebd8)
          .setRounded(12).setStrokeStyle(3, 0xb99a70).setDepth(1001)
        this.casilleros.push({ fondo, marca: this.crearMarca(x, 75) })
      }
    }

    this.botones = {
      sonido: crearBoton(this, 1030, 72, {
        ancho: 138, alto: 72, texto: 'Escuchar', tamano: 27,
        alTocar: () => {
          if (!this.esDeslizamiento(this.input.activePointer)) decir(this.reto.consigna)
        },
      }).setDepth(1003),
      ayuda: crearBoton(this, 1184, 72, {
        ancho: 118, alto: 72, texto: 'Ayuda', tamano: 28,
        alTocar: () => {
          if (!this.esDeslizamiento(this.input.activePointer)) this.mostrarAyuda()
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
    const ancho = mapa[0].length * this.casilla
    const alto = mapa.length * this.casilla
    this.add.tileSprite(this.origenMapa.x - 16, this.origenMapa.y - 16,
      ancho + 32, alto + 32, 'pasto').setOrigin(0).setDepth(0)
    mapa.forEach((filaTexto, fila) => {
      for (let columna = 0; columna < filaTexto.length; columna += 1) {
        const simbolo = filaTexto[columna]
        const punto = this.centroCasilla(fila, columna)
        this.add.image(punto.x, punto.y, simbolo === '#' ? 'muro-adobe' : 'camino-tierra')
          .setDisplaySize(this.casilla, this.casilla).setDepth(1)
        if (simbolo === 'P') {
          this.puerta = this.add.image(punto.x, punto.y, 'puerta-cerrada')
            .setDisplaySize(this.casilla, this.casilla).setDepth(2)
        }
        if (simbolo === 'C') this.inicio = { fila, columna }
      }
    })
    this.dibujosObjetos = this.reto.objetos.map((objeto) => {
      const punto = this.centroCasilla(objeto.fila, objeto.columna)
      return ajustarATamano(this.add.image(punto.x, punto.y, objeto.tipo),
        this.casilla * 0.78, this.casilla * 0.78).setDepth(3)
    })
    this.add.text(ZONA_MAPA.x + ZONA_MAPA.ancho / 2, 675,
      'Desliza para caminar · También puedes usar las flechas', estiloTexto(24, COLOR.tinta))
      .setOrigin(0.5)
  }

  crearGuia() {
    this.add.text(142, 179, '¡Vamos, cuy!', estiloTexto(32)).setOrigin(0.5)
    const globo = dibujarGlobo(this.add.graphics(), 236, 250)
    globo.setPosition(142, 355)
    this.textoGlobo = this.add.text(142, 355, this.reto.consigna,
      estiloTexto(25, COLOR.tinta, { wordWrap: { width: 204 }, lineSpacing: 3 })).setOrigin(0.5)
    this.add.ellipse(142, 675, 132, 16, 0x4b211b, 0.12)
    this.dibujoKusi = ajustarATamano(this.add.image(142, 674, 'kusi-frente').setOrigin(0.5, 1), 164, 180)
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
    this.captura = new CapturaLaberinto(this, { ancho: ANCHO, congelables: this.dibujosZorros, activo: this.vida })
    this.puertaViva = new PuertaViva(this, this.puerta, { casilla: this.casilla, activo: this.vida })
    this.ultimosCuadros = new Map()
    // Sin vida no hay sonidos que apagar y tampoco botón.
    if (this.vida) {
      this.botones.altavoz = crearBotonSonido(this, {
        silenciado: this.sonidos.silenciado,
        alTocar: () => {
          if (!this.esDeslizamiento(this.input.activePointer)) this.alternarSonido()
        },
      })
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

    // Cada dedo conserva su propio origen. El umbral se mide en píxeles de la
    // pantalla, para que 30 px sigan siendo 30 al reducir el lienzo en un móvil.
    this.alIniciarDeslizamiento = (puntero) => {
      this.iniciosDeslizamiento.set(puntero.id, this.puntoEnPantalla(puntero))
    }
    this.alTerminarDeslizamiento = (puntero) => {
      const direccion = this.esDeslizamiento(puntero)
      this.iniciosDeslizamiento.delete(puntero.id)
      if (direccion) this.elegirRumbo(direccion)
    }
    this.input.on('pointerdown', this.alIniciarDeslizamiento)
    this.input.on('pointerup', this.alTerminarDeslizamiento)
    this.input.on('pointerupoutside', this.alTerminarDeslizamiento)
  }

  puntoEnPantalla(puntero) {
    const lienzo = this.game.canvas.getBoundingClientRect()
    return { x: puntero.x * lienzo.width / ANCHO, y: puntero.y * lienzo.height / ALTO }
  }

  esDeslizamiento(puntero) {
    const inicio = this.iniciosDeslizamiento.get(puntero.id)
    return inicio ? direccionDelDeslizamiento(inicio, this.puntoEnPantalla(puntero)) : null
  }

  elegirRumbo(direccion) {
    if (this.terminada || this.cambiandoNivel) return
    pedirDireccion(this.movimiento, direccion)
    this.mano?.ocultar()
    this.nivelIniciado = true
    if (!this.iniciada) {
      this.iniciada = true
      avisarPartida(this.partida, 'inicio', { nivel: this.indiceNivel + 1 })
    }
  }

  procesarCasilla({ fila, columna }) {
    const resultado = comerEnCasilla(this.regla, this.reto.regla, fila, columna)
    if (resultado) {
      avisarPartida(this.partida, 'accion', {
        nivel: this.indiceNivel + 1, objeto: resultado.objeto, correcto: resultado.correcto,
      })
      const dibujo = this.dibujosObjetos[resultado.indice]
      if (resultado.correcto) {
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
    this.add.rectangle(ANCHO / 2, ALTO / 2, ANCHO, ALTO, NUMERO.crema, 0.97).setDepth(2000)
    ajustarATamano(this.add.image(ANCHO / 2, 300, 'kusi-frente').setOrigin(0.5, 1), 180, 204).setDepth(2001)
    this.add.text(ANCHO / 2, 386, this.mensajeCierre, estiloTexto(40, COLOR.tinta, {
      wordWrap: { width: 820 }, lineSpacing: 8,
    })).setOrigin(0.5).setDepth(2001)
    this.botones.repetir = crearBoton(this, ANCHO / 2, 554, {
      ancho: 320, alto: 82, texto: 'Jugar otra vez', tamano: 32,
      alTocar: () => this.scene.restart(this.datosParaNivel(0, crearPartidaLaberinto())),
    }).setDepth(2002)
  }

  posicionMovimiento() {
    const posicion = posicionEnCasillas(this.movimiento)
    return this.centroCasilla(posicion.fila, posicion.columna)
  }

  capturarCuy() {
    this.movimiento = crearMovimiento(this.reto.mapa)
    this.zorros.forEach(restablecerZorro)
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
    // Solo lectura, igual que en el mercado. Las pruebas realizan las acciones
    // con teclado y puntero reales; no existe un atajo para mover al personaje.
    this.leerEstado = () => ({
      familia: 'laberinto', nivel: this.indiceNivel + 1, mapa: this.reto.mapa.map((fila) => fila),
      casilla: this.casilla, origenMapa: { ...this.origenMapa },
      inicio: { ...this.inicio }, consigna: this.textoGlobo.text,
      movimiento: { ...this.movimiento }, velocidad: CASILLAS_POR_SEGUNDO * this.multiplicador,
      regla: { ...this.regla, objetos: this.regla.objetos.map((objeto) => ({ ...objeto })) },
      puertaAbierta: this.regla.completada, terminada: this.terminada, mensajeCierre: this.mensajeCierre,
      manoVisible: Boolean(this.mano?.visible),
      invulnerable: this.segundosInvulnerable > 0, segundosInvulnerable: this.segundosInvulnerable,
      capturas: this.capturas,
      zorros: this.zorros.map((zorro, indice) => ({
        ...zorro, inicio: { ...zorro.inicio }, mirando: this.dibujosZorros[indice].direccionAnimada,
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
      ubicar: (nombre) => {
        const boton = this.botones[nombre]
        if (!boton) return null
        const lienzo = this.game.canvas.getBoundingClientRect()
        return { x: lienzo.left + boton.x * lienzo.width / ANCHO, y: lienzo.top + boton.y * lienzo.height / ALTO }
      },
    }
  }
}
