// Ayuda para cortar una figura entera en partes (kit/reproductor/logica/partesDeFigura.js):
// dice por dónde pasa la silueta y comprueba que los rectángulos no dejen píxeles afuera.
//
//   node kit/herramientas/analizar_figura.mjs <figura.png>                 el perfil de la silueta
//   node kit/herramientas/analizar_figura.mjs <figura.png> <partes.json>   y su cobertura
//
// El perfil trae, cada «banda» de filas, los tramos de x donde hay figura: donde un tramo se
// parte en dos (los brazos que se separan del tronco) o se angosta (el cuello, la cintura) está
// un buen lugar para cortar. Los rectángulos van en fracciones de la imagen, de 0 a 1.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { leerPng } from './comprobar_pieza.mjs'

const OPACO = 128

export function analizarFigura(archivo, { banda = 24 } = {}) {
  const { ancho, alto, pixeles } = leerPng(readFileSync(archivo))
  const lleno = (x, y) => pixeles[(y * ancho + x) * 4 + 3] >= OPACO
  let x0 = ancho, y0 = alto, x1 = -1, y1 = -1
  const bandas = []
  for (let inicio = 0; inicio < alto; inicio += banda) {
    const final = Math.min(alto, inicio + banda)
    const columnas = new Uint8Array(ancho)
    for (let y = inicio; y < final; y++) for (let x = 0; x < ancho; x++) if (lleno(x, y)) {
      columnas[x] = 1
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y)
    }
    const tramos = []
    for (let x = 0; x < ancho; x++) {
      if (!columnas[x]) continue
      let fin = x
      while (fin + 1 < ancho && columnas[fin + 1]) fin += 1
      tramos.push([+(x / ancho).toFixed(3), +((fin + 1) / ancho).toFixed(3)])
      x = fin
    }
    bandas.push({ y: +(inicio / alto).toFixed(3), hasta: +(final / alto).toFixed(3), tramos })
  }
  return { ancho, alto, caja: x1 < 0 ? null : { x: +(x0 / ancho).toFixed(3), y: +(y0 / alto).toFixed(3),
    ancho: +((x1 - x0 + 1) / ancho).toFixed(3), alto: +((y1 - y0 + 1) / alto).toFixed(3) }, bandas }
}

// Qué parte de la figura queda fuera de todos los rectángulos (se perdería al cortar) y qué
// parte cae en dos a la vez (se vería repetida). Los dos números van de 0 a 1.
export function coberturaDePartes(archivo, partes) {
  const { ancho, alto, pixeles } = leerPng(readFileSync(archivo))
  const cajas = Object.values(partes).map((caja) => ({
    x0: Math.floor(caja.x * ancho), y0: Math.floor(caja.y * alto),
    x1: Math.ceil((caja.x + caja.ancho) * ancho), y1: Math.ceil((caja.y + caja.alto) * alto),
  }))
  let total = 0, fuera = 0, repetidos = 0
  for (let y = 0; y < alto; y++) for (let x = 0; x < ancho; x++) {
    if (pixeles[(y * ancho + x) * 4 + 3] < OPACO) continue
    total += 1
    const dentro = cajas.filter((caja) => x >= caja.x0 && x < caja.x1 && y >= caja.y0 && y < caja.y1).length
    if (dentro === 0) fuera += 1
    else if (dentro > 1) repetidos += 1
  }
  return { sinCubrir: total ? fuera / total : 0, repetido: total ? repetidos / total : 0, pixelesDeFigura: total }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [archivo, partes] = process.argv.slice(2)
  if (!archivo) {
    console.error('Uso: node kit/herramientas/analizar_figura.mjs <figura.png> [<partes.json>]')
    process.exit(2)
  }
  const resultado = { perfil: analizarFigura(archivo) }
  if (partes) resultado.cobertura = coberturaDePartes(archivo, JSON.parse(readFileSync(partes, 'utf8')))
  console.log(JSON.stringify(resultado))
}
