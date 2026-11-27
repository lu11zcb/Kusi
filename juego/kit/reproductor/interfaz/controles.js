// Los controles en pantalla de un juego del taller: un joystick abajo a la izquierda y, si el juego
// salta, un botón grande de «Saltar» abajo a la derecha. También funcionan las flechas (o A, D, W, S)
// y la barra espaciadora. El niño maneja a su protagonista con el dedo, sin tocar casillas ni botones
// de «ir a…». La lógica (el vector, la zona muerta) está en ../logica/controles.js.
//
//   const controles = crearControles(this, { saltar: true })
//   // en update(tiempo, delta):
//   const { x, y, saltar } = controles.leer()
//
// Los controles viven en la pantalla (scrollFactor 0, por encima de todo). Si el juego usa zoom en
// su cámara, los controles no se deben agregar a esa cámara: se mantiene el zoom en 1.

import * as Phaser from 'phaser'
import { COLOR, NUMERO, estiloTexto } from '../medidas.js'
import { vectorDeJoystick, vectorDeTeclas, combinarEntradas } from '../logica/controles.js'

const PROFUNDIDAD = 5000
const RADIO_BASE = 92
const RADIO_PERILLA = 44
const RADIO_SALTO = 62
const RECORRIDO_PERILLA = RADIO_BASE - RADIO_PERILLA / 2
const MARGEN = 36
const CLAVE_SALTO = 'boton-saltar'

