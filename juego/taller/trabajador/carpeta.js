// La carpeta de cada trabajo (taller/entrega.md §1): se crea con lo que llegó del
// buzón y, si es una corrección, con una copia del juego anterior.

import { cp, mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { esIdTrabajo, PATRON_PIEZA } from '#kit/reproductor/datos/registroJuegos.js'
import { CARPETA_JUEGO } from './configuracion.js'

export function carpetaDe(trabajos, id) {
  if (!esIdTrabajo(id)) throw new Error('El trabajo «' + String(id) + '» no es un id válido.')
  return path.join(trabajos, id)
}

// Lo que revisa el supervisor antes de decidir (decisión 3): los juegos de ejemplo de
// juegos/ y los del taller ya aprobados, con sus piezas aprobadas.
export async function armarBiblioteca({ aprobados = { juegos: [], piezas: [] } } = {}) {
  const carpetaJuegos = path.join(CARPETA_JUEGO, 'juegos')
  const ejemplos = []
  for (const entrada of await readdir(carpetaJuegos, { withFileTypes: true })) {
    if (!entrada.isDirectory()) continue
    ejemplos.push({
      familia: entrada.name,
      carpeta: path.join(carpetaJuegos, entrada.name),
      readme: path.join(carpetaJuegos, entrada.name, 'README.md'),
    })
  }
  return {
    ejemplos,
    catalogo: path.join(CARPETA_JUEGO, 'kit', 'catalogo.json'),
    taller: aprobados.juegos,
    piezas_aprobadas: aprobados.piezas,
  }
}

// Crea la carpeta con trabajo.json y biblioteca.json. En «corregir_juego» copia antes
// juego/ y piezas/ del trabajo anterior: el supervisor modifica esa copia y la carpeta
// anterior no se toca (la juegan los estudiantes hasta que se envíe la nueva).
export async function prepararCarpeta(trabajo, { trabajos, biblioteca }) {
  const carpeta = carpetaDe(trabajos, trabajo.id)
  let anterior = null
  if (trabajo.tipo === 'corregir_juego') {
    const id = trabajo.entrada?.anterior?.trabajo
    if (esIdTrabajo(id) && existsSync(path.join(trabajos, id, 'juego'))) {
      anterior = path.join(trabajos, id)
      await cp(path.join(anterior, 'juego'), path.join(carpeta, 'juego'), { recursive: true })
      if (existsSync(path.join(anterior, 'piezas'))) {
        await cp(path.join(anterior, 'piezas'), path.join(carpeta, 'piezas'), { recursive: true })
      }
    }
  }
  for (const sub of ['juego', 'piezas', 'revision']) await mkdir(path.join(carpeta, sub), { recursive: true })
  // Solo lo que trajo el buzón: la propuesta aprobada y el tema, sin datos de niños.
  await escribirJson(path.join(carpeta, 'trabajo.json'), {
    id: trabajo.id, tipo: trabajo.tipo, intentos: trabajo.intentos, entrada: trabajo.entrada,
  })
  await escribirJson(path.join(carpeta, 'biblioteca.json'), biblioteca)
  return { carpeta, anterior }
}

// Las piezas nuevas de este trabajo: los PNG de piezas/ con un nombre válido, menos los
// que ya traía la copia del juego anterior. Un nombre que empieza con «fondo-» es un fondo.
export async function piezasNuevas(carpeta, anterior = null) {
  const deAntes = new Set(anterior ? await nombresDePiezas(anterior) : [])
  return (await nombresDePiezas(carpeta))
    .filter((id) => !deAntes.has(id))
    .map((id) => ({ id, tipo: id.startsWith('fondo-') ? 'fondo' : 'objeto' }))
}

async function nombresDePiezas(carpeta) {
  const piezas = path.join(carpeta, 'piezas')
  if (!existsSync(piezas)) return []
  return (await readdir(piezas, { withFileTypes: true }))
    .filter((archivo) => archivo.isFile() && archivo.name.endsWith('.png'))
    .map((archivo) => archivo.name.slice(0, -'.png'.length))
    .filter((id) => PATRON_PIEZA.test(id))
    .sort()
}

export async function escribirJson(archivo, datos) {
  await writeFile(archivo, JSON.stringify(datos, null, 2) + '\n')
}

export async function leerJson(archivo) {
  return JSON.parse(await readFile(archivo, 'utf8'))
}
