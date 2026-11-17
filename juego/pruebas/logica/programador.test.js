import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { randomUUID } from 'node:crypto'
import path from 'node:path'
import { programar, pedidoDeCodigo, textoDeArchivo, MAX_ENCARGOS } from '../../taller/programar.mjs'
import { leerAgentes } from '../../taller/trabajador/roles.js'
import { pedidoParaElSupervisor } from '../../taller/trabajador/procesar.js'

// El programador del taller sin el programa real: un doble «escribe» el juego en la carpeta
// del trabajo. Comprueba lo que se le pide, dónde escribe y lo que queda registrado.

const agentes = await leerAgentes()
const roles = { programador: { programa: 'programador-de-prueba', carpeta: '{temporal}', argumentos: ['{pedido}', '{instrucciones}'] } }

async function trabajoDePrueba() {
  const carpeta = path.join(await mkdtemp(path.join(tmpdir(), 'kusi-programador-')), randomUUID())
  await mkdir(carpeta, { recursive: true })
  await writeFile(path.join(carpeta, 'trabajo.json'), '{}')
  return carpeta
}

// Un programador de mentira: escribe juego.js y responde como lo haría el programa real.
function programadorDePrueba(respuestas) {
  const llamadas = []
  return {
    llamadas,
    lanzarRol: async (comando) => {
      llamadas.push(comando)
      const respuesta = respuestas.shift()
      if (respuesta === 'agotado') return { codigo: null, agotado: true, salida: '', errores: '' }
      const carpeta = /Carpeta del trabajo: (\S+)\./.exec(comando.argumentos[0])[1]
      await writeFile(path.join(carpeta, 'juego', 'juego.js'), 'export default {}\n')
      return { codigo: 0, agotado: false, salida: JSON.stringify({ result: respuesta, usage: { input_tokens: 100, output_tokens: 40 } }), errores: '' }
    },
  }
}

test('el encargo dice la carpeta, la tarea y la corrección, y nunca nombra programas', () => {
  const carpeta = '/t/' + randomUUID()
  const pedido = pedidoDeCodigo({ carpeta, tarea: 'Escribe la lógica de los niveles', correccion: 'La ayuda 2 no se ve.',
    juegoUrl: 'http://127.0.0.1:5174/', trabajo: path.basename(carpeta) })
  assert.match(pedido, /Escribe solo dentro de \/t\/.+\/juego/)
  assert.match(pedido, /Tarea del supervisor: Escribe la lógica de los niveles/)
  assert.match(pedido, /Es una corrección[\s\S]*La ayuda 2 no se ve\./)
  assert.match(pedido, /\?juego=/)
  assert.match(pedido, /^Eres el programador del taller de Kusi/)
})

