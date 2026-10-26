// Evidencia visual del juego real. Ejecutar con Vite en http://127.0.0.1:5174/ :
//   node herramientas/capturar_hu46.mjs
// Toma los tres niveles en un monitor de 1280 x 720 y en un celular horizontal
// táctil de 800 x 360, con la capa de vida y con ?vida=0, y anota cuánto mide
// de verdad cada casilla en la pantalla.
import { chromium } from 'playwright'
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const destino = new URL('../evidencias/hu46-profundidad/', import.meta.url)
await mkdir(destino, { recursive: true })
const PANTALLAS = [{ width: 1280, height: 720 }, { width: 800, height: 360 }]
const NIVELES = [1, 2, 3]
const navegador = await chromium.launch({ headless: true })
const medidas = []
try {
  for (const pantalla of PANTALLAS) {
    const tactil = pantalla.width === 800
    for (const nivel of NIVELES) {
      for (const vida of [true, false]) {
        const contexto = await navegador.newContext({
          viewport: pantalla, hasTouch: tactil, isMobile: tactil, deviceScaleFactor: 1,
        })
        const pagina = await contexto.newPage()
        const errores = []
        pagina.on('pageerror', (error) => errores.push(error.message))
        await pagina.goto('http://127.0.0.1:5174/?paquete=laberinto&nivel=' + nivel + (vida ? '' : '&vida=0'))
        await pagina.waitForFunction(() => window.kusi?.listo && window.kusi.estado().familia === 'laberinto')
        // El primer nivel enseña una mano que apunta a la fruta; se quita con la
        // primera tecla para ver el tablero limpio. Los otros niveles no la tienen
        // y el zorro se queda en su sitio hasta que el niño elige un rumbo.
        if (nivel === 1) await pagina.keyboard.press('ArrowLeft')
        await pagina.waitForTimeout(450)
        const archivo = 'nivel' + nivel + '-' + pantalla.width + 'x' + pantalla.height + (vida ? '' : '-sin-vida') + '.png'
        await pagina.screenshot({ path: fileURLToPath(new URL(archivo, destino)) })
        const estado = await pagina.evaluate(() => window.kusi.estado())
        medidas.push({
          archivo, nivel, pantalla, tactil, vida,
          lienzo: estado.pantalla.renderizador.activo,
          casillaFisica: Math.round(estado.casilla * estado.pantalla.escala * 10) / 10,
          casilla: estado.casilla, origenMapa: estado.origenMapa, errores,
        })
        await contexto.close()
      }
    }
  }
  await writeFile(new URL('medidas.json', destino), JSON.stringify(medidas, null, 2) + '\n')
  for (const medida of medidas) {
    console.log(medida.archivo + ': casilla de ' + medida.casillaFisica + ' px' +
      (medida.errores.length ? ', ERRORES ' + medida.errores.join(' | ') : ''))
  }
} finally {
  await navegador.close()
}
