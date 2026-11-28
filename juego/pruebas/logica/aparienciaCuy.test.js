import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { CARPETA_PRENDAS, PELAJES, PRENDAS_CUY, leerApariencia, teñirPelaje } from '../../kit/reproductor/datos/aparienciaCuy.js'
import { elegirProtagonista } from '../../kit/reproductor/datos/protagonistas.js'

const RECURSOS = new URL('../../kit/recursos/', import.meta.url)
const medidasPng = (ruta) => {
  const datos = readFileSync(new URL(ruta, RECURSOS))
  return { ancho: datos.readUInt32BE(16), alto: datos.readUInt32BE(20) }
}

test('lee el cuy que manda la app y pone las prendas en el orden de sus capas', () => {
  assert.deepEqual(leerApariencia('crema.GORRA_CELESTE.LENTES_CUADRADOS.POLERON_MENTA'), {
    apariencia: { pelaje: 'crema', prendas: ['POLERON_MENTA', 'LENTES_CUADRADOS', 'GORRA_CELESTE'] }, avisos: [],
  })
  assert.deepEqual(leerApariencia(null), { apariencia: null, avisos: [] })
  assert.deepEqual(leerApariencia(''), { apariencia: null, avisos: [] })
})

test('lo que todavía no está dibujado para el juego se omite con un aviso, y el niño juega igual', () => {
  const { apariencia, avisos } = leerApariencia('gris.SOMBRERO.GORRA_CELESTE.GORRA_CELESTE')
  assert.deepEqual(apariencia, { pelaje: 'cafe', prendas: ['GORRA_CELESTE'] })
  assert.equal(avisos.length, 2)
  assert.equal(elegirProtagonista('cuy-nino').protagonista.id, 'cuy-nino')
})

test('cada prenda tiene su capa y lo que tapa, con las medidas del molde', () => {
  const molde = medidasPng('dibujos/personajes/cuy-nino.png')
  assert.deepEqual(molde, { ancho: 768, alto: 1792 })
  for (const { archivo } of Object.values(PRENDAS_CUY)) {
    for (const sufijo of ['', '-quita']) {
      const ruta = CARPETA_PRENDAS + archivo + sufijo + '.png'
      assert.ok(existsSync(new URL(ruta, RECURSOS)), ruta)
      assert.deepEqual(medidasPng(ruta), molde, ruta)
    }
  }
})

test('el pelaje cambia solo lo café: el contorno, lo crema, lo rosado y las prendas quedan igual', () => {
  const pixeles = [
    [176, 106, 64, 255], // pelaje café
    [47, 11, 1, 255], // contorno
    [253, 243, 227, 255], // panza crema
    [240, 128, 128, 255], // oreja rosada
    [90, 160, 240, 255], // gorra celeste
  ]
  const datos = new Uint8ClampedArray(pixeles.flat())
  teñirPelaje(datos, 'crema')
  const salida = [...datos]
  assert.notDeepEqual(salida.slice(0, 4), pixeles[0])
  assert.ok(salida[2] > pixeles[0][2] + 40, 'el café se aclara hacia el crema')
  assert.deepEqual(salida.slice(4), pixeles.slice(1).flat())
  const igual = new Uint8ClampedArray(pixeles.flat())
  teñirPelaje(igual, 'cafe')
  assert.deepEqual([...igual], pixeles.flat())
  assert.ok(Object.hasOwn(PELAJES, 'crema'))
})
