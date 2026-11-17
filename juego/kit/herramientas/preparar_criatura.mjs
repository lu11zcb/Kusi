// Prepara una criatura animada (un personaje o enemigo que se mueve) a partir de lo que entregó la herramienta de
// imágenes: UNA imagen ancha con la criatura dibujada 3 veces, lado a lado, como los 3 cuadros de su ciclo de caminar.
//
//   node kit/herramientas/preparar_criatura.mjs <original.png> <criatura-nombre.png>
//
// Corta la imagen en 3 partes iguales, quita el fondo blanco de cada una con la visión de macOS (preparar_pieza.swift,
// modo --recorte) y arma una tira de 768 × 256: 3 cuadros de 256 × 256 con **la misma escala** (el lado mayor del cuadro
// más grande mide 200 px), los pies en y = 244 y el cuerpo centrado en su cuadro. El ciclo se reproduce con
// kit/reproductor/dibujos/criaturaAnimada.js.

import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { guardarPng, leerRgba, recortar } from './animaciones/png_rgba.mjs'
import { prepararPieza } from './preparar_pieza.mjs'

export const CUADRO = 256
export const CUADROS = 3
export const LADO_MAYOR = 200
// El punto más bajo de la criatura (sus pies) cae en la fila 244, como los personajes del kit.
export const PIES = 244

// Reduce (o agranda) una imagen RGBA promediando el área de cada píxel nuevo, con el alfa premultiplicado para que los
// bordes transparentes no se vuelvan grises.
export function escalar(imagen, escala) {
  const ancho = Math.max(1, Math.round(imagen.ancho * escala))
  const alto = Math.max(1, Math.round(imagen.alto * escala))
  const datos = Buffer.alloc(ancho * alto * 4)
  const fx = imagen.ancho / ancho
  const fy = imagen.alto / alto
  for (let y = 0; y < alto; y += 1) {
    for (let x = 0; x < ancho; x += 1) {
      const sx0 = x * fx
      const sx1 = (x + 1) * fx
      const sy0 = y * fy
      const sy1 = (y + 1) * fy
      let r = 0, g = 0, b = 0, a = 0, peso = 0
      for (let sy = Math.floor(sy0); sy < Math.min(imagen.alto, Math.ceil(sy1)); sy += 1) {
        const wy = Math.min(sy + 1, sy1) - Math.max(sy, sy0)
        for (let sx = Math.floor(sx0); sx < Math.min(imagen.ancho, Math.ceil(sx1)); sx += 1) {
          const w = (Math.min(sx + 1, sx1) - Math.max(sx, sx0)) * wy
          const i = (sy * imagen.ancho + sx) * 4
          const alfa = imagen.datos[i + 3] / 255
          r += imagen.datos[i] * alfa * w
          g += imagen.datos[i + 1] * alfa * w
          b += imagen.datos[i + 2] * alfa * w
          a += alfa * w
          peso += w
        }
      }
      const o = (y * ancho + x) * 4
      if (a > 0) {
        datos[o] = Math.round(r / a)
        datos[o + 1] = Math.round(g / a)
        datos[o + 2] = Math.round(b / a)
      }
      datos[o + 3] = Math.round((255 * a) / Math.max(peso, 1e-9))
    }
  }
  return { ancho, alto, datos }
}

// Copia un cuadro sobre la hoja en (x0, y0), solo donde hay figura (la hoja empieza transparente).
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

// Devuelve { tipo, cuadros, lado_mayor, alturas } o lanza un error con su motivo (por ejemplo, «Cuadro 2: No se
// encontró ninguna figura en la imagen»).
export async function prepararCriatura(original, destino) {
  const tira = leerRgba(original)
  const ancho = Math.floor(tira.ancho / CUADROS)
  if (ancho < 64 || tira.alto < 64) throw new Error('La imagen es muy chica para tres cuadros: mide ' + tira.ancho + ' × ' + tira.alto + '.')
  const carpeta = await mkdtemp(path.join(tmpdir(), 'kusi-criatura-'))
  try {
    const recortes = []
    for (let i = 0; i < CUADROS; i += 1) {
      const entrada = path.join(carpeta, 'celda-' + (i + 1) + '.png')
      const salida = path.join(carpeta, 'recorte-' + (i + 1) + '.png')
      guardarPng(entrada, recortar(tira, i * ancho, 0, ancho, tira.alto))
      try {
        await prepararPieza(entrada, salida, { recorte: true })
      } catch (error) {
        throw new Error('Cuadro ' + (i + 1) + ': ' + error.message)
      }
      recortes.push(leerRgba(salida))
    }
    // La misma escala para los tres: si no, la criatura «respiraría» de tamaño al caminar.
    const mayor = Math.max(...recortes.map((recorte) => Math.max(recorte.ancho, recorte.alto)))
    const escala = LADO_MAYOR / mayor
    const hoja = { ancho: CUADRO * CUADROS, alto: CUADRO, datos: Buffer.alloc(CUADRO * CUADROS * CUADRO * 4) }
    const alturas = []
    recortes.forEach((recorte, i) => {
      const cuadro = escalar(recorte, escala)
      pegar(hoja, cuadro, i * CUADRO + Math.round((CUADRO - cuadro.ancho) / 2), PIES + 1 - cuadro.alto)
      alturas.push(cuadro.alto)
    })
    guardarPng(destino, hoja)
    return { tipo: 'criatura', cuadros: CUADROS, lado_mayor: Math.round(mayor * escala), alturas }
  } finally {
    await rm(carpeta, { recursive: true, force: true })
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [original, destino] = process.argv.slice(2)
  if (!original || !destino) {
    console.error('Uso: node kit/herramientas/preparar_criatura.mjs <original.png> <criatura-nombre.png>')
    process.exit(2)
  }
  try {
    console.log(JSON.stringify(await prepararCriatura(original, destino)))
  } catch (error) {
    console.error(error.message)
    process.exit(1)
  }
}
