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
const { obtenerSesion, ingresar, salir, cambiarContrasena } = await import(await modulo(new URL('../src/servicios/acceso.ts', import.meta.url)))
const cuenta = { id: 'uuid-qa', nombre: 'Persona QA', correo: 'qa@example.com', roles: ['administrador', 'docente'], debe_cambiar_contrasena: false }
const json = (datos, estado = 200) => new Response(JSON.stringify(datos), { status: estado })

test('el ingreso usa CSRF actual y devuelve los roles del servidor', async (t) => {
  let envios = 0
  t.mock.method(globalThis, 'fetch', async (ruta, opciones) => {
    assert.equal(opciones.credentials, 'same-origin')
    assert.equal(opciones.cache, 'no-store')
    if (ruta.endsWith('sesion/')) return json({ usuario: null, csrf_token: 'csrf-qa' })
    envios += 1
    assert.equal(ruta, '/api/acceso/ingreso/')
    assert.equal(opciones.headers['X-CSRFToken'], 'csrf-qa')
    assert.deepEqual(JSON.parse(opciones.body), { correo: 'qa@example.com', contrasena: 'clave-qa' })
    return json({ usuario: cuenta, csrf_token: 'csrf-renovado' })
  })
  assert.deepEqual((await ingresar('qa@example.com', 'clave-qa')).usuario.roles, cuenta.roles)
  assert.equal(envios, 1)
})

test('la sesión rechaza roles desconocidos en una respuesta incompleta', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => json({ usuario: { ...cuenta, roles: ['superusuario'] }, csrf_token: 'csrf-qa' }))
  await assert.rejects(obtenerSesion(), /comprobar la sesión/)
})

test('conserva el mensaje común de credenciales inválidas', async (t) => {
  t.mock.method(globalThis, 'fetch', async (ruta) => ruta.endsWith('sesion/')
    ? json({ usuario: null, csrf_token: 'csrf-qa' })
    : json({ mensaje: 'Correo o contraseña incorrectos' }, 401))
  await assert.rejects(ingresar('qa@example.com', 'incorrecta'), (error) => error.estado === 401 && error.message === 'Correo o contraseña incorrectos')
})

test('salida y cambio de contraseña se envían como POST con CSRF', async (t) => {
  const rutas = []
  t.mock.method(globalThis, 'fetch', async (ruta, opciones) => {
    if (ruta.endsWith('sesion/')) return json({ usuario: cuenta, csrf_token: 'csrf-qa' })
    rutas.push(ruta)
    assert.equal(opciones.method, 'POST')
    assert.equal(opciones.headers['X-CSRFToken'], 'csrf-qa')
    return json({ usuario: null, csrf_token: 'csrf-qa' })
  })
  await cambiarContrasena({ contrasena_actual: 'temporal-qa', nueva_contrasena: 'nueva-qa', confirmacion: 'nueva-qa' })
  await salir()
  assert.deepEqual(rutas, ['/api/acceso/contrasena/', '/api/acceso/salida/'])
})
