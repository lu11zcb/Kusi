import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { armarBiblioteca, leerModelos, tipoDePieza } from '../../taller/trabajador/carpeta.js'

// Un juego modelo (hecho por el equipo) entra a la biblioteca con todas sus piezas aprobadas.
test('un juego modelo entra a la biblioteca con sus piezas como aprobadas', async () => {
  const trabajos = await mkdtemp(path.join(tmpdir(), 'kusi-modelos-'))
  const id = '11111111-2222-4333-8444-555555555555'
  try {
    await mkdir(path.join(trabajos, id, 'juego'), { recursive: true })
    await mkdir(path.join(trabajos, id, 'piezas', 'origen'), { recursive: true })
    await writeFile(path.join(trabajos, id, 'juego', 'juego.js'), 'export default {}')
    await writeFile(path.join(trabajos, id, 'piezas', 'tambor.png'), 'png')
    await writeFile(path.join(trabajos, id, 'piezas', 'fondo-plaza.png'), 'png')
    await writeFile(path.join(trabajos, id, 'piezas', 'origen', 'tambor-intento-1.png'), 'original')
    const biblioteca = await armarBiblioteca({ enviados: [], trabajos, modelos: [
      { trabajo: id, titulo: 'El traje de Inti', familia: 'traje_inti' },
      { trabajo: '99999999-2222-4333-8444-555555555555', titulo: 'No está en esta Mac', familia: 'otro' },
    ] })
    assert.equal(biblioteca.taller.length, 1)
    assert.equal(biblioteca.taller[0].modelo, true)
    assert.deepEqual(biblioteca.piezas_aprobadas.map((p) => p.id + ':' + p.tipo).sort(), ['fondo-plaza:fondo', 'tambor:objeto'])
    assert.ok(biblioteca.piezas_aprobadas.every((p) => /^[0-9a-f]{64}$/.test(p.sha256)))
  } finally { await rm(trabajos, { recursive: true, force: true }) }
})

test('los modelos del taller son los dos juegos que hizo el equipo', async () => {
  const modelos = await leerModelos()
  assert.deepEqual(modelos.map((m) => m.titulo), ['El traje de Inti', 'Las vocales congeladas'])
  assert.equal(tipoDePieza('fondo-cuento-1'), 'cuento')
  assert.equal(tipoDePieza('criatura-lobito'), 'criatura')
})
