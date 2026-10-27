import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { DIRECCIONES_PERSONAJE, validarSpritePersonaje } from '../src/datos/validarSpritePersonaje.js'

const leerZorro = async () => JSON.parse(await readFile(
  new URL('../public/dibujos/zorro-animado-v1.json', import.meta.url), 'utf8',
))

test('el zorro usa su propio manifiesto, caminar continuo y el cuadro quieto central', async () => {
  const datos = validarSpritePersonaje(await leerZorro(), 'zorro')
  expect(datos.fotograma).toEqual({ ancho: 256, alto: 256 })
  expect(datos.cuadricula).toEqual({ columnas: 3, filas: 5 })
  for (const direccion of DIRECCIONES_PERSONAJE) {
    const inicio = { frente: 0, derecha: 3, izquierda: 3, espaldas: 6 }[direccion]
    expect(datos.animaciones[direccion].caminar).toMatchObject({
      fotogramas: [inicio, inicio + 1, inicio + 2, inicio + 1], fps: 8, repetir: -1,
    })
    expect(datos.animaciones[direccion].quieto.fotogramas).toEqual([inicio + 1])
    expect(datos.animaciones[direccion].caminar.voltear === true).toBe(direccion === 'izquierda')
    expect(datos.animaciones[direccion].cansado.fotogramas).toEqual([9, 10, 11, 10])
  }
})

test('el contrato rechaza voltear frente o espalda y las transiciones sin destino válido', async () => {
  const datos = await leerZorro()
  const modificar = (animacion, direccion = 'frente') => ({
    ...datos,
    animaciones: {
      ...datos.animaciones,
      [direccion]: { ...datos.animaciones[direccion], prueba: animacion },
    },
  })
  const finita = { fotogramas: [0, 1, 2], fps: 8, repetir: 0, siguiente: 'quieto' }
  expect(validarSpritePersonaje(modificar(finita))).toBeTruthy()
  for (const direccion of ['frente', 'espaldas']) {
    expect(() => validarSpritePersonaje(modificar({ ...finita, voltear: true }, direccion)))
      .toThrow('No se puede voltear una vista frontal o de espaldas')
  }
  expect(() => validarSpritePersonaje(modificar({ ...finita, siguiente: 'inexistente' })))
    .toThrow('Estado siguiente inexistente')
  expect(() => validarSpritePersonaje(modificar({ ...finita, repetir: -1 })))
    .toThrow('El estado siguiente necesita una animación finita')
})

test('el motor compartido conserva una expresión finita y vuelve al estado del manifiesto', async ({ page: pagina }) => {
  await pagina.goto('/')
  await pagina.waitForFunction(() => window.kusi?.listo)
  const resultado = await pagina.evaluate(async () => {
    const { PersonajeAnimado } = await import('/src/dibujos/personajeAnimado.js')
    const datos = await (await fetch('/dibujos/zorro-animado-v1.json')).json()
    datos.animaciones.frente.prueba = { fotogramas: [0, 1, 2], fps: 8, repetir: 0, siguiente: 'quieto' }
    const reproducidas = []
    const intervalos = []
    const personaje = Object.assign(Object.create(PersonajeAnimado.prototype), {
      datosSprite: datos,
      clavePersonaje: 'prueba',
      relojManual: true,
      direccionAnimada: 'frente',
      setFlipX: () => {},
      play: (clave) => reproducidas.push(clave),
      anims: { update: (tiempo, intervalo) => intervalos.push(intervalo) },
    })
    personaje.mostrarEstado('prueba')
    personaje.animarMovimiento('izquierda', 10, 0.125, 1000)
    const antesDeTerminar = [...reproducidas]
    personaje.terminarEstado({ key: 'otro:frente:prueba' })
    const pendiente = personaje.estadoExpresivo
    personaje.terminarEstado({ key: 'prueba:frente:prueba' })
    return { antesDeTerminar, pendiente, reproducidas, intervalos, expresionFinal: personaje.estadoExpresivo }
  })
  expect(resultado.antesDeTerminar).toEqual(['prueba:frente:prueba'])
  expect(resultado.pendiente).toBe('prueba')
  expect(resultado.reproducidas).toEqual(['prueba:frente:prueba', 'prueba:frente:quieto'])
  expect(resultado.intervalos).toEqual([125])
  expect(resultado.expresionFinal).toBeNull()
})
