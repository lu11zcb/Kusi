import test from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { cargarModulo } from './cargar-modulo.mjs'

const { leerRespuestaSabio, preguntarASabio, respuestaDeSabio, proporciones } = await import(await cargarModulo(new URL('../src/servicios/sabio.ts', import.meta.url)))
const { KusiSabio, MensajeSabio, GraficoBarras, ListaApoyo, ListaEstudiantes } = await import(await cargarModulo(new URL('../src/docente/KusiSabio.tsx', import.meta.url)))

const LISTA = {
  id: 'c1', estado: 'lista', texto: 'Trabaja el nivel 3 en parejas.', actividad: { titulo: 'Contar hasta 10', seccion: '1.º A' },
  graficos: [{ tipo: 'errores_por_nivel', barras: [{ etiqueta: 'Nivel 1', valor: 4, total: null, detalle: null }, { etiqueta: 'Nivel 3', valor: 30, total: null, detalle: null }] }],
  quienes_necesitan_ayuda: [{ nombre: 'Rosa Quispe Mamani', motivos: ['3 errores en el nivel 1'] }],
}

test('lee una respuesta lista o «pensando» y rechaza lo que no tiene la forma', () => {
  assert.deepEqual(leerRespuestaSabio({ id: 'c1', estado: 'pensando' }), { estado: 'pensando' })
  const lista = leerRespuestaSabio(LISTA)
  assert.equal(lista.texto, 'Trabaja el nivel 3 en parejas.')
  assert.equal(lista.graficos[0].barras[1].valor, 30)
  assert.equal(lista.quienes_necesitan_ayuda[0].nombre, 'Rosa Quispe Mamani')
  assert.equal(leerRespuestaSabio({ ...LISTA, quienes_necesitan_ayuda: null }).quienes_necesitan_ayuda, null)
  assert.deepEqual(lista.actividad, { titulo: 'Contar hasta 10', seccion: '1.º A' })
  assert.equal(lista.estudiantes, null)
  assert.deepEqual(leerRespuestaSabio({ ...LISTA, estudiantes: [{ seccion: '1.º A', nombres: ['Ana Pérez', 'José Ramos'] }] }).estudiantes,
    [{ seccion: '1.º A', nombres: ['Ana Pérez', 'José Ramos'] }])
  assert.throws(() => leerRespuestaSabio({ ...LISTA, estudiantes: [{ seccion: '1.º A', nombres: [3] }] }), /Kusi Sabio/)
  assert.equal(leerRespuestaSabio({ ...LISTA, actividad: null, graficos: [], quienes_necesitan_ayuda: null }).actividad, null)
  for (const mala of [null, { estado: 'lista', texto: '', graficos: [] }, { ...LISTA, graficos: [{ tipo: 'inventado', barras: [] }] },
    { ...LISTA, graficos: [{ tipo: 'errores_por_nivel', barras: [{ etiqueta: 'Nivel 1', valor: -1 }] }] },
    { ...LISTA, quienes_necesitan_ayuda: [{ nombre: 'Rosa', motivos: 'no' }] }, { ...LISTA, actividad: { titulo: '' } }]) {
    assert.throws(() => leerRespuestaSabio(mala), /Kusi Sabio/)
  }
})

test('pregunta con el CSRF de Spring y como mucho 4 intercambios, sin elegir actividad', async (t) => {
  const llamadas = []
  t.mock.method(globalThis, 'fetch', async (ruta, opciones = {}) => {
    llamadas.push({ ruta, opciones })
    if (ruta === '/api/edu/acceso/csrf/') return new Response(JSON.stringify({ csrf_token: 'csrf' }))
    if (ruta === '/api/edu/sabio/consultas/') return new Response(JSON.stringify({ id: 'c1', estado: 'pensando' }))
    return new Response(JSON.stringify(LISTA))
  })
  const historial = Array.from({ length: 6 }, (_, i) => ({ pregunta: 'P' + i, respuesta: 'R' + i }))
  assert.equal(await preguntarASabio('  ¿Cómo envío un juego?  ', historial), 'c1')
  const envio = llamadas.find((l) => l.ruta === '/api/edu/sabio/consultas/')
  assert.equal(envio.opciones.method, 'POST')
  assert.equal(envio.opciones.headers['X-XSRF-TOKEN'], 'csrf')
  const cuerpo = JSON.parse(envio.opciones.body)
  assert.equal('actividad_id' in cuerpo, false)
  assert.equal(cuerpo.pregunta, '¿Cómo envío un juego?')
  assert.deepEqual(cuerpo.historial.map((h) => h.pregunta), ['P2', 'P3', 'P4', 'P5'])
  assert.equal((await respuestaDeSabio('c1')).estado, 'lista')
  assert.equal(llamadas.at(-1).ruta, '/api/edu/sabio/consultas/c1/')
  await assert.rejects(preguntarASabio('   ', []), /600 caracteres/)
})

