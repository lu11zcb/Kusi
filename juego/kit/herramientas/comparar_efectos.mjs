// Toma el mismo momento de cada efecto de la capa de vida con Canvas y con AUTO
// (WebGL) y los pone uno junto al otro para mirarlos. Ejecutar con Vite en
// http://127.0.0.1:5174/ :
//   node herramientas/comparar_efectos.mjs [carpeta de salida]
// Deja una imagen por efecto (comparacion-<efecto>.png): arriba Canvas y abajo AUTO.
// Los cuadros se copian dentro de la página justo después de que Phaser dibuja,
// así que cada toma es el cuadro exacto y no depende de lo que tarde una captura.
import { chromium } from 'playwright'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const BASE = 'http://127.0.0.1:5174/'
const ESCALA = 2
const carpeta = process.argv[2]
  ?? fileURLToPath(new URL('../../evidencias/hu46-profundidad/canvas-contra-auto/', import.meta.url))
await mkdir(carpeta, { recursive: true })
const paqueteOriginal = JSON.parse(await readFile(new URL('../recursos/paquete-laberinto-ejemplo.json', import.meta.url), 'utf8'))

// Un pasillo con lo que pida cada momento: frutas, zorros y la puerta al final.
function pasillo({ objetos, regla, zorros = [] }) {
  const paquete = structuredClone(paqueteOriginal)
  paquete.retos = [{
    ...paquete.retos[0],
    mapa: ['#############', '#C.........P#', '#############'],
    objetos, regla,
    enemigos: zorros.map((columna) => ({ tipo: 'zorro', fila: 1, columna, movimiento: 'patrulla' })),
  }]
  return paquete
}

const estado = (pagina) => pagina.evaluate(() => window.kusi.estado())

async function abrir(navegador, renderizador, paquete) {
  // Con 1280 x 720 el mundo y el lienzo coinciden: un punto del juego es un punto del lienzo.
  const contexto = await navegador.newContext({ viewport: { width: 1280, height: 720 } })
  const pagina = await contexto.newPage()
  await pagina.route('**/paquete-laberinto-ejemplo.json', (ruta) => ruta.fulfill({ json: paquete }))
  await pagina.goto(BASE + '?paquete=laberinto&renderizador=' + renderizador)
  await pagina.waitForFunction(() => window.kusi?.listo && window.kusi.estado().familia === 'laberinto')
  return { contexto, pagina }
}

// Caja alrededor de un punto del juego, sin salirse del lienzo.
const caja = (x, y, ancho = 340, alto = 250) => ({
  x: Math.round(Math.max(0, Math.min(1280 - ancho, x - ancho / 2))),
  y: Math.round(Math.max(0, Math.min(720 - alto, y - alto * 0.62))), ancho, alto,
})

// Espera, dentro de la página, a que «condicion» se cumpla y copia el lienzo
// «desfases» milisegundos después, siempre tras el dibujo del cuadro. «accion»
// (una tecla, por ejemplo) se ejecuta con la espera ya puesta.
async function capturar(pagina, accion, { condicion, desfases, zona }) {
  const espera = pagina.evaluate(({ texto, desfases, zona, escala }) => new Promise((resolver, rechazar) => {
    const cumple = new Function('e', 'return (' + texto + ')(e)')
    const lienzo = document.querySelector('canvas')
    const original = window.requestAnimationFrame
    const tomas = []
    let inicio = null
    const terminar = (error, resultado) => {
      window.requestAnimationFrame = original
      if (error) rechazar(error)
      else resolver(resultado)
    }
    const limite = setTimeout(() => terminar(new Error('No ocurrió: ' + texto)), 15000)
    window.requestAnimationFrame = (devolucion) => original((tiempo) => {
      devolucion(tiempo)
      const ahora = performance.now()
      if (inicio === null && cumple(window.kusi.estado())) inicio = ahora
      if (inicio === null) return
      while (tomas.length < desfases.length && ahora - inicio >= desfases[tomas.length]) {
        const hoja = document.createElement('canvas')
        hoja.width = zona.ancho * escala
        hoja.height = zona.alto * escala
        const dibujo = hoja.getContext('2d')
        dibujo.imageSmoothingQuality = 'high'
        dibujo.drawImage(lienzo, zona.x, zona.y, zona.ancho, zona.alto, 0, 0, hoja.width, hoja.height)
        tomas.push(hoja.toDataURL('image/png'))
      }
      if (tomas.length === desfases.length) {
        clearTimeout(limite)
        terminar(null, tomas)
      }
    })
  }), { texto: condicion.toString(), desfases, zona, escala: ESCALA })
  if (accion) await accion()
  return (await espera).map((url) => Buffer.from(url.split(',')[1], 'base64'))
}

