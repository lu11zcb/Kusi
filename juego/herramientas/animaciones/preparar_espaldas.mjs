// Integra las nuevas poses traseras sin modificar las otras filas del atlas.
// Desde juego/: node herramientas/animaciones/preparar_espaldas.mjs
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { leerRgba, recortar, medirSilueta, guardarPng } from './png_rgba.mjs'

const raiz = new URL('../../', import.meta.url)
// La receta vigente reutiliza las filas aprobadas del atlas actual.
const ajustes = JSON.parse(readFileSync(new URL(process.argv[2] ?? 'arte/espaldas-v3/preparacion.json', raiz), 'utf8'))
const carpeta = new URL(ajustes.carpeta, raiz)
const trabajo = new URL('preparacion/', carpeta)
mkdirSync(trabajo, { recursive: true })
const contratos = ajustes.personajes
const informe = []
for (const contrato of contratos) {
  const { nombre, base, salida, fila } = contrato
  const original = leerRgba(new URL('public/dibujos/' + base, raiz))
  const fuente = leerRgba(new URL('origen/' + nombre + '-espalda.png', carpeta))
  const tira = { ancho: 768, alto: 256, datos: Buffer.alloc(768 * 256 * 4) }
  const cuadros = []
  // El apoyo y la altura coinciden con las vistas frontales aprobadas.
  const referencia = medirSilueta(recortar(original, 256, 0, 256, 256))
  const altura = referencia.maxY - referencia.minY + 1
  for (let c = 0; c < 3; c++) {
    // Las fuentes generadas pueden tener un píxel de diferencia entre columnas.
    // Se dividen por sus límites, sin deformar ni recortar la ilustración.
    const izquierda = Math.round(c * fuente.ancho / 3), derecha = Math.round((c + 1) * fuente.ancho / 3)
    const celda = recortar(fuente, izquierda, 0, derecha - izquierda, fuente.alto)
    const caja = medirSilueta(celda)
    const x = Math.max(0, caja.minX - 3), y = Math.max(0, caja.minY - 3)
    const recorte = recortar(celda, x, y, Math.min(celda.ancho - x, caja.maxX - x + 4), Math.min(celda.alto - y, caja.maxY - y + 4))
    const entrada = new URL(nombre + '-' + c + '-recorte.png', trabajo)
    const reducida = new URL(nombre + '-' + c + '-reducida.png', trabajo)
    guardarPng(entrada, recorte)
    let alto = Math.round(recorte.alto * altura / (caja.maxY - caja.minY + 1))
    let im, medida
    for (let intento = 0; intento < 5; intento++) {
      // Una escala isotrópica por pose: no se ensancha ni aplasta el dibujo.
      execFileSync('sips', ['--resampleHeight', String(alto), fileURLToPath(entrada), '--out', fileURLToPath(reducida)])
      im = leerRgba(reducida); medida = medirSilueta(im)
      const diferencia = altura - (medida.maxY - medida.minY + 1)
      if (!diferencia) break
      alto += diferencia
    }
    const dx = Math.round(128 - medida.centroCabeza), dy = 244 - medida.maxY
    if (medida.minX + dx < 2 || medida.maxX + dx > 253 || Math.abs(medida.minY + dy - referencia.minY) > 2) {
      throw new Error('La pose no cabe con sus anclas: ' + nombre + ' ' + c)
    }
    for (let py = 0; py < im.alto; py++) for (let px = 0; px < im.ancho; px++) {
      const tx = px + dx, ty = py + dy
      if (tx < 0 || tx >= 256 || ty < 0 || ty >= 256) continue
      im.datos.copy(tira.datos, (ty * 768 + c * 256 + tx) * 4, (py * im.ancho + px) * 4, (py * im.ancho + px + 1) * 4)
    }
    cuadros.push(medirSilueta(recortar(tira, c * 256, 0, 256, 256)))
  }
  const datos = Buffer.from(original.datos)
  tira.datos.copy(datos, fila * 256 * 768 * 4)
  const atlas = { ancho: original.ancho, alto: original.alto, datos }
  guardarPng(new URL('public/dibujos/' + salida, raiz), atlas)
  guardarPng(new URL(nombre + '-espalda-256.png', carpeta), tira)
  informe.push({ nombre, base, salida, fila_reemplazada: fila, cuadros,
    otras_filas_identicas: datos.subarray(0, fila * 256 * 768 * 4).equals(original.datos.subarray(0, fila * 256 * 768 * 4)) &&
      datos.subarray((fila + 1) * 256 * 768 * 4).equals(original.datos.subarray((fila + 1) * 256 * 768 * 4)) })
  console.log(nombre + ': ' + salida + ', solo cambia la fila ' + fila)
}
writeFileSync(new URL('alineacion.json', carpeta), JSON.stringify(informe, null, 2) + '\n')
