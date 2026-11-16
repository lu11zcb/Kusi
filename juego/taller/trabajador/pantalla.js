// La revisión de la pantalla por código: mira capturas del juego y dice, sin que nadie las vea, si el mundo se ve
// vacío, recortado o congelado. Son los defectos que antes se encontraban a simple vista y que el docente no tiene
// que revisar. Es lógica pura (recibe los píxeles); comprobar.js toma las capturas con el navegador.
//
// Una captura es { ancho, alto, datos } con los píxeles RGBA (4 bytes por píxel).
//
// Solo se rechaza lo que es seguro: una falsa alarma gasta una de las dos correcciones de un juego bueno.

// El color liso del lienzo del reproductor (main.js, backgroundColor #8fd0ef). Si se ve mucho en el centro, el mundo
// no llena la pantalla (una cámara recortada deja franjas de este color arriba y abajo).
export const COLOR_LIENZO = [0x8f, 0xd0, 0xef]
const TOLERANCIA_LIENZO = 3
// Más de esta parte del centro con el color liso del lienzo = bandas vacías. Medido en capturas reales: los juegos
// con el mundo completo dan 0 %; una franja azul abajo dio entre 6 y 9 %, y una cámara recortada, 34 %.
export const MAXIMO_LIENZO = 0.04
// Menos colores importantes que estos en el centro = un mundo liso, sin dibujos.
export const MINIMO_COLORES = 4
// Menos píxeles distintos que esta parte entre dos capturas = quieto.
export const MINIMO_CAMBIO = 0.0005
const CAMBIO_DE_CANAL = 24

// El centro de la pantalla: sin las esquinas donde están los botones de la interfaz y el joystick.
function centro({ ancho, alto }) {
  return { x0: Math.floor(ancho * 0.25), x1: Math.floor(ancho * 0.75), y0: Math.floor(alto * 0.2), y1: Math.floor(alto * 0.95) }
}

// Cuánto del centro es el color liso del lienzo y cuántos colores distintos (de verdad) tiene.
export function medirCaptura(captura) {
  const { ancho, datos } = captura
  const { x0, x1, y0, y1 } = centro(captura)
  let total = 0
  let lienzo = 0
  const grupos = new Map()
  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      const i = (y * ancho + x) * 4
      const r = datos[i]
      const g = datos[i + 1]
      const b = datos[i + 2]
      total += 1
      if (Math.abs(r - COLOR_LIENZO[0]) <= TOLERANCIA_LIENZO && Math.abs(g - COLOR_LIENZO[1]) <= TOLERANCIA_LIENZO && Math.abs(b - COLOR_LIENZO[2]) <= TOLERANCIA_LIENZO) lienzo += 1
      // Cada canal en 16 niveles: los degradados suaves cuentan como un solo color.
      const clave = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4)
      grupos.set(clave, (grupos.get(clave) ?? 0) + 1)
    }
  }
  const importantes = [...grupos.values()].filter((cuenta) => cuenta / total >= 0.005).length
  return { lienzo: total ? lienzo / total : 0, colores: importantes }
}

// Qué parte del centro cambió entre dos capturas.
export function cambioEntre(a, b) {
  if (a.ancho !== b.ancho || a.alto !== b.alto) return 1
  const { x0, x1, y0, y1 } = centro(a)
  let total = 0
  let distintos = 0
  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      const i = (y * a.ancho + x) * 4
      total += 1
      if (Math.abs(a.datos[i] - b.datos[i]) > CAMBIO_DE_CANAL || Math.abs(a.datos[i + 1] - b.datos[i + 1]) > CAMBIO_DE_CANAL ||
          Math.abs(a.datos[i + 2] - b.datos[i + 2]) > CAMBIO_DE_CANAL) distintos += 1
    }
  }
  return total ? distintos / total : 0
}

// Los motivos (en español, para el supervisor) de un juego cuya pantalla no está bien. Recibe tres capturas:
// «inicio», «reposo» (un momento después, sin tocar nada) y «conFlechas» (después de mover el joystick).
export function motivosDePantalla({ inicio, reposo, conFlechas }) {
  const motivos = []
  const medida = medirCaptura(inicio)
  if (medida.lienzo > MAXIMO_LIENZO) {
    motivos.push('El mundo no llena la pantalla: el ' + Math.round(medida.lienzo * 100) + ' % del centro es el color liso del lienzo (franjas vacías arriba o abajo). ' +
      'No recortes la cámara (setViewport ni una cámara extra): el mundo llena toda la pantalla y la interfaz flota encima (reglas.md, 13.17).')
  } else if (medida.colores < MINIMO_COLORES) {
    motivos.push('El mundo se ve liso y vacío: casi no hay colores ni dibujos en el centro de la pantalla. Rellénalo con suelo trabajado y decorado (reglas.md, 13.13 y 13.22).')
  }
  if (reposo && conFlechas && cambioEntre(inicio, reposo) < MINIMO_CAMBIO && cambioEntre(reposo, conFlechas) < MINIMO_CAMBIO) {
    motivos.push('El juego se ve congelado: no cambia nada en pantalla ni solo ni al mover el joystick (flechas). Comprueba que la escena se actualiza, que se mueve con los controles del kit y que el mundo tiene vida (reglas.md, 13.16 y 13.22).')
  }
  return motivos
}
