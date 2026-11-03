// Ayudas compartidas por las pruebas de la capa de vida del laberinto. Solo usan
// las flechas, el ratón y la lectura del estado, igual que un niño jugando.
import { readFile } from 'node:fs/promises'

const RUTA_PAQUETE = new URL('../../kit/recursos/paquete-laberinto-ejemplo.json', import.meta.url)
export const leerPaquete = async () => JSON.parse(await readFile(RUTA_PAQUETE, 'utf8'))
export const estado = (pagina) => pagina.evaluate(() => window.kusi.estado())

// La escena publica la transformación real de cámara. EXPAND puede añadir
// espacio alrededor del mundo de 1280 × 720; dividir por ese tamaño ya no basta.
export async function puntoEnLienzo(pagina, x, y) {
  return pagina.evaluate(({ x, y }) => {
    if (window.kusi?.proyectar) return window.kusi.proyectar(x, y)
    // La pantalla de error del paquete conserva el lienzo de carga y sus botones.
    const lienzo = document.querySelector('canvas').getBoundingClientRect()
    return { x: lienzo.left + x * lienzo.width / 1280, y: lienzo.top + y * lienzo.height / 720 }
  }, { x, y })
}

export function seSuperponen(a, b) {
  return a.x < b.x + b.ancho && a.x + a.ancho > b.x &&
    a.y < b.y + b.alto && a.y + a.alto > b.y
}

// Abre el laberinto real; «parametros» añade, por ejemplo, '&vida=0' o '&rapido=1'.
export async function abrir(pagina, parametros = '') {
  await pagina.goto('/?paquete=laberinto' + parametros)
  await pagina.waitForFunction(() => window.kusi?.listo && window.kusi.estado().familia === 'laberinto')
  return estado(pagina)
}

export async function esperarCasilla(pagina, fila, columna) {
  await pagina.waitForFunction(({ fila, columna }) => {
    const movimiento = window.kusi.estado().movimiento
    return movimiento.fila === fila && movimiento.columna === columna && !movimiento.moviendose
  }, { fila, columna })
  return estado(pagina)
}

// Mantiene un rumbo real con el ratón y suelta dentro del último tramo. La
// prueba decide cada segmento; no se añade ningún atajo al control del juego.
export async function avanzarConJoystick(pagina, direccion, casillas = 1) {
  const inicial = await estado(pagina)
  const inicio = inicial.movimiento
  const punto = await pagina.evaluate(() => { const c=window.kusi.estado().joystick.centro; return window.kusi.proyectar(c.x,c.y) })
  const pasos = { derecha: [0, 1], izquierda: [0, -1], abajo: [1, 0], arriba: [-1, 0] }
  const [fila, columna] = pasos[direccion]
  await pagina.mouse.move(punto.x, punto.y)
  await pagina.mouse.down()
  await pagina.mouse.move(punto.x + columna * 45, punto.y + fila * 45)
  try {
    await pagina.waitForFunction(({ inicio, fila, columna, casillas }) => {
      const m = window.kusi.estado().movimiento
      const avance = (m.fila - inicio.fila) * fila + (m.columna - inicio.columna) * columna + m.progreso
      return avance >= casillas - 0.7
    }, { inicio, fila, columna, casillas })
  } finally {
    await pagina.mouse.up()
  }
  return esperarCasilla(pagina, inicio.fila + fila * casillas, inicio.columna + columna * casillas)
}

export async function servirPaquete(pagina, paquete) {
  await pagina.route('**/paquete-laberinto-ejemplo.json', (ruta) => ruta.fulfill({ json: paquete }))
}

// Un pasillo recto con una fresa, un plátano y la puerta al final. Con «zorros»
// se añaden zorros que patrullan desde que el nivel aparece.
export async function servirPasillo(pagina, { zorros = [], objetos, regla, mapa, movimientoZorro = 'patrulla' } = {}) {
  const paquete = await leerPaquete()
  paquete.retos = [{
    ...paquete.retos[0],
    mapa: mapa ?? ['#############', '#C.........P#', '#############'],
    regla: regla ?? { tipo: 'orden', secuencia: ['fresa', 'platano'] },
    objetos: objetos ?? [{ tipo: 'fresa', fila: 1, columna: 2 }, { tipo: 'platano', fila: 1, columna: 10 }],
    enemigos: zorros.map((columna) => ({ tipo: 'zorro', fila: 1, columna, movimiento: movimientoZorro })),
  }]
  await servirPaquete(pagina, paquete)
  return paquete
}

// Toma una muestra del estado en cada cuadro de dibujo durante «milisegundos» y
// devuelve lo que «leer» extrae de cada una. «leer» se escribe como una función
// de flecha que recibe el estado completo; se envía al navegador como texto.
export async function muestrear(pagina, milisegundos, leer) {
  return pagina.evaluate(({ milisegundos, texto }) => new Promise((resolver) => {
    const extraer = new Function('estado', 'return (' + texto + ')(estado)')
    const muestras = []
    const fin = performance.now() + milisegundos
    const paso = () => {
      muestras.push(extraer(window.kusi.estado()))
      if (performance.now() < fin) requestAnimationFrame(paso)
      else resolver(muestras)
    }
    paso()
  }), { milisegundos, texto: leer.toString() })
}
