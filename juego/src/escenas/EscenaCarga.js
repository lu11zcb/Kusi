// Primera escena: valida y prepara el paquete del juego antes de cargar sus dibujos.
// Si falta algún dibujo, se reemplaza por una figura simple.

import * as Phaser from 'phaser'
import { ANCHO, ALTO, COLOR, estiloTexto } from '../medidas.js'
import {
  clavesDelPaquete,
  pedirDibujos,
  completarConFiguras,
} from '../dibujos/dibujos.js'
import { generarPaquetePrueba } from '../datos/generarPaquetePrueba.js'
import { validarPaquete } from '../datos/validarPaquete.js'
import { validarLaberinto } from '../datos/validarLaberinto.js'
import { crearPartidaLaberinto, avisarPartida } from '../logica/partidaLaberinto.js'
import { nivelPedido } from '../logica/parametrosLaberinto.js'
import { avisos } from '../logica/avisos.js'
import { leerPuente, MENSAJE_PAQUETE, AVISO_ERROR } from '../mensajes/puenteGuion.js'
import { crearBoton } from '../interfaz/piezas.js'
import { validarSpriteCuy } from '../datos/validarSpriteCuy.js'
import { validarSpritePersonaje } from '../datos/validarSpritePersonaje.js'
import { vidaActiva } from '../efectos/vida.js'
import { pedirSonidosLaberinto } from '../efectos/SonidosLaberinto.js'
import {
  ARCHIVO_MANIFIESTO_CUY, CLAVE_MANIFIESTO_CUY, pedirHojaCuy, registrarAnimacionesCuy,
} from '../dibujos/cuyAnimado.js'
import {
  ARCHIVO_MANIFIESTO_ZORRO, CLAVE_MANIFIESTO_ZORRO, pedirHojaZorro, registrarAnimacionesZorro,
} from '../dibujos/zorroAnimado.js'

