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
    // La siguiente actualización entrega el sprite real creado por la escena.
    // La captura dura una llamada y restaura el método antes de seguir jugando;
    // permite comprobar Phaser sin agregar accesos de prueba al código del juego.
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

test('el manifiesto real define asustado una vez con cinco pasos y regreso a quieto', async () => {
  const datos = validarSpriteCuy(await leerManifiesto())
  expect(datos.fotograma).toEqual({ ancho: 256, alto: 256 })
  expect(datos.cuadricula).toEqual({ columnas: 3, filas: 6 })
  for (const direccion of DIRECCIONES_CUY) {
    expect(datos.animaciones[direccion].asustado).toEqual({
      fotogramas: [6, 7, 8, 7, 8],
      fps: 10,
      repetir: 0,
      siguiente: 'quieto',
      voltear: false,
    })
  }
})

test('Phaser registra los cinco pasos de asustado a diez cuadros por segundo sin repetir', async ({ page: pagina }) => {
  await encontrarCuy(pagina)
  const animaciones = await pagina.evaluate(() => {
    const cuy = window.cuyAnimacionDePrueba
    return ['frente', 'espaldas', 'derecha', 'izquierda'].map((direccion) => {
      const animacion = cuy.scene.anims.get('cuy-nino-animado-v1:' + direccion + ':asustado')
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
      fotogramas: [6, 7, 8, 7, 8], fps: 10, repetir: 0, duracion: 500,
    })
  }
})

test('el sprite real conserva asustado sin reflejarlo y vuelve a quieto al completar el ciclo', async ({ page: pagina }) => {
  await encontrarCuy(pagina)
  const resultado = await pagina.evaluate(() => {
    const cuy = window.cuyAnimacionDePrueba
    // Se detiene el reloj exterior para entregar exactamente 100 ms por paso.
    // El sprite, sus texturas, AnimationState y eventos siguen siendo los reales
    // del mercado; no se simula la finalización ni se reemplaza el reloj interno.
    cuy.scene.game.loop.stop()
    cuy.animarMovimiento('izquierda', 10, 0, 0)
    const lateral = { clave: cuy.anims.currentAnim.key, volteado: cuy.flipX }
    const completadas = []
    cuy.on('animationcomplete', (animacion) => completadas.push(animacion.key))
    const aceptado = cuy.mostrarEstado('asustado', 'izquierda')
    const medir = () => ({
      clave: cuy.anims.currentAnim.key,
      fotograma: cuy.frame.name,
      volteado: cuy.flipX,
      expresion: cuy.estadoExpresivo,
    })
    const pasos = [medir()]
    for (let paso = 1; paso <= 4; paso += 1) {
      // Cambiar el deseo de movimiento hacia el frente no debe interrumpir la
      // expresión frontal que empezó mientras el personaje miraba a la izquierda.
      cuy.animarMovimiento('frente', 10, 0.1, paso * 100)
      pasos.push(medir())
    }
    cuy.animarMovimiento('frente', 10, 0.1, 500)
    const terminado = medir()
    cuy.animarMovimiento('frente', 0, 0.1, 600)
    return { lateral, aceptado, pasos, completadas, terminado, reanudado: medir() }
  })
  expect(resultado.lateral).toEqual({
    clave: 'cuy-nino-animado-v1:izquierda:caminar_lado', volteado: true,
  })
  expect(resultado.aceptado).toBe(true)
  expect(resultado.pasos.map((paso) => paso.fotograma)).toEqual([6, 7, 8, 7, 8])
  for (const paso of resultado.pasos) {
    expect(paso).toMatchObject({
      clave: 'cuy-nino-animado-v1:izquierda:asustado', volteado: false, expresion: 'asustado',
    })
  }
  expect(resultado.completadas).toEqual(['cuy-nino-animado-v1:izquierda:asustado'])
  expect(resultado.terminado).toEqual({
    clave: 'cuy-nino-animado-v1:izquierda:quieto', fotograma: 4, volteado: true, expresion: null,
  })
  expect(resultado.reanudado).toEqual({
    clave: 'cuy-nino-animado-v1:frente:quieto', fotograma: 1, volteado: false, expresion: null,
  })
})
