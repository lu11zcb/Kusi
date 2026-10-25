// Ayudas compartidas por las pruebas de la capa de vida del laberinto. Solo usan
// las flechas, el ratón y la lectura del estado, igual que un niño jugando.
import { readFile } from 'node:fs/promises'

const RUTA_PAQUETE = new URL('../../public/paquete-laberinto-ejemplo.json', import.meta.url)
export const leerPaquete = async () => JSON.parse(await readFile(RUTA_PAQUETE, 'utf8'))
export const estado = (pagina) => pagina.evaluate(() => window.kusi.estado())

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

export async function servirPaquete(pagina, paquete) {
  await pagina.route('**/paquete-laberinto-ejemplo.json', (ruta) => ruta.fulfill({ json: paquete }))
}

// Un pasillo recto con una fresa, un plátano y la puerta al final. Con «zorros»
// se añaden zorros que patrullan; el zorro no se mueve hasta que el niño elige
// su primer rumbo.
export async function servirPasillo(pagina, { zorros = [], objetos, regla, mapa } = {}) {
  const paquete = await leerPaquete()
  paquete.retos = [{
    ...paquete.retos[0],
    mapa: mapa ?? ['#############', '#C.........P#', '#############'],
    regla: regla ?? { tipo: 'orden', secuencia: ['fresa', 'platano'] },
    objetos: objetos ?? [{ tipo: 'fresa', fila: 1, columna: 2 }, { tipo: 'platano', fila: 1, columna: 10 }],
    enemigos: zorros.map((columna) => ({ tipo: 'zorro', fila: 1, columna, movimiento: 'patrulla' })),
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
