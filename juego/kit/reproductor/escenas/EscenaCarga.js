// Primera escena: valida y prepara el paquete del juego antes de cargar sus dibujos.
// Cada ilustración requerida debe estar disponible antes de abrir el nivel.

import * as Phaser from 'phaser'
import { ANCHO, ALTO, COLOR, estiloTexto } from '../medidas.js'
import {
  clavesDelPaquete,
  pedirDibujos,
  completarConFiguras,
} from '../dibujos/dibujos.js'
import { validarLaberinto } from '../../../juegos/laberinto/datos/validarLaberinto.js'
import { crearPartidaLaberinto, avisarPartida } from '../../../juegos/laberinto/logica/partidaLaberinto.js'
import { nivelPedido } from '../../../juegos/laberinto/logica/parametrosLaberinto.js'
import { avisos } from '../logica/avisos.js'
import { leerPuente, MENSAJE_PAQUETE, MENSAJE_REINICIAR, AVISO_ERROR } from '../mensajes/puenteGuion.js'
import { crearBoton } from '../interfaz/piezas.js'
import { validarSpriteCuy } from '../datos/validarSpriteCuy.js'
import { validarSpritePersonaje } from '../datos/validarSpritePersonaje.js'
import { elegirProtagonista } from '../datos/protagonistas.js'
import {
  trabajoPedido, esIdTrabajo, elegirJuego, revisarFicha, erroresDelValidar,
  clasificarPiezas, rutaGuionEjemplo, rutaPieza, claveEscena,
} from '../datos/registroJuegos.js'
import { cargarFicha, cargarGrabaciones, escenaDelTrabajo, dibujarFiguraSimple } from './juegosDelTaller.js'
import { partirHistoria, debeContarHistoria } from '../logica/historia.js'
import { callarVoz, configurarVoz } from '../logica/voz.js'
import { necesitaPermisoMicrofono } from '../interfaz/microfono.js'
import {
  pedirManifiestoProtagonista, prepararProtagonista, registrarProtagonista,
} from '../dibujos/protagonista.js'
import { pedirKitFinal, OBJETOS_KIT } from '../dibujos/kitFinal.js'
import { pedirEstiloFinal } from '../dibujos/estiloFinal.js'
import { vidaActiva } from '../efectos/vida.js'
import { pedirSonidosLaberinto } from '../efectos/SonidosLaberinto.js'
import {
  ARCHIVO_MANIFIESTO_CUY, CLAVE_MANIFIESTO_CUY, pedirHojaCuy, registrarAnimacionesCuy,
} from '../dibujos/cuyAnimado.js'
import {
  ARCHIVO_MANIFIESTO_ZORRO, CLAVE_MANIFIESTO_ZORRO, pedirHojaZorro, registrarAnimacionesZorro,
} from '../dibujos/zorroAnimado.js'

// Paquete de ejemplo utilizado mientras se integra el generador real.
const ARCHIVO_DEL_LABERINTO = 'paquete-laberinto-ejemplo.json'

export class EscenaCarga extends Phaser.Scene {
  constructor() {
    super('carga')
  }

  // Un guion que llegó por mensaje de la página que contiene el juego (ver puenteGuion.js)
  // reemplaza al de ejemplo. Aunque el guion sea nulo (un texto que no era JSON), cuenta
  // como llegado: se rechaza con su motivo en vez de quedarse esperando.
  init(datos) {
    this.llegoPorMensaje = Boolean(datos) && Object.hasOwn(datos, 'paquete')
    this.paqueteRecibido = this.llegoPorMensaje ? datos.paquete : null
    this.partidaRecibida = this.llegoPorMensaje ? datos.partida ?? null : null
  }