test('un gráfico que pidió el docente se lee y se dibuja con su propio título', () => {
  const lista = leerRespuestaSabio({ ...LISTA, graficos: [{ tipo: 'propio', titulo: 'Puntos por estudiante',
    barras: [{ etiqueta: 'Ana Pérez', valor: 18, total: null, detalle: null }] }] })
  assert.equal(lista.graficos[0].titulo, 'Puntos por estudiante')
  assert.throws(() => leerRespuestaSabio({ ...LISTA, graficos: [{ tipo: 'propio', titulo: '', barras: [] }] }), /Kusi Sabio/)
  const html = renderToStaticMarkup(createElement(GraficoBarras, { grafico: lista.graficos[0] }))
  assert.match(html, /Puntos por estudiante/)
  assert.match(html, /Ana Pérez/)
})

test('las barras se miden contra la más alta o contra su total', () => {
  assert.deepEqual(proporciones([{ valor: 5, total: null }, { valor: 10, total: null }]), [0.5, 1])
  assert.deepEqual(proporciones([{ valor: 30, total: 100 }, { valor: 0, total: null }]), [0.3, 0])
})

test('la respuesta muestra el texto, el gráfico con sus datos y la lista con los nombres', () => {
  const html = renderToStaticMarkup(createElement(MensajeSabio, { mensaje: { pregunta: '¿Quién necesita ayuda?', respuesta: leerRespuestaSabio(LISTA) } }))
  assert.match(html, /Trabaja el nivel 3 en parejas\./)
  assert.match(html, /Sobre: Contar hasta 10 · 1\.º A/)
  assert.match(html, /Errores por nivel/)
  assert.match(html, /aria-label="Errores por nivel: Nivel 1 4, Nivel 3 30"/)
  assert.match(html, /Quiénes necesitan ayuda en clase/)
  assert.match(html, /Rosa Quispe Mamani/)
  const pensando = renderToStaticMarkup(createElement(MensajeSabio, { mensaje: { pregunta: '¿Qué refuerzo?' } }))
  assert.match(pensando, /Kusi Sabio está pensando…/)
  assert.match(renderToStaticMarkup(createElement(ListaApoyo, { lista: [] })), /nadie del grupo/)
  const estudiantes = renderToStaticMarkup(createElement(ListaEstudiantes, { secciones: [{ seccion: '1.º A', nombres: ['Ana Pérez', 'José Ramos'] }] }))
  assert.match(estudiantes, /1\.º A · 2 estudiantes/)
  assert.match(estudiantes, /José Ramos/)
  assert.match(renderToStaticMarkup(createElement(GraficoBarras, { grafico: { tipo: 'ayudas_por_nivel', barras: [] } })), /Todavía no hay datos/)
})

test('da formato a párrafos, negritas y listas y muestra las etiquetas HTML como texto', () => {
  const texto = 'Primero, **repasa en grupo**.\r\n\r\n' +
    '1. Cuenta en voz alta.\r\n2. Comprueba **en parejas**.\r\n\r\n' +
    '- Usa fichas.\r\n- Revisa las **respuestas**.\r\n\r\n' +
    '<script>alert(1)</script>'
  const respuesta = leerRespuestaSabio({ ...LISTA, texto })
  const html = renderToStaticMarkup(createElement(MensajeSabio, { mensaje: { pregunta: '¿Qué refuerzo?', respuesta } }))
  assert.match(html, /<p>Primero, <strong>repasa en grupo<\/strong>\.<\/p>/)
  assert.match(html, /<ol(?: start="1")?><li>Cuenta en voz alta\.<\/li><li>Comprueba <strong>en parejas<\/strong>\.<\/li><\/ol>/)
  assert.match(html, /<ul><li>Usa fichas\.<\/li><li>Revisa las <strong>respuestas<\/strong>\.<\/li><\/ul>/)
  assert.match(html, /<p>&lt;script&gt;alert\(1\)&lt;\/script&gt;<\/p>/)
  assert.doesNotMatch(html, /<script\b/i)
})

test('cerrado es un botón con el logo; abierto no pide elegir actividad y ofrece sugerencias', () => {
  const cerrado = renderToStaticMarkup(createElement(KusiSabio, { logo: '/logo.webp' }))
  assert.match(cerrado, /aria-label="Abrir Kusi Sabio"/)
  assert.match(cerrado, /src="\/logo\.webp"/)
  const abierto = renderToStaticMarkup(createElement(KusiSabio, { logo: '/logo.webp', abiertoAlInicio: true }))
  assert.doesNotMatch(abierto, /<select/)
  assert.match(abierto, /¿Qué reforzar en la próxima clase\?/)
  assert.match(abierto, /¿Cómo envío un juego a mi clase\?/)
  assert.match(abierto, /Escribe tu pregunta/)
})
