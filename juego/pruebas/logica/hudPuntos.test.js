import test from 'node:test'
import assert from 'node:assert/strict'
import { crearHudPuntos } from '../../kit/reproductor/interfaz/hud.js'
import { avisarPartida, crearPartida, observarAvisosPartida } from '../../kit/reproductor/logica/partida.js'

function escenarioDePrueba() {
  const textos = []
  const pieza = () => ({
    setData() { return this },
    setDepth() { return this },
    setOrigin() { return this },
    setPosition() { return this },
    setRounded() { return this },
    setScrollFactor() { return this },
    setStrokeStyle() { return this },
    setSize() { return this },
    setText(texto) { this.text = texto; this.width = texto.length * 12; return this },
  })
  return {
    textos,
    add: {
      rectangle: pieza, star: pieza,
      text(_x, _y, texto) { const cifra = pieza().setText(texto); textos.push(cifra); return cifra },
    },
  }
}

test('el HUD presenta los puntos que llegan al emitir avisos de una partida', () => {
  const escena = escenarioDePrueba()
  const hud = crearHudPuntos(escena)
  const partida = crearPartida()
  hud.empezar(3)
  const dejarDeEscuchar = observarAvisosPartida((aviso) => {
    if (aviso.partida === partida.id) hud.recibir(aviso)
  })
  try {
    assert.equal(escena.textos[0].text, '0 de 20')
    avisarPartida(partida, 'accion', { nivel: 1, correcto: false })
    avisarPartida(partida, 'ayuda', { nivel: 1, ayuda: 1 })
    assert.equal(escena.textos[0].text, '0 de 20')
    avisarPartida(partida, 'reto_completado', { nivel: 1 })
    assert.equal(escena.textos[0].text, '6 de 20')
    avisarPartida(partida, 'reto_completado', { nivel: 1 })
    avisarPartida(crearPartida(), 'reto_completado', { nivel: 3 })
    assert.equal(escena.textos[0].text, '6 de 20')
    avisarPartida(partida, 'reto_completado', { nivel: 2 })
    assert.equal(escena.textos[0].text, '12 de 20')
  } finally { dejarDeEscuchar() }
})

test('fin llega de inmediato al panel y Android lo recibe una vez al salir de la tarjeta', () => {
  const anterior = globalThis.window
  const web = [], android = []
  globalThis.window = {
    parent: { postMessage: (mensaje) => web.push(mensaje) },
    KusiPuente: { emitir: (mensaje) => android.push(JSON.parse(mensaje)) },
  }
  let continuar
  const dejarDeEscuchar = observarAvisosPartida((aviso, entregarFin) => {
    if (aviso.tipo !== 'fin') return false
    continuar = entregarFin
    return true
  })
  try {
    const partida = crearPartida()
    avisarPartida(partida, 'reto_completado', { nivel: 1 })
    const fin = avisarPartida(partida, 'fin', { niveles: 1 })
    assert.deepEqual(web.map(({ aviso }) => aviso.tipo), ['reto_completado', 'fin'])
    assert.deepEqual(android.map(({ aviso }) => aviso.tipo), ['reto_completado'])
    continuar()
    continuar()
    assert.deepEqual(android[1].aviso, fin)
    assert.equal(android.length, 2)
  } finally { dejarDeEscuchar(); globalThis.window = anterior }
})
