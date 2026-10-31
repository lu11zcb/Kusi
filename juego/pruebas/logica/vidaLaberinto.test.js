import { test } from 'node:test'
import assert from 'node:assert/strict'
import { vidaActiva } from '../../kit/reproductor/efectos/vida.js'
import { ParpadeoCuy, ESPERA_MINIMA, ESPERA_MAXIMA } from '../../kit/reproductor/efectos/ParpadeoCuy.js'
import { SonidosLaberinto, SONIDOS_LABERINTO, esCuadroDePisada } from '../../kit/reproductor/efectos/SonidosLaberinto.js'

// Un cuy de mentira con la misma interfaz que usa el parpadeo: dónde mira, si
// tiene una expresión en curso y las dos operaciones que el efecto le pide.
function crearCuyFalso({ direccion = 'frente', expresion = null } = {}) {
  const cuy = {
    direccionAnimada: direccion,
    estadoExpresivo: expresion,
    mostrados: [],
    interrumpidos: [],
    mostrarEstado(estado, vista) {
      this.mostrados.push([estado, vista])
      this.estadoExpresivo = estado
      return true
    },
    interrumpirEstado(estado) {
      this.interrumpidos.push(estado)
      if (this.estadoExpresivo !== estado) return false
      this.estadoExpresivo = null
      return true
    },
  }
  return cuy
}

test('la vida está encendida salvo con ?vida=0, aunque haya otros parámetros', () => {
  assert.equal(vidaActiva(''), true)
  assert.equal(vidaActiva('?paquete=laberinto'), true)
  assert.equal(vidaActiva('?vida=1'), true)
  assert.equal(vidaActiva('?vida='), true)
  assert.equal(vidaActiva('?vida=0'), false)
  assert.equal(vidaActiva('?paquete=laberinto&vida=0&rapido=1'), false)
  // Fuera de un navegador no hay dirección que leer y la capa queda encendida.
  assert.equal(vidaActiva(), true)
})

test('el parpadeo espera quieto y de frente el tiempo que sortea entre el mínimo y el máximo', () => {
  for (const [azar, espera] of [[0, ESPERA_MINIMA], [1, ESPERA_MAXIMA], [0.5, (ESPERA_MINIMA + ESPERA_MAXIMA) / 2]]) {
    const cuy = crearCuyFalso()
    const parpadeo = new ParpadeoCuy(cuy, { azar: () => azar })
    assert.equal(parpadeo.actualizar(espera - 0.01, false), false, 'todavía no toca')
    assert.deepEqual(cuy.mostrados, [])
    assert.equal(parpadeo.actualizar(0.02, false), true)
    assert.deepEqual(cuy.mostrados, [['parpadeo', 'frente']])
    assert.equal(parpadeo.parpadeos, 1)
  }
})

test('después de parpadear sortea otra espera completa y no repite el parpadeo en cadena', () => {
  const cuy = crearCuyFalso()
  const parpadeo = new ParpadeoCuy(cuy, { azar: () => 0 })
  parpadeo.actualizar(ESPERA_MINIMA, false)
  assert.equal(cuy.mostrados.length, 1)
  // Mientras el parpadeo sigue en curso la cuenta no avanza.
  assert.equal(parpadeo.actualizar(10, false), false)
  cuy.estadoExpresivo = null
  assert.equal(parpadeo.actualizar(ESPERA_MINIMA - 0.01, false), false)
  assert.equal(parpadeo.actualizar(0.02, false), true)
  assert.equal(cuy.mostrados.length, 2)
})

test('caminar reinicia la espera y corta un parpadeo que estaba en curso', () => {
  const cuy = crearCuyFalso()
  const parpadeo = new ParpadeoCuy(cuy, { azar: () => 0 })
  parpadeo.actualizar(ESPERA_MINIMA - 0.5, false)
  assert.equal(parpadeo.actualizar(0.1, true), false)
  // La cuenta empezó de cero: medio segundo después de volver a quedarse quieto no toca.
  assert.equal(parpadeo.actualizar(ESPERA_MINIMA - 0.01, false), false)
  assert.deepEqual(cuy.mostrados, [])

  cuy.estadoExpresivo = 'parpadeo'
  parpadeo.actualizar(0.016, true)
  assert.equal(cuy.estadoExpresivo, null)
  assert.deepEqual(cuy.interrumpidos.slice(-1), ['parpadeo'])
})

test('de lado, de espaldas o con otra expresión el cuy no parpadea ni conserva la cuenta', () => {
  for (const situacion of [{ direccion: 'derecha' }, { direccion: 'izquierda' }, { direccion: 'espaldas' },
    { expresion: 'feliz' }, { expresion: 'asustado' }]) {
    const cuy = crearCuyFalso(situacion)
    const parpadeo = new ParpadeoCuy(cuy, { azar: () => 0 })
    assert.equal(parpadeo.actualizar(ESPERA_MAXIMA * 3, false), false)
    assert.deepEqual(cuy.mostrados, [])
    // Al volver a la pose frontal la espera empieza de cero.
    cuy.direccionAnimada = 'frente'
    cuy.estadoExpresivo = null
    assert.equal(parpadeo.actualizar(ESPERA_MINIMA - 0.01, false), false)
    assert.equal(parpadeo.actualizar(0.02, false), true)
  }
})

