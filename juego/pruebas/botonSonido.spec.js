import { test, expect } from '@playwright/test'
import { BOTON_SONIDO } from '../src/interfaz/BotonSonido.js'
import { abrir, estado, servirPaquete, servirPasillo, leerPaquete } from './ayudas/laberinto.js'

async function tocarAltavoz(pagina) {
  const punto = await pagina.evaluate(() => window.kusi.ubicar('altavoz'))
  expect(punto).not.toBeNull()
  await pagina.mouse.click(punto.x, punto.y)
}

const sonidos = async (pagina) => (await estado(pagina)).vida.sonidos

// Tres niveles diminutos, cada uno con una fruta y la puerta, para pasar de nivel rápido.
async function servirTresNivelesCortos(pagina) {
  const paquete = await leerPaquete()
  paquete.retos = paquete.retos.map((reto, indice) => ({
    ...reto,
    mapa: ['#######', '#C...P#', '#######'],
    enemigos: [],
    objetos: [{ tipo: indice === 1 ? 'mango' : 'fresa', fila: 1, columna: 2 }],
    regla: indice === 2 ? { tipo: 'solo_clase', clase: 'fruta', meta: 1 }
      : { tipo: 'orden', secuencia: [indice === 1 ? 'mango' : 'fresa'] },
  }))
  await servirPaquete(pagina, paquete)
}

// El altavoz no debe pisar el mapa jugable, la barra de arriba ni las instrucciones
// de abajo, ni siquiera con el mapa más ancho que cabe en pantalla.
function comprobarQueNoPisaNada(nivel) {
  const boton = nivel.vida.botonSonido
  expect(boton).toMatchObject({ silenciado: false, ancho: BOTON_SONIDO.ancho, alto: BOTON_SONIDO.alto })
  const caja = {
    izquierda: boton.x - boton.ancho / 2, derecha: boton.x + boton.ancho / 2,
    arriba: boton.y - boton.alto / 2, abajo: boton.y + boton.alto / 2,
  }
  expect(caja.derecha).toBeLessThanOrEqual(1280)
  expect(caja.abajo).toBeLessThanOrEqual(720)
  const casillas = {
    izquierda: nivel.origenMapa.x, arriba: nivel.origenMapa.y,
    derecha: nivel.origenMapa.x + nivel.mapa[0].length * nivel.casilla,
    abajo: nivel.origenMapa.y + nivel.mapa.length * nivel.casilla,
  }
  const separados = caja.izquierda >= casillas.derecha || caja.arriba >= casillas.abajo ||
    caja.derecha <= casillas.izquierda || caja.abajo <= casillas.arriba
  expect(separados).toBe(true)
  // La barra de arriba termina en y=132 y las instrucciones de abajo, en x=1070.
  expect(caja.arriba).toBeGreaterThan(132)
  expect(caja.izquierda).toBeGreaterThan(1075)
}

test('el altavoz está en la esquina de abajo, sin pisar el mapa, la barra ni las instrucciones', async ({ page: pagina }) => {
  comprobarQueNoPisaNada(await abrir(pagina))
  // Un mapa de 16 × 8, el más ancho y alto que cabe, es el caso con menos espacio libre.
  const ancho = await pagina.context().newPage()
  await servirPasillo(ancho, {
    mapa: [
      '################', '#C............P#', '#..............#', '#..............#',
      '#..............#', '#..............#', '#..............#', '################',
    ],
    objetos: [{ tipo: 'fresa', fila: 1, columna: 5 }], regla: { tipo: 'orden', secuencia: ['fresa'] },
  })
  comprobarQueNoPisaNada(await abrir(ancho))
  // Los botones de la barra siguen donde estaban.
  expect(await pagina.evaluate(() => window.kusi.ubicar('sonido'))).not.toBeNull()
  expect(await pagina.evaluate(() => window.kusi.ubicar('ayuda'))).not.toBeNull()
})

