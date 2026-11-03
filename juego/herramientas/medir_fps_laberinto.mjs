// Mide los cuadros por segundo del laberinto con Canvas y con AUTO (WebGL) en la
// misma partida. Ejecutar con Vite en http://127.0.0.1:5174/ :
//   node herramientas/medir_fps_laberinto.mjs [segundos] [--sin-gpu] [--ventana] [--con-vsync]
// --sin-gpu apaga la aceleración del navegador (como un equipo sin tarjeta gráfica)
// y --ventana abre una ventana de verdad en lugar de trabajar sin pantalla.
// Por defecto se quita el límite de 60 cuadros: el número que sale es lo que aguanta
// el equipo, no lo que la pantalla alcanza a mostrar, y por eso sirve para comparar.
// Con --con-vsync se conserva el límite de la pantalla: sirve para ver si cada
// lienzo mantiene un ritmo parejo (qué porcentaje de cuadros tarda más de 25 ms).
import { chromium } from 'playwright'
import { mkdir, writeFile } from 'node:fs/promises'

const BASE = 'http://127.0.0.1:5174/'
const SEGUNDOS = Number(process.argv.find((argumento) => /^\d+$/.test(argumento)) ?? 8)
const SIN_GPU = process.argv.includes('--sin-gpu')
const CON_VENTANA = process.argv.includes('--ventana')
const CON_VSYNC = process.argv.includes('--con-vsync')
// Un cuadro que tarda más de esto ya se nota como un tirón.
const MILISEGUNDOS_LENTOS = 25
const SEGUNDOS_DE_CALENTAMIENTO = 2
const MILISEGUNDOS_ENTRE_TECLAS = 260

const PANTALLAS = [
  { nombre: '1280x720', viewport: { width: 1280, height: 720 }, tactil: false },
  { nombre: '800x360 táctil', viewport: { width: 800, height: 360 }, tactil: true },
]
// Quieto: respiración, parpadeo y frutas flotando. Caminando: además rebote,
// polvito y pisadas. El nivel 2 suma un zorro que persigue.
const ESCENARIOS = [
  { nombre: 'quieto, nivel 1', nivel: 1, caminar: false },
  { nombre: 'caminando, nivel 1', nivel: 1, caminar: true },
  { nombre: 'caminando con zorro, nivel 2', nivel: 2, caminar: true },
]
const RENDERIZADORES = ['canvas', 'auto']
const TECLAS = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp']

const percentil = (ordenados, fraccion) =>
  ordenados[Math.min(ordenados.length - 1, Math.floor(ordenados.length * fraccion))]

async function medir(navegador, pantalla, escenario, renderizador) {
  const contexto = await navegador.newContext({
    viewport: pantalla.viewport, hasTouch: pantalla.tactil, isMobile: pantalla.tactil, deviceScaleFactor: 1,
  })
  const pagina = await contexto.newPage()
  const errores = []
  pagina.on('pageerror', (error) => errores.push(error.message))
  await pagina.goto(BASE + '?paquete=laberinto&nivel=' + escenario.nivel + '&renderizador=' + renderizador)
  await pagina.waitForFunction(() => window.kusi?.listo && window.kusi.estado().familia === 'laberinto')
  const lienzo = await pagina.evaluate(() => window.kusi.estado().pantalla.renderizador)

  const caminar = async (milisegundos) => {
    const fin = Date.now() + milisegundos
    let vuelta = 0
    while (Date.now() < fin) {
      if (escenario.caminar) await pagina.keyboard.press(TECLAS[vuelta++ % TECLAS.length])
      await pagina.waitForTimeout(MILISEGUNDOS_ENTRE_TECLAS)
    }
  }
  await caminar(SEGUNDOS_DE_CALENTAMIENTO * 1000)
  await pagina.evaluate(() => {
    const medida = window.medidaDeCuadros = { intervalos: [], ultimo: 0, activa: true }
    const paso = (tiempo) => {
      if (!medida.activa) return
      if (medida.ultimo) medida.intervalos.push(tiempo - medida.ultimo)
      medida.ultimo = tiempo
      requestAnimationFrame(paso)
    }
    requestAnimationFrame(paso)
  })
  await caminar(SEGUNDOS * 1000)
  const intervalos = await pagina.evaluate(() => {
    window.medidaDeCuadros.activa = false
    return window.medidaDeCuadros.intervalos
  })
  await contexto.close()

  const ordenados = [...intervalos].sort((a, b) => a - b)
  const media = intervalos.reduce((suma, valor) => suma + valor, 0) / intervalos.length
  return {
    pantalla: pantalla.nombre, escenario: escenario.nombre, pedido: renderizador, lienzo,
    cuadros: intervalos.length, fps: 1000 / media, mediana: 1000 / percentil(ordenados, 0.5),
    // El 1 % de los cuadros más lentos: lo que se siente como tirones.
    fpsPeores: 1000 / percentil(ordenados, 0.99), milisegundosMedios: media, errores,
    porcentajeLentos: 100 * intervalos.filter((milisegundos) => milisegundos > MILISEGUNDOS_LENTOS).length / intervalos.length,
  }
}

const navegador = await chromium.launch({
  headless: !CON_VENTANA,
  args: [...(CON_VSYNC ? [] : ['--disable-frame-rate-limit', '--disable-gpu-vsync']), ...(SIN_GPU ? ['--disable-gpu'] : [])],
})
const resultados = []
try {
  const sonda = await navegador.newPage()
  const aceleracion = await sonda.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl')
    const info = gl?.getExtension('WEBGL_debug_renderer_info')
    return info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : 'sin WebGL'
  })
  console.log('Navegador: Chromium ' + navegador.version() + (CON_VENTANA ? ' con ventana' : ' sin pantalla') +
    (SIN_GPU ? ', sin GPU' : '') + (CON_VSYNC ? ', con sincronía vertical' : '') + '\nWebGL dibuja con: ' + aceleracion + '\n' + SEGUNDOS + ' s por medida\n')
  await sonda.close()
  for (const pantalla of PANTALLAS) {
    for (const escenario of ESCENARIOS) {
      for (const renderizador of RENDERIZADORES) {
        const resultado = await medir(navegador, pantalla, escenario, renderizador)
        resultados.push(resultado)
        console.log([pantalla.nombre, escenario.nombre, renderizador + ' → ' + resultado.lienzo.activo,
          resultado.fps.toFixed(1) + ' fps', 'peores ' + resultado.fpsPeores.toFixed(1) + ' fps',
          resultado.porcentajeLentos.toFixed(1) + ' % de cuadros lentos',
          resultado.errores.length ? 'ERRORES ' + resultado.errores.join(' | ') : ''].join(' | '))
      }
    }
  }
  const sufijo = (SIN_GPU ? 'sin-gpu' : CON_VENTANA ? 'ventana' : 'normal') + (CON_VSYNC ? '-vsync' : '')
  const destino = new URL('../evidencias/hu46-profundidad/', import.meta.url)
  await mkdir(destino, { recursive: true })
  await writeFile(new URL('fps-' + sufijo + '.json', destino),
    JSON.stringify({ navegador: navegador.version(), aceleracion, segundos: SEGUNDOS, resultados }, null, 2) + '\n')
} finally {
  await navegador.close()
}
