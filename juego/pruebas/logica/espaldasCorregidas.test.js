import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { leerRgba, recortar } from '../../kit/herramientas/animaciones/png_rgba.mjs'

const carpeta = new URL('../../kit/recursos/dibujos/', import.meta.url)
// Huellas de los píxeles aprobados antes de retirar los atlas intermedios.
const referencias = JSON.parse(readFileSync(new URL('../fixtures/filas-personajes-aprobadas.json', import.meta.url)))
for (const { imagen, ancho, alto, filas } of referencias) {
  test(imagen + ': conserva los píxeles aprobados de frente, laterales y expresiones', () => {
    const actual = leerRgba(new URL(imagen, carpeta))
    assert.deepEqual([actual.ancho, actual.alto], [ancho, alto])
    for (const [fila, esperada] of Object.entries(filas)) {
      const datos = recortar(actual, 0, Number(fila) * 256, 768, 256).datos
      assert.equal(createHash('sha256').update(datos).digest('hex'), esperada, 'fila ' + fila)
    }
  })
}

test('la espalda del cuy conserva la cinta roja sin colgar el nudo sobre el torso y muestra pelaje dorsal', () => {
  const im = leerRgba(new URL('cuy-nino-cuadros-v9.png', carpeta))
  for (let c = 0; c < 3; c++) {
    const cuadro = recortar(im, c * 256, 1024, 256, 256)
    let rojoBajo = 0, marron = 0, total = 0
    for (let y = 158; y < 220; y++) for (let x = 70; x < 190; x++) {
      const i = (y * 256 + x) * 4, [r,g,b,a] = cuadro.datos.subarray(i, i + 4)
      if (a >= 32 && r > 180 && r > g * 2.1 && r > b * 2.1) rojoBajo++
      if (y < 205 && x >= 90 && x < 170 && a >= 32) {
        total++; if (r > 90 && r > g * 1.3 && g > b * 1.3) marron++
      }
    }
    assert.equal(rojoBajo, 0, 'el pañuelo no debe colgar por la espalda')
    assert.ok(marron / total > .7, 'el dorso no debe parecer la barriga frontal')
  }
})

test('la mancha de la nuca del cuy tiene bordes suaves y no añade mechones bajo el pañuelo', () => {
  const im = leerRgba(new URL('cuy-nino-cuadros-v9.png', carpeta))
  const esCrema = (r,g,b,a) => a >= 128 && r > 215 && g > 185 && b > 145
  for (let c = 0; c < 3; c++) {
    const cuadro = recortar(im, c * 256, 1024, 256, 256), bordes = []
    for (let y = 62; y < 121; y++) {
      const xs = []
      for (let x = 85; x < 175; x++) {
        const i = (y * 256 + x) * 4
        if (esCrema(...cuadro.datos.subarray(i, i + 4))) xs.push(x)
      }
      assert.ok(xs.length, 'la mancha clara debe ser continua')
      bordes.push([Math.min(...xs), Math.max(...xs)])
    }
    // Las curvas suaves no hacen las oscilaciones repetidas del borde dentado.
    let variacion = 0
    for (let y = 1; y < bordes.length; y++) {
      variacion += Math.abs(bordes[y][0] - bordes[y-1][0]) + Math.abs(bordes[y][1] - bordes[y-1][1])
    }
    assert.ok(variacion <= 40, 'la nuca no debe tener un borde de mechones en zigzag')
    for (let y = 148; y < 180; y++) for (let x = 112; x < 144; x++) {
      const i = (y * 256 + x) * 4
      assert.equal(esCrema(...cuadro.datos.subarray(i, i + 4)), false, 'sin mechón colgante sobre el dorso')
    }
  }
})

test('la cola del zorro permanece centrada detrás de la cadera y conserva volumen entre pasos', () => {
  const im = leerRgba(new URL('zorro-cuadros-v4.png', carpeta)), medidas = []
  for (let c = 0; c < 3; c++) {
    const cuadro = recortar(im, c * 256, 512, 256, 256)
    let area = 0, sumaX = 0, sumaY = 0
    for (let y = 110; y < 235; y++) for (let x = 0; x < 256; x++) {
      const i = (y * 256 + x) * 4, [r,g,b,a] = cuadro.datos.subarray(i, i + 4)
      if (a >= 128 && r > 210 && g > 180 && b > 145) { area++; sumaX += x; sumaY += y }
    }
    assert.ok(area > 200, 'la punta de la cola debe seguir visible')
    const x = sumaX / area, y = sumaY / area
    assert.ok(Math.abs(x - 128) <= 8, 'la cola debe quedar centrada, no desplazada hacia un costado')
    medidas.push({ area, x, y })
  }
  assert.ok(Math.max(...medidas.map(m => m.area)) / Math.min(...medidas.map(m => m.area)) < 1.25)
  for (const eje of ['x','y']) assert.ok(Math.max(...medidas.map(m => m[eje])) - Math.min(...medidas.map(m => m[eje])) < 12)
})
