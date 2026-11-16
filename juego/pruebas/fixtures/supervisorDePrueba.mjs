// Un supervisor de prueba, sin IA: deja en la carpeta del trabajo un juego mínimo, como
// lo dejaría el supervisor real, para probar el trabajador de punta a punta.
//
//   node supervisorDePrueba.mjs <carpeta> <modo> <pedido>
//   modo «bien»     escribe el juego completo.
//   modo «corrige»  el primer intento olvida las pruebas; con el pedido de corrección las agrega.
//   modo «roto»     siempre olvida las pruebas.
//   modo «lento»    no termina nunca (para probar el límite de tiempo).
//   modo «no»       responde que no se puede hacer.

import { mkdir, writeFile, copyFile } from 'node:fs/promises'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'

const [carpeta, modo, pedido = ''] = process.argv.slice(2)
const esCorreccion = /Corrección \d de 2/.test(pedido)

if (modo === 'lento') setInterval(() => {}, 1000)
else await trabajar()

async function trabajar() {
  if (modo === 'no') return responder('FALLÓ: el tema pide dibujar una figura sagrada como personaje.')

  const conPruebas = ['bien', 'sin-revision', 'revision-vieja'].includes(modo) || (modo === 'corrige' && esCorreccion)
  const archivos = {
    'juego/juego.js': [
      "import { EscenaParejas } from './escenas/EscenaParejas.js'",
      "import { validarParejas } from './datos/validarParejas.js'",
      '',
      "export default { familia: 'parejas_prueba', nombre: 'Las parejas de prueba', escena: EscenaParejas,",
      "  validar: validarParejas, piezas: ['fresa', 'olla-de-prueba'] }",
    ].join('\n'),
    'juego/escenas/EscenaParejas.js': [
      "import * as Phaser from 'phaser'",
      "import { ANCHO, estiloTexto } from '#kit/reproductor/medidas.js'",
      "import { avisarPartida } from '#kit/reproductor/logica/partida.js'",
      "import { crearControles } from '#kit/reproductor/interfaz/controles.js'",
      "import { crearHud } from '#kit/reproductor/interfaz/hud.js'",
      "import { repartirYColocar, darVida, ambiente } from '#kit/reproductor/efectos/mundoVivo.js'",
      '',
      'export class EscenaParejas extends Phaser.Scene {',
      '  init(datos) { this.datos = datos }',
      '  create() {',
      '    const reto = this.datos.paquete.retos[this.datos.indiceNivel]',
      '    this.add.text(ANCHO / 2, 80, reto.consigna, estiloTexto(32)).setOrigin(0.5)',
      '    this.controles = crearControles(this)',
      '    this.hud = crearHud(this)',
      "    repartirYColocar(this, { area: { x: 0, y: 0, ancho: 1280, alto: 720 }, cantidad: 4, claves: ['fresa'] })",
      "    darVida(this, this.add.circle(200, 200, 10, 0xffffff), 'flotar')",
      "    ambiente(this, { area: { x: 0, y: 0, ancho: 1280, alto: 720 }, cantidad: 4 })",
      "    avisarPartida(this.datos.partida, 'listo', { familia: 'parejas_prueba', nivel: this.datos.indiceNivel + 1 })",
      '  }',
      '}',
    ].join('\n'),
    'juego/datos/validarParejas.js': [
      'export function validarParejas(guion) {',
      "  const errores = Array.isArray(guion?.retos) && guion.retos.length ? [] : ['Faltan los retos.']",
      '  return { valido: errores.length === 0, errores }',
      '}',
    ].join('\n'),
    'juego/logica/parejas.js': 'export const sonPareja = (a, b) => a === b\n',
    'juego/guion-ejemplo.json': JSON.stringify({
      formato: 'kusi-paquete/0', familia: 'parejas_prueba', titulo: 'Parejas', orientacion: 'horizontal',
      historia: 'Kusi perdió sus calcetines. Ayúdalo a juntar las parejas.',
      retos: [{ id: 1, consigna: 'Junta las parejas.', ayudas: ['Mira los colores.', 'Empieza por la fresa.'] }],
      cierre: { mensaje: '¡Muy bien!' },
    }),
    'juego/README.md': '# Las parejas de prueba\n\nUn juego mínimo para probar el trabajador.\n',
    'plan.md': '# Plan del trabajo\n\nJuego nuevo de prueba.\n',
    'evidencia.json': JSON.stringify({ intentos: { piezas: { 'olla-de-prueba': 1 } } }),
  }
  if (conPruebas) {
    archivos['juego/pruebas/parejas.test.js'] = [
      "import { test } from 'node:test'",
      "import assert from 'node:assert/strict'",
      "import { sonPareja } from '../logica/parejas.js'",
      "import { validarParejas } from '../datos/validarParejas.js'",
      "test('dos iguales son pareja', () => assert.equal(sonPareja('fresa', 'fresa'), true))",
      "test('el validar rechaza un guion sin retos', () => assert.equal(validarParejas({}).valido, false))",
    ].join('\n')
  }
  for (const [ruta, contenido] of Object.entries(archivos)) {
    await mkdir(path.dirname(path.join(carpeta, ruta)), { recursive: true })
    await writeFile(path.join(carpeta, ruta), contenido)
  }
  await mkdir(path.join(carpeta, 'piezas'), { recursive: true })
  await copyFile(new URL('../../kit/recursos/dibujos/objetos/papa.png', import.meta.url), path.join(carpeta, 'piezas', 'olla-de-prueba.png'))
  // Es evidencia ficticia solo para esta prueba del recorrido del trabajador.
  await mkdir(path.join(carpeta, 'revision'), { recursive: true })
  await writeFile(path.join(carpeta, 'revision', 'piezas.md'), 'Revisión ficticia de la pieza de prueba.\n')
  if (modo !== 'sin-revision') await writeFile(path.join(carpeta, 'revision', 'piezas.json'), JSON.stringify({ piezas: [{
    id: 'olla-de-prueba', veredicto: 'aprobado', informe: 'piezas.md',
    sha256: modo === 'revision-vieja' ? '0'.repeat(64) : createHash('sha256').update(await readFile(path.join(carpeta, 'piezas', 'olla-de-prueba.png'))).digest('hex'),
  }] }))
  responder('LISTO')
}

// El mismo resumen en JSON que deja un programa real al terminar.
function responder(texto) {
  console.log(JSON.stringify({ result: texto, is_error: false, usage: { input_tokens: 1200, output_tokens: 300 }, total_cost_usd: 0.01 }))
}