export function crearControles(escena, { saltar = false, joystick = true } = {}) {
  const estado = { dedo: null, dx: 0, dy: 0, saltoPedido: false, saltoSostenido: false, saltoDedo: null }
  const piezas = []
  const base = joystick ? escena.add.image(0, 0, 'joystick-base').setDisplaySize(RADIO_BASE * 2, RADIO_BASE * 2).setScrollFactor(0).setDepth(PROFUNDIDAD).setAlpha(0.9) : null
  const perilla = joystick ? escena.add.image(0, 0, 'joystick-perilla').setDisplaySize(RADIO_PERILLA * 2, RADIO_PERILLA * 2).setScrollFactor(0).setDepth(PROFUNDIDAD + 1) : null
  if (base) piezas.push(base, perilla)

  // Agrupar el dibujo permite achicarlo alrededor del centro sin mover la etiqueta ni la zona de toque.
  let boton = null
  let etiqueta = null
  let circuloDeRespaldo = null
  if (saltar) {
    boton = escena.add.container(0, 0).setDepth(PROFUNDIDAD + 1)
    if (escena.textures.exists(CLAVE_SALTO)) {
      const lado = 2 * RADIO_SALTO
      boton.add(escena.add.image(0, 0, CLAVE_SALTO).setDisplaySize(lado, lado))
    } else {
      // El juego sigue siendo jugable si el archivo del botón no llegó a cargarse.
      const sombra = escena.add.circle(0, 6, RADIO_SALTO, NUMERO.terracota)
      circuloDeRespaldo = escena.add.circle(0, 0, RADIO_SALTO, NUMERO.naranja).setStrokeStyle(5, NUMERO.tinta)
      const flecha = escena.add.triangle(0, -12, 0, -22, 22, 14, -22, 14, NUMERO.tinta)
      boton.add([sombra, circuloDeRespaldo, flecha])
    }
    boton.setScrollFactor(0, 0, true)
    etiqueta = escena.add.text(0, 0, 'Saltar', estiloTexto(20, COLOR.tinta)).setOrigin(0.5).setScrollFactor(0).setDepth(PROFUNDIDAD + 2)
    piezas.push(boton, etiqueta)
  }
  for (const pieza of piezas) pieza.setData('hud', true)

  // Las posiciones siguen al tamaño de la pantalla (el lienzo se amplía en pantallas alargadas).
  const colocar = () => {
    const { width: ancho, height: alto } = escena.scale
    estado.centro = { x: MARGEN + RADIO_BASE + 14, y: alto - MARGEN - RADIO_BASE }
    base?.setPosition(estado.centro.x, estado.centro.y)
    perilla?.setPosition(estado.centro.x + estado.dx, estado.centro.y + estado.dy)
    if (boton) {
      const centro = { x: ancho - MARGEN - 80, y: alto - MARGEN - 72 }
      estado.centroSalto = centro
      boton.setPosition(centro.x, centro.y)
      etiqueta.setPosition(centro.x, centro.y + RADIO_SALTO + 12)
    }
  }
  colocar()
  escena.scale.on('resize', colocar)

  // El dedo: el primero que toca el joystick lo maneja, y otro dedo puede tocar «Saltar» a la vez.
  const alBajar = (puntero) => {
    if (boton && estado.saltoDedo === null && Phaser.Math.Distance.Between(puntero.x, puntero.y, estado.centroSalto.x, estado.centroSalto.y) <= RADIO_SALTO) {
      estado.saltoDedo = puntero.id
      estado.saltoPedido = true
      estado.saltoSostenido = true
      boton.setScale(0.92)
      circuloDeRespaldo?.setFillStyle(NUMERO.naranjaClaro)
      return
    }
    if (joystick && estado.dedo === null && Phaser.Math.Distance.Between(puntero.x, puntero.y, estado.centro.x, estado.centro.y) <= RADIO_BASE * 1.5) {
      estado.dedo = puntero.id
      alMover(puntero)
    }
  }
  const alMover = (puntero) => {
    if (puntero.id !== estado.dedo) return
    const gesto = vectorDeJoystick(puntero.x - estado.centro.x, puntero.y - estado.centro.y, RECORRIDO_PERILLA)
    estado.dx = gesto.x * RECORRIDO_PERILLA
    estado.dy = gesto.y * RECORRIDO_PERILLA
    estado.vector = gesto
    perilla.setPosition(estado.centro.x + estado.dx, estado.centro.y + estado.dy)
  }
  const alSoltar = (puntero) => {
    if (puntero.id === estado.dedo) {
      estado.dedo = null
      estado.dx = 0
      estado.dy = 0
      estado.vector = { x: 0, y: 0 }
      perilla?.setPosition(estado.centro.x, estado.centro.y)
    }
    if (puntero.id === estado.saltoDedo) {
      estado.saltoDedo = null
      estado.saltoSostenido = false
      boton.setScale(1)
      circuloDeRespaldo?.setFillStyle(NUMERO.naranja)
    }
  }
  estado.vector = { x: 0, y: 0 }
  escena.input.on('pointerdown', alBajar)
  escena.input.on('pointermove', alMover)
  escena.input.on('pointerup', alSoltar)
  escena.input.on('pointerupoutside', alSoltar)

  // El teclado.
  const teclado = escena.input.keyboard
  const teclas = teclado ? teclado.addKeys({
    izquierda: Phaser.Input.Keyboard.KeyCodes.LEFT, derecha: Phaser.Input.Keyboard.KeyCodes.RIGHT,
    arriba: Phaser.Input.Keyboard.KeyCodes.UP, abajo: Phaser.Input.Keyboard.KeyCodes.DOWN,
    a: Phaser.Input.Keyboard.KeyCodes.A, d: Phaser.Input.Keyboard.KeyCodes.D,
    w: Phaser.Input.Keyboard.KeyCodes.W, s: Phaser.Input.Keyboard.KeyCodes.S,
    espacio: Phaser.Input.Keyboard.KeyCodes.SPACE,
  }, false) : null
  if (teclas && saltar) {
    teclas.espacio.on('down', () => { estado.saltoPedido = true })
    teclas.arriba.on('down', () => { estado.saltoPedido = true })
    teclas.w.on('down', () => { estado.saltoPedido = true })
  }

  let destruido = false
  const destruir = () => {
    if (destruido) return
    destruido = true
    escena.scale.off('resize', colocar)
    escena.input.off('pointerdown', alBajar)
    escena.input.off('pointermove', alMover)
    escena.input.off('pointerup', alSoltar)
    escena.input.off('pointerupoutside', alSoltar)
    if (teclas) for (const tecla of Object.values(teclas)) { tecla.removeAllListeners?.(); teclado.removeKey(tecla) }
    for (const pieza of piezas) pieza.destroy()
  }
  escena.events.once('shutdown', destruir)
  escena.events.once('destroy', destruir)

  return {
    // El estado de este cuadro: x e y de -1 a 1, y «saltar» una sola vez por cada toque del botón.
    leer() {
      const delTeclado = teclas
        ? vectorDeTeclas({ izquierda: teclas.izquierda.isDown || teclas.a.isDown, derecha: teclas.derecha.isDown || teclas.d.isDown,
          arriba: !saltar && (teclas.arriba.isDown || teclas.w.isDown), abajo: teclas.abajo.isDown || teclas.s.isDown })
        : { x: 0, y: 0 }
      const { x, y } = combinarEntradas(estado.vector, delTeclado)
      const saltoPedido = estado.saltoPedido
      estado.saltoPedido = false
      return { x, y, saltar: saltoPedido, saltarSostenido: estado.saltoSostenido }
    },
    // Las pruebas y el revisor leen aquí dónde están los controles.
    estado: () => ({ joystick: { ...estado.centro, radio: RADIO_BASE }, saltar: estado.centroSalto ? { ...estado.centroSalto, radio: RADIO_SALTO } : null }),
    // La mano guía empuja el dibujo. El vector de juego lo sigue dando el niño.
    demostrarJoystick(punto = estado.centro) {
      if (destruido || !perilla || estado.dedo !== null) return
      const { x, y } = estado.centro
      const dx = punto.x - x
      const dy = punto.y - y
      const escala = RECORRIDO_PERILLA / Math.max(RECORRIDO_PERILLA, Math.hypot(dx, dy))
      perilla.setPosition(x + dx * escala, y + dy * escala)
    },
    destruir,
  }
}
