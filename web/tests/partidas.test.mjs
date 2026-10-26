import test from 'node:test'
import assert from 'node:assert/strict'
import { cargarModulo } from './cargar-modulo.mjs'
const { avisoValido, avisoDelIframe, RegistroAvisos, guardarAviso } = await import(await cargarModulo(new URL('../src/servicios/partidas.ts', import.meta.url)))
const aviso = { tipo: 'ayuda', partida: 'partida-de-prueba', orden: 1, momento: '2026-10-26T20:00:00Z', nivel: 1, ayuda: 1 }
const resumen = { partida: aviso.partida, prueba_docente: true, ayudas_usadas: 1, niveles_completados: 0, termino: false }

test('HU48: solo acepta avisos válidos del iframe y origen esperados', () => {
  const ventana = {}
  const evento = { source: ventana, origin: 'http://127.0.0.1:5174', data: { tipo: 'aviso', aviso } }
  assert.deepEqual(avisoDelIframe(evento, ventana, evento.origin), aviso)
  assert.equal(avisoDelIframe({ ...evento, source: {} }, ventana, evento.origin), null)
  assert.equal(avisoDelIframe({ ...evento, origin: 'https://otro.example' }, ventana, evento.origin), null)
  for (const cambio of [{ orden: 0 }, { tipo: 'inventado' }, { ayuda: 3 }, { nivel: 9 }, { momento: 'mal' }, { relleno: 'x'.repeat(8192) }]) assert.equal(avisoValido({ ...aviso, ...cambio }), false)
})
test('HU48/HU49: la cola comparte el envío duplicado y reintenta el original tras perder la respuesta', async () => {
  let llamadas = 0
  const registro = new RegistroAvisos(async () => { llamadas++; if (llamadas === 1) throw new Error('respuesta perdida'); return resumen })
  const primera = registro.registrar(aviso)
  assert.equal(registro.registrar(aviso), primera)
  await assert.rejects(primera)
  assert.equal(registro.pendientes.size, 1)
  await registro.registrar(aviso)
  await registro.registrar(aviso)
  assert.equal(llamadas, 2)
  assert.equal(registro.pendientes.size, 0)
})
test('HU48: guarda con CSRF de Spring y valida el resumen confirmado', async () => {
  const original = globalThis.fetch
  const llamadas = []
  globalThis.fetch = async (ruta, opciones) => {
    llamadas.push({ ruta, opciones })
    return new Response(JSON.stringify(ruta.endsWith('/csrf/') ? { csrf_token: 'token-de-prueba' } : { guardado: true, duplicado: false, resumen }))
  }
  try {
    assert.deepEqual(await guardarAviso(aviso), resumen)
    assert.equal(llamadas[1].opciones.headers['X-XSRF-TOKEN'], 'token-de-prueba')
    assert.deepEqual(JSON.parse(llamadas[1].opciones.body), { aviso })
  } finally { globalThis.fetch = original }
})