// Paquete de ejemplo utilizado mientras se integra el generador real.
const ARCHIVO_DEL_PAQUETE = 'paquete-ejemplo.json'
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
  }

  preload() {
    // Solo el alias explícito elige el ejemplo nuevo. Sin parámetros se conserva
    // el mercado; la escena definitiva se decide por la familia del JSON cargado.
    // ?paquete=mensaje abre el laberinto sin guion y espera el que le manden.
    const parametros = new URLSearchParams(window.location.search)
    this.esperaMensaje = parametros.get('paquete') === 'mensaje'
    this.pideLaberinto = parametros.get('paquete') === 'laberinto' || this.esperaMensaje
    this.partidaLaberinto = this.pideLaberinto ? crearPartidaLaberinto() : null
    if (this.pideLaberinto) window.kusi = { listo: false, avisos }
    this.cameras.main.setBackgroundColor(COLOR.crema)

    this.add
      .text(
        ANCHO / 2,
        ALTO / 2,
        this.pideLaberinto ? 'Preparando los caminos...' : 'Cargando el mercado...',
        estiloTexto(36),
      )
      .setOrigin(0.5)

    // Con un guion recibido por mensaje, o esperándolo, no se pide el de ejemplo.
    if (!this.esperaMensaje && !this.llegoPorMensaje) {
      this.load.json('paquete', this.pideLaberinto ? ARCHIVO_DEL_LABERINTO : ARCHIVO_DEL_PAQUETE)
    }
    this.load.json(CLAVE_MANIFIESTO_CUY, ARCHIVO_MANIFIESTO_CUY)
    this.load.json(CLAVE_MANIFIESTO_ZORRO, ARCHIVO_MANIFIESTO_ZORRO)
  }

  async create() {
    this.conectarPuente()
    // Sin guion todavía: se queda esperando. El puente avisó a la página que ya puede
    // recibirlo, y cuando llegue esta escena se reinicia con él.
    if (this.esperaMensaje && !this.llegoPorMensaje) return

    const paqueteBase = this.llegoPorMensaje ? this.paqueteRecibido : this.cache.json.get('paquete')

    try {
      // Simula la generación del paquete a partir del ejemplo. Lo que se pide como
      // laberinto se trata siempre como laberinto: un guion de otra familia se rechaza.
      const esLaberinto = this.pideLaberinto || paqueteBase?.familia === 'laberinto'
      if (esLaberinto && !this.partidaLaberinto) this.partidaLaberinto = crearPartidaLaberinto()
      const paquete = esLaberinto ? structuredClone(paqueteBase) : await generarPaquetePrueba(paqueteBase)

      // Verifica que el paquete generado tenga la estructura necesaria.
      const resultado = esLaberinto ? validarLaberinto(paquete) : validarPaquete(paquete)

      if (!resultado.valido) {
        throw new Error(resultado.errores.join('; '))
      }

      // El jugador animado es obligatorio: un fallo de carga debe quedar visible.
      const cuyAnimado = validarSpriteCuy(this.cache.json.get(CLAVE_MANIFIESTO_CUY))
      const zorroAnimado = validarSpritePersonaje(this.cache.json.get(CLAVE_MANIFIESTO_ZORRO), 'zorro')

      // Carga los dibujos necesarios para los puestos y productos.
      const claves = clavesDelPaquete(paquete)
      pedirDibujos(this, claves)
      pedirHojaCuy(this, cuyAnimado)
      pedirHojaZorro(this, zorroAnimado)
      // Los sonidos solo pertenecen al laberinto. Con ?vida=0 ni siquiera se
      // descargan, para que la comparación sin efectos sea también más liviana.
      if (esLaberinto && vidaActiva()) pedirSonidosLaberinto(this)

      this.load.once('complete', () => {
        try {
          const dibujadas = completarConFiguras(this, claves)

          if (dibujadas.length > 0) {
            console.info(
              `[dibujos] ${dibujadas.length} figuras simples creadas como reemplazo`,
            )
          }

          // Abre el mercado usando el paquete preparado.
          registrarAnimacionesCuy(this, cuyAnimado)
          registrarAnimacionesZorro(this, zorroAnimado)
          // ?nivel=N sirve para revisar cualquier nivel sin ganar los anteriores;
          // sin él, o con un valor dudoso, el laberinto empieza en el primero.
          const datos = { paquete, cuyAnimado, zorroAnimado, partida: this.partidaLaberinto }
          if (esLaberinto) datos.indiceNivel = nivelPedido(window.location.search, paquete.retos.length)
          this.scene.start(esLaberinto ? 'laberinto' : 'mercado', datos)
        } catch (error) {
          this.mostrarError(error)
        }
      })

      this.load.start()
    } catch (error) {
      this.mostrarError(error)
    }
  }

  // Si el juego se abrió para recibir guiones, esta escena atiende los que lleguen
  // mientras prepara el juego o espera. Mientras se prepara no hay nada que reiniciar:
  // solo importa un guion nuevo, y con él la escena empieza de nuevo.
  conectarPuente() {
    this.puente = leerPuente(this.game)
    if (!this.puente) return
    this.alRecibirOrden = (orden) => {
      if (orden.tipo === MENSAJE_PAQUETE) this.scene.restart({ paquete: orden.paquete })
    }
    this.puente.conectar(this.alRecibirOrden)
    this.events.once('shutdown', () => this.puente.desconectar(this.alRecibirOrden))
  }

  mostrarError(error) {
    // No se intenta dibujar un mapa inválido. El niño recibe una salida simple;
    // el diagnóstico técnico queda en consola y el puente recibe un solo fallo.
    if (this.partidaLaberinto) {
      console.error('[carga] No se pudo preparar el laberinto:', error)
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
        estado: () => ({ familia: 'laberinto', error: mensaje }),
      }
      return
    }
    console.error('[carga] No se pudo preparar el mercado:', error)

    this.add
      .text(
        ANCHO / 2,
        ALTO / 2 + 60,
        'No se pudo cargar el mercado',
        estiloTexto(28, COLOR.rojo),
      )
      .setOrigin(0.5)
  }
}

