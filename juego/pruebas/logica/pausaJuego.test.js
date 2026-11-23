import { test } from 'node:test'
import assert from 'node:assert/strict'
import { instalarPausaJuego } from '../../kit/reproductor/mensajes/pausaJuego.js'

// La pausa sin Phaser: un juego de mentira con el mismo reparto que el real. El
// administrador de escenas pausa en el acto; this.scene.pause() de cada escena
// solo lo anota para el cuadro siguiente, como hace Phaser.

function juegoDePrueba() {
  const escena = {
    estado: 'corriendo',
    anotadas: [],
    indiceNivel: 1,
    partida: { id: 'partida-de-prueba', orden: 3, cerrada: false },
    sys: { settings: { key: 'laberinto' } },
    scene: { pause() { escena.anotadas.push('pausa') }, resume() { escena.anotadas.push('reanuda') } },
  }
  const sonido = { pausado: false, pauseAll() { sonido.pausado = true }, resumeAll() { sonido.pausado = false } }
  const juego = {
    input: { enabled: true },
    sound: sonido,
    scene: {
      getScenes: () => (escena.estado === 'corriendo' ? [escena] : []),
      pause(objetivo) { if (objetivo === escena) escena.estado = 'pausada' },
      resume(objetivo) { if (objetivo === escena) escena.estado = 'corriendo' },
    },
  }
  const avisos = []
  let ordenar = null
  const puente = { controlar(funcion) { ordenar = funcion }, avisar(aviso) { avisos.push(aviso) } }
  const voz = { callada: false }
  instalarPausaJuego(juego, puente, () => { voz.callada = true })
  return { escena, juego, avisos, voz, ordenar: (tipo) => ordenar({ tipo }) }
}

test('al avisar «pausado» la escena ya está detenida, sin esperar al cuadro siguiente', () => {
  const { escena, juego, avisos, voz, ordenar } = juegoDePrueba()
  ordenar('pausar')
  assert.equal(escena.estado, 'pausada')
  assert.deepEqual(escena.anotadas, [])
  assert.equal(juego.input.enabled, false)
  assert.equal(juego.sound.pausado, true)
  assert.equal(voz.callada, true)
  assert.deepEqual(avisos, [{ tipo: 'pausado', partida: 'partida-de-prueba', orden: 3, nivel: 2 }])
})

test('reanudar devuelve la escena, la entrada y el sonido en el acto', () => {
  const { escena, juego, avisos, ordenar } = juegoDePrueba()
  ordenar('pausar')
  ordenar('reanudar')
  assert.equal(escena.estado, 'corriendo')
  assert.deepEqual(escena.anotadas, [])
  assert.equal(juego.input.enabled, true)
  assert.equal(juego.sound.pausado, false)
  assert.deepEqual(avisos.map((aviso) => aviso.tipo), ['pausado', 'reanudado'])
})

test('una partida cerrada no se pausa', () => {
  const { escena, avisos, ordenar } = juegoDePrueba()
  escena.partida.cerrada = true
  ordenar('pausar')
  assert.equal(escena.estado, 'corriendo')
  assert.deepEqual(avisos, [])
})
