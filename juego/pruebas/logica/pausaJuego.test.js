import { test } from 'node:test'
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { instalarPausaJuego, pedirPausa } from '../../kit/reproductor/mensajes/pausaJuego.js'
import { crearPuente } from '../../kit/reproductor/mensajes/puenteGuion.js'

// La pausa sin Phaser: un juego de mentira con el mismo reparto que el real. El
// administrador de escenas pausa en el acto; this.scene.pause() de cada escena
// solo lo anota para el cuadro siguiente, como hace Phaser.

function juegoDePrueba({ anfitrion = true } = {}) {
  const escena = {
    estado: 'corriendo',
    anotadas: [],
    indiceNivel: 1,
    partida: { id: 'partida-de-prueba', orden: 3, cerrada: false },
    sys: { settings: { key: 'laberinto' }, events: new EventEmitter(), isPaused: () => escena.estado === 'pausada' },
    scene: { pause() { escena.anotadas.push('pausa') }, resume() { escena.anotadas.push('reanuda') } },
  }
  const sonido = { pausado: false, pauseAll() { sonido.pausado = true }, resumeAll() { sonido.pausado = false } }
  const juego = {
    registry: new Map(),
    input: { enabled: true },
    sound: sonido,
    scene: {
      getScenes: () => (escena.estado === 'corriendo' ? [escena] : []),
      pause(objetivo) { if (objetivo === escena) escena.estado = 'pausada' },
      resume(objetivo) { if (objetivo === escena) escena.estado = 'corriendo' },
    },
  }
  const avisos = []
  const avisosNativos = []
  let recibirMensaje
  const ventana = {
    addEventListener(_tipo, escuchar) { recibirMensaje = escuchar },
    postMessage(aviso) { avisos.push(aviso) },
  }
  ventana.parent = anfitrion ? { postMessage: ventana.postMessage } : ventana
  if (anfitrion) ventana.KusiPuente = { emitir: (texto) => avisosNativos.push(JSON.parse(texto)) }
  const puente = crearPuente(ventana)
  const voz = { callada: false }
  let vueltas = 0
  const pantalla = {
    mostrar(acciones) { pantalla.acciones = acciones },
    ocultar() { pantalla.acciones = null; pantalla.despedida = false },
    despedir() { pantalla.acciones = null; pantalla.despedida = true },
  }
  instalarPausaJuego(juego, puente, {
    pantalla,
    callar: () => { voz.callada = true },
    volverPortada: () => { vueltas += 1 },
  })
  return {
    escena, juego, pantalla, avisos, avisosNativos, voz,
    pausarDesdeBoton: () => pedirPausa(juego),
    ordenar: (tipo) => recibirMensaje({ source: ventana.parent, data: { tipo } }),
    vueltas: () => vueltas,
  }
}

test('al avisar «pausado» la escena ya está detenida, sin esperar al cuadro siguiente', () => {
  const { escena, juego, pantalla, avisos, voz, ordenar } = juegoDePrueba()
  ordenar('pausar')
  assert.equal(escena.estado, 'pausada')
  assert.deepEqual(escena.anotadas, [])
  assert.equal(juego.input.enabled, false)
  assert.equal(juego.sound.pausado, true)
  assert.equal(voz.callada, true)
  assert.ok(!pantalla.acciones)
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

test('Pausa abre el menú y Seguir reanuda con el mismo aviso que la app', () => {
  const { escena, juego, pantalla, avisos, pausarDesdeBoton } = juegoDePrueba()
  pausarDesdeBoton()
  assert.equal(escena.estado, 'pausada')
  assert.equal(juego.input.enabled, false)
  assert.deepEqual(avisos, [{ tipo: 'pausado', partida: escena.partida.id, orden: 3, nivel: 2 }])
  pantalla.acciones.seguir()
  assert.equal(pantalla.acciones, null)
  assert.equal(escena.estado, 'corriendo')
  assert.equal(juego.input.enabled, true)
  assert.deepEqual(avisos.at(-1), { tipo: 'reanudado' })
})

test('Salir avisa a la página y al puente nativo una sola vez y deja la partida quieta', () => {
  const { escena, pantalla, avisos, avisosNativos, ordenar, pausarDesdeBoton, vueltas } = juegoDePrueba()
  pausarDesdeBoton()
  const { salir, seguir } = pantalla.acciones
  salir()
  salir()
  seguir()
  ordenar('reanudar')
  assert.equal(escena.estado, 'pausada')
  assert.equal(pantalla.despedida, true)
  assert.equal(vueltas(), 0)
  assert.deepEqual(avisos.slice(1), [{ tipo: 'salir' }])
  assert.deepEqual(avisosNativos, avisos)
})

test('Salir con el juego abierto solo vuelve a la portada una vez', () => {
  const { pantalla, avisos, pausarDesdeBoton, vueltas } = juegoDePrueba({ anfitrion: false })
  pausarDesdeBoton()
  const { salir } = pantalla.acciones
  salir()
  salir()
  assert.equal(vueltas(), 1)
  assert.deepEqual(avisos.map(({ tipo }) => tipo), ['pausado'])
})

test('reemplazar una partida pausada despeja el menú y devuelve la entrada sin avisar reanudado', () => {
  const { escena, juego, pantalla, avisos, pausarDesdeBoton } = juegoDePrueba()
  pausarDesdeBoton()
  escena.estado = 'cerrada'
  escena.sys.events.emit('shutdown')
  assert.equal(escena.estado, 'cerrada')
  assert.equal(juego.input.enabled, true)
  assert.equal(pantalla.acciones, null)
  assert.deepEqual(avisos.map(({ tipo }) => tipo), ['pausado'])
})
