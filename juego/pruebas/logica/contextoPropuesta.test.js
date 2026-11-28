import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, readFile, rm, utimes } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { randomUUID } from 'node:crypto'
import path from 'node:path'
import {
  armarContextoPropuesta, archivoDeContenidos, juegosHechos, nombreDeArea, recetaDelPlan,
} from '../../taller/trabajador/contextoPropuesta.js'
import { procesarPropuesta } from '../../taller/trabajador/proponer.js'

// El proponedor recibe todo en un solo archivo (contexto.md) para escribir rápido, como en un chat.

test('el área del pedido se vuelve el nombre de su archivo de contenidos, si existe', () => {
  assert.equal(nombreDeArea('Ciencia y Tecnología'), 'ciencia-y-tecnologia')
  assert.equal(nombreDeArea('Matemática'), 'matematica')
  assert.equal(nombreDeArea('Inglés'), 'ingles')
  assert.match(archivoDeContenidos({ cursoNombre: 'Ciencia y Tecnología', grado: '1' }), /kit\/curriculo\/1-ciencia-y-tecnologia\.md$/)
  assert.equal(archivoDeContenidos({ cursoNombre: 'Inglés', grado: '1' }), null)
  assert.equal(archivoDeContenidos({ cursoNombre: 'Matemática', grado: '3' }), null)
})

test('la receta se lee del plan como la escribe el supervisor', () => {
  assert.equal(recetaDelPlan('Escena `EscenaTrajeInti`. Receta: **exploración**'), 'exploración')
  assert.equal(recetaDelPlan('**Receta: `carrera` (UNA sola)** de kit/recetas/carrera.md'), 'carrera')
  assert.equal(recetaDelPlan('- **Receta: plataformas** (`kit/recetas/plataformas.md`)'), 'plataformas')
  assert.equal(recetaDelPlan('3. **Receta:** `carrera` (de lado)'), 'carrera')
  assert.equal(recetaDelPlan('Lee `kit/recetas/corredor.md`.\n**Receta: `corredor` (UNA sola).**'), 'corredor')
  assert.equal(recetaDelPlan('No hay receta en `kit/recetas/` para este tipo'), null)
  assert.equal(recetaDelPlan('sin receta'), null)
})

async function juegoHecho(trabajos, titulo, receta, como, segundos) {
  const carpeta = path.join(trabajos, randomUUID())
  await mkdir(path.join(carpeta, 'juego'), { recursive: true })
  await mkdir(path.join(carpeta, 'piezas'), { recursive: true })
  const readme = path.join(carpeta, 'juego', 'README.md')
  await writeFile(readme, '# ' + titulo + '\n\n' + como + '\n\n## Más detalles\n\nNo va.\n')
  await writeFile(path.join(carpeta, 'plan.md'), 'Receta: **' + receta + '**\n')
  await writeFile(path.join(carpeta, 'piezas', titulo.toLowerCase().split(' ')[0] + '.png'), 'png')
  await utimes(readme, segundos, segundos)
}

test('el contexto trae los contenidos del grado, los juegos hechos del más nuevo al más viejo y las referencias', async () => {
  const trabajos = await mkdtemp(path.join(tmpdir(), 'kusi-contexto-'))
  try {
    await juegoHecho(trabajos, 'Plaza vieja', 'corredor', 'Corre por carriles.', 1000)
    await juegoHecho(trabajos, 'Carrera nueva', 'carrera', 'Compite con un monito.', 2000)
    const hechos = await juegosHechos(trabajos)
    assert.deepEqual(hechos.map((j) => j.titulo + ':' + j.receta), ['Carrera nueva:carrera', 'Plaza vieja:corredor'])
    assert.equal(hechos[0].como, 'Compite con un monito.')

    const texto = await armarContextoPropuesta({ cursoNombre: 'Ciencia y Tecnología', grado: '1' }, { trabajos })
    assert.match(texto, /Copia de `kit\/curriculo\/1-ciencia-y-tecnologia\.md`/)
    assert.match(texto, /Documentos usados/)
    assert.ok(texto.indexOf('Carrera nueva') < texto.indexOf('Plaza vieja'))
    assert.match(texto, /No repitas la receta/)
    assert.match(texto, /carrera, plaza\./)
    for (const archivo of ['kit/recetas/README.md', 'kit/generos/README.md', 'kit/friv/por-motor.md']) assert.ok(texto.includes(archivo), archivo)

    // Sin contenidos del área (Inglés), pide pocas búsquedas en vez de inventar.
    const ingles = await armarContextoPropuesta({ cursoNombre: 'Inglés', grado: '1' }, { trabajos })
    assert.match(ingles, /No hay contenidos del grado para «Inglés»/)
    assert.match(ingles, /3 búsquedas como máximo/)
  } finally { await rm(trabajos, { recursive: true, force: true }) }
})

test('el trabajador deja contexto.md en la carpeta antes de lanzar al proponedor', async () => {
  const trabajos = await mkdtemp(path.join(tmpdir(), 'kusi-contexto-'))
  const trabajo = { id: randomUUID(), tipo: 'proponer',
    entrada: { entrada: { cursoNombre: 'Matemática', grado: '1', tema: 'Contar hasta diez', tipo: 'nueva' }, versionBase: null } }
  let leido = null
  const lanzar = async (comando) => {
    leido = await readFile(path.join(comando.argumentos[1], 'contexto.md'), 'utf8')
    await writeFile(path.join(comando.argumentos[1], 'propuesta.json'),
      JSON.stringify({ propuesta: { titulo: 'Prueba' }, fuentes: [{ documento: 'Programa', referencia: 'pág. 1' }] }))
    return { codigo: 0, agotado: false, segundos: 1, salida: JSON.stringify({ result: 'LISTO', usage: {}, is_error: false }), errores: '' }
  }
  try {
    const final = await procesarPropuesta(trabajo, {
      buzon: { propuesta: async () => ({ estado: 200, datos: {} }), fallo: async () => ({ estado: 200 }) },
      lanzar, trabajos, limiteMs: 60000, registrar: () => {},
      roles: { proponedor: { programa: 'proponedor-de-prueba', carpeta: '{temporal}', argumentos: ['{pedido}', '{carpeta}', '{instrucciones}'] } },
      agentes: { proponedor: { instrucciones: 'Instrucciones.' } },
    })
    assert.equal(final.resultado, 'listo')
    assert.match(leido, /Copia de `kit\/curriculo\/1-matematica\.md`/)
  } finally { await rm(trabajos, { recursive: true, force: true }) }
})
