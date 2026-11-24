import assert from 'node:assert/strict'
import test from 'node:test'
import { recolectarPantalla } from '#kit/reproductor/revisar/recolectar.js'
import { revisarPantalla } from '#kit/reproductor/logica/revisarPantalla.js'

function objeto(type, id, { x = 0, y = 0, escala = 1, datos = {}, ...extras } = {}) {
  return {
    type, name: id, width: 80, height: 40, displayOriginX: 40, displayOriginY: 20,
    getData: (clave) => datos[clave],
    getWorldTransformMatrix: () => ({ transformPoint: (a, b) => ({ x: x + a * escala, y: y + b * escala }) }),
    ...extras,
  }
}

function juegoDePrueba(lista, input) {
  const camara = {
    x: 0, y: 0, width: 640, height: 360, scrollX: 100, scrollY: 20, useBounds: true,
    matrixCombined: { transformPoint: (x, y) => ({ x: 2 * (x - 100), y: 2 * (y - 20) }) },
  }
  return {
    canvas: { getBoundingClientRect: () => ({ left: 0, top: 0, width: 1280, height: 720 }) },
    scale: { baseSize: { width: 640, height: 360 } },
    scene: { getScenes(activa) {
      assert.equal(activa, true)
      return [
        { sys: { settings: { key: 'taller', data: { paquete: { retos: [{}, {}] } } } },
          children: { list: lista }, cameras: { cameras: [camara] }, input },
        { sys: { settings: { key: 'oculta', visible: false } },
          children: { list: [objeto('Text', 'oculto', { text: 'Escena oculta' })] }, cameras: { cameras: [camara] } },
      ]
    } },
  }
}

test('reúne texto, HUD y objetos activos en sus píxeles de pantalla después de la cámara', () => {
  const texto = objeto('Text', 'vocal', { x: 160, y: 140, escala: 0.5, text: 'A', style: { fontSize: '24px' } })
  const marco = objeto('Image', 'tarjeta', { x: 170, y: 80, input: { enabled: true } })
  const hud = objeto('Rectangle', 'indicador', { x: 66, y: 38, scrollFactorX: 0, scrollFactorY: 0, datos: { hud: true } })
  const decorado = objeto('Image', 'árbol', { x: 170, y: 80, input: { enabled: false } })
  const invisible = objeto('Text', 'oculto', { text: 'No se ve', alpha: 0 })
  const otraCamara = objeto('Text', 'filtrado', { text: 'Filtrado', willRender: () => false })
  const zona = objeto('Zone', 'Gestos', { x: 160, y: 115, input: { enabled: true } })
  const fueraDeVista = objeto('Image', 'Otra parte del mapa', { x: 800, y: 115, input: { enabled: true } })
  const pantalla = recolectarPantalla(juegoDePrueba([texto, marco, hud, decorado, invisible, otraCamara, zona, fueraDeVista]),
    { ancho: 1280, alto: 720 })

  assert.deepEqual(pantalla.cajas.map(({ tipo, x, y, ancho, alto, letra }) => ({ tipo, x, y, ancho, alto, letra })), [
    { tipo: 'texto', x: 160, y: 440, ancho: 160, alto: 80, letra: 48 },
    { tipo: 'objeto', x: 120, y: 160, ancho: 320, alto: 160, letra: undefined },
    { tipo: 'hud', x: 104, y: 72, ancho: 320, alto: 160, letra: undefined },
  ])
  assert.deepEqual(pantalla.toques.map(({ x, y }) => ({ x, y })), [{ x: 280, y: 240 }, { x: 240, y: 380 }])
  assert.equal(pantalla.niveles, 2)
  assert.match(revisarPantalla(pantalla)[0].motivo, /tarjeta.*indicador/)
})

test('usa el área de toque de un dibujo sin tamaño y conserva la posición local del dedo', () => {
  const entrada = { enabled: true, localX: 7, localY: 9, hitArea: { left: 0, right: 40, top: 0, bottom: 40 } }
  const dibujo = objeto('Graphics', 'dibujo', { x: 120, y: 30, width: undefined, height: undefined,
    displayOriginX: 0, displayOriginY: 0, input: entrada })
  const gestor = { hitTest(puntero, [candidato]) {
    candidato.input.localX = 500
    candidato.input.localY = 600
    return puntero.x === 60 ? [candidato] : []
  } }
  const pantalla = recolectarPantalla(juegoDePrueba([dibujo], { manager: gestor }), { ancho: 1280, alto: 720 })

  assert.deepEqual(pantalla.toques, [{ id: 'taller:0.0', x: 120, y: 80, hud: false }])
  assert.equal(pantalla.cajas[0].tipo, 'objeto')
  assert.deepEqual([entrada.localX, entrada.localY], [7, 9])
})

test('conserva la parte cortada y mide un dibujo importante aunque no se toque', () => {
  const padre = objeto('Container', 'Capa fija', { scrollFactorX: 0, scrollFactorY: 0 })
  const globo = objeto('Graphics', 'Globo', { x: 105, y: 30, datos: { hud: true,
    cajaPantalla: { x: -20, y: -10, ancho: 40, alto: 20 } }, parentContainer: padre })
  const microfono = objeto('Graphics', 'Micrófono', { x: 200, y: 50, datos: { objetoDeJuego: true,
    cajaPantalla: { x: -15, y: -10, ancho: 30, alto: 20 } } })
  const texto = objeto('Text', 'letra de abajo', { x: 220, y: 190, text: 'E', style: { fontSize: '24px' } })
  padre.list = [globo]
  const pantalla = recolectarPantalla(juegoDePrueba([padre, microfono, texto]), { ancho: 1280, alto: 720 })

  assert.equal(pantalla.cajas[2].y + pantalla.cajas[2].alto, 760)
  assert.deepEqual(pantalla.toques, [])
  assert.deepEqual(revisarPantalla(pantalla).map(({ regla, motivo }) => [regla, motivo]), [
    ['14.8', 'Están encimados «Globo (taller:0.0.0)» y «Micrófono (taller:0.1)».'],
    ['13.14', '«E» se sale de la pantalla.'],
  ])
})
