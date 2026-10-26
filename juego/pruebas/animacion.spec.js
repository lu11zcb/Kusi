import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { estado, esperarCasilla, leerPaquete, servirPaquete } from './ayudas/laberinto.js'
import { DIRECCIONES_CUY, validarSpriteCuy } from '../src/datos/validarSpriteCuy.js'

const leerManifiesto = async () => JSON.parse(await readFile(
  new URL('../public/dibujos/cuy-nino-animado-v1.json', import.meta.url), 'utf8',
))

async function empezar(pagina) {
  await pagina.goto('/')
  await pagina.waitForFunction(() => window.kusi?.listo)
}

test('el manifiesto define frente, espalda y lateral con su apoyo central', async () => {
  const datos = validarSpriteCuy(await leerManifiesto())
  expect(datos.fotograma).toEqual({ ancho: 256, alto: 256 })
  expect(datos.cuadricula).toEqual({ columnas: 3, filas: 6 })
  for (const direccion of DIRECCIONES_CUY) {
    const lateral = direccion === 'derecha' || direccion === 'izquierda'
    const espaldas = direccion === 'espaldas'
    const apoyo = lateral ? 4 : espaldas ? 13 : 1
    // Cada caminar conserva su fila y el reposo usa su cuadro de apoyo central.
    expect(datos.animaciones[direccion].caminar).toMatchObject({
      fotogramas: [0, 1, 2, 1], fps: 8, repetir: -1,
    })
    expect(datos.animaciones[direccion].quieto.fotogramas).toEqual([apoyo])
    expect(datos.animaciones[direccion].reposo.fotogramas).toEqual([apoyo])
    if (espaldas) {
      expect(datos.animaciones[direccion].caminar_espalda).toEqual({
        fotogramas: [12, 13, 14, 13], fps: 8, repetir: -1, voltear: false,
      })
    }
    if (lateral) {
      expect(datos.animaciones[direccion].caminar_lado).toEqual({
        fotogramas: [3, 4, 5, 4], fps: 8, repetir: -1, voltear: direccion === 'izquierda',
      })
      expect(datos.animaciones[direccion].quieto.voltear).toBe(direccion === 'izquierda')
    }
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
      getSourceImage: () => ({ width: 768, height: 1536 }),
      setFilter: () => {},
    }
    registrarAnimacionesCuy({
      textures: { exists: () => true, get: () => textura },
      anims: { exists: () => false, create: (animacion) => animaciones.push(animacion) },
    }, datos)

    // La escena entrega distintas distancias al acelerar y frenar. En ambos
    // casos los mismos 125 ms deben llegar al reloj de animación de Phaser.
    const intervalos = []
    const cuy = Object.assign(Object.create(CuyAnimado.prototype), {
      datosSprite: datos,
      clavePersonaje: 'cuy-nino-animado-v1',
      relojManual: true,
      setFlipX: () => {},
      play: () => {},
      anims: { update: (tiempo, intervalo) => intervalos.push(intervalo) },
    })
    CuyAnimado.prototype.animarMovimiento.call(cuy, 'frente', 1, 0.125, 1000)
    CuyAnimado.prototype.animarMovimiento.call(cuy, 'frente', 32.5, 0.125, 1125)
    return {
      caminar: animaciones.find((animacion) => animacion.key.endsWith(':frente:caminar')),
      espalda: animaciones.find((animacion) => animacion.key.endsWith(':espaldas:caminar_espalda')),
      quieto: animaciones.find((animacion) => animacion.key.endsWith(':frente:quieto')),
      intervalos,
    }
  })
  expect(configuracion.caminar.frames.map((cuadro) => cuadro.frame)).toEqual([0, 1, 2, 1])
  expect(configuracion.caminar).toMatchObject({ frameRate: 8, repeat: -1, sortFrames: false })
  expect(configuracion.espalda.frames.map((cuadro) => cuadro.frame)).toEqual([12, 13, 14, 13])
  expect(configuracion.espalda).toMatchObject({ frameRate: 8, repeat: -1, sortFrames: false })
  expect(configuracion.quieto.frames.map((cuadro) => cuadro.frame)).toEqual([1])
  expect(configuracion.intervalos).toEqual([125, 125])
})

