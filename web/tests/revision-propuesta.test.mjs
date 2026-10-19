import assert from 'node:assert/strict'
import test from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { cargarModulo } from './cargar-modulo.mjs'

const { RevisionPropuesta } = await import(await cargarModulo(new URL('../src/docente/RevisionPropuesta.tsx', import.meta.url)))
const solicitud = {
  id_solicitud: '00000000-0000-4000-8000-000000000001', tema: 'Compras de prueba', proposito: 'refuerzo', estado: 'generada',
  propuesta: {
    id: '00000000-0000-4000-8000-000000000002', version: 2, origen: 'ia', estado_revision: 'pendiente', origen_objetivo: 'ia',
    objetivo: 'Los niños aprenderán a sumar.', historia: 'Kusi compra en el mercado.', acciones: ['Elegir una fruta'],
    reglas: ['Pagar antes de salir'], retos: ['Revisar el vuelto'], ayudas: ['Cuenta las monedas'], recursos: ['fresa'],
  },
}
const mostrar = (datos) => renderToStaticMarkup(createElement(RevisionPropuesta, { solicitud: datos, alCambiar() {} }))

test('HU20: la vista compartida muestra toda la propuesta y las acciones sin UUID visibles', () => {
  const html = mostrar(solicitud)
  for (const texto of ['Los niños aprenderán a sumar.', 'Kusi compra en el mercado.', 'Elegir una fruta', 'Pagar antes de salir', 'Revisar el vuelto', 'Cuenta las monedas', 'fresa', 'Aprobar versión 2', 'Rechazar', 'Modificar', 'Enviar observaciones', 'Ver versiones anteriores']) {
    assert.ok(html.includes(texto), texto)
  }
  assert.ok(!html.includes(solicitud.id_solicitud))
  assert.ok(!html.includes(solicitud.propuesta.id))
})

test('HU20: las acciones corresponden al estado de revisión y los recursos ausentes se señalan', () => {
  const rechazada = mostrar({ ...solicitud, propuesta: { ...solicitud.propuesta, estado_revision: 'rechazada', recursos: null } })
  assert.ok(rechazada.includes('Pedir otra alternativa'))
  assert.ok(!rechazada.includes('Aprobar versión'))
  assert.ok(rechazada.includes('<em>Pendiente</em>'))
  const aprobada = mostrar({ ...solicitud, propuesta: { ...solicitud.propuesta, estado_revision: 'aprobada', apta_para_juego: true } })
  assert.ok(aprobada.includes('Aprobada'))
  assert.ok(!aprobada.includes('Aprobar versión'))
  assert.ok(!aprobada.includes('Pedir otra alternativa'))
})
