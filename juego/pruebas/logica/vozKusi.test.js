import test from 'node:test'
import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { copyFile, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { archivoDeFrase } from '../../taller/vozGrabada.mjs'
import { decirConPython, grabarFrases, grabarVozKusi, textoParaElMotor } from '../../taller/vozKusi.mjs'

const ejecutar = promisify(execFile)

async function carpetaTemporal(t) {
  const carpeta = await mkdtemp(path.join(tmpdir(), 'kusi-voz-'))
  t.after(() => rm(carpeta, { recursive: true, force: true }))
  return carpeta
}

function simularGrabacion(duraciones) {
  const pedidos = []
  const opciones = {
    async motor({ trabajos }) {
      pedidos.push(trabajos.map(({ texto }) => texto))
      const fallos = []
      for (const { texto, salida } of trabajos) {
        const duracion = duraciones[texto]?.shift()
        assert.notEqual(duracion, undefined, 'Grabación inesperada de ' + texto)
        if (duracion === null) {
          fallos.push({ salida, motivo: 'No audio was generated.' })
          continue
        }
        await writeFile(salida, String(duracion))
      }
      return { fallos }
    },
    async convertir([wav, opcionFormato, formato, opcionDatos, codec, audio]) {
      assert.deepEqual([opcionFormato, formato, opcionDatos, codec], ['-f', 'm4af', '-d', 'aac'])
      await copyFile(wav, audio)
    },
    async afinfo([audio]) {
      assert.equal(path.extname(audio), '.m4a')
      const duracion = Number(await readFile(audio, 'utf8'))
      return { stdout: 'File: ' + audio + '\nestimated duration: ' + duracion.toFixed(6) + ' sec\n' }
    },
  }
  return { pedidos, opciones }
}

test('el motor recibe exactamente seis letras en las vocales de tres o más repeticiones', () => {
  assert.equal(textoParaElMotor('aaa, ooola e iiisla'), 'aaaaaa, ' + 'o'.repeat(6) + 'la e iiiiiisla')
  assert.equal(textoParaElMotor('Iiiiiii. ¡ÚÚÚ!'), 'Iiiiii. ¡ÚÚÚÚÚÚ!')
  assert.equal(textoParaElMotor('Leer. ¡Aaa!'), 'Leer. ¡Aaaaaa!')
})

test('repite solo los audios fuera de rango y escribe la revisión sin cambiar las claves de voz.json', async (t) => {
  const carpeta = await carpetaTemporal(t)
  const carpetaJuego = path.join(carpeta, 'juego')
  const carpetaVoz = path.join(carpeta, 'voz')
  await mkdir(carpetaJuego)
  await writeFile(path.join(carpetaJuego, 'guion-ejemplo.json'), JSON.stringify({ consigna: 'Suena aaa.' }))
  await writeFile(path.join(carpetaJuego, 'frases.js'), 'export const frasesDeKusi = () => ["¡Ooola!", "Iiiiiii."]')
  const { pedidos, opciones } = simularGrabacion({
    'Suena aaaaaa.': [0.24, 0.795],
    '¡Oooooola!': [1.18],
    'Iiiiii.': [6.5, 0.24, 1.1],
  })

  const resultado = await grabarVozKusi({ carpeta, ...opciones })
  assert.deepEqual(resultado, { voz: 'Kusi', grabadas: 3, ya_estaban: 0, total: 3, para_revisar: 1, fallidas: 0 })
  assert.deepEqual(pedidos, [
    ['Suena aaaaaa.', '¡Oooooola!', 'Iiiiii.'],
    ['Suena aaaaaa.', 'Iiiiii.'],
    ['Iiiiii.'],
  ])

  const frases = Object.fromEntries(['Suena aaa.', '¡Ooola!', 'Iiiiiii.'].map((frase) => [frase, archivoDeFrase(frase)]))
  const leerJson = async (nombre) => JSON.parse(await readFile(path.join(carpetaVoz, nombre), 'utf8'))
  assert.deepEqual(await leerJson('voz.json'), { voz: 'Kusi', frases })
  const informe = await leerJson('revisar.json')
  assert.deepEqual(informe, { voz: 'Kusi', frases: {
    'Suena aaa.': { archivo: frases['Suena aaa.'], duracion: 0.795, intentos: 2, revisar: false },
    '¡Ooola!': { archivo: frases['¡Ooola!'], duracion: 1.18, intentos: 1, revisar: false },
    'Iiiiiii.': { archivo: frases['Iiiiiii.'], duracion: 1.1, intentos: 3, revisar: true },
  } })
  assert.equal(await readFile(path.join(carpetaVoz, frases['Iiiiiii.']), 'utf8'), '1.1')

  assert.deepEqual(await grabarVozKusi({ carpeta, ...opciones }), {
    voz: 'Kusi', grabadas: 0, ya_estaban: 3, total: 3, para_revisar: 1, fallidas: 0,
  })
  assert.equal(pedidos.length, 3)
  assert.deepEqual(await leerJson('revisar.json'), informe)
  assert.deepEqual((await readdir(carpetaVoz)).sort(), [...Object.values(frases), 'revisar.json', 'voz.json'].sort())
})

test('mide las grabaciones anteriores sin informe y renueva las vocales que cambian', async (t) => {
  const carpetaVoz = await carpetaTemporal(t)
  const frases = ['Hola.', 'Buen día.', 'iiisla']
  const archivos = Object.fromEntries(frases.map((frase) => [frase, archivoDeFrase(frase)]))
  await writeFile(path.join(carpetaVoz, 'voz.json'), JSON.stringify({ voz: 'Kusi', frases: archivos }))
  await writeFile(path.join(carpetaVoz, archivos['Hola.']), '0.6')
  await writeFile(path.join(carpetaVoz, archivos['Buen día.']), '0.2')
  await writeFile(path.join(carpetaVoz, archivos.iiisla), '0.8')
  const { pedidos, opciones } = simularGrabacion({ 'Buen día.': [6.5, 6.5], iiiiiisla: [0.9] })

  assert.deepEqual(await grabarFrases({ frases, carpetaVoz, ...opciones }), {
    voz: 'Kusi', grabadas: 2, ya_estaban: 1, total: 3, para_revisar: 1, fallidas: 0,
  })
  assert.deepEqual(pedidos, [['Buen día.', 'iiiiiisla'], ['Buen día.']])
  const informe = JSON.parse(await readFile(path.join(carpetaVoz, 'revisar.json'), 'utf8'))
  assert.deepEqual(informe.frases, {
    'Hola.': { archivo: archivos['Hola.'], duracion: 0.6, intentos: 1, revisar: false },
    'Buen día.': { archivo: archivos['Buen día.'], duracion: 6.5, intentos: 3, revisar: true },
    iiisla: { archivo: archivos.iiisla, duracion: 0.9, intentos: 1, revisar: false },
  })
})

test('la grabación lee el modelo de voz local y se lo pasa a Python', async (t) => {
  const carpeta = await carpetaTemporal(t)
  const archivoModelo = path.join(carpeta, 'modelo.txt')
  await writeFile(archivoModelo, '  modelo-simulado\n')
  const resultado = await decirConPython({
    trabajos: [{ texto: 'Hola.', salida: path.join(carpeta, 'hola.wav') }],
    archivoModelo,
    async ejecutarPython(_programa, argumentos) {
      const posicionModelo = argumentos.indexOf('--modelo')
      assert.notEqual(posicionModelo, -1)
      assert.equal(argumentos[posicionModelo + 1], 'modelo-simulado')
      await writeFile(argumentos[argumentos.indexOf('--informe') + 1], '{"fallos":[]}')
    },
  })
  assert.deepEqual(resultado, { fallos: [] })
})

test('la grabación avisa si falta el archivo del modelo de voz antes de llamar al motor', async (t) => {
  const carpeta = await carpetaTemporal(t)
  await assert.rejects(decirConPython({
    trabajos: [{ texto: 'Hola.', salida: path.join(carpeta, 'hola.wav') }],
    archivoModelo: path.join(carpeta, 'modelo.txt'),
    ejecutarPython: () => assert.fail('El motor requiere el modelo de voz.'),
  }), /Falta el modelo de voz.*modelo\.txt/)
})

test('decir.py sigue después de una frase fallida y registra su salida y motivo', async (t) => {
  const carpeta = await carpetaTemporal(t)
  const lista = path.join(carpeta, 'frases.json')
  const informe = path.join(carpeta, 'fallos.json')
  const fallida = path.join(carpeta, 'fallida.wav')
  const sana = path.join(carpeta, 'sana.wav')
  await writeFile(lista, JSON.stringify([{ texto: 'Falla.', salida: fallida }, { texto: 'Hola.', salida: sana }]))
  const guion = fileURLToPath(new URL('../../taller/voz/decir.py', import.meta.url))
  const prueba = [
    'import runpy, sys',
    'from pathlib import Path',
    'main = runpy.run_path(sys.argv.pop(1))["main"]',
    'def decir_falso(modelo, texto, salida, *opciones):',
    '    assert modelo == "modelo-simulado"',
    '    if texto == "Falla.":',
    '        raise RuntimeError("No audio was generated.")',
    '    Path(salida).write_text("audio simulado", encoding="utf-8")',
    'main.__globals__.update(cargar_modelo=lambda nombre: nombre, decir=decir_falso)',
    'main()',
  ].join('\n')
  const argumentos = ['-c', prueba, guion, '--lista', lista, '--informe', informe, '--referencia', 'simulada.wav']
  await assert.rejects(ejecutar('python3', argumentos), { code: 2, stderr: /required: --modelo/ })
  const { stdout } = await ejecutar('python3', [...argumentos, '--modelo', 'modelo-simulado'])
  assert.match(stdout, /grabadas: 1, fallidas: 1/)
  assert.equal(await readFile(sana, 'utf8'), 'audio simulado')
  assert.deepEqual(JSON.parse(await readFile(informe, 'utf8')), {
    fallos: [{ salida: fallida, motivo: 'No audio was generated.' }],
  })
})

test('reintenta solo las frases fallidas y publica todas las que consigue grabar', async (t) => {
  const carpetaVoz = await carpetaTemporal(t)
  const frases = ['Falla.', 'Hola.', 'Vuelve.']
  const { pedidos, opciones } = simularGrabacion({
    'Falla.': [null, null, null, null], 'Hola.': [0.6], 'Vuelve.': [null, 0.8],
  })
  assert.deepEqual(await grabarFrases({ frases, carpetaVoz, ...opciones }), {
    voz: 'Kusi', grabadas: 2, ya_estaban: 0, total: 3, para_revisar: 0, fallidas: 1,
  })
  assert.deepEqual(pedidos, [frases, ['Falla.', 'Vuelve.'], ['Falla.'], ['Falla.']])
  const leerJson = async (nombre) => JSON.parse(await readFile(path.join(carpetaVoz, nombre), 'utf8'))
  const archivos = { 'Hola.': archivoDeFrase('Hola.'), 'Vuelve.': archivoDeFrase('Vuelve.') }
  assert.deepEqual(await leerJson('voz.json'), { voz: 'Kusi', frases: archivos })
  assert.deepEqual((await leerJson('revisar.json')).frases['Falla.'], {
    fallo: true, intentos: 4, motivo: 'No audio was generated.',
  })
  assert.deepEqual((await readdir(carpetaVoz)).sort(), [...Object.values(archivos), 'revisar.json', 'voz.json'].sort())
})

test('si se cancela una tanda, limpia el bloqueo y no publica el índice', async (t) => {
  const carpetaVoz = await carpetaTemporal(t)
  const controlador = new AbortController()
  const { opciones } = simularGrabacion({ 'Hola.': [0.6] })
  await assert.rejects(grabarFrases({
    frases: ['Hola.'], carpetaVoz, senal: controlador.signal, ...opciones,
    async motor(pedido) {
      await opciones.motor(pedido)
      controlador.abort(new Error('Tiempo agotado.'))
    },
  }), /Tiempo agotado/)
  assert.deepEqual(await readdir(carpetaVoz), [])
})
