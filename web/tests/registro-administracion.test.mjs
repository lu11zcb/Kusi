import assert from 'node:assert/strict'
import test from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { cargarModulo } from './cargar-modulo.mjs'

const { RegistrarUsuario } = await import(await cargarModulo(new URL('../src/administracion/RegistrarUsuario.tsx', import.meta.url)))
const renderizar = (props) => renderToStaticMarkup(createElement(RegistrarUsuario, props))

test('el registro general permite elegir entre los tres roles', () => {
  const html = renderizar({})
  assert.match(html, /aria-label="Tipo de cuenta"/)
  for (const rol of ['estudiante', 'docente', 'administrador']) assert.ok(html.includes('data-rol="' + rol + '"'))
})

for (const rol of ['estudiante', 'docente', 'administrador']) {
  test('registro de ' + rol + ' fija el rol y pide los datos de esa cuenta', () => {
    const html = renderizar({ rolInicial: rol })
    assert.doesNotMatch(html, /Tipo de cuenta|data-rol=/)
    // Nombres y apellidos van en campos separados para que no falte ninguno.
    assert.match(html, /<label for="nombre">Nombres<\/label>/)
    assert.match(html, /<input[^>]*id="nombre"[^>]*required=""/)
    assert.match(html, /<label for="apellidos">Apellidos<\/label>/)
    assert.match(html, /<input[^>]*id="apellidos"[^>]*required=""/)
    assert.ok(html.indexOf('for="nombre"') < html.indexOf('for="apellidos"'))
    assert.ok(html.includes('Registrar ' + rol))
    if (rol === 'estudiante') {
      assert.match(html, /<input[^>]*id="dni"[^>]*required=""/)
      assert.doesNotMatch(html, /name="correo"/)
    } else {
      assert.match(html, /<input[^>]*id="correo"[^>]*required=""/)
      assert.doesNotMatch(html, /name="dni"/)
    }
  })
}
