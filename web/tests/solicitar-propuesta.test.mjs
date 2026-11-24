import assert from 'node:assert/strict'
import test from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { cargarModulo } from './cargar-modulo.mjs'

const { SolicitarPropuesta } = await import(await cargarModulo(new URL('../src/docente/SolicitarPropuesta.tsx', import.meta.url)))

test('la solicitud presenta los campos de la idea sin preguntar cuándo usar el juego', () => {
  const html = renderToStaticMarkup(createElement(SolicitarPropuesta, {
    borrador: { seleccion: '', tema: 'Patrones con frutas', objetivo: '', instrucciones: '' },
    alCambiarBorrador() {},
    alOcupar() {},
  }))
  assert.match(html, /Una idea para tu clase/)
  assert.match(html, /Curso y sección/)
  assert.match(html, /Patrones con frutas/)
  assert.match(html, /Preparar propuesta/)
  assert.doesNotMatch(html, /¿Cuándo usarán el juego\?|Antes de la clase|Después de la clase|type="radio"/i)
})