test('con la vida apagada el parpadeo no hace nada', () => {
  const cuy = crearCuyFalso()
  const parpadeo = new ParpadeoCuy(cuy, { activo: false, azar: () => 0 })
  assert.equal(parpadeo.actualizar(ESPERA_MAXIMA * 10, false), false)
  assert.equal(parpadeo.actualizar(1, true), false)
  assert.deepEqual(cuy.mostrados, [])
  assert.deepEqual(cuy.interrumpidos, [])
  assert.equal(parpadeo.parpadeos, 0)
})

test('las pisadas suenan en el primer y el tercer cuadro del ciclo de caminar', () => {
  // Phaser numera los cuadros de una animación desde 1: 0,1,2,1 llega como 1,2,3,4.
  assert.deepEqual([1, 2, 3, 4].map((index) => esCuadroDePisada({ index })), [true, false, true, false])
  assert.equal(esCuadroDePisada(null), false)
  assert.equal(esCuadroDePisada(undefined), false)
})

// Un gestor de sonido de mentira: crea sonidos que recuerdan si están sonando.
function crearEscenaFalsa({ bloqueado = false, sinArchivo = [] } = {}) {
  const creados = []
  const escena = {
    game: { loop: { now: 1000 } },
    sound: {
      locked: bloqueado,
      add(clave) {
        const sonido = {
          clave,
          isPlaying: false,
          detenido: 0,
          destruido: false,
          play() { this.isPlaying = true; return true },
          stop() { this.isPlaying = false; this.detenido += 1 },
          destroy() { this.destruido = true },
        }
        creados.push(sonido)
        return sonido
      },
    },
    cache: {
      audio: { exists: (clave) => !sinArchivo.some((tipo) => clave.endsWith(tipo)) },
    },
  }
  return { escena, creados }
}

test('con la vida apagada o con el audio bloqueado no suena nada ni se guardan pisadas pendientes', () => {
  const apagado = crearEscenaFalsa()
  const sonidosApagados = new SonidosLaberinto(apagado.escena, { activo: false })
  assert.equal(sonidosApagados.reproducir('comer'), false)
  assert.equal(apagado.creados.length, 0)

  const bloqueado = crearEscenaFalsa({ bloqueado: true })
  const sonidos = new SonidosLaberinto(bloqueado.escena)
  assert.equal(sonidos.reproducir('paso_cuy'), false)
  bloqueado.escena.sound.locked = false
  bloqueado.escena.game.loop.now += 1
  // Al desbloquearse solo suena lo que se pide después, no lo acumulado.
  assert.deepEqual(sonidos.estado().reproducciones, {})
  assert.equal(sonidos.reproducir('paso_cuy'), true)
  assert.equal(sonidos.estado().reproducciones.paso_cuy, 1)
})

test('cada sonido respeta su espera mínima y un tipo desconocido o sin archivo no suena', () => {
  const { escena, creados } = crearEscenaFalsa({ sinArchivo: ['puerta'] })
  const sonidos = new SonidosLaberinto(escena)
  assert.equal(sonidos.reproducir('comer'), true)
  creados[0].isPlaying = false
  // Antes de que pase la espera de «comer» el mismo sonido se rechaza.
  escena.game.loop.now += SONIDOS_LABERINTO.comer.espera - 1
  assert.equal(sonidos.reproducir('comer'), false)
  escena.game.loop.now += 1
  assert.equal(sonidos.reproducir('comer'), true)
  assert.equal(sonidos.estado().reproducciones.comer, 2)

  assert.equal(sonidos.reproducir('puerta'), false)
  assert.equal(sonidos.reproducir('inexistente'), false)
})

test('los pasos del cuy y del zorro comparten el intervalo y no se superponen', () => {
  const { escena, creados } = crearEscenaFalsa()
  const sonidos = new SonidosLaberinto(escena)
  assert.equal(sonidos.reproducir('paso_cuy'), true)
  // Mientras suena el paso del cuy, el del zorro se rechaza aunque sea otro tipo.
  escena.game.loop.now += 200
  assert.equal(sonidos.reproducir('paso_zorro'), false)
  creados[0].isPlaying = false
  assert.equal(sonidos.reproducir('paso_zorro'), true)
  assert.deepEqual(sonidos.estado().reproducciones, { paso_cuy: 1, paso_zorro: 1 })
})

test('silenciar detiene lo que suena y impide nuevos sonidos; destruir libera todo', () => {
  const { escena, creados } = crearEscenaFalsa()
  const sonidos = new SonidosLaberinto(escena)
  sonidos.reproducir('captura')
  assert.deepEqual(sonidos.estado().enReproduccion, ['captura'])
  assert.equal(sonidos.cambiarSilencio(), true)
  assert.equal(creados[0].detenido, 1)
  escena.game.loop.now += 1000
  assert.equal(sonidos.reproducir('nivel'), false)
  assert.equal(sonidos.cambiarSilencio(), false)
  assert.equal(sonidos.reproducir('nivel'), true)

  sonidos.destruir()
  assert.equal(creados.every((sonido) => sonido.destruido), true)
  assert.equal(sonidos.estado().destruido, true)
  assert.equal(sonidos.reproducir('comer'), false)
})

test('los volúmenes se quedan bajos para un juego de niños y cada sonido tiene su archivo', () => {
  for (const [tipo, datos] of Object.entries(SONIDOS_LABERINTO)) {
    assert.ok(datos.volumen > 0 && datos.volumen <= 0.15, tipo + ' debe sonar bajo')
    assert.match(datos.archivo, /^[a-z0-9-]+\.(ogg|wav)$/, tipo + ' debe apuntar a audio de public/sonidos')
    assert.ok(datos.espera >= 0, tipo + ' necesita una espera válida')
  }
})
