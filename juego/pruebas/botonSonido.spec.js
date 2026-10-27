import { test, expect } from '@playwright/test'
import { BOTON_SONIDO } from '../src/interfaz/BotonSonido.js'
import { abrir, estado, servirPaquete, servirPasillo, leerPaquete, puntoEnLienzo, seSuperponen } from './ayudas/laberinto.js'

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
// de Kusi, ni siquiera con el mapa más ancho que cabe en pantalla.
async function comprobarQueNoPisaNada(pagina, nivel) {
  const boton = nivel.vida.botonSonido
  expect(boton).toMatchObject({ silenciado: false, ancho: BOTON_SONIDO.ancho, alto: BOTON_SONIDO.alto })
  const caja = {
    izquierda: boton.x - boton.ancho / 2, derecha: boton.x + boton.ancho / 2,
    arriba: boton.y - boton.alto / 2, abajo: boton.y + boton.alto / 2,
  }
  const rectangulo = { x: caja.izquierda, y: caja.arriba, ancho: boton.ancho, alto: boton.alto }
  for (const ocupado of ['barra', 'globo', 'kusi']) {
    expect(seSuperponen(rectangulo, nivel.presentacion[ocupado]), ocupado).toBe(false)
  }
  // El altavoz ahora está arriba a la derecha. Puede quedar sobre el cerco
  // exterior, pero nunca sobre una casilla transitable, una fruta o el portal.
  nivel.mapa.forEach((fila, f) => [...fila].forEach((simbolo, c) => {
    if (simbolo === '#') return
    const casilla = { x: nivel.origenMapa.x + c * nivel.casilla, y: nivel.origenMapa.y + f * nivel.casilla,
      ancho: nivel.casilla, alto: nivel.casilla }
    expect(seSuperponen(rectangulo, casilla)).toBe(false)
  }))
  const esquina = await puntoEnLienzo(pagina, caja.izquierda, caja.arriba)
  const opuesta = await puntoEnLienzo(pagina, caja.derecha, caja.abajo)
  const pantalla = pagina.viewportSize()
  expect(esquina.x).toBeGreaterThanOrEqual(0)
  expect(esquina.y).toBeGreaterThanOrEqual(0)
  expect(opuesta.x).toBeLessThanOrEqual(pantalla.width)
  expect(opuesta.y).toBeLessThanOrEqual(pantalla.height)
  expect(esquina.x).toBeGreaterThan(pantalla.width - 120)
  // La cámara puede añadir margen vertical. Se mide contra la banda superior
  // real proyectada, que contiene los tres botones de la disposición aprobada.
  const barra=nivel.presentacion.barra
  const arriba=await puntoEnLienzo(pagina,barra.x,barra.y)
  const abajo=await puntoEnLienzo(pagina,barra.x,barra.y+barra.alto)
  expect(esquina.y).toBeGreaterThanOrEqual(arriba.y)
  expect(opuesta.y).toBeLessThanOrEqual(abajo.y)
  const escuchar=await pagina.evaluate(()=>window.kusi.ubicar('sonido'))
  const ayuda=await pagina.evaluate(()=>window.kusi.ubicar('ayuda'))
  expect(escuchar.x).toBeLessThan(ayuda.x)
  expect(ayuda.x).toBeLessThan(esquina.x)
  for(const botonSuperior of [escuchar,ayuda]){
    expect(botonSuperior.x).toBeGreaterThan(pantalla.width*.8)
    expect(botonSuperior.y).toBeGreaterThanOrEqual(arriba.y)
    expect(botonSuperior.y).toBeLessThanOrEqual(abajo.y)
  }
}

test('el altavoz está arriba a la derecha, sin tapar caminos ni instrucciones', async ({ page: pagina }) => {
  await comprobarQueNoPisaNada(pagina, await abrir(pagina))
  // Un mapa de 16 × 8, el más ancho y alto que cabe, es el caso con menos espacio libre.
  const ancho = await pagina.context().newPage()
  await servirPasillo(ancho, {
    mapa: [
      '################', '#C............P#', '#..............#', '#..............#',
      '#..............#', '#..............#', '#..............#', '################',
    ],
    objetos: [{ tipo: 'fresa', fila: 1, columna: 5 }], regla: { tipo: 'orden', secuencia: ['fresa'] },
  })
  await comprobarQueNoPisaNada(ancho, await abrir(ancho))
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
