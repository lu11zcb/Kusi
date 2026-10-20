import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { validarPaquete } from '../src/datos/validarPaquete.js'
import { generarPaquetePrueba } from '../src/datos/generarPaquetePrueba.js'

const rutaPaquete = new URL('../public/paquete-ejemplo.json', import.meta.url)

test('el paquete de ejemplo tiene una estructura válida', async () => {
  const contenido = await readFile(rutaPaquete, 'utf8')
  const paquete = JSON.parse(contenido)

  const resultado = validarPaquete(paquete)

  expect(resultado.valido, resultado.errores.join('; ')).toBe(true)
})

test('el generador de prueba devuelve un paquete válido', async () => {
  const contenido = await readFile(rutaPaquete, 'utf8')
  const paqueteBase = JSON.parse(contenido)

  const generado = await generarPaquetePrueba(paqueteBase)

  expect(generado).not.toBe(paqueteBase)
  expect(generado.titulo).toBe(paqueteBase.titulo)
  expect(validarPaquete(generado).valido).toBe(true)
})

test('el generador rechaza paquetes inválidos', async () => {
  await expect(
    generarPaquetePrueba({ formato: 'incorrecto' })
  ).rejects.toThrow('No se puede generar el juego')
})