test('el cuy cambia entre espalda, frente y laterales y queda quieto en su última dirección', async ({ page: pagina }) => {
  const paquete = await leerPaquete()
  // Un patio con una fruta fuera del recorrido permite observar las cuatro
  // vistas sin que una expresión o un cambio de nivel interrumpa la caminata.
  paquete.retos = [{
    ...paquete.retos[0],
    mapa: ['#########', '#......P#', '#.......#', '#...C...#', '#.......#', '#.......#', '#########'],
    objetos: [{ tipo: 'fresa', fila: 3, columna: 1 }],
    regla: { tipo: 'orden', secuencia: ['fresa'] }, enemigos: [],
  }]
  await servirPaquete(pagina, paquete)
  const errores = []
  pagina.on('pageerror', (error) => errores.push(error.message))
  await empezar(pagina)
  for (const [tecla, vista, fila, columna, apoyo, cuadros] of [
    ['ArrowUp', 'espaldas', 1, 4, 13, [12, 13, 14]],
    ['ArrowRight', 'derecha', 1, 7, 4, [3, 4, 5]],
    ['ArrowDown', 'frente', 5, 7, 1, [0, 1, 2]],
    ['ArrowLeft', 'izquierda', 5, 1, 4, [3, 4, 5]],
  ]) {
    const antes = await estado(pagina)
    await pagina.keyboard.press(tecla)
    await pagina.waitForFunction(() => window.kusi.estado().movimiento.moviendose)
    const primerPaso = (await estado(pagina)).animacionCuy.fotograma
    await pagina.waitForFunction((previo) => window.kusi.estado().animacionCuy.fotograma !== previo, primerPaso)
    const durante = await estado(pagina)
    expect(cuadros).toContain(durante.animacionCuy.fotograma)
    expect(durante.animacionCuy.clave).toContain(':' + vista + ':')
    expect(durante.animacionCuy.flipX).toBe(vista === 'izquierda')
    expect(Math.hypot(durante.cuyX - antes.cuyX, durante.cuyY - antes.cuyY)).toBeGreaterThan(0)
    await esperarCasilla(pagina, fila, columna)
    // La expresión feliz puede terminar después de alcanzar la última fruta.
    await pagina.waitForFunction(() => window.kusi.estado().animacionCuy.estado === 'reposo')
    const quieto = (await estado(pagina)).animacionCuy
    expect(quieto).toMatchObject({ fotograma: apoyo, clave: 'cuy-nino-animado-v1:' + vista + ':quieto', flipX: vista === 'izquierda' })
    await pagina.waitForTimeout(150)
    expect((await estado(pagina)).animacionCuy).toEqual(quieto)
  }
  expect(errores).toEqual([])
})

test('la espalda real repite 0,1,2,1 a ocho fps y las vistas verticales nunca se reflejan', async ({ page: pagina }) => {
  await empezar(pagina)
  const resultado = await pagina.evaluate(async () => {
    const { CuyAnimado } = await import('/src/dibujos/cuyAnimado.js')
    // Una actualización entrega el Sprite real, sin exponer métodos de prueba
    // en el juego. Luego se avanza únicamente su reloj con pasos de 125 ms.
    const cuy = await new Promise((resolver) => {
      const animarMovimiento = CuyAnimado.prototype.animarMovimiento
      CuyAnimado.prototype.animarMovimiento = function (...argumentos) {
        CuyAnimado.prototype.animarMovimiento = animarMovimiento
        animarMovimiento.apply(this, argumentos)
        resolver(this)
      }
    })
    cuy.scene.game.loop.stop()
    cuy.animarMovimiento('espaldas', 10, 0, 0)
    const pasos = [cuy.frame.name]
    for (let paso = 1; paso <= 8; paso += 1) {
      cuy.animarMovimiento('espaldas', 10, 0.125, paso * 125)
      pasos.push(cuy.frame.name)
    }
    const repetir = cuy.anims.currentAnim.repeat
    cuy.animarMovimiento('espaldas', 0, 0.125, 1125)
    const quieto = { fotograma: cuy.frame.name, clave: cuy.anims.currentAnim.key, volteado: cuy.flipX }
    cuy.animarMovimiento('espaldas', 0, 0.5, 1625)
    const despues = { fotograma: cuy.frame.name, clave: cuy.anims.currentAnim.key, volteado: cuy.flipX }
    // Incluso un manifiesto recibido con el volteo incorrecto queda protegido
    // por el Sprite; este ensayo omite deliberadamente el validador de carga.
    const volteos = ['frente', 'espaldas'].map((direccion) => {
      cuy.datosSprite.animaciones[direccion].quieto.voltear = true
      cuy.reproducirEstado(direccion, 'quieto')
      return cuy.flipX
    })
    return { pasos, repetir, quieto, despues, volteos }
  })
  expect(resultado.pasos).toEqual([12, 13, 14, 13, 12, 13, 14, 13, 12])
  expect(resultado.repetir).toBe(-1)
  expect(resultado.quieto).toEqual({
    fotograma: 13, clave: 'cuy-nino-animado-v1:espaldas:quieto', volteado: false,
  })
  expect(resultado.despues).toEqual(resultado.quieto)
  expect(resultado.volteos).toEqual([false, false])
})

test('al intentar atravesar un muro el jugador queda en reposo sin avanzar', async ({ page: pagina }) => {
  await empezar(pagina)
  const inicial = await estado(pagina)
  await pagina.keyboard.press('ArrowUp')
  await pagina.waitForTimeout(300)
  const bloqueado = await estado(pagina)
  expect(bloqueado.movimiento.moviendose).toBe(false)
  expect(bloqueado.animacionCuy.estado).toBe('reposo')
  expect([bloqueado.cuyX, bloqueado.cuyY]).toEqual([inicial.cuyX, inicial.cuyY])
  expect(bloqueado.mapa[bloqueado.movimiento.fila - 1][bloqueado.movimiento.columna]).toBe('#')
})
