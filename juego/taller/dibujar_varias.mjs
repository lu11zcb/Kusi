// Pide varias piezas al dibujante a la vez, con un solo comando. Una por una tardaban
// 1 minuto cada una (11 piezas = 11 minutos); juntas tardan unos 2 o 3.
//
//   node taller/dibujar_varias.mjs --carpeta <carpeta del trabajo> --piezas '<JSON>' --mundo "<el mundo de la aventura>"
//
// <JSON> es una lista de { id, que, fondo?, cuento?, figura?, criatura?, apoyado? }, con lo mismo que
// recibe dibujar.mjs por pieza. Responde un JSON con una lista de los resultados, uno por
// pieza y en el mismo orden (cada uno trae «siguiente»: revisor, corregir o respaldo).
// «--mundo» describe el mundo de la aventura (por ejemplo, de qué está hecho): se le dice a cada pieza
// para que todo parezca del mismo lugar (reglas.md, 13.10). Las correcciones se piden después, de una en una, con dibujar.mjs --correccion.

import path from 'node:path'
import { parseArgs } from 'node:util'
import { dibujar } from './dibujar.mjs'
import { leerRoles } from './trabajador/roles.js'
import { CARPETA_TALLER } from './trabajador/configuracion.js'

// Cuántas piezas se dibujan al mismo tiempo: la herramienta de imágenes aguanta varias, pero
// no conviene pedirle doce de golpe.
export const MAX_EN_PARALELO = 6

// «dibujarPieza» permite probarlo sin la herramienta de imágenes.
export async function dibujarVarias({ carpeta, piezas, mundo = null }, { roles, dibujarPieza = dibujar } = {}) {
  if (!Array.isArray(piezas) || piezas.length === 0) {
    return [{ id: null, pasa: false, motivo: 'Falta --piezas: una lista JSON de { id, que, fondo?, cuento?, apoyado? }.' }]
  }
  const ids = piezas.map((pieza) => pieza?.id)
  if (new Set(ids).size !== ids.length) {
    return [{ id: null, pasa: false, motivo: 'Hay ids repetidos en --piezas: cada pieza se pide una sola vez.' }]
  }
  const resultados = new Array(piezas.length)
  let siguiente = 0
  // Un grupo de trabajadores toma la siguiente pieza de la lista cuando termina la suya.
  const trabajador = async () => {
    while (siguiente < piezas.length) {
      const numero = siguiente
      siguiente += 1
      const pieza = piezas[numero] ?? {}
      try {
        resultados[numero] = await dibujarPieza({ mundo, ...pieza, carpeta }, { roles })
      } catch (error) {
        resultados[numero] = { id: pieza.id ?? null, pasa: false, siguiente: 'corregir', motivo: 'El dibujante falló: ' + String(error?.message ?? error) }
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(MAX_EN_PARALELO, piezas.length) }, trabajador))
  return resultados
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  const { values } = parseArgs({ options: { carpeta: { type: 'string' }, piezas: { type: 'string' }, mundo: { type: 'string' } } })
  let piezas = null
  try { piezas = JSON.parse(values.piezas ?? 'null') } catch { piezas = null }
  const roles = await leerRoles(process.env.TALLER_ROLES ?? path.join(CARPETA_TALLER, 'roles.local.json'))
  console.log(JSON.stringify(await dibujarVarias({ carpeta: values.carpeta, piezas, mundo: values.mundo ?? null }, { roles })))
}
