import { test } from 'node:test'
import assert from 'node:assert/strict'
import { COLOR_LIENZO, medirCaptura, cambioEntre, motivosDePantalla } from '../../taller/trabajador/pantalla.js'

const ANCHO = 320
const ALTO = 180

// Una captura inventada: un mundo con varios colores en cuadrados, y (si se pide) franjas del color del lienzo.
function captura({ franjaArriba = 0, franjaAbajo = 0, colores = 8, moverX = 0, liso = false } = {}) {
  const datos = Buffer.alloc(ANCHO * ALTO * 4, 255)
  for (let y = 0; y < ALTO; y += 1) {
    for (let x = 0; x < ANCHO; x += 1) {
      const i = (y * ANCHO + x) * 4
      let color
      if (y < franjaArriba || y >= ALTO - franjaAbajo) color = COLOR_LIENZO
      else if (liso) color = [210, 190, 150]
      else {
        const celda = (Math.floor((x - moverX + ANCHO) / 40) + Math.floor(y / 30)) % colores
        color = [40 + celda * 25, 200 - celda * 18, 60 + celda * 20]
      }
      datos[i] = color[0]; datos[i + 1] = color[1]; datos[i + 2] = color[2]
    }
  }
  return { ancho: ANCHO, alto: ALTO, datos }
}

test('un mundo que llena la pantalla y tiene varios colores no tiene motivos', () => {
  const bueno = captura()
  const medida = medirCaptura(bueno)
  assert.equal(medida.lienzo, 0)
  assert.ok(medida.colores >= 4)
  assert.deepEqual(motivosDePantalla({ inicio: bueno, reposo: captura({ moverX: 8 }), conFlechas: captura({ moverX: 20 }) }), [])
})

test('las franjas del color del lienzo arriba y abajo se rechazan (el juego recortado a una tira)', () => {
  // Como el juego de los títeres: el mundo en la mitad de la pantalla y bandas azules arriba y abajo.
  const tira = captura({ franjaArriba: 45, franjaAbajo: 50 })
  assert.ok(medirCaptura(tira).lienzo > 0.2)
  const motivos = motivosDePantalla({ inicio: tira, reposo: captura({ franjaArriba: 45, franjaAbajo: 50, moverX: 8 }), conFlechas: captura({ franjaArriba: 45, franjaAbajo: 50, moverX: 16 }) })
  assert.equal(motivos.length, 1)
  assert.match(motivos[0], /no llena la pantalla/)
  assert.match(motivos[0], /No recortes la cámara/)
  // Una franja de 90 px abajo en 720 de alto (como la del juego de los faroles) también.
  assert.match(motivosDePantalla({ inicio: captura({ franjaAbajo: 22 }) })[0], /no llena la pantalla/)
})

test('un mundo liso y vacío se rechaza', () => {
  const motivos = motivosDePantalla({ inicio: captura({ liso: true }) })
  assert.equal(motivos.length, 1)
  assert.match(motivos[0], /liso y vacío/)
})

test('un juego congelado (nada cambia solo ni con las flechas) se rechaza, pero uno que solo se mueve con las flechas no', () => {
  const igual = captura()
  assert.match(motivosDePantalla({ inicio: igual, reposo: captura(), conFlechas: captura() })[0], /congelado/)
  // Quieto solo, pero responde a las flechas: es normal en un juego sin ambiente.
  assert.deepEqual(motivosDePantalla({ inicio: igual, reposo: captura(), conFlechas: captura({ moverX: 30 }) }), [])
  // Se mueve solo (el mundo tiene vida) aunque las flechas no cambien nada más.
  assert.deepEqual(motivosDePantalla({ inicio: igual, reposo: captura({ moverX: 20 }), conFlechas: captura({ moverX: 20 }) }), [])
})

test('sin las capturas de reposo y de flechas, solo se revisa lo que se puede ver en una', () => {
  assert.deepEqual(motivosDePantalla({ inicio: captura() }), [])
})

test('capturas de distinto tamaño cuentan como cambio total', () => {
  assert.equal(cambioEntre(captura(), { ancho: 10, alto: 10, datos: Buffer.alloc(400) }), 1)
})
