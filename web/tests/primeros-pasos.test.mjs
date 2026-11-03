import assert from 'node:assert/strict'
import test from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { cargarModulo } from './cargar-modulo.mjs'
const { PrimerosPasos } = await import(await cargarModulo(new URL('../src/componentes/PrimerosPasos.tsx', import.meta.url)))
const pasos = [{ texto: 'Crear una idea', hecho: true, destino: 'solicitar' }, { texto: 'Preparar un juego', hecho: false, destino: 'propuestas' }, { texto: 'Enviar a mi clase', hecho: false, destino: 'propuestas' }]

test('Primeros pasos cuenta acciones completadas y ofrece el siguiente destino sin representar tiempos del sistema', () => {
  const html = renderToStaticMarkup(createElement(PrimerosPasos, { pasos, alElegir() {} }))
  assert.ok(html.includes('aria-valuenow="1"'))
  assert.ok(html.includes('aria-valuemax="3"'))
  assert.ok(html.includes('1 de 3 pasos completados'))
  assert.ok(html.includes('Ir a Preparar un juego'))
  assert.ok(!html.includes('Ir a Crear una idea'))
  assert.ok(!html.includes('segundos'))
})

test('cargar los datos no presenta avances sin comprobar', () => {
  const html = renderToStaticMarkup(createElement(PrimerosPasos, { pasos, alElegir() {}, cargando: true }))
  assert.ok(html.includes('Buscando tus avances'))
  assert.ok(!html.includes('role="progressbar"'))
})
