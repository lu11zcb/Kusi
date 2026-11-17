import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { guardarPng, leerRgba } from '../../kit/herramientas/animaciones/png_rgba.mjs'
import { tiraSobreBlanco } from '../ayudas/tira.js'
import { prepararCriatura, escalar, PIES } from '../../kit/herramientas/preparar_criatura.mjs'
import { comprobarPieza } from '../../kit/herramientas/comprobar_pieza.mjs'

test('una tira de tres poses se convierte en una hoja de 768 × 256 con los pies en y = 244', async () => {
  const carpeta = await mkdtemp(path.join(tmpdir(), 'kusi-criatura-prueba-'))
  const original = path.join(carpeta, 'original.png')
  const hoja = path.join(carpeta, 'criatura-bicho.png')
  tiraSobreBlanco(original)
  const informe = await prepararCriatura(original, hoja)
  assert.equal(informe.tipo, 'criatura')
  assert.equal(informe.cuadros, 3)
  assert.ok(informe.lado_mayor >= 190 && informe.lado_mayor <= 210, 'el cuadro más grande mide ' + informe.lado_mayor)
  const imagen = leerRgba(hoja)
  assert.equal(imagen.ancho, 768)
  assert.equal(imagen.alto, 256)
  // Los pies de cada cuadro quedan en la fila 244.
  for (let c = 0; c < 3; c += 1) {
    let maxY = -1
    for (let y = 0; y < 256; y += 1) for (let x = 0; x < 256; x += 1) if (imagen.datos[(y * 768 + c * 256 + x) * 4 + 3] >= 128) maxY = Math.max(maxY, y)
    assert.equal(maxY, PIES, 'pies del cuadro ' + (c + 1))
  }
  const filtro = comprobarPieza(hoja, { criatura: true })
  assert.deepEqual(filtro.respuestas.filter((r) => !r.si), [], 'el filtro del código la acepta')
  assert.equal(filtro.pasa, true)
  await rm(carpeta, { recursive: true })
})

test('un cuadro vacío o una imagen que no es una tira se rechazan con su motivo', async () => {
  const carpeta = await mkdtemp(path.join(tmpdir(), 'kusi-criatura-prueba-'))
  tiraSobreBlanco(path.join(carpeta, 'sin-segundo.png'), { vacio: 1 })
  await assert.rejects(prepararCriatura(path.join(carpeta, 'sin-segundo.png'), path.join(carpeta, 'x.png')), /Cuadro 2/)
  guardarPng(path.join(carpeta, 'chica.png'), { ancho: 30, alto: 30, datos: Buffer.alloc(30 * 30 * 4, 255) })
  await assert.rejects(prepararCriatura(path.join(carpeta, 'chica.png'), path.join(carpeta, 'y.png')), /muy chica/)
  await rm(carpeta, { recursive: true })
})

test('el filtro rechaza una hoja con los tres cuadros iguales, con los pies mal puestos o de otra medida', async () => {
  const carpeta = await mkdtemp(path.join(tmpdir(), 'kusi-criatura-prueba-'))
  // Tres cuadros idénticos: no se vería moverse.
  tiraSobreBlanco(path.join(carpeta, 'igual.png'), { patas: [[0, 0], [0, 0], [0, 0]] })
  await prepararCriatura(path.join(carpeta, 'igual.png'), path.join(carpeta, 'criatura-quieto.png'))
  const quieto = comprobarPieza(path.join(carpeta, 'criatura-quieto.png'), { criatura: true })
  assert.equal(quieto.pasa, false)
  assert.ok(quieto.respuestas.some((r) => !r.si && /distintos entre sí/.test(r.pregunta)))
  // Una pieza de objeto (256 × 256) no es una criatura.
  guardarPng(path.join(carpeta, 'criatura-chica.png'), { ancho: 256, alto: 256, datos: Buffer.alloc(256 * 256 * 4) })
  const chica = comprobarPieza(path.join(carpeta, 'criatura-chica.png'), { criatura: true })
  assert.equal(chica.pasa, false)
  assert.ok(chica.respuestas.some((r) => !r.si && /768 × 256/.test(r.pregunta)))
  await rm(carpeta, { recursive: true })
})

test('escalar promedia el área y no ensucia los bordes transparentes', () => {
  // Un cuadrado opaco rojo de 4 × 4 en el centro de uno de 8 × 8 transparente, reducido a la mitad.
  const datos = Buffer.alloc(8 * 8 * 4)
  for (let y = 2; y < 6; y += 1) for (let x = 2; x < 6; x += 1) datos.set([255, 0, 0, 255], (y * 8 + x) * 4)
  const chica = escalar({ ancho: 8, alto: 8, datos }, 0.5)
  assert.equal(chica.ancho, 4)
  assert.deepEqual([...chica.datos.subarray((1 * 4 + 1) * 4, (1 * 4 + 1) * 4 + 4)], [255, 0, 0, 255])
  assert.equal(chica.datos[3], 0, 'la esquina sigue transparente')
  assert.equal(chica.datos[0], 0, 'y sin color arrastrado')
})
