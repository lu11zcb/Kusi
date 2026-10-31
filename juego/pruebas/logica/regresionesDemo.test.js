import test from 'node:test'
import assert from 'node:assert/strict'
import { desactivarBotones } from '../../kit/reproductor/interfaz/piezas.js'
import { crearMovimiento, pedirDireccion, avanzarMovimiento, detenerEnCentro } from '../../juegos/laberinto/logica/movimientoLaberinto.js'
import { crearZorro, avanzarZorro, posicionEnCasillas } from '../../juegos/laberinto/logica/zorrosLaberinto.js'
import { PortalVivo } from '../../juegos/laberinto/efectos/PortalVivo.js'

const PASILLO = ['#############', '#C.........P#', '#############']

test('el cierre admite los botones nuevos y antiguos y desactiva todos sin lanzar errores', () => {
  let contenedor = 0
  let fondo = 0
  const botones = { sonido: { disableInteractive() { contenedor += 1 } },
    ayuda: { disableInteractive() { contenedor += 1 } },
    altavoz: { fondo: { disableInteractive() { fondo += 1 } } } }
  assert.doesNotThrow(() => desactivarBotones(botones))
  assert.equal(contenedor, 2)
  assert.equal(fondo, 1)
  assert.ok(Object.values(botones).every(boton => boton.activo === false))
  assert.doesNotThrow(() => desactivarBotones({ sonido: botones.sonido }))
})

test('una pulsación llega al portal y queda detenida en ese mismo cuadro', () => {
  const estado = crearMovimiento(PASILLO)
  pedirDireccion(estado, 'derecha')
  let cierre = 0
  avanzarMovimiento(estado, PASILLO, 20, 3, movimiento => {
    if (PASILLO[movimiento.fila][movimiento.columna] !== 'P') return true
    detenerEnCentro(movimiento)
    // La pantalla de cierre observa el estado antes de volver al callback.
    assert.equal(movimiento.moviendose, false)
    cierre += 1
    return false
  })
  assert.equal(cierre, 1)
  assert.deepEqual([estado.columna, estado.progreso, estado.moviendose], [11, 0, false])
})

test('la flecha posterior al joystick conserva el recorrido y el freno ante el muro', () => {
  const estado = crearMovimiento(PASILLO)
  pedirDireccion(estado, 'derecha')
  avanzarMovimiento(estado, PASILLO, .5)
  detenerEnCentro(estado)
  avanzarMovimiento(estado, PASILLO, 1)
  assert.equal(estado.columna, 3)
  pedirDireccion(estado, 'izquierda')
  avanzarMovimiento(estado, PASILLO, 10)
  assert.deepEqual([estado.columna, estado.progreso, estado.moviendose], [1, 0, false])
})

test('la patrulla recorre el pasillo sin perseguir al niño y conserva el desplazamiento continuo', () => {
  const enemigo = { fila: 1, columna: 2, movimiento: 'patrulla' }
  const anterior = crearZorro(enemigo, PASILLO)
  const actual = crearZorro(enemigo, PASILLO, { vivo: true })
  for (let paso = 0; paso < 300; paso += 1) {
    avanzarZorro(anterior, PASILLO, { fila: 1, columna: 1 }, 1 / 60)
    avanzarZorro(actual, PASILLO, { fila: 1, columna: 1 }, 1 / 60)
    const a=posicionEnCasillas(actual),b=posicionEnCasillas(anterior)
    assert.ok(Math.abs(a.columna-b.columna)<1e-8)
    assert.equal(a.fila,b.fila)
    assert.equal(actual.fase,'buscar')
    assert.equal(actual.persiguiendo,false)
  }
})

test('el portal con vida apagada tiene alfa cero incluso después de abrirse', () => {
  // Phaser distingue fillAlpha y alpha: alpha nace en 1 aunque el relleno sea
  // transparente. Esta doble interfaz reproduce la diferencia que ocultaba el fallo.
  const escena = { add: { ellipse: () => ({ alpha: 1,
    setDepth() { return this }, setAlpha(alfa) { this.alpha = alfa; return this } }) } }
  const puerta = { x: 10, y: 20, scaleX: 1, scaleY: 1, texture: { key: 'portal-abierto' } }
  const portal = new PortalVivo(escena, puerta, { casilla: 80, activo: false })
  portal.abrir()
  portal.actualizar(2)
  assert.equal(portal.estado().brillo, 0)
})