test('tocar el altavoz apaga todos los sonidos y volver a tocarlo los enciende', async ({ page: pagina }) => {
  await abrir(pagina)
  // La primera tecla permite que el navegador deje sonar; el cuy camina y suenan pasos y frutas.
  await pagina.keyboard.press('ArrowRight')
  await pagina.waitForFunction(() => window.kusi.estado().vida.sonidos.reproducciones.paso_cuy >= 2)
  expect((await sonidos(pagina)).silenciado).toBe(false)

  await tocarAltavoz(pagina)
  const apagado = await sonidos(pagina)
  expect(apagado.silenciado).toBe(true)
  expect(apagado.enReproduccion).toEqual([])
  expect((await estado(pagina)).vida.botonSonido.silenciado).toBe(true)
  // Tocar el altavoz no mueve al cuy ni elige un rumbo nuevo.
  const rumbo = (await estado(pagina)).movimiento.direccion
  expect(rumbo).toBe('derecha')

  // Aunque el cuy siga caminando y comiendo, no suena nada nuevo.
  const antes = { ...apagado.reproducciones }
  await pagina.waitForFunction(() => window.kusi.estado().regla.recogidos >= 2, null, { timeout: 8000 })
  await pagina.waitForTimeout(600)
  expect((await sonidos(pagina)).reproducciones).toEqual(antes)

  // Al encenderlos otra vez vuelven a sonar los pasos.
  await tocarAltavoz(pagina)
  expect((await sonidos(pagina)).silenciado).toBe(false)
  await pagina.keyboard.press('ArrowDown')
  await pagina.waitForFunction(
    (anterior) => window.kusi.estado().vida.sonidos.reproducciones.paso_cuy > anterior,
    antes.paso_cuy, { timeout: 8000 },
  )
})

test('el silencio se conserva al pasar de nivel y al abrir el juego otra vez', async ({ page: pagina }) => {
  await servirTresNivelesCortos(pagina)
  await abrir(pagina, '&rapido=1')
  await tocarAltavoz(pagina)
  expect((await estado(pagina)).vida.botonSonido.silenciado).toBe(true)

  // Al pasar al nivel 2 la fanfarria de inicio de nivel no suena y el botón sigue tachado.
  await pagina.keyboard.press('ArrowRight')
  await pagina.waitForFunction(() => window.kusi.estado().nivel === 2)
  const nivel2 = await estado(pagina)
  expect(nivel2.vida.sonidos.silenciado).toBe(true)
  expect(nivel2.vida.sonidos.reproducciones.nivel ?? 0).toBe(0)
  expect(nivel2.vida.botonSonido.silenciado).toBe(true)

  // Al recargar la página sigue apagado, y se puede volver a encender.
  await pagina.reload()
  await pagina.waitForFunction(() => window.kusi?.listo)
  expect((await estado(pagina)).vida.botonSonido.silenciado).toBe(true)
  await tocarAltavoz(pagina)
  expect((await estado(pagina)).vida.botonSonido.silenciado).toBe(false)
  await pagina.reload()
  await pagina.waitForFunction(() => window.kusi?.listo)
  expect((await estado(pagina)).vida.botonSonido.silenciado).toBe(false)
})

test('el botón Escuchar sigue leyendo la consigna aunque los sonidos estén apagados', async ({ page: pagina }) => {
  await pagina.addInitScript(() => {
    window.frasesKusi = []
    Object.defineProperty(window, 'SpeechSynthesisUtterance', {
      configurable: true, value: class { constructor(texto) { this.text = texto } },
    })
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true, value: { cancel() {}, speak(frase) { window.frasesKusi.push(frase.text) } },
    })
  })
  const inicial = await abrir(pagina)
  await tocarAltavoz(pagina)
  const punto = await pagina.evaluate(() => window.kusi.ubicar('sonido'))
  await pagina.mouse.click(punto.x, punto.y)
  expect(await pagina.evaluate(() => window.frasesKusi)).toEqual([inicial.consigna, inicial.consigna])
})

test('con ?vida=0 no hay botón de sonido', async ({ page: pagina }) => {
  const inicial = await abrir(pagina, '&vida=0')
  expect(inicial.vida.botonSonido).toBeNull()
  expect(await pagina.evaluate(() => window.kusi.ubicar('altavoz'))).toBeNull()
  // Los botones de siempre siguen ahí.
  expect(await pagina.evaluate(() => window.kusi.ubicar('sonido'))).not.toBeNull()
  expect(await pagina.evaluate(() => window.kusi.ubicar('ayuda'))).not.toBeNull()
})
