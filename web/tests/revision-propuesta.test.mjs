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

test('HU27: solo una propuesta aprobada ofrece Generar juego y muestra la regla del laberinto', () => {
  const pendiente = mostrar({ ...solicitud, propuesta: { ...solicitud.propuesta, regla_juego: 'orden' } })
  assert.ok(pendiente.includes('Seguir el orden (patrones)'))
  assert.ok(!pendiente.includes('>Generar juego</button>'))
  const aprobada = mostrar({ ...solicitud, propuesta: { ...solicitud.propuesta, estado_revision: 'aprobada', regla_juego: 'solo_clase' } })
  assert.ok(aprobada.includes('Solo una clase (clasificar)'))
  assert.ok(aprobada.includes('Generar juego</button>'))
  assert.ok(aprobada.includes('Generar y probar el juego'))
})

// La propuesta diseña el juego que corresponde al tema. Si es otro juego, el docente lo lee
// completo, sin una regla de laberinto, y el botón de generar no se activa.
test('Otro juego: se muestra la propuesta, pero no se puede generar todavía', () => {
  const otro = { ...solicitud.propuesta, estado_revision: 'aprobada', tipo_juego: 'otro', se_puede_generar: false, regla_juego: null,
    historia: 'Kusi acompaña al niño a ordenar los días de la creación.' }
  const html = mostrar({ ...solicitud, propuesta: otro })
  assert.ok(html.includes('Kusi acompaña al niño a ordenar los días de la creación.'))
  assert.ok(!html.includes('Regla elegida para el laberinto'))
  assert.ok(html.includes('Este juego todavía no se puede crear'))
  assert.ok(html.includes('Por ahora Kusi solo crea juegos de laberinto con frutas y verduras.'))
  assert.match(html, /<button[^>]*disabled=""[^>]*>.*Generar juego<\/button>/)
  const laberinto = mostrar({ ...solicitud, propuesta: { ...otro, tipo_juego: 'laberinto', se_puede_generar: true, regla_juego: 'orden' } })
  assert.ok(!laberinto.includes('Este juego todavía no se puede crear'))
  assert.ok(laberinto.includes('Seguir el orden (patrones)'))
})

// El menú conserva las pantallas ocultas. Verificamos que la revisión siga
// presente para conservar su borrador, pero que se retire todo el seguimiento
// (cuyos efectos cancelan las consultas al desmontarse) hasta volver a entrar.
test('HU27: una revisión oculta conserva la propuesta sin montar consultas ni vista previa', () => {
  const html = renderToStaticMarkup(createElement(RevisionPropuesta, {
    solicitud, alCambiar() {}, activo: false,
  }))
  assert.ok(html.includes('Los niños aprenderán a sumar.'))
  assert.ok(!html.includes('Generar y probar el juego'))
  assert.ok(!html.includes('<iframe'))
})
