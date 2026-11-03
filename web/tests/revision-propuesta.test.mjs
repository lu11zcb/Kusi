import assert from 'node:assert/strict'
import test from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { cargarModulo } from './cargar-modulo.mjs'

const { RevisionPropuesta } = await import(await cargarModulo(new URL('../src/docente/RevisionPropuesta.tsx', import.meta.url)))
const solicitud = {
  id_solicitud: '00000000-0000-4000-8000-000000000001', tema: 'Patrones de prueba', proposito: 'refuerzo', estado: 'generada',
  propuesta: {
    id: '00000000-0000-4000-8000-000000000002', version: 2, origen: 'ia', estado_revision: 'pendiente', origen_objetivo: 'ia',
    objetivo: 'Reconocer patrones.', historia: 'Kusi recorre los caminos.', acciones: ['Elegir una fruta'],
    reglas: ['Seguir el orden'], retos: ['Completar el patrón'], ayudas: ['Mira qué sigue'], recursos: ['archivo-del-catalogo'],
  },
}
const mostrar = (datos, opciones = {}) => renderToStaticMarkup(createElement(RevisionPropuesta, { solicitud: datos, alCambiar() {}, ...opciones }))

test('la idea conserva su contenido educativo y ofrece aprobar y preparar en un solo paso', () => {
  const html = mostrar(solicitud)
  for (const texto of ['Reconocer patrones.', 'Kusi recorre los caminos.', 'Elegir una fruta', 'Seguir el orden', 'Completar el patrón', 'Mira qué sigue', 'Aprobar y preparar juego', 'Editar el texto', 'Pedir estos cambios']) assert.ok(html.includes(texto), texto)
  for (const texto of ['Versión', 'versiones anteriores', 'generada por IA', 'archivo-del-catalogo', solicitud.id_solicitud, solicitud.propuesta.id]) assert.ok(!html.includes(texto), texto)
})

test('los cambios se piden en una conversación y una idea rechazada todavía se puede recuperar', () => {
  const html = mostrar({ ...solicitud, propuesta: { ...solicitud.propuesta, estado_revision: 'rechazada' } })
  assert.ok(html.includes('role="log"'))
  assert.ok(html.includes('¿Qué quieres cambiar?'))
  assert.ok(html.includes('Proponer otra idea'))
  assert.ok(!html.includes('Aprobar y preparar juego'))
  const ajustada = mostrar({ ...solicitud, propuesta: { ...solicitud.propuesta, observaciones: 'Acorta las instrucciones.' } })
  assert.ok(ajustada.includes('Preparar juego con estos cambios'))
})

test('la idea aprobada permite continuar sin volver a aprobar ni mostrar versiones', () => {
  const html = mostrar({ ...solicitud, propuesta: { ...solicitud.propuesta, estado_revision: 'aprobada', apta_para_juego: true } })
  assert.ok(html.includes('Continuar preparando mi juego'))
  assert.ok(!html.includes('Aprobar y preparar juego'))
  assert.ok(!html.includes('Generar juego'))
})

test('un tipo de juego no disponible se explica sin ofrecer una preparación que no se puede realizar', () => {
  const html = mostrar({ ...solicitud, propuesta: { ...solicitud.propuesta, tipo_juego: 'otro', se_puede_generar: false } })
  assert.ok(html.includes('Este tipo de juego todavía no está disponible'))
  assert.ok(html.includes('Pedir estos cambios'))
  assert.ok(!html.includes('Aprobar y preparar juego'))
})

test('una revisión oculta conserva la idea y no monta el juego', () => {
  const html = mostrar(solicitud, { activo: false })
  assert.ok(html.includes('Reconocer patrones.'))
  assert.ok(!html.includes('<iframe'))
})