  preload() {
    this.scene.get('puntos')?.limpiarPartida()
    callarVoz()
    configurarVoz(null)
    // El ejemplo se abre directamente; el modo mensaje espera el guion del panel.
    // La partida existe desde la carga para registrar también cualquier fallo.
    const parametros = new URLSearchParams(window.location.search)
    this.abrirPortada = parametros.get('portada') === '1'
    // Solo se pide la pieza si está en el kit. El tutorial dibuja su propia mano
    // mientras llega el arte y también puede seguir si la imagen falla al cargar.
    const hayManoGuia = Object.keys(import.meta.glob('../../recursos/dibujos/interfaz/mano-guia.png')).length > 0
    if (hayManoGuia && parametros.get('tutorial') !== '0' && !this.textures.exists('mano-guia')) {
      this.load.image('mano-guia', 'dibujos/interfaz/mano-guia.png')
    }
    this.esperaMensaje = parametros.get('paquete') === 'mensaje'
    // ?juego=<trabajo> abre el guion de ejemplo de un juego del taller.
    this.juegoPedido = trabajoPedido(window.location.search)
    this.familiaAbierta = 'laberinto'
    this.partidaLaberinto = crearPartidaLaberinto(this.partidaRecibida)
    window.kusi = { listo: false, avisos }
    this.cameras.main.setBackgroundColor(COLOR.crema)

    this.add
      .text(
        ANCHO / 2,
        ALTO / 2,
        'Preparando los caminos...',
        estiloTexto(36),
      )
      .setOrigin(0.5)

    // Con un guion recibido por mensaje, o esperándolo, no se pide el de ejemplo.
    // Un id que no es un UUID no arma ninguna ruta: create() lo rechaza con su motivo.
    if (!this.esperaMensaje && !this.llegoPorMensaje) {
      if (this.juegoPedido === null) this.load.json('paquete', ARCHIVO_DEL_LABERINTO)
      else if (esIdTrabajo(this.juegoPedido)) this.load.json('paquete', rutaGuionEjemplo(this.juegoPedido))
    }
    this.load.json(CLAVE_MANIFIESTO_CUY, ARCHIVO_MANIFIESTO_CUY)
    this.load.json(CLAVE_MANIFIESTO_ZORRO, ARCHIVO_MANIFIESTO_ZORRO)
    // Un juego del taller no nombra al cuy: recibe «el protagonista» (hoy, el de siempre).
    this.protagonista = elegirProtagonista(null).protagonista
    pedirManifiestoProtagonista(this, this.protagonista)
  }

  async create() {
    this.conectarPuente()
    // Sin guion todavía: se queda esperando. El puente avisó a la página que ya puede
    // recibirlo, y cuando llegue esta escena se reinicia con él.
    if (this.esperaMensaje && !this.llegoPorMensaje) return

    const paqueteBase = this.llegoPorMensaje ? this.paqueteRecibido : this.cache.json.get('paquete')

    try {
      // La copia evita modificar los datos de la caché de Phaser.
      const paquete = structuredClone(paqueteBase)
      // Un guion con «trabajo» (o ?juego=) es de un juego del taller; sin él, del laberinto.
      // ?juego= solo vale para su guion de ejemplo, no para uno que llegó por mensaje.
      const eleccion = elegirJuego(paquete, this.llegoPorMensaje ? null : this.juegoPedido)
      if (eleccion.taller) {
        await this.abrirJuegoDelTaller(paquete, eleccion.trabajo)
        return
      }

      // Todo guion del laberinto pasa por su contrato, también si llega por mensaje.
      const resultado = validarLaberinto(paquete)

      if (!resultado.valido) {
        throw new Error(resultado.errores.join('; '))
      }

      // El jugador animado es obligatorio: un fallo de carga debe quedar visible.
      const cuyAnimado = validarSpriteCuy(this.cache.json.get(CLAVE_MANIFIESTO_CUY))
      const zorroAnimado = validarSpritePersonaje(this.cache.json.get(CLAVE_MANIFIESTO_ZORRO), 'zorro')

      // Carga el paisaje, los alimentos del guion y las animaciones de los personajes.
      const claves = clavesDelPaquete(paquete)
      pedirDibujos(this, claves)
      pedirKitFinal(this)
      pedirEstiloFinal(this)
      pedirHojaCuy(this, cuyAnimado)
      pedirHojaZorro(this, zorroAnimado)
      // Los sonidos solo pertenecen al laberinto. Con ?vida=0 ni siquiera se
      // descargan, para que la comparación sin efectos sea también más liviana.
      if (vidaActiva()) pedirSonidosLaberinto(this)

      this.load.once('complete', () => {
        try {
          completarConFiguras(this, claves)

          // Abre el laberinto usando el guion y las animaciones preparados.
          registrarAnimacionesCuy(this, cuyAnimado)
          registrarAnimacionesZorro(this, zorroAnimado)
          // ?nivel=N sirve para revisar cualquier nivel sin ganar los anteriores;
          // sin él, o con un valor dudoso, el laberinto empieza en el primero.
          const datos = { paquete, cuyAnimado, zorroAnimado, partida: this.partidaLaberinto }
          datos.indiceNivel = nivelPedido(window.location.search, paquete.retos.length)
          // «listo» sigue siendo único por partida, pero una reapertura confirmada
          // necesita avisar de nuevo al anfitrión que terminó de cargar.
          if (this.partidaRecibida) this.scene.get('laberinto').events.once('create', () =>
            this.puente?.avisar({ tipo: 'cargado', niveles: paquete.retos.length }))
          this.scene.get('puntos')?.prepararLaberinto(this.scene.get('laberinto'))
          if (this.abrirPortada) {
            this.scene.start('historia', { siguiente: { clave: 'laberinto', datos } })
          } else {
            this.scene.start('laberinto', datos)
          }
        } catch (error) {
          this.mostrarError(error)
        }
      })

      this.load.start()
    } catch (error) {
      this.mostrarError(error)
    }
  }

