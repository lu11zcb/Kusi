import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { DIRECCIONES_CUY, validarSpriteCuy } from '../kit/reproductor/datos/validarSpriteCuy.js'

const leerManifiesto = async () => JSON.parse(await readFile(
  new URL('../kit/recursos/dibujos/cuy-nino-animado-v1.json', import.meta.url), 'utf8',
))

async function encontrarCuy(pagina) {
  await pagina.goto('/')
  await pagina.waitForFunction(() => window.kusi?.listo)
  await pagina.evaluate(async () => {
    const { CuyAnimado } = await import('/kit/reproductor/dibujos/cuyAnimado.js')
    // Se captura el jugador real durante una sola actualización y se restaura
    // enseguida el método. Las comprobaciones usan su escena y su AnimationState,
    // sin agregar accesos especiales al código que recibe el niño.
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

test('el manifiesto define feliz una sola vez con tres cuadros frontales y regreso a quieto', async () => {
  const datos = validarSpriteCuy(await leerManifiesto())
  expect(datos.fotograma).toEqual({ ancho: 256, alto: 256 })
  expect(datos.cuadricula).toEqual({ columnas: 3, filas: 6 })
  for (const direccion of DIRECCIONES_CUY) {
    expect(datos.animaciones[direccion].feliz).toEqual({
      fotogramas: [9, 10, 11],
      fps: 8,
      repetir: 0,
      siguiente: 'quieto',
      voltear: false,
    })
  }
})

test('Phaser registra feliz a ocho cuadros por segundo con una duración de 375 ms', async ({ page: pagina }) => {
  await encontrarCuy(pagina)
  const animaciones = await pagina.evaluate(() => {
    const cuy = window.cuyAnimacionDePrueba
    return ['frente', 'espaldas', 'derecha', 'izquierda'].map((direccion) => {
      const animacion = cuy.scene.anims.get('cuy-nino-animado-v1:' + direccion + ':feliz')
      return {
        direccion,
        fotogramas: animacion.frames.map((cuadro) => cuadro.textureFrame),
        fps: animacion.frameRate,
        repetir: animacion.repeat,
        duracion: animacion.duration,
      }
    })
  })
  expect(animaciones).toHaveLength(4)
  for (const animacion of animaciones) {
    expect(animacion).toMatchObject({
      fotogramas: [9, 10, 11], fps: 8, repetir: 0, duracion: 375,
    })
  }
})

test('el sprite real mantiene feliz sin reflejarlo hasta completar el salto y vuelve a quieto', async ({ page: pagina }) => {
  await encontrarCuy(pagina)
  const resultado = await pagina.evaluate(() => {
    const cuy = window.cuyAnimacionDePrueba
    // Se detiene únicamente el reloj exterior para entregar 125 ms exactos por
    // cuadro. La reproducción y la transición siguen usando los eventos reales
    // del Sprite de Phaser, incluidos los tres cuadros de la hoja del laberinto.
    cuy.scene.game.loop.stop()
    cuy.animarMovimiento('izquierda', 10, 0, 0)
    const lateral = { clave: cuy.anims.currentAnim.key, volteado: cuy.flipX }
    const completadas = []
    cuy.on('animationcomplete', (animacion) => completadas.push(animacion.key))
    const aceptado = cuy.mostrarEstado('feliz', 'izquierda')
    const medir = () => ({
      clave: cuy.anims.currentAnim.key,
      fotograma: cuy.frame.name,
      volteado: cuy.flipX,
      expresion: cuy.estadoExpresivo,
    })
    const pasos = [medir()]
    for (let paso = 1; paso <= 2; paso += 1) {
      // Aunque el movimiento pida otra vista, el salto debe conservar su ciclo
      // frontal y terminar antes de que se reproduzca caminar o quieto.
      cuy.animarMovimiento('frente', 10, 0.125, paso * 125)
      pasos.push(medir())
    }
    // Un milisegundo antes del final todavía debe mostrarse el último cuadro
    // del salto. El siguiente milisegundo dispara la transición a quieto.
    cuy.animarMovimiento('frente', 10, 0.124, 374)
    const antesDelFinal = medir()
    const completadasAntesDelFinal = [...completadas]
    cuy.animarMovimiento('frente', 10, 0.001, 375)
    const terminado = medir()
    cuy.animarMovimiento('frente', 0, 0.125, 500)
    return { lateral, aceptado, pasos, antesDelFinal, completadasAntesDelFinal, completadas, terminado, reanudado: medir() }
  })
  expect(resultado.lateral).toEqual({
    clave: 'cuy-nino-animado-v1:izquierda:caminar_lado', volteado: true,
  })
  expect(resultado.aceptado).toBe(true)
  expect(resultado.pasos.map((paso) => paso.fotograma)).toEqual([9, 10, 11])
  for (const paso of resultado.pasos) {
    expect(paso).toMatchObject({
      clave: 'cuy-nino-animado-v1:izquierda:feliz', volteado: false, expresion: 'feliz',
    })
  }
  expect(resultado.completadasAntesDelFinal).toEqual([])
  expect(resultado.antesDelFinal).toEqual({
    clave: 'cuy-nino-animado-v1:izquierda:feliz', fotograma: 11, volteado: false, expresion: 'feliz',
  })
  expect(resultado.completadas).toEqual(['cuy-nino-animado-v1:izquierda:feliz'])
  expect(resultado.terminado).toEqual({
    clave: 'cuy-nino-animado-v1:izquierda:quieto', fotograma: 4, volteado: true, expresion: null,
  })
  expect(resultado.reanudado).toEqual({
    clave: 'cuy-nino-animado-v1:frente:quieto', fotograma: 1, volteado: false, expresion: null,
  })
})
