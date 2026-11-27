import { expect, test } from '@playwright/test'

const TRABAJO = '8f26ebcd-2b8a-4025-b7b8-cabbc9cc892e'
const PAGINAS = [
  'En la plaza del pueblo, Kusi buscaba a sus amigos para celebrar con ellos una gran fiesta.',
  'Al llegar al campo, vio que todas las frutas se habían caído y pidió ayuda para recogerlas.',
]
const CONSIGNA = 'Junta las frutas.'
const PRESENTACION = 'Soy Lana. Voy a jugar contigo.'
const AYUDA = 'Mira al lado del árbol.'
const AUDIOS = ['100000000001.m4a', '100000000002.m4a', '100000000003.m4a', '100000000004.m4a', '100000000005.m4a']
const EMPEZAR = { x: 640, y: 610 }

// Servimos los datos de prueba desde Playwright sin crear carpetas del taller.
async function servirTrabajo(pagina, conIndice = true) {
  await pagina.route('**/taller/trabajos/' + TRABAJO + '/**', (ruta) => {
    const archivo = new URL(ruta.request().url()).pathname.split('/').at(-1)
    if (archivo === 'guion-ejemplo.json') return ruta.fulfill({ json: {
      formato: 'kusi-paquete/0', familia: 'prueba_voz', historia: PAGINAS.join(' '), consigna: CONSIGNA, presentacion: PRESENTACION, ayuda: AYUDA, retos: [{}],
    } })
    if (archivo === 'juego.js') return ruta.fulfill({ contentType: 'text/javascript', body: [
      "import { EscenaHistoria } from '/kit/reproductor/escenas/EscenaHistoria.js'",
      "import { crearHud } from '/kit/reproductor/interfaz/hud.js'",
      'class EscenaPrueba extends EscenaHistoria {',
      '  init({ paquete }) { this.paquete = paquete }',
      '  create() {',
      '    let silenciado = false',
      '    const hud = crearHud(this, {',
      '      alEscuchar: () => hud.decir(this.paquete.consigna),',
      '      alAyuda: () => hud.decir(this.paquete.ayuda),',
      '      alSilenciar: () => { silenciado = !silenciado; this.sound.mute = silenciado; hud.sonido(silenciado) },',
      '    })',
      "    const globo = this.children.list.find((pieza) => pieza.type === 'Text')",
      '    window.textoDelGlobo = () => globo.text',
      '    window.sonidoDelJuegoApagado = () => silenciado',
      "    window.iconosDelHud = this.children.list.map((pieza) => pieza.texture?.key).filter((clave) => clave?.startsWith('boton-'))",
      "    this.events.once('update', () => { window.entradaDelJuegoLista = true })",
      '    const inicio = this.children.list.length',
      "    hud.indicador({ icono: 'fresa', texto: '1 / 3' })",
      "    hud.indicador({ icono: 'fresa', texto: '0 / 5' })",
      '    const indicadores = this.children.list.slice(inicio)',
      '    window.medidasIndicadores = () => indicadores.map((pieza) => ({',
      '      y: pieza.y, alto: pieza.displayHeight, ancho: pieza.displayWidth,',
      '      borde: pieza.lineWidth, letra: pieza.style?.fontSize,',
      '    }))',
      '    let toques = 0',
      '    const inicioSoltar = this.children.list.length',
      '    const soltar = hud.botonSoltar({ alTocar: () => { toques += 1 } })',
      '    const [imagen, etiqueta, dibujo] = this.children.list.slice(inicioSoltar)',
      '    const camara = this.cameras.main',
      '    const protagonista = { x: camara.width / 2, y: camara.height / 2 }',
      '    camara.setBounds(0, 0, 2000, 1200).startFollow(protagonista, true, 0.12, 0.12)',
      '    window.probarSoltar = {',
      "      mostrar: () => soltar.mostrar('fresa'), ocultar: () => soltar.ocultar(),",
      '      moverProtagonista: () => { protagonista.x += 340; protagonista.y += 140 },',
      '      estado: () => ({ toques,',
      '        camara: { x: camara.scrollX, y: camara.scrollY },',
      '        visibles: [imagen, etiqueta, dibujo].map((pieza) => pieza.visible),',
      '        imagen: { x: imagen.x, y: imagen.y, ancho: imagen.displayWidth, alto: imagen.displayHeight },',
      '        etiqueta: { texto: etiqueta.text, y: etiqueta.y, letra: etiqueta.style.fontSize },',
      '        dibujo: { textura: dibujo.texture.key, x: dibujo.x, y: dibujo.y, lado: Math.max(dibujo.displayWidth, dibujo.displayHeight) },',
      '      }),',
      '    }',
      '    hud.decir(this.paquete.consigna)',
      '    hud.decir(this.paquete.presentacion, { esperar: true })',
      '  }',
      '  update() {}',
      '}',
      "export default { familia: 'prueba_voz', nombre: 'Prueba', escena: EscenaPrueba, validar: () => ({ valido: true }), piezas: ['fresa'] }",
    ].join('\n') })
    if (archivo === 'voz.json') {
      if (!conIndice) return ruta.fallback()
      return ruta.fulfill({ json: {
        voz: 'Paulina (Enhanced)', frases: Object.fromEntries([...PAGINAS, CONSIGNA, PRESENTACION, AYUDA].map((texto, indice) => [texto, AUDIOS[indice]])),
      } })
    }
    return ruta.fulfill({ status: 404 })
  })
}

