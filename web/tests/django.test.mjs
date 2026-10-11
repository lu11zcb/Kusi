import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'

// Usa el TypeScript ya instalado, sin añadir un runner ni escribir compilados.
const fuente = await readFile(new URL('../src/servicios/django.ts', import.meta.url), 'utf8')
const { outputText } = ts.transpileModule(fuente, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
})
const { ErrorApi, obtenerContextoRegistro, registrarUsuario } = await import(
  'data:text/javascript;base64,' + Buffer.from(outputText).toString('base64')
)

const usuario = { id: 'b0afffc6-0ecb-423c-9795-e23cb68ec504', nombre: 'Persona de prueba', correo: 'persona@example.com' }
const datos = { nombre: usuario.nombre, correo: usuario.correo, rol: 'docente' }
const contexto = { usuario, csrf_token: 'token-de-prueba' }
const creado = { usuario: { ...usuario, rol: 'docente' }, contrasena_temporal: 'Abcdef2345' }
const json = (cuerpo, estado = 200) => new Response(JSON.stringify(cuerpo), {
  status: estado, headers: { 'Content-Type': 'application/json' },
})

test('consulta contexto con sesión, mismo origen y sin caché', async (t) => {
  const controlador = new AbortController()
  t.mock.method(globalThis, 'fetch', async (ruta, opciones) => {
    assert.equal(ruta, '/api/cuentas/registro/contexto/')
    assert.equal(opciones.credentials, 'same-origin')
    assert.equal(opciones.mode, 'same-origin')
    assert.equal(opciones.cache, 'no-store')
    assert.equal(opciones.signal, controlador.signal)
    return json(contexto)
  })
  assert.deepEqual(await obtenerContextoRegistro(controlador.signal), contexto)
})

test('registra con CSRF fresco, cookies y los datos del formulario', async (t) => {
  const llamadas = []
  t.mock.method(globalThis, 'fetch', async (ruta, opciones) => {
    llamadas.push(ruta)
    if (ruta.endsWith('contexto/')) return json(contexto)
    assert.equal(ruta, '/api/cuentas/usuarios/')
    assert.equal(opciones.method, 'POST')
    assert.equal(opciones.credentials, 'same-origin')
    assert.equal(opciones.mode, 'same-origin')
    assert.equal(opciones.cache, 'no-store')
    assert.equal(opciones.headers['X-CSRFToken'], contexto.csrf_token)
    assert.equal(opciones.headers['Content-Type'], 'application/json')
    assert.deepEqual(JSON.parse(opciones.body), datos)
    return json(creado, 201)
  })
  assert.deepEqual(await registrarUsuario(datos), creado)
  assert.deepEqual(llamadas, ['/api/cuentas/registro/contexto/', '/api/cuentas/usuarios/'])
})

test('una sesión rechazada impide enviar el POST', async (t) => {
  let llamadas = 0
  t.mock.method(globalThis, 'fetch', async () => {
    llamadas += 1
    return json({ mensaje: 'Debes iniciar sesión.' }, 401)
  })
  await assert.rejects(registrarUsuario(datos), (error) => error instanceof ErrorApi && error.estado === 401)
  assert.equal(llamadas, 1)
})

test('conserva errores de campo para validación y conflicto', async (t) => {
  let estado = 400
  t.mock.method(globalThis, 'fetch', async (ruta) => ruta.endsWith('contexto/')
    ? json(contexto)
    : json({ mensaje: 'Revisa los datos.', errores: { correo: [{ message: 'Correo repetido.', code: 'unique' }] } }, estado))
  for (estado of [400, 409]) {
    await assert.rejects(registrarUsuario(datos), (error) => {
      assert.equal(error.estado, estado)
      assert.deepEqual(error.errores, { correo: ['Correo repetido.'] })
      return true
    })
  }
})

test('comunica un rechazo CSRF y no repite el POST', async (t) => {
  let envios = 0
  t.mock.method(globalThis, 'fetch', async (ruta) => {
    if (ruta.endsWith('contexto/')) return json(contexto)
    envios += 1
    return json({ mensaje: 'La verificación de seguridad falló.' }, 403)
  })
  await assert.rejects(registrarUsuario(datos), (error) => error.estado === 403 && error.message.includes('seguridad'))
  assert.equal(envios, 1)
})

test('un fallo de red al enviar no provoca un segundo registro', async (t) => {
  let envios = 0
  t.mock.method(globalThis, 'fetch', async (ruta) => {
    if (ruta.endsWith('contexto/')) return json(contexto)
    envios += 1
    throw new TypeError('Desconexión simulada')
  })
  await assert.rejects(registrarUsuario(datos), (error) => error.estado === 0 && error.message.includes('verifica el correo'))
  assert.equal(envios, 1)
})

test('una respuesta HTML de error se transforma en un mensaje legible', async (t) => {
  t.mock.method(globalThis, 'fetch', async (ruta) => ruta.endsWith('contexto/')
    ? json(contexto)
    : new Response('<h1>Error de prueba</h1>', { status: 500 }))
  await assert.rejects(registrarUsuario(datos), (error) => error instanceof ErrorApi && error.estado === 500)
})

test('no considera confirmado un registro con respuesta incompleta', async (t) => {
  t.mock.method(globalThis, 'fetch', async (ruta) => ruta.endsWith('contexto/')
    ? json(contexto)
    : json({ usuario: creado.usuario }, 201))
  await assert.rejects(registrarUsuario(datos), (error) => error.message.includes('verifica el correo'))
})

test('no acepta como rol una lista, un objeto ni un valor desconocido', async (t) => {
  let rol = ['docente']
  t.mock.method(globalThis, 'fetch', async (ruta) => ruta.endsWith('contexto/')
    ? json(contexto)
    : json({ ...creado, usuario: { ...creado.usuario, rol } }, 201))
  for (rol of [['docente'], {}, null, 'superusuario']) {
    await assert.rejects(registrarUsuario(datos), (error) => error.message.includes('verifica el correo'))
  }
})

test('rechaza contexto sin token y no intenta registrar', async (t) => {
  let llamadas = 0
  t.mock.method(globalThis, 'fetch', async () => {
    llamadas += 1
    return json({ usuario })
  })
  await assert.rejects(registrarUsuario(datos), ErrorApi)
  assert.equal(llamadas, 1)
})

test('recoge solo mensajes válidos de los campos conocidos', async (t) => {
  t.mock.method(globalThis, 'fetch', async (ruta) => ruta.endsWith('contexto/')
    ? json(contexto)
    : json({ errores: { correo: [null, 7, { message: 'Correo inválido.' }], rol: 'incorrecto', otro: [{ message: 'Ajeno' }] } }, 400))
  await assert.rejects(registrarUsuario(datos), (error) => {
    assert.deepEqual(error.errores, { correo: ['Correo inválido.'] })
    return true
  })
})
