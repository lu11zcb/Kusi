import { test } from 'node:test'
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { sombraBajo } from '../../kit/reproductor/efectos/mundoVivo.js'

// Una escena y un objeto de mentira: lo justo para ver la sombra sin abrir Phaser.
function escenaDePrueba() {
  const sombras = []
  const escena = {
    events: new EventEmitter(),
    add: {
      ellipse(x, y) {
        const sombra = { x, y, destruida: false, setDepth() { return this }, setPosition(nx, ny) { this.x = nx; this.y = ny; return this },
          destroy() { this.destruida = true } }
        sombras.push(sombra)
        return sombra
      },
    },
  }
  return { escena, sombras }
}

function objetoDePrueba(x, y) {
  const objeto = new EventEmitter()
  Object.assign(objeto, { x, y, depth: 5, active: true })
  objeto.destroy = () => { objeto.active = false; objeto.emit('destroy') }
  return objeto
}

test('la sombra sigue a su objeto en cada cuadro', () => {
  const { escena, sombras } = escenaDePrueba()
  const objeto = objetoDePrueba(100, 200)
  sombraBajo(escena, objeto)
  objeto.x = 140
  escena.events.emit('update')
  assert.equal(sombras[0].x, 140)
})

test('al destruir el objeto, su sombra se destruye y deja de escuchar los cuadros', () => {
  const { escena, sombras } = escenaDePrueba()
  const objeto = objetoDePrueba(100, 200)
  sombraBajo(escena, objeto)
  assert.equal(escena.events.listenerCount('update'), 1)
  objeto.destroy()
  assert.equal(sombras[0].destruida, true)
  assert.equal(escena.events.listenerCount('update'), 0)
})
