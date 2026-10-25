import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { DIRECCIONES_CUY, validarSpriteCuy } from '../src/datos/validarSpriteCuy.js'

const leerManifiesto = async () => JSON.parse(await readFile(
  new URL('../public/dibujos/cuy-nino-animado-v1.json', import.meta.url), 'utf8',
))

async function encontrarCuy(pagina) {
  await pagina.goto('/')
  await pagina.waitForFunction(() => window.kusi?.listo)
  await pagina.evaluate(async () => {
    const { CuyAnimado } = await import('/src/dibujos/cuyAnimado.js')
    // Se captura el jugador real durante una sola actualización y se restaura
    // enseguida el método, igual que en las pruebas de feliz y asustado.
    window.cuyAnimacionDePrueba = await new Promise((resolver) => {
      const animarMovimiento = CuyAnimado.prototype.animarMovimiento
      CuyAnimado.prototype.animarMovimiento = function (...argumentos) {
        CuyAnimado.prototype.animarMovimiento = animarMovimiento
        animarMovimiento.apply(this, argumentos)
        resolver(this)
      }
    })
  })
}

test('el manifiesto define el parpadeo una sola vez, solo de frente, y cabe en la hoja', async () => {
  const datos = validarSpriteCuy(await leerManifiesto())
  expect(datos.imagen).toBe('cuy-nino-cuadros-v6.png')
  expect(datos.fotograma).toEqual({ ancho: 256, alto: 256 })
  expect(datos.cuadricula).toEqual({ columnas: 3, filas: 6 })
  expect(datos.animaciones.frente.parpadeo).toEqual({
    fotogramas: [15, 16, 17, 16, 15], fps: 16, repetir: 0, siguiente: 'quieto', voltear: false,
  })
  for (const direccion of DIRECCIONES_CUY.filter((vista) => vista !== 'frente')) {
    expect(datos.animaciones[direccion].parpadeo).toBeUndefined()
  }
  // La sexta fila termina en el cuadro 17; el 18 ya está fuera de la hoja.
  const fuera = structuredClone(datos)
  fuera.animaciones.frente.parpadeo.fotogramas = [15, 16, 18]
  expect(() => validarSpriteCuy(fuera)).toThrow('Índice fuera de la hoja')
})

test('Phaser registra el parpadeo a dieciséis cuadros por segundo sin repetir', async ({ page: pagina }) => {
  await encontrarCuy(pagina)
  const animacion = await pagina.evaluate(() => {
    const parpadeo = window.cuyAnimacionDePrueba.scene.anims.get('cuy-nino-animado-v1:frente:parpadeo')
    return {
      fotogramas: parpadeo.frames.map((cuadro) => cuadro.textureFrame),
      fps: parpadeo.frameRate, repetir: parpadeo.repeat, duracion: parpadeo.duration,
    }
  })
  expect(animacion).toEqual({ fotogramas: [15, 16, 17, 16, 15], fps: 16, repetir: 0, duracion: 312.5 })
})

test('el sprite real parpadea una vez y vuelve a su dibujo quieto de frente', async ({ page: pagina }) => {
  await encontrarCuy(pagina)
  const resultado = await pagina.evaluate(() => {
    const cuy = window.cuyAnimacionDePrueba
    // Se detiene el reloj exterior para entregar exactamente 62,5 ms por cuadro.
    // El sprite, su AnimationState y los eventos siguen siendo los reales.
    cuy.scene.game.loop.stop()
    cuy.animarMovimiento('frente', 0, 0, 0)
    const completadas = []
    cuy.on('animationcomplete', (animacion) => completadas.push(animacion.key))
    const aceptado = cuy.mostrarEstado('parpadeo', 'frente')
    const medir = () => ({
      clave: cuy.anims.currentAnim.key, fotograma: cuy.frame.name,
      volteado: cuy.flipX, expresion: cuy.estadoExpresivo,
    })
    const pasos = [medir()]
    for (let paso = 1; paso <= 4; paso += 1) {
      cuy.animarMovimiento('frente', 0, 0.0625, paso * 62.5)
      pasos.push(medir())
    }
    const antesDelFinal = { ...medir(), completadas: [...completadas] }
    cuy.animarMovimiento('frente', 0, 0.0625, 312.5)
    const terminado = medir()
    return { aceptado, pasos, antesDelFinal, completadas, terminado }
  })
  expect(resultado.aceptado).toBe(true)
  expect(resultado.pasos.map((paso) => paso.fotograma)).toEqual([15, 16, 17, 16, 15])
  for (const paso of resultado.pasos) {
    expect(paso).toMatchObject({
      clave: 'cuy-nino-animado-v1:frente:parpadeo', volteado: false, expresion: 'parpadeo',
    })
  }
  // El último cuadro vuelve a mostrar los ojos abiertos antes de terminar.
  expect(resultado.antesDelFinal.completadas).toEqual([])
  expect(resultado.completadas).toEqual(['cuy-nino-animado-v1:frente:parpadeo'])
  expect(resultado.terminado).toEqual({
    clave: 'cuy-nino-animado-v1:frente:quieto', fotograma: 1, volteado: false, expresion: null,
  })
})

test('interrumpir el parpadeo deja caminar de inmediato y no toca otras expresiones', async ({ page: pagina }) => {
  await encontrarCuy(pagina)
  const resultado = await pagina.evaluate(() => {
    const cuy = window.cuyAnimacionDePrueba
    cuy.scene.game.loop.stop()
    cuy.animarMovimiento('frente', 0, 0, 0)
    cuy.mostrarEstado('parpadeo', 'frente')
    cuy.animarMovimiento('frente', 0, 0.0625, 62.5)
    // Mientras dura la expresión, pedir caminar no cambia el dibujo...
    cuy.animarMovimiento('derecha', 10, 0.0625, 125)
    const retenido = cuy.anims.currentAnim.key
    // ...pero la escena puede cortarla y el caminar entra en ese mismo cuadro.
    const cortado = cuy.interrumpirEstado('parpadeo')
    cuy.animarMovimiento('derecha', 10, 0.0625, 187.5)
    const caminando = { clave: cuy.anims.currentAnim.key, volteado: cuy.flipX, expresion: cuy.estadoExpresivo }
    const repetido = cuy.interrumpirEstado('parpadeo')

    // Una expresión distinta, como feliz, nunca se corta con esta llamada.
    cuy.mostrarEstado('feliz', 'frente')
    const ajeno = cuy.interrumpirEstado('parpadeo')
    return { retenido, cortado, caminando, repetido, ajeno, feliz: cuy.estadoExpresivo }
  })
  expect(resultado.retenido).toBe('cuy-nino-animado-v1:frente:parpadeo')
  expect(resultado.cortado).toBe(true)
  expect(resultado.caminando).toEqual({
    clave: 'cuy-nino-animado-v1:derecha:caminar_lado', volteado: false, expresion: null,
  })
  expect(resultado.repetido).toBe(false)
  expect(resultado.ajeno).toBe(false)
  expect(resultado.feliz).toBe('feliz')
})
