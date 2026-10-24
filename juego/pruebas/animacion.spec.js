import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { DIRECCIONES_CUY, validarSpriteCuy } from '../src/datos/validarSpriteCuy.js'

const leerManifiesto = async () => JSON.parse(await readFile(
  new URL('../public/dibujos/cuy-nino-animado-v1.json', import.meta.url), 'utf8',
))

const estado = (pagina) => pagina.evaluate(() => window.kusi.estado())

async function tocar(pagina, nombre) {
  const punto = await (await pagina.waitForFunction((n) => window.kusi.ubicar(n), nombre)).jsonValue()
  await pagina.mouse.click(punto.x, punto.y)
}

async function empezar(pagina) {
  await pagina.goto('/')
  await pagina.waitForFunction(() => window.kusi?.listo)
  await tocar(pagina, 'vamos')
  await pagina.waitForFunction(() => window.kusi.estado().puedeMoverse)
}

test('el manifiesto define caminar 1-2-3-2 y el apoyo central para quieto', async () => {
  const datos = validarSpriteCuy(await leerManifiesto())
  expect(datos.fotograma).toEqual({ ancho: 256, alto: 256 })
  expect(datos.cuadricula).toEqual({ columnas: 3, filas: 1 })
  for (const direccion of DIRECCIONES_CUY) {
    expect(datos.animaciones[direccion].caminar).toMatchObject({
      fotogramas: [0, 1, 2, 1], fps: 8, repetir: -1,
    })
    expect(datos.animaciones[direccion].quieto.fotogramas).toEqual([1])
    expect(datos.animaciones[direccion].reposo.fotogramas).toEqual([1])
  }
})

test('el contrato acepta un nombre PNG y rechaza rutas o extensiones distintas', async () => {
  const datos = await leerManifiesto()
  expect(validarSpriteCuy({ ...datos, imagen: 'cuy-nino-caminar-v1.png' }).imagen)
    .toBe('cuy-nino-caminar-v1.png')
  for (const imagen of ['../cuy.png', 'dibujos/cuy.png', 'cuy.jpg', 'cuy.png.exe']) {
    expect(() => validarSpriteCuy({ ...datos, imagen })).toThrow('La imagen debe ser un PNG de dibujos/')
  }
})

test('Phaser registra el cuadro central repetido y mantiene la cadencia al frenar', async ({ page: pagina }) => {
  await empezar(pagina)
  const configuracion = await pagina.evaluate(async () => {
    const { registrarAnimacionesCuy, CuyAnimado } = await import('/src/dibujos/cuyAnimado.js')
    const datos = await (await fetch('/dibujos/cuy-nino-animado-v1.json')).json()
    const animaciones = []
    const textura = {
      getSourceImage: () => ({ width: 768, height: 256 }),
      setFilter: () => {},
    }
    registrarAnimacionesCuy({
      textures: { exists: () => true, get: () => textura },
      anims: { exists: () => false, create: (animacion) => animaciones.push(animacion) },
    }, datos)

    // La escena entrega distintas distancias al acelerar y frenar. En ambos
    // casos los mismos 125 ms deben llegar al reloj de animación de Phaser.
    const intervalos = []
    const cuy = {
      datosSprite: datos,
      setFlipX: () => {},
      play: () => {},
      anims: { update: (tiempo, intervalo) => intervalos.push(intervalo) },
    }
    CuyAnimado.prototype.animarMovimiento.call(cuy, 'frente', 1, 0.125, 1000)
    CuyAnimado.prototype.animarMovimiento.call(cuy, 'frente', 32.5, 0.125, 1125)
    return {
      caminar: animaciones.find((animacion) => animacion.key.endsWith(':frente:caminar')),
      quieto: animaciones.find((animacion) => animacion.key.endsWith(':frente:quieto')),
      intervalos,
    }
  })
  expect(configuracion.caminar.frames.map((cuadro) => cuadro.frame)).toEqual([0, 1, 2, 1])
  expect(configuracion.caminar).toMatchObject({ frameRate: 8, repeat: -1, sortFrames: false })
  expect(configuracion.quieto.frames.map((cuadro) => cuadro.frame)).toEqual([1])
  expect(configuracion.intervalos).toEqual([125, 125])
})

