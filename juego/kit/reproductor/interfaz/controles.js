// Los juegos pueden pedir joystick con un botón de salto o dos botones para cambiar de carril.
// El teclado también funciona. La lógica del joystick y su zona muerta está en ../logica/controles.js.
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
const RADIO_BOTON = 62
const RECORRIDO_PERILLA = RADIO_BASE - RADIO_PERILLA / 2
const MARGEN = 36

// El dibujo se achica alrededor del centro. La etiqueta y la zona de toque conservan su tamaño.
function crearBoton(escena, clave, texto, alPulsar, sentido = 0) {
  const dibujo = escena.add.container(0, 0).setDepth(PROFUNDIDAD + 1)
  let circuloDeRespaldo = null
  if (escena.textures.exists(clave)) {
    const lado = 2 * RADIO_BOTON
    dibujo.add(escena.add.image(0, 0, clave).setDisplaySize(lado, lado))
  } else {
    // Una flecha dibujada permite reconocer la acción si falla la carga de la textura.
    const sombra = escena.add.circle(0, 6, RADIO_BOTON, NUMERO.terracota)
    circuloDeRespaldo = escena.add.circle(0, 0, RADIO_BOTON, NUMERO.naranja).setStrokeStyle(5, NUMERO.tinta)
    dibujo.add([sombra, circuloDeRespaldo])
    if (sentido) {
      const flecha = escena.add.graphics()
      flecha.lineStyle(10, NUMERO.tinta)
      flecha.lineBetween(0, -24 * sentido, 0, 24 * sentido)
      flecha.lineBetween(-17, 7 * sentido, 0, 24 * sentido)
      flecha.lineBetween(17, 7 * sentido, 0, 24 * sentido)
      flecha.fillStyle(NUMERO.tinta)
      for (const [x, y] of [[0, -24], [0, 24], [-17, 7], [17, 7]]) flecha.fillCircle(x, y * sentido, 5)
      dibujo.add(flecha)
    } else {
      dibujo.add(escena.add.triangle(0, -12, 0, -22, 22, 14, -22, 14, NUMERO.tinta))
    }
  }
  dibujo.setScrollFactor(0, 0, true)
  const etiqueta = escena.add.text(0, 0, texto, estiloTexto(20, COLOR.tinta))
    .setOrigin(0.5).setScrollFactor(0).setDepth(PROFUNDIDAD + 2)
  return { dibujo, etiqueta, circuloDeRespaldo, alPulsar, dedos: new Set() }
}

function zonaDelBoton(boton) {
  return boton ? { x: boton.dibujo.x, y: boton.dibujo.y, radio: RADIO_BOTON } : null
}