// Cada efecto devuelve su lista de tomas (buffers PNG).
const efectos = {
  quieto: async (navegador, renderizador) => {
    const { contexto, pagina } = await abrir(navegador, renderizador, pasillo({
      objetos: [{ tipo: 'fresa', fila: 1, columna: 6 }], regla: { tipo: 'orden', secuencia: ['fresa'] },
    }))
    const e = await estado(pagina)
    const tomas = await capturar(pagina, null, {
      condicion: () => true, desfases: [1300], zona: caja(e.cuyX, e.cuyY, 340, 250),
    })
    await contexto.close()
    return tomas
  },
  parpadeo: async (navegador, renderizador) => {
    const { contexto, pagina } = await abrir(navegador, renderizador, pasillo({
      objetos: [{ tipo: 'fresa', fila: 1, columna: 6 }], regla: { tipo: 'orden', secuencia: ['fresa'] },
    }))
    const e = await estado(pagina)
    const tomas = await capturar(pagina, null, {
      condicion: (estado) => estado.animacionCuy.fotograma >= 16, desfases: [0],
      zona: caja(e.cuyX, e.cuyY, 220, 200),
    })
    await contexto.close()
    return tomas
  },
  caminando: async (navegador, renderizador) => {
    const { contexto, pagina } = await abrir(navegador, renderizador, pasillo({
      objetos: [{ tipo: 'fresa', fila: 1, columna: 10 }], regla: { tipo: 'orden', secuencia: ['fresa'] },
    }))
    const e = await estado(pagina)
    const tomas = await capturar(pagina, () => pagina.keyboard.press('ArrowRight'), {
      condicion: (estado) => estado.movimiento.moviendose, desfases: [700, 810, 920],
      zona: caja(e.cuyX + 200, e.cuyY, 300, 200),
    })
    await contexto.close()
    return tomas
  },
  comiendo: async (navegador, renderizador) => {
    const { contexto, pagina } = await abrir(navegador, renderizador, pasillo({
      objetos: [{ tipo: 'fresa', fila: 1, columna: 5 }], regla: { tipo: 'orden', secuencia: ['fresa'] },
    }))
    const fruta = (await estado(pagina)).vida.frutas[0]
    const tomas = await capturar(pagina, () => pagina.keyboard.press('ArrowRight'), {
      condicion: (estado) => estado.regla.recogidos >= 1, desfases: [60, 200, 340],
      zona: caja(fruta.x, fruta.y, 300, 220),
    })
    await contexto.close()
    return tomas
  },
  atrapado: async (navegador, renderizador) => {
    const { contexto, pagina } = await abrir(navegador, renderizador, pasillo({
      objetos: [{ tipo: 'fresa', fila: 1, columna: 6 }, { tipo: 'platano', fila: 1, columna: 10 }],
      regla: { tipo: 'orden', secuencia: ['fresa', 'platano'] }, zorros: [3],
    }))
    const zona = { x: 0, y: 150, ancho: 1280, alto: 330 }
    const congelado = await capturar(pagina, () => pagina.keyboard.press('ArrowRight'), {
      condicion: (estado) => estado.vida.captura.congelado, desfases: [0, 180], zona,
    })
    const asustado = await capturar(pagina, null, {
      condicion: (estado) => estado.capturas >= 1, desfases: [250], zona,
    })
    await contexto.close()
    return [...congelado, ...asustado]
  },
  puerta: async (navegador, renderizador) => {
    const { contexto, pagina } = await abrir(navegador, renderizador, pasillo({
      objetos: [{ tipo: 'fresa', fila: 1, columna: 3 }], regla: { tipo: 'orden', secuencia: ['fresa'] },
    }))
    const puerta = (await estado(pagina)).vida.puerta
    const tomas = await capturar(pagina, () => pagina.keyboard.press('ArrowRight'), {
      condicion: (estado) => estado.puertaAbierta, desfases: [80, 260, 440],
      zona: caja(puerta.base.x, puerta.base.y, 300, 260),
    })
    await contexto.close()
    return tomas
  },
}

