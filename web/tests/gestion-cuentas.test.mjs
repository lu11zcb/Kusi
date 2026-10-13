import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'

const cache = new Map()
async function modulo(url) {
  if (cache.has(url.href)) return cache.get(url.href)
  const fuente = await readFile(url, 'utf8')
  let { outputText } = ts.transpileModule(fuente, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  })
  for (const coincidencia of [...outputText.matchAll(/from\s+(['"])(\.[^'"]+)\1/g)]) {
    const destino = await modulo(new URL(coincidencia[2] + '.ts', url))
    outputText = outputText.replace(coincidencia[0], 'from ' + JSON.stringify(destino))
  }
  const resultado = 'data:text/javascript;base64,' + Buffer.from(outputText).toString('base64')
  cache.set(url.href, resultado)
  return resultado
}
const { refrescarUsuarioGuardado } = await import(await modulo(new URL('../src/servicios/usuarios.ts', import.meta.url)))
const cuenta = { id: 'cuenta-qa', nombre: 'Persona QA', correo: 'qa@example.com', roles: ['administrador'], debe_cambiar_contrasena: false, activo: true }
const json = (datos, estado = 200) => new Response(JSON.stringify(datos), { status: estado })

test('al desactivar la propia cuenta refresca acceso sin consultar rutas que ahora rechazan la sesión', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => assert.fail('No debe consultar el detalle protegido'))
  let refrescos = 0
  const resultado = await refrescarUsuarioGuardado({ ...cuenta, activo: false }, cuenta.id, async () => { refrescos += 1 })
  assert.equal(refrescos, 1)
  assert.deepEqual(resultado, { detalle: null, aviso: '' })
})

test('al quitarse el rol administrador actualiza el panel sin presentar el cambio como fallido', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => assert.fail('No debe consultar el detalle administrativo'))
  let refrescos = 0
  const resultado = await refrescarUsuarioGuardado({ ...cuenta, roles: ['docente'] }, cuenta.id, async () => { refrescos += 1 })
  assert.equal(refrescos, 1)
  assert.equal(resultado.aviso, '')
})

test('un fallo del historial después de guardar informa que el cambio ya quedó persistido', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => json({ mensaje: 'Servicio no disponible.' }, 503))
  const resultado = await refrescarUsuarioGuardado(cuenta, 'otra-cuenta', async () => assert.fail('No debe cambiar el acceso de otro usuario'))
  assert.equal(resultado.detalle, null)
  assert.match(resultado.aviso, /El cambio ya se guardó/)
})

test('un fallo al refrescar el propio acceso conserva la confirmación y pide volver a comprobarlo', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => assert.fail('No debe consultar con acceso desconocido'))
  const resultado = await refrescarUsuarioGuardado(cuenta, cuenta.id, async () => { throw new Error('Sin conexión') })
  assert.equal(resultado.detalle, null)
  assert.match(resultado.aviso, /El cambio ya se guardó/)
})

test('el refresco normal conserva los datos e historial devueltos por el servidor', async (t) => {
  const detalle = { usuario: cuenta, historial: [{ id: 1, tipo: 'estado' }] }
  t.mock.method(globalThis, 'fetch', async () => json(detalle))
  const resultado = await refrescarUsuarioGuardado(cuenta, 'otra-cuenta', async () => assert.fail('No debe cambiar el acceso'))
  assert.deepEqual(resultado, { detalle, aviso: '' })
})