test('el cuento avanza al terminar cada lectura y el globo del juego sigue la voz', async ({ page }) => {
  await servirTrabajo(page)
  await page.addInitScript(() => {
    window.eventosVoz = []
    window.Audio = class {
      constructor(ruta) { this.archivo = ruta.split('/').at(-1) }
      play() {
        window.audioActivo = this
        window.eventosVoz.push('suena ' + this.archivo)
        return Promise.resolve()
      }
      pause() { window.eventosVoz.push('pausa ' + this.archivo) }
    }
  })
  await page.goto('/?juego=' + TRABAJO + '&vida=0')
  await page.waitForFunction(() => document.title === 'Kusi · La historia')
  const eventos = () => page.evaluate(() => window.eventosVoz)
  const texto = () => page.evaluate(() => window.textoDelGlobo())
  const iniciarAudio = () => page.evaluate(() => window.audioActivo.onplaying())
  const terminarAudio = () => page.evaluate(() => {
    window.ultimoFinDeVoz = performance.now()
    window.audioActivo.onended()
  })
  const tiempoDesdeElFin = () => page.evaluate(() => performance.now() - window.ultimoFinDeVoz)
  expect(await eventos()).toEqual([])

  await page.locator('canvas').click({ position: EMPEZAR })
  await expect.poll(eventos).toEqual(['suena ' + AUDIOS[0]])
  await iniciarAudio()
  // Los antiguos puntos de «Seguir» y «Saltar» y la lámina ya no adelantan la lectura.
  await page.locator('canvas').click({ position: { x: 1090, y: 611 } })
  await page.mouse.click(1170, 56)
  await page.mouse.click(950, 280)
  expect(await eventos()).toEqual(['suena ' + AUDIOS[0]])
  await terminarAudio()
  const hastaPaginaDos = ['suena ' + AUDIOS[0], 'suena ' + AUDIOS[1]]
  await expect.poll(eventos).toEqual(hastaPaginaDos)
  expect(await tiempoDesdeElFin()).toBeGreaterThanOrEqual(1100)
  await iniciarAudio()

  // Tocar donde estaba Escuchar o tocar a Kusi no reinicia la narración.
  await page.mouse.click(179, 641)
  await page.mouse.click(179, 440)
  expect(await eventos()).toEqual(hastaPaginaDos)
  await terminarAudio()
  await page.waitForFunction(() => window.kusi?.listo && window.entradaDelJuegoLista)
  expect(await tiempoDesdeElFin()).toBeGreaterThanOrEqual(1100)
  const hastaConsigna = [...hastaPaginaDos, 'suena ' + AUDIOS[2]]
  await expect.poll(eventos).toEqual(hastaConsigna)
  await iniciarAudio()
  expect(await texto()).toBe(CONSIGNA)
  expect(await page.evaluate(() => window.iconosDelHud)).toEqual(['boton-sonido', 'boton-escuchar', 'boton-ayuda', 'boton-pausa'])

  // Sonido solo controla la música y los efectos. La ayuda espera el fin de la consigna.
  await page.mouse.click(1228, 52)
  expect(await page.evaluate(() => window.sonidoDelJuegoApagado())).toBe(true)
  expect(await eventos()).toEqual(hastaConsigna)
  await page.mouse.click(1032, 52)
  expect(await eventos()).toEqual(hastaConsigna)
  expect(await texto()).toBe(CONSIGNA)
  await terminarAudio()
  const hastaAyuda = [...hastaConsigna, 'suena ' + AUDIOS[4]]
  await expect.poll(eventos).toEqual(hastaAyuda)
  expect(await texto()).toBe(CONSIGNA)
  await iniciarAudio()
  expect(await texto()).toBe(AYUDA)

  await page.mouse.click(1130, 52)
  const hastaRepetirAyuda = [...hastaAyuda, 'pausa ' + AUDIOS[4], 'suena ' + AUDIOS[4]]
  expect(await eventos()).toEqual(hastaRepetirAyuda)
  await iniciarAudio()
  await terminarAudio()
  await expect.poll(eventos).toEqual([...hastaRepetirAyuda, 'suena ' + AUDIOS[3]])
  expect(await texto()).toBe(AYUDA)
  await iniciarAudio()
  expect(await texto()).toBe(PRESENTACION)
  await terminarAudio()
})