test('la vista frontal conserva el anclaje y la mancha sin voltearse en ninguna dirección', async ({ page: pagina }) => {
  const datos = await leerManifiesto()
  const errores = []
  pagina.on('pageerror', (error) => errores.push(error.message))
  await empezar(pagina)
  const inicial = await estado(pagina)
  expect(inicial.animacionCuy).toMatchObject({
    recurso: 'cuy-nino-animado-v1', estado: 'reposo',
    fotograma: 1, clave: 'cuy-nino-animado-v1:frente:quieto',
    anclaje: datos.anclaje, escala: datos.escala, flipX: false,
  })

  // Separa el recorrido de la jardinera y del muro situados junto a la entrada.
  await pagina.keyboard.down('ArrowUp')
  await pagina.waitForFunction(() => window.kusi.estado().cuyY < 940)
  await pagina.keyboard.up('ArrowUp')
  await pagina.waitForFunction(() => window.kusi.estado().velocidad === 0)

  // Las cuatro direcciones usan la vista frontal mientras no exista caminar_lado.
  // La mancha debe conservar su lado al caminar y también al volver a quieto.
  const direcciones = [
    ['ArrowUp', 'espaldas'],
    ['ArrowRight', 'derecha'],
    ['ArrowDown', 'frente'],
    ['ArrowLeft', 'izquierda'],
  ]
  for (const [tecla, direccion] of direcciones) {
    const antes = await estado(pagina)
    await pagina.keyboard.down(tecla)
    await pagina.waitForFunction((vista) => {
      const actual = window.kusi.estado()
      return actual.mirando === vista && actual.animacionCuy?.estado === 'caminar'
    }, direccion)
    // Dos fotogramas distintos demuestran que se reproduce el ciclo de patas.
    const primerPaso = (await estado(pagina)).animacionCuy.fotograma
    await pagina.waitForFunction((previo) => window.kusi.estado().animacionCuy.fotograma !== previo, primerPaso)
    const durante = await estado(pagina)
    await pagina.keyboard.up(tecla)
    expect([0, 1, 2]).toContain(durante.animacionCuy.fotograma)
    expect(durante.animacionCuy.flipX).toBe(false)
    expect(durante.animacionCuy.anclaje).toEqual(datos.anclaje)
    expect(Math.hypot(durante.cuyX - antes.cuyX, durante.cuyY - antes.cuyY)).toBeGreaterThan(0)
    await pagina.waitForFunction(() => {
      const actual = window.kusi.estado()
      return actual.velocidad === 0 && actual.animacionCuy.estado === 'reposo'
    })
    const quieto = (await estado(pagina)).animacionCuy
    expect(quieto.fotograma).toBe(1)
    expect(quieto.clave).toBe('cuy-nino-animado-v1:' + direccion + ':quieto')
    expect(quieto.flipX).toBe(false)
  }
  expect(errores).toEqual([])
})

test('al empujar la pileta el jugador queda en reposo y no camina sin avanzar', async ({ page: pagina }) => {
  await pagina.goto('/?rapido=1')
  await pagina.waitForFunction(() => window.kusi?.listo)
  await tocar(pagina, 'vamos')
  await tocar(pagina, 'pileta')
  await pagina.waitForFunction(() => {
    const actual = window.kusi.estado()
    return !actual.caminando && actual.velocidad === 0 && actual.animacionCuy?.estado === 'reposo'
  })
  await pagina.keyboard.down('ArrowUp')
  try {
    await pagina.waitForTimeout(800)
    const bloqueado = await estado(pagina)
    expect(bloqueado.animacionCuy.estado).toBe('reposo')
    const { pileta, cuyX, cuyY } = bloqueado
    expect(((cuyX - pileta.x) / pileta.radioX) ** 2 + ((cuyY - pileta.y) / pileta.radioY) ** 2).toBeGreaterThan(1)
    await pagina.waitForTimeout(200)
    const despues = await estado(pagina)
    expect([despues.cuyX, despues.cuyY]).toEqual([cuyX, cuyY])
  } finally {
    await pagina.keyboard.up('ArrowUp')
  }
})