export function crearControles(escena, { saltar = false, joystick = true, carriles = false } = {}) {
  const conJoystick = joystick && !carriles
  const estado = { dedo: null, dx: 0, dy: 0, saltoPedido: false, vector: { x: 0, y: 0 } }
  const piezas = []
  const base = conJoystick ? escena.add.image(0, 0, 'joystick-base').setDisplaySize(RADIO_BASE * 2, RADIO_BASE * 2).setScrollFactor(0).setDepth(PROFUNDIDAD).setAlpha(0.9) : null
  const perilla = conJoystick ? escena.add.image(0, 0, 'joystick-perilla').setDisplaySize(RADIO_PERILLA * 2, RADIO_PERILLA * 2).setScrollFactor(0).setDepth(PROFUNDIDAD + 1) : null
  if (base) piezas.push(base, perilla)

  // La cola conserva incluso dos toques rápidos entre cuadros y entrega un carril por lectura.
  const cambiosDeCarril = []
  const pedirSubida = () => cambiosDeCarril.push(-1)
  const pedirBajada = () => cambiosDeCarril.push(1)
  const pedirSalto = () => { estado.saltoPedido = true }
  const subir = carriles ? crearBoton(escena, 'boton-subir', 'Subir', pedirSubida, -1) : null
  const bajar = carriles ? crearBoton(escena, 'boton-bajar', 'Bajar', pedirBajada, 1) : null
  const salto = saltar && !carriles ? crearBoton(escena, 'boton-saltar', 'Saltar', pedirSalto) : null
  const botones = [subir, bajar, salto].filter(Boolean)
  for (const boton of botones) piezas.push(boton.dibujo, boton.etiqueta)
  for (const pieza of piezas) pieza.setData('hud', true)

  // Las posiciones siguen al tamaño de la pantalla (el lienzo se amplía en pantallas alargadas).
  const colocar = () => {
    const { width: ancho, height: alto } = escena.scale
    estado.centro = { x: MARGEN + RADIO_BASE + 14, y: alto - MARGEN - RADIO_BASE }
    base?.setPosition(estado.centro.x, estado.centro.y)
    perilla?.setPosition(estado.centro.x + estado.dx, estado.centro.y + estado.dy)
    for (const boton of botones) {
      const x = boton === subir ? estado.centro.x : ancho - MARGEN - 80
      // Los botones de carril comparten una altura para que sus etiquetas también queden alineadas.
      const y = boton === salto ? alto - MARGEN - 72 : estado.centro.y
      boton.dibujo.setPosition(x, y)
      boton.etiqueta.setPosition(x, y + RADIO_BOTON + 12)
    }
  }
  colocar()
  escena.scale.on('resize', colocar)

  // Cada toque pertenece a un botón hasta que se suelta. Arrastrar el dedo no produce otro pulso.
  const alBajar = (puntero) => {
    if (puntero.id === estado.dedo || botones.some(boton => boton.dedos.has(puntero.id))) return
    for (const boton of botones) {
      if (boton === salto && boton.dedos.size) continue
      const distancia = Phaser.Math.Distance.Between(puntero.x, puntero.y, boton.dibujo.x, boton.dibujo.y)
      if (distancia > RADIO_BOTON) continue
      boton.dedos.add(puntero.id)
      boton.alPulsar()
      boton.dibujo.setScale(0.92)
      boton.circuloDeRespaldo?.setFillStyle(NUMERO.naranjaClaro)
      return
    }
    if (conJoystick && estado.dedo === null && Phaser.Math.Distance.Between(puntero.x, puntero.y, estado.centro.x, estado.centro.y) <= RADIO_BASE * 1.5) {
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
    for (const boton of botones) {
      if (!boton.dedos.delete(puntero.id) || boton.dedos.size) continue
      boton.dibujo.setScale(1)
      boton.circuloDeRespaldo?.setFillStyle(NUMERO.naranja)
    }
  }
  escena.input.on('pointerdown', alBajar)
  escena.input.on('pointermove', alMover)
  escena.input.on('pointerup', alSoltar)
  escena.input.on('pointerupoutside', alSoltar)

  // Phaser emite «down» solo al iniciar la pulsación con emitOnRepeat en false.
  const teclado = escena.input.keyboard
  const teclas = teclado ? teclado.addKeys({
    izquierda: Phaser.Input.Keyboard.KeyCodes.LEFT, derecha: Phaser.Input.Keyboard.KeyCodes.RIGHT,
    arriba: Phaser.Input.Keyboard.KeyCodes.UP, abajo: Phaser.Input.Keyboard.KeyCodes.DOWN,
    a: Phaser.Input.Keyboard.KeyCodes.A, d: Phaser.Input.Keyboard.KeyCodes.D,
    w: Phaser.Input.Keyboard.KeyCodes.W, s: Phaser.Input.Keyboard.KeyCodes.S,
    espacio: Phaser.Input.Keyboard.KeyCodes.SPACE,
  }, false, false) : null
  if (teclas && carriles) {
    teclas.arriba.on('down', pedirSubida)
    teclas.w.on('down', pedirSubida)
    teclas.abajo.on('down', pedirBajada)
    teclas.s.on('down', pedirBajada)
  }
  if (teclas && salto) {
    teclas.espacio.on('down', pedirSalto)
    teclas.arriba.on('down', pedirSalto)
    teclas.w.on('down', pedirSalto)
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
    // El modo de carriles consume un pulso. El movimiento libre sigue leyendo el vector sostenido.
    leer() {
      if (carriles) return { x: 0, y: cambiosDeCarril.shift() ?? 0, saltar: false, saltarSostenido: false }
      const delTeclado = teclas
        ? vectorDeTeclas({ izquierda: teclas.izquierda.isDown || teclas.a.isDown, derecha: teclas.derecha.isDown || teclas.d.isDown,
          arriba: !saltar && (teclas.arriba.isDown || teclas.w.isDown), abajo: teclas.abajo.isDown || teclas.s.isDown })
        : { x: 0, y: 0 }
      const { x, y } = combinarEntradas(estado.vector, delTeclado)
      const saltoPedido = estado.saltoPedido
      estado.saltoPedido = false
      return { x, y, saltar: saltoPedido, saltarSostenido: salto !== null && salto.dedos.size > 0 }
    },
    // El tutorial usa estas zonas para señalar el centro de los controles.
    estado: () => ({
      joystick: carriles ? null : { ...estado.centro, radio: RADIO_BASE },
      saltar: zonaDelBoton(salto),
      subir: zonaDelBoton(subir),
      bajar: zonaDelBoton(bajar),
    }),
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
