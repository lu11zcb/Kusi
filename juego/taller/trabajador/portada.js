// La portada de cada juego: la imagen que ve el niño en la lista de juegos de la app para
// reconocerlo. El dibujante la pinta al terminar el juego, como la voz, con el mundo que
// describe el plan. No es una pieza del juego (no pasa por la aprobación de piezas): se
// guarda aparte como portada.png. Si no sale, el juego se entrega igual y la app usa su
// imagen de siempre.

import { copyFile, readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { dibujar } from '../dibujar.mjs'

export const ARCHIVO_PORTADA = 'portada.png'
const LARGO_DESCRIPCION = 600

// Qué se pinta: el título y la historia de la propuesta, y el mundo del plan («**Mundo:** …»).
export async function pedidoDePortada(carpeta) {
  const trabajo = JSON.parse(await readFile(path.join(carpeta, 'trabajo.json'), 'utf8'))
  const propuesta = trabajo.entrada?.propuesta ?? {}
  let mundo = null
  const plan = path.join(carpeta, 'plan.md')
  if (existsSync(plan)) {
    const linea = /^\*\*Mundo:\*\*\s*(.+)$/m.exec(await readFile(plan, 'utf8'))
    if (linea) mundo = linea[1].trim().slice(0, LARGO_DESCRIPCION)
  }
  const partes = [
    propuesta.titulo ? 'A game called «' + propuesta.titulo + '»' : null,
    propuesta.historia ? 'Story: ' + String(propuesta.historia).slice(0, LARGO_DESCRIPCION) : null,
    mundo ? 'Where it happens: ' + mundo : null,
  ].filter(Boolean)
  if (!partes.length) throw new Error('El trabajo no describe el juego (sin propuesta ni plan).')
  return { que: partes.join('. '), mundo }
}

export async function dibujarPortada({ carpeta, roles, lanzarRol, registrar, restanteMs, dibujarPieza = dibujar }) {
  if (restanteMs <= 0) return { estado: 'omitida', motivo: 'Se acabó el tiempo del trabajo.' }
  if (!roles?.dibujante) return { estado: 'omitida', motivo: 'No hay un rol de dibujante en el archivo de roles.' }
  try {
    const { que, mundo } = await pedidoDePortada(carpeta)
    registrar('Dibujando la portada del juego.')
    const resultado = await dibujarPieza({ carpeta, id: 'portada', que, portada: true, mundo }, { roles, lanzarRol })
    if (!resultado.pasa || !resultado.archivo) return { estado: 'sin_portada', motivo: resultado.motivo ?? 'La portada no pasó el filtro.' }
    await copyFile(resultado.archivo, path.join(carpeta, ARCHIVO_PORTADA))
    return { estado: 'dibujada' }
  } catch (error) {
    return { estado: 'sin_portada', motivo: error.message }
  }
}
