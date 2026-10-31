// Se mide el texto real de Phaser. El globo crece hacia arriba en su columna.
export function encajarTextoKusi(texto, globo) {
  const margen = { izquierda: 32, derecha: 24, arriba: 24, abajo: 25 }
  const ancho = globo.ancho - margen.izquierda - margen.derecha
  const maximo = globo.altoMaximo ?? 304
  texto.setOrigin(0, 0).setWordWrapWidth(ancho, true).setFontSize(24)
  for (let size = 23; texto.height > maximo - margen.arriba - margen.abajo && size >= 20; size -= 1) texto.setFontSize(size)
  const necesario = texto.height + margen.arriba + margen.abajo
  const alto = [160, 232, 304].find(h => h >= necesario) ?? maximo
  const y = (globo.bordeInferior ?? globo.y + globo.alto) - alto
  texto.setPosition(globo.x + margen.izquierda, y + margen.arriba)
  return { alto, y, texto: { x: texto.x, y: texto.y, ancho: texto.width, alto: texto.height },
    interior: { x: globo.x + margen.izquierda, y: y + margen.arriba, ancho, alto: alto - margen.arriba - margen.abajo } }
}