// El temblor de la pantalla mide pocos píxeles y no se aprecia en una foto: se
// compara cuánto se corrió de verdad la barra de arriba en cada cuadro del temblor
// con lo que declara la cámara. Devuelve el mayor error, en píxeles.
async function medirTemblor(navegador, renderizador) {
  const { contexto, pagina } = await abrir(navegador, renderizador, pasillo({
    objetos: [{ tipo: 'fresa', fila: 1, columna: 6 }, { tipo: 'platano', fila: 1, columna: 10 }],
    regla: { tipo: 'orden', secuencia: ['fresa', 'platano'] }, zorros: [3],
  }))
  const espera = pagina.evaluate(() => new Promise((resolver, rechazar) => {
    const zona = { x: 24, y: 14, ancho: 460, alto: 62 }
    const lienzo = document.querySelector('canvas')
    const original = window.requestAnimationFrame
    const leerGris = () => {
      const hoja = document.createElement('canvas')
      hoja.width = zona.ancho
      hoja.height = zona.alto
      const dibujo = hoja.getContext('2d', { willReadFrequently: true })
      dibujo.drawImage(lienzo, zona.x, zona.y, zona.ancho, zona.alto, 0, 0, zona.ancho, zona.alto)
      const { data } = dibujo.getImageData(0, 0, zona.ancho, zona.alto)
      const gris = new Float32Array(zona.ancho * zona.alto)
      for (let i = 0; i < gris.length; i += 1) gris[i] = (data[i * 4] + data[i * 4 + 1] + data[i * 4 + 2]) / 3
      return gris
    }
    // Cuánto hay que correr el cuadro de reposo para que se parezca al del temblor.
    const mejorCorrimiento = (cuadro, reposo) => {
      let mejor = { x: 0, y: 0, error: Infinity }
      for (let dy = -6; dy <= 6; dy += 1) {
        for (let dx = -6; dx <= 6; dx += 1) {
          let suma = 0
          let cuenta = 0
          for (let y = 8; y < zona.alto - 8; y += 1) {
            for (let x = 8; x < zona.ancho - 8; x += 1) {
              suma += Math.abs(cuadro[y * zona.ancho + x] - reposo[(y - dy) * zona.ancho + (x - dx)])
              cuenta += 1
            }
          }
          if (suma / cuenta < mejor.error) mejor = { x: dx, y: dy, error: suma / cuenta }
        }
      }
      return mejor
    }
    const tomas = []
    let fin = null
    const limite = setTimeout(() => {
      window.requestAnimationFrame = original
      rechazar(new Error('El temblor no ocurrió'))
    }, 15000)
    window.requestAnimationFrame = (devolucion) => original((tiempo) => {
      devolucion(tiempo)
      const captura = window.kusi.estado().vida.captura
      if (captura.temblando) {
        tomas.push({ x: captura.camara.scrollX, y: captura.camara.scrollY, gris: leerGris() })
      } else if (tomas.length > 0) {
        fin ??= tiempo
        if (tiempo - fin < 200) return
        clearTimeout(limite)
        window.requestAnimationFrame = original
        const reposo = { x: captura.camara.scrollX, y: captura.camara.scrollY, gris: leerGris() }
        const medidas = tomas.map((toma) => ({
          // La cámara se corre hacia un lado y lo que se ve se corre hacia el otro.
          esperadoX: -(toma.x - reposo.x), esperadoY: -(toma.y - reposo.y),
          medido: mejorCorrimiento(toma.gris, reposo.gris),
        })).filter((medida) => Math.abs(medida.esperadoX) >= 1 || Math.abs(medida.esperadoY) >= 1)
        resolver(medidas.map((medida) => ({
          esperadoX: medida.esperadoX, esperadoY: medida.esperadoY, medidoX: medida.medido.x, medidoY: medida.medido.y,
        })))
      }
    })
  }))
  await pagina.keyboard.press('ArrowRight')
  const medidas = await espera
  await contexto.close()
  const error = Math.max(0, ...medidas.map((medida) =>
    Math.max(Math.abs(medida.esperadoX - medida.medidoX), Math.abs(medida.esperadoY - medida.medidoY))))
  return { cuadros: medidas.length, error, ejemplo: medidas.slice(0, 4) }
}

// Una hoja con dos filas (Canvas arriba, AUTO abajo) que se fotografía con el mismo navegador.
async function componer(navegador, nombre, porRenderizador) {
  const fila = (etiqueta, tomas) => '<div class="fila"><b>' + etiqueta + '</b>' +
    tomas.map((toma) => '<img src="data:image/png;base64,' + toma.toString('base64') + '">').join('') + '</div>'
  const pagina = await navegador.newPage({ viewport: { width: 1900, height: 600 } })
  await pagina.setContent('<style>body{margin:0;background:#222;color:#fff;font:16px sans-serif}' +
    '.fila{display:flex;align-items:center;gap:8px;padding:6px}b{width:70px}img{max-width:600px}</style>' +
    fila('Canvas', porRenderizador.canvas) + fila('AUTO', porRenderizador.auto))
  await pagina.waitForLoadState('load')
  const destino = path.join(carpeta, 'comparacion-' + nombre + '.png')
  await pagina.screenshot({ path: destino, fullPage: true })
  await pagina.close()
  return destino
}

const navegador = await chromium.launch()
try {
  for (const [nombre, tomar] of Object.entries(efectos)) {
    const porRenderizador = {}
    for (const renderizador of ['canvas', 'auto']) porRenderizador[renderizador] = await tomar(navegador, renderizador)
    console.log(await componer(navegador, nombre, porRenderizador))
  }
  for (const renderizador of ['canvas', 'auto']) {
    const temblor = await medirTemblor(navegador, renderizador)
    console.log('temblor con ' + renderizador + ': ' + temblor.cuadros + ' cuadros medidos, error mayor ' +
      temblor.error + ' px; por ejemplo ' + JSON.stringify(temblor.ejemplo))
  }
  await writeFile(path.join(carpeta, 'LEEME.txt'),
    'Cada comparacion-<efecto>.png muestra el mismo momento con Canvas (arriba) y con AUTO (abajo).\n')
} finally {
  await navegador.close()
}
