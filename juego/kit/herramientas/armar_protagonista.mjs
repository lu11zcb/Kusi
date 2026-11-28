// Arma la hoja de un protagonista (el molde del cuy: 3 columnas × 7 filas de 256 px, kit/estilo/molde-personaje.md)
// a partir de las 7 tiras que entregó la herramienta de imágenes, una por fila y con fondo blanco:
//
//   node kit/herramientas/armar_protagonista.mjs <carpeta-de-tiras> <destino.png> [--prefijo cuy-nino]
//
// Las tiras se llaman <prefijo>-0-frente.png … <prefijo>-6-lanzar.png. Cada cuadro se recorta con la visión de macOS
// (preparar_pieza.swift, modo --recorte). Todas las filas usan **la misma escala** (la fila de frente queda de
// y = 23 a y = 244, como el cuy), los pies apoyan en y = 244 y **el centro de la cabeza queda en x = 128** en cada
// cuadro: así una prenda puesta sobre la cabeza (una gorra, unos lentes) calza en todos los cuadros sin bailar.

import { readFileSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { guardarPng, leerRgba, medirSilueta, recortar } from './animaciones/png_rgba.mjs'
import { prepararPieza } from './preparar_pieza.mjs'
import { escalar } from './preparar_criatura.mjs'
import { leerPng, OPACO } from './comprobar_pieza.mjs'

export const FILAS = Object.freeze(['frente', 'lado', 'asustado', 'feliz', 'espaldas', 'parpadeo', 'lanzar'])
export const CELDA = 256
export const PIES = 244
export const CIMA_FRENTE = 23
export const CENTRO = 128
// La cabeza es la franja de arriba de la silueta: en el cuy ocupa más de la mitad del alto.
const FRACCION_CABEZA = 0.45

// Centro horizontal de la cabeza: el medio de lo opaco en la franja de arriba de la silueta.
export function centroDeCabeza(imagen) {
  const silueta = medirSilueta(imagen, OPACO)
  const hasta = silueta.minY + Math.round((silueta.maxY - silueta.minY) * FRACCION_CABEZA)
  let minX = Infinity
  let maxX = -Infinity
  for (let y = silueta.minY; y <= hasta; y += 1) {
    for (let x = 0; x < imagen.ancho; x += 1) {
      if (imagen.datos[(y * imagen.ancho + x) * 4 + 3] >= OPACO) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
      }
    }
  }
  return (minX + maxX) / 2
}

function pegar(hoja, cuadro, x0, y0) {
  for (let y = 0; y < cuadro.alto; y += 1) {
    for (let x = 0; x < cuadro.ancho; x += 1) {
      const hx = x0 + x
      const hy = y0 + y
      if (hx < 0 || hy < 0 || hx >= hoja.ancho || hy >= hoja.alto) continue
      cuadro.datos.copy(hoja.datos, (hy * hoja.ancho + hx) * 4, (y * cuadro.ancho + x) * 4, (y * cuadro.ancho + x) * 4 + 4)
    }
  }
}

export async function armarProtagonista(carpeta, destino, { prefijo = 'cuy-nino' } = {}) {
  const temporal = await mkdtemp(path.join(tmpdir(), 'kusi-protagonista-'))
  try {
    // 1. Recortar los 21 cuadros.
    const cuadros = []
    for (const [fila, nombre] of FILAS.entries()) {
      const ruta = path.join(carpeta, prefijo + '-' + fila + '-' + nombre + '.png')
      const imagen = leerPng(readFileSync(ruta))
      if (!imagen.pixeles) throw new Error(ruta + ': debe ser un PNG de 8 bits sin entrelazado.')
      const tira = { ancho: imagen.ancho, alto: imagen.alto, datos: Buffer.from(imagen.pixeles) }
      const ancho = Math.floor(tira.ancho / 3)
      for (let columna = 0; columna < 3; columna += 1) {
        const entrada = path.join(temporal, fila + '-' + columna + '.png')
        const salida = path.join(temporal, fila + '-' + columna + '-recorte.png')
        guardarPng(entrada, recortar(tira, columna * ancho, 0, ancho, tira.alto))
        try {
          await prepararPieza(entrada, salida, { recorte: true })
        } catch (error) {
          throw new Error('Fila ' + fila + ' (' + nombre + '), cuadro ' + (columna + 1) + ': ' + error.message)
        }
        cuadros.push({ fila, columna, imagen: leerRgba(salida) })
      }
    }
    // 2. Una sola escala: el cuadro más alto de la fila de frente va de la cima a los pies del cuy.
    const altoFrente = Math.max(...cuadros.filter((c) => c.fila === 0).map((c) => medirSilueta(c.imagen, OPACO).maxY -
      medirSilueta(c.imagen, OPACO).minY + 1))
    const escala = (PIES - CIMA_FRENTE + 1) / altoFrente
    // 3. Cada cuadro con los pies en y = 244 y el centro de la cabeza en x = 128.
    const hoja = { ancho: CELDA * 3, alto: CELDA * FILAS.length, datos: Buffer.alloc(CELDA * 3 * CELDA * FILAS.length * 4) }
    const informe = []
    for (const { fila, columna, imagen } of cuadros) {
      const cuadro = escalar(imagen, escala)
      const silueta = medirSilueta(cuadro, OPACO)
      const x0 = Math.round(CENTRO - centroDeCabeza(cuadro))
      const y0 = PIES - silueta.maxY
      const izquierda = x0 + silueta.minX
      const derecha = x0 + silueta.maxX
      pegar(hoja, cuadro, columna * CELDA + x0, fila * CELDA + y0)
      informe.push({ fila: FILAS[fila], cuadro: columna, cima: y0 + silueta.minY, izquierda, derecha,
        recortado: izquierda < 2 || derecha > CELDA - 3 || y0 + silueta.minY < 0 })
    }
    guardarPng(destino, hoja)
    return { escala: Number(escala.toFixed(4)), cuadros: informe }
  } finally {
    await rm(temporal, { recursive: true, force: true })
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const argumentos = process.argv.slice(2)
  const indice = argumentos.indexOf('--prefijo')
  const prefijo = indice >= 0 ? argumentos.splice(indice, 2)[1] : undefined
  const [carpeta, destino] = argumentos
  if (!carpeta || !destino) {
    console.error('Uso: node kit/herramientas/armar_protagonista.mjs <carpeta-de-tiras> <destino.png> [--prefijo cuy-nino]')
    process.exit(2)
  }
  try {
    console.log(JSON.stringify(await armarProtagonista(carpeta, destino, { prefijo }), null, 1))
  } catch (error) {
    console.error(error.message)
    process.exit(1)
  }
}
