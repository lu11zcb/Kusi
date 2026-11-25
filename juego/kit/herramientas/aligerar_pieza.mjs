// Aligera los dibujos para que los juegos abran rápido en el celular: vuelve a guardar cada
// PNG con una paleta de hasta 256 colores (como pngquant), con el mismo ancho y alto. Un fondo
// pasa de unos 2,5 MB a unos 650 KB y se ve igual. Solo reemplaza el archivo si queda más
// liviano. Las figuras enteras (figura-*, cuadradas de 768 × 768) no se tocan: el juego las
// corta midiendo sus colores y contornos, y la paleta podría mover esos cortes. Las tiras de
// animación también pueden llamarse figura-*, pero son más anchas que altas y sí se aligeran.
//
// El dibujante la aplica sola a cada pieza nueva. Para aligerar lo que ya existe:
//   node kit/herramientas/aligerar_pieza.mjs <pieza.png | carpeta de piezas>...

import { readdir, rename, rm, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

// Calidad alta y sin perder detalle visible; «dither» suaviza los degradados.
const OPCIONES_PNG = { palette: true, quality: 90, effort: 10, dither: 1.0, compressionLevel: 9 }

export const seQuedaComoEsta = (archivo, { width, height }) => path.basename(archivo).startsWith('figura-') && width === height

export async function aligerarPieza(archivo) {
  const antes = (await stat(archivo)).size
  const original = await sharp(archivo).metadata()
  // Una pieza que ya tiene paleta ya está aligerada: volver a hacerlo solo la degradaría.
  if (original.isPalette || seQuedaComoEsta(archivo, original)) return { archivo, antes, despues: antes, cambio: false }
  const temporal = archivo + '.aligerando.png'
  try {
    await sharp(archivo).png(OPCIONES_PNG).toFile(temporal)
    const nueva = await sharp(temporal).metadata()
    const despues = (await stat(temporal)).size
    // Mismo tamaño exacto (las tiras de animación dependen de él) y de verdad más liviano.
    if (nueva.width !== original.width || nueva.height !== original.height || despues >= antes) {
      await rm(temporal, { force: true })
      return { archivo, antes, despues: antes, cambio: false }
    }
    await rename(temporal, archivo)
    return { archivo, antes, despues, cambio: true }
  } catch (error) {
    await rm(temporal, { force: true })
    throw error
  }
}

// Los PNG de una carpeta de piezas, sin entrar a «origen» (lo que entregó la herramienta de
// imágenes) ni a otras subcarpetas.
export async function aligerarCarpeta(carpeta) {
  const resultados = []
  for (const entrada of await readdir(carpeta, { withFileTypes: true })) {
    if (entrada.isFile() && entrada.name.endsWith('.png') && !entrada.name.endsWith('.aligerando.png')) {
      resultados.push(await aligerarPieza(path.join(carpeta, entrada.name)))
    }
  }
  return resultados
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const rutas = process.argv.slice(2)
  if (!rutas.length) {
    console.error('Uso: node kit/herramientas/aligerar_pieza.mjs <pieza.png | carpeta de piezas>...')
    process.exit(2)
  }
  let antes = 0, despues = 0, cambiados = 0
  for (const ruta of rutas) {
    const resultados = (await stat(ruta)).isDirectory() ? await aligerarCarpeta(ruta) : [await aligerarPieza(ruta)]
    for (const r of resultados) { antes += r.antes; despues += r.despues; if (r.cambio) cambiados++ }
  }
  console.log(JSON.stringify({ cambiados, antes_kb: Math.round(antes / 1024), despues_kb: Math.round(despues / 1024) }))
}