  // Abre un juego del taller (taller/entrega.md §6): trae su ficha, revisa el guion con
  // el validar del juego, carga lo común, las piezas del kit y las del trabajo, y abre su
  // escena con { paquete, partida, trabajo, indiceNivel }.
  async abrirJuegoDelTaller(paquete, trabajo) {
    if (!paquete || typeof paquete !== 'object' || Array.isArray(paquete)) {
      throw new Error('No llegó el guion del juego del trabajo ' + trabajo + '.')
    }
    // El guion de ejemplo puede no decir su trabajo: es el que se pidió con ?juego=.
    paquete.trabajo = trabajo
    this.familiaAbierta = String(paquete.familia ?? 'taller')

    const control = new AbortController()
    const cancelar = () => control.abort()
    this.events.once('shutdown', cancelar)
    let ficha, grabaciones
    try {
      [ficha, grabaciones] = await Promise.all([cargarFicha(trabajo), cargarGrabaciones(trabajo, control.signal)])
    } catch (error) {
      if (control.signal.aborted) return
      cancelar()
      throw error
    } finally {
      this.events.off('shutdown', cancelar)
    }
    if (control.signal.aborted) return
    const revision = revisarFicha(ficha, paquete)
    if (!revision.valido) throw new Error(revision.errores.join('; '))
    // El validar es código del juego: si se cae, cuenta como un guion que no pasa.
    let resultado
    try {
      resultado = ficha.validar(structuredClone(paquete))
    } catch (error) {
      throw new Error('El validar del juego se cayó: ' + String(error?.message ?? error))
    }
    const errores = erroresDelValidar(resultado)
    if (errores.length) throw new Error(errores.join('; '))

    // Lo común: el protagonista, el zorro (por si el juego tiene un enemigo), Kusi, el
    // patio, la interfaz y los sonidos. Después, las piezas que pide la ficha.
    const datosProtagonista = prepararProtagonista(this, this.protagonista)
    const zorroAnimado = validarSpritePersonaje(this.cache.json.get(CLAVE_MANIFIESTO_ZORRO), 'zorro')
    pedirHojaZorro(this, zorroAnimado)
    pedirKitFinal(this)
    pedirEstiloFinal(this)
    if (vidaActiva()) pedirSonidosLaberinto(this)
    const { delKit, delTrabajo } = clasificarPiezas(ficha.piezas, OBJETOS_KIT)
    this.load.maxRetries = 0
    for (const pieza of delKit) this.load.image(pieza, 'dibujos/objetos/' + pieza + '.png')
    for (const pieza of delTrabajo) this.load.image(pieza, rutaPieza(trabajo, pieza))

    this.load.once('complete', () => {
      try {
        registrarProtagonista(this, datosProtagonista)
        registrarAnimacionesZorro(this, zorroAnimado)
        for (const pieza of [...delKit, ...delTrabajo]) {
          if (this.textures.exists(pieza)) continue
          console.warn('[carga] Falta la pieza «' + pieza + '»: se usa una figura simple.')
          dibujarFiguraSimple(this, pieza)
        }

        const clave = claveEscena(trabajo)
        const usaMicrofono = ficha.usaMicrofono === true
        if (!this.scene.get(clave)) this.scene.add(clave, escenaDelTrabajo(ficha.escena, clave, usaMicrofono), false)
        configurarVoz(grabaciones)
        const datos = {
          paquete,
          partida: this.partidaLaberinto,
          trabajo,
          indiceNivel: nivelPedido(window.location.search, paquete.retos.length),
        }
        this.atenderPuenteDelJuego(clave, datos, usaMicrofono)
        // La historia de la propuesta se cuenta primero, como un cuento, salvo que no haya, que se pida
        // un nivel o ?historia=0, o que la partida se reanude donde se dejó.
        const paginas = partirHistoria(paquete.historia)
        const contar = debeContarHistoria({ busqueda: window.location.search, partida: datos.partida, paginas })
        if (this.abrirPortada || contar || (usaMicrofono && necesitaPermisoMicrofono())) {
          // Sin cuento, la misma portada da el primer toque antes de entrar al nivel.
          this.scene.start('historia', { paginas: contar ? paginas : [], piezas: ficha.piezas, usaMicrofono, siguiente: { clave, datos } })
        } else {
          this.scene.start(clave, datos)
        }
      } catch (error) {
        this.mostrarError(error)
      }
    })
    this.load.start()
  }