test('un encargo que termina deja el código en juego/, su pedido y su registro', async () => {
  const carpeta = await trabajoDePrueba()
  const { lanzarRol, llamadas } = programadorDePrueba(['LISTO'])
  const resultado = await programar({ carpeta, tarea: 'Escribe el juego completo según plan.md' }, { roles, agentes, lanzarRol })
  assert.equal(resultado.pasa, true, JSON.stringify(resultado))
  assert.equal(resultado.siguiente, 'revisor')
  assert.deepEqual(resultado.archivos, ['juego.js'])
  // Trabaja desde una carpeta vacía fuera del proyecto y recibe sus instrucciones de programador.
  assert.ok(!llamadas[0].carpeta.startsWith(path.dirname(carpeta)))
  assert.match(llamadas[0].argumentos[1], /^# Programador/)
  assert.match(await readFile(path.join(carpeta, 'programador', 'pedidos.md'), 'utf8'), /## Encargo 1[\s\S]*Resultado: terminó\./)
  const registro = JSON.parse(await readFile(path.join(carpeta, 'programador', 'registro.json'), 'utf8'))
  assert.deepEqual({ ...registro[0], segundos: 0 }, { encargo: 1, termino: true, motivo: null, segundos: 0, tokens_entrada: 100, tokens_salida: 40, costo_estimado_usd: 0 })
  await rm(path.dirname(carpeta), { recursive: true })
})

test('un FALLÓ que solo dice que el entorno bloqueó el build o el navegador no es un fallo del juego', async () => {
  const carpeta = await trabajoDePrueba()
  const { lanzarRol } = programadorDePrueba([
    'FALLÓ: 8 pruebas aprobadas; compilación y Playwright bloqueados por permisos del entorno.',
    'FALLÓ: 2 pruebas fallan; Playwright bloqueado por permisos del entorno.',
    'FALLÓ: ReferenceError en la escena; el build quedó bloqueado por permisos.',
  ])
  const primero = await programar({ carpeta, tarea: 'Escribe el juego' }, { roles, agentes, lanzarRol })
  assert.equal(primero.pasa, true, primero.motivo)
  assert.equal(primero.siguiente, 'revisor')
  const segundo = await programar({ carpeta, tarea: 'Escribe el juego' }, { roles, agentes, lanzarRol })
  assert.equal(segundo.pasa, false)
  const tercero = await programar({ carpeta, tarea: 'Escribe el juego' }, { roles, agentes, lanzarRol })
  assert.equal(tercero.pasa, false)
  await rm(path.dirname(carpeta), { recursive: true })
})

test('el pedido al programador no le pide el build ni el navegador y le dice que la historia es un texto', () => {
  const pedido = pedidoDeCodigo({ carpeta: '/t/x', tarea: 'haz', correccion: null, juegoUrl: 'http://127.0.0.1:5174/', trabajo: 'x' })
  assert.match(pedido, /NO corras npm run build ni abras el juego/)
  assert.match(pedido, /es un TEXTO/)
  assert.doesNotMatch(pedido, /abre el juego con Playwright una vez/)
})

test('si el programador dice que no pudo o se acaba su tiempo, toca corregir', async () => {
  const carpeta = await trabajoDePrueba()
  const { lanzarRol } = programadorDePrueba(['FALLÓ: falta la pieza olla', 'agotado'])
  const primero = await programar({ carpeta, tarea: 'Escribe la escena' }, { roles, agentes, lanzarRol })
  assert.deepEqual([primero.pasa, primero.siguiente, primero.motivo], [false, 'corregir', 'FALLÓ: falta la pieza olla'])
  const segundo = await programar({ carpeta, tarea: 'Escribe la escena', correccion: 'usa una figura simple' }, { roles, agentes, lanzarRol })
  assert.deepEqual([segundo.encargo, segundo.pasa], [2, false])
  assert.match(segundo.motivo, /no terminó en/)
  await rm(path.dirname(carpeta), { recursive: true })
})

test('hay un tope de encargos por trabajo y solo se trabaja en la carpeta de un trabajo', async () => {
  const carpeta = await trabajoDePrueba()
  const { lanzarRol, llamadas } = programadorDePrueba(Array(MAX_ENCARGOS).fill('LISTO'))
  for (let i = 0; i < MAX_ENCARGOS; i++) await programar({ carpeta, tarea: 'parte ' + i }, { roles, agentes, lanzarRol })
  const deMas = await programar({ carpeta, tarea: 'otra parte' }, { roles, agentes, lanzarRol })
  assert.deepEqual([deMas.pasa, deMas.siguiente], [false, 'fallo'])
  assert.equal(llamadas.length, MAX_ENCARGOS)
  assert.match((await programar({ carpeta: tmpdir(), tarea: 'x' }, { roles, agentes, lanzarRol })).motivo, /carpeta/)
  assert.match((await programar({ carpeta, tarea: ' ' }, { roles, agentes, lanzarRol })).motivo, /--tarea/)
  assert.equal(existsSync(path.join(carpeta, 'programador', 'registro.json')), true)
  await rm(path.dirname(carpeta), { recursive: true })
})

test('el supervisor encarga el código con programar.mjs y no lo escribe él', () => {
  const trabajo = { id: randomUUID(), tipo: 'crear_juego' }
  const pedido = pedidoParaElSupervisor({ trabajo, carpeta: '/t/' + trabajo.id, juegoUrl: 'http://127.0.0.1:5174/', correccion: null, intento: 1 })
  assert.match(pedido, /No escribes el código del juego ni dibujas/)
  assert.match(pedido, /programar\.mjs --carpeta \/t\/.+ --tarea/)
  assert.match(pedido, /dibujar\.mjs --carpeta/)
})

test('una tarea larga se lee de un archivo de la carpeta del trabajo y nunca de fuera', async () => {
  const carpeta = await mkdtemp(path.join(tmpdir(), 'kusi-tarea-'))
  await mkdir(path.join(carpeta, 'programador'), { recursive: true })
  const larga = 'TAREA B: ' + 'la escena completa; (con comillas \'simples\' y \"dobles\"); $x `y` | z > w. '.repeat(200)
  await writeFile(path.join(carpeta, 'programador', 'tarea-1.md'), larga + '\n')
  assert.equal(await textoDeArchivo(carpeta, 'programador/tarea-1.md'), larga.trim())
  await assert.rejects(textoDeArchivo(carpeta, '../fuera.md'), /dentro de la carpeta del trabajo/)
  await assert.rejects(textoDeArchivo(carpeta, '/etc/hosts'), /dentro de la carpeta del trabajo/)
  await assert.rejects(textoDeArchivo(carpeta, ''), /dentro de la carpeta del trabajo/)
  await assert.rejects(textoDeArchivo(carpeta, 'programador/no-existe.md'), /No existe el archivo/)
  await rm(carpeta, { recursive: true })
})