test.describe('cuento con el puente nativo', () => {
  test.use({ hasTouch: true })

  test('la portada espera un toque y también abre el cuento al tocar la lámina', async ({ page }) => {
    await servirTrabajo(page, false)
    await page.addInitScript(() => {
      window.eventosVoz = []
      window.KusiPuente = { decir: (texto) => window.eventosVoz.push(texto) }
    })
    await page.goto('/?juego=' + TRABAJO + '&vida=0')
    await page.waitForFunction(() => document.title === 'Kusi · La historia')
    const eventos = () => page.evaluate(() => window.eventosVoz)

    await page.keyboard.press('Enter')
    expect(await eventos()).toEqual([])
    await page.touchscreen.tap(950, 280)
    await expect.poll(eventos).toEqual([PAGINAS[0]])
    await expect.poll(eventos, { timeout: 12000 }).toEqual(PAGINAS)
  })
})

test('sin grabaciones el juego recibe un índice vacío y usa la voz en español de respaldo', async ({ page }) => {
  await servirTrabajo(page, false)
  await page.addInitScript(() => {
    window.eventosVoz = []
    Object.defineProperty(window, 'SpeechSynthesisUtterance', {
      value: class { constructor(texto) { this.text = texto } },
    })
    Object.defineProperty(window, 'speechSynthesis', { value: {
      getVoices: () => [{ name: 'Eddy', lang: 'es-MX', localService: true }, { name: 'Mónica', lang: 'es-ES', localService: true }],
      speak(frase) { window.eventosVoz.push([frase.text, frase.voice.name]); frase.onstart(); frase.onend() },
    } })
  })
  const indice = page.waitForResponse('**/taller/trabajos/' + TRABAJO + '/voz/voz.json')
  await page.goto('/?juego=' + TRABAJO + '&vida=0&historia=0')
  const respuesta = await indice
  expect(respuesta.status()).toBe(200)
  expect(await respuesta.json()).toEqual({ voz: null, frases: {} })
  await page.waitForFunction(() => window.kusi?.listo)
  await page.keyboard.press('Enter')
  await expect.poll(() => page.evaluate(() => window.eventosVoz)).toEqual([[CONSIGNA, 'Mónica'], [PRESENTACION, 'Mónica']])
})

test('los indicadores tienen letra de 24 px, iconos de 32 px y quedan separados por 50 px', async ({ page }) => {
  await servirTrabajo(page)
  await page.goto('/?juego=' + TRABAJO + '&vida=0&historia=0')
  await page.waitForFunction(() => window.kusi?.listo)
  const indicadores = await page.evaluate(() => window.medidasIndicadores())
  expect(indicadores).toMatchObject([
    { y: 146, alto: 42, borde: 3 },
    { y: 146, letra: '24px' },
    { y: 146 },
    { y: 196, alto: 42, borde: 3 },
    { y: 196, letra: '24px' },
    { y: 196 },
  ])
  for (const indice of [2, 5]) {
    const { alto, ancho } = indicadores[indice]
    expect(Math.max(alto, ancho)).toBeCloseTo(32)
  }
})

test.describe(() => {
  test.use({ hasTouch: true })

  test('Soltar muestra lo que se lleva y recibe el toque con la cámara desplazada', async ({ page }) => {
    await servirTrabajo(page)
    await page.goto('/?juego=' + TRABAJO + '&vida=0&historia=0')
    await page.waitForFunction(() => window.entradaDelJuegoLista)
    const estado = () => page.evaluate(() => window.probarSoltar.estado())
    expect(await estado()).toMatchObject({ camara: { x: 0, y: 0 }, visibles: [false, false, false] })
    await page.evaluate(() => {
      window.probarSoltar.mostrar()
      window.probarSoltar.moverProtagonista()
    })
    // El mundo ya se desplazó en un cuadro de Phaser, como en un juego de exploración.
    await page.waitForFunction(() => {
      const { x, y } = window.probarSoltar.estado().camara
      return x > 100 && y > 40
    })
    expect(await estado()).toMatchObject({
      visibles: [true, true, true],
      imagen: { x: 1200, y: 625, ancho: 76, alto: 76 },
      etiqueta: { texto: 'Soltar', y: 675, letra: '20px' },
      dibujo: { textura: 'fresa', x: 1172, y: 649, lado: 32 },
    })
    await page.mouse.click(1200, 625)
    expect((await estado()).toques).toBe(1)
    await page.touchscreen.tap(1172, 649)
    expect((await estado()).toques).toBe(2)

    await page.evaluate(() => window.probarSoltar.ocultar())
    await page.touchscreen.tap(1200, 625)
    expect(await estado()).toMatchObject({ toques: 2, visibles: [false, false, false] })
  })
})
