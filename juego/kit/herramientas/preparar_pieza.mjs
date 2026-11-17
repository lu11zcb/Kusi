// Prepara una pieza con preparar_pieza.swift (la visión de macOS quita el fondo blanco).
// La primera vez lo compila (unos 25 s) en kit/herramientas/.compilado/, que no se sube;
// después cada pieza tarda menos de un segundo.
//
//   node kit/herramientas/preparar_pieza.mjs <original.png> <pieza.png> [--apoyado | --fondo]

import { execFile } from 'node:child_process'
import { existsSync, statSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const ejecutar = promisify(execFile)
const CARPETA = path.dirname(fileURLToPath(import.meta.url))
const FUENTE = path.join(CARPETA, 'preparar_pieza.swift')
const PROGRAMA = path.join(CARPETA, '.compilado', 'preparar_pieza')

// Se recompila si cambió el código fuente.
async function compilar() {
  if (existsSync(PROGRAMA) && statSync(PROGRAMA).mtimeMs >= statSync(FUENTE).mtimeMs) return PROGRAMA
  await mkdir(path.dirname(PROGRAMA), { recursive: true })
  await ejecutar('swiftc', ['-O', FUENTE, '-o', PROGRAMA], { timeout: 180_000 })
  return PROGRAMA
}

// Devuelve lo que informó la herramienta ({ tipo, lado_mayor, instancias }) o lanza un
// error con su motivo (por ejemplo, «No se encontró ninguna figura en la imagen»).
export async function prepararPieza(original, destino, { apoyado = false, fondo = false, figura = false, recorte = false } = {}) {
  const programa = await compilar()
  const opciones = recorte ? ['--recorte'] : fondo ? ['--fondo'] : figura ? ['--figura'] : apoyado ? ['--apoyado'] : []
  try {
    const { stdout } = await ejecutar(programa, [original, destino, ...opciones], { timeout: 60_000 })
    return JSON.parse(stdout.trim().split('\n').at(-1))
  } catch (error) {
    throw new Error(String(error.stderr || error.message).trim())
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [original, destino] = process.argv.slice(2)
  if (!original || !destino) {
    console.error('Uso: node kit/herramientas/preparar_pieza.mjs <original.png> <pieza.png> [--apoyado | --fondo | --figura]')
    process.exit(2)
  }
  try {
    console.log(JSON.stringify(await prepararPieza(original, destino, {
      apoyado: process.argv.includes('--apoyado'), fondo: process.argv.includes('--fondo'), figura: process.argv.includes('--figura'),
    })))
  } catch (error) {
    console.error(error.message)
    process.exit(1)
  }
}