  // Un juego del taller no tiene que saber del puente: el reproductor atiende por él un
  // guion nuevo (vuelve a la carga) o el reinicio (otra partida desde el primer nivel).
  // Se conecta cuando la carga se cierra; si el juego conecta su propio manejador, gana el suyo.
  atenderPuenteDelJuego(clave, datos, usaMicrofono) {
    if (!this.puente) return
    const puente = this.puente
    const escenas = this.game.scene
    const alRecibir = (orden) => {
      // Un guion nuevo o el reinicio también cierran la historia, si se estaba contando.
      escenas.stop('historia')
      if (orden.tipo === MENSAJE_PAQUETE) {
        escenas.stop(clave)
        escenas.start('carga', { paquete: orden.paquete, partida: orden.partida })
      } else if (orden.tipo === MENSAJE_REINICIAR) {
        callarVoz()
        const reinicio = { ...datos, indiceNivel: 0, partida: crearPartidaLaberinto() }
        if (usaMicrofono && necesitaPermisoMicrofono()) {
          escenas.start('historia', { usaMicrofono, siguiente: { clave, datos: reinicio } })
        } else {
          escenas.start(clave, reinicio)
        }
      }
    }
    this.events.once('shutdown', () => puente.conectar(alRecibir))
  }

  // Si el juego se abrió para recibir guiones, esta escena atiende los que lleguen
  // mientras prepara el juego o espera. Mientras se prepara no hay nada que reiniciar:
  // solo importa un guion nuevo, y con él la escena empieza de nuevo.
  conectarPuente() {
    this.puente = leerPuente(this.game)
    if (!this.puente) return
    this.alRecibirOrden = (orden) => {
      if (orden.tipo === MENSAJE_PAQUETE) this.scene.restart({ paquete: orden.paquete, partida: orden.partida })
    }
    this.puente.conectar(this.alRecibirOrden)
    this.events.once('shutdown', () => this.puente.desconectar(this.alRecibirOrden))
  }

  mostrarError(error) {
    // No se intenta dibujar un mapa inválido. El niño recibe una salida simple;
    // el diagnóstico técnico queda en consola y el puente recibe un solo fallo.
    console.error('[carga] No se pudo preparar el juego «' + this.familiaAbierta + '»:', error)
    avisarPartida(this.partidaLaberinto, 'fallo', { motivo: String(error.message ?? error) })
    // La página que contiene el juego se entera del motivo (la vista previa del panel).
    this.puente?.avisar({ tipo: AVISO_ERROR, motivo: String(error.message ?? error) })
    this.children.removeAll(true)
    const mensaje = 'Este camino no está listo todavía.\n¡Vamos a intentarlo de nuevo!'
    this.add.text(ANCHO / 2, ALTO / 2 - 60, mensaje, estiloTexto(36, COLOR.tinta, {
      wordWrap: { width: 800 },
    })).setOrigin(0.5)
    crearBoton(this, ANCHO / 2, ALTO / 2 + 100, {
      ancho: 300, alto: 76, texto: 'Intentar de nuevo', tamano: 30,
      alTocar: () => {
        // Phaser conserva los JSON entre reinicios de escena. Quitamos solo
        // el paquete fallido para que el reintento vuelva a pedir el archivo.
        this.cache.json.remove('paquete')
        this.scene.restart()
      },
    })
    window.kusi = {
      listo: false, avisos,
      estado: () => ({ familia: this.familiaAbierta, error: mensaje }),
    }
  }
}
