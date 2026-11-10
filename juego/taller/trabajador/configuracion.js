// La configuración del trabajador. Las claves salen del .env de la raíz del proyecto
// y nunca se imprimen: en la consola solo se dice si están o no.

import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

export const CARPETA_TALLER = fileURLToPath(new URL('../', import.meta.url))
export const CARPETA_JUEGO = path.resolve(CARPETA_TALLER, '..')
export const CARPETA_RAIZ = path.resolve(CARPETA_JUEGO, '..')

// Lee un .env: «NOMBRE=valor» por línea, sin comentarios ni líneas vacías. Las
// comillas que rodean un valor se quitan.
export function leerEnv(texto) {
  const valores = {}
  for (const linea of texto.split(/\r?\n/)) {
    const limpia = linea.trim()
    if (limpia === '' || limpia.startsWith('#') || !limpia.includes('=')) continue
    const nombre = limpia.slice(0, limpia.indexOf('=')).trim()
    let valor = limpia.slice(limpia.indexOf('=') + 1).trim()
    if (valor.length >= 2 && (valor[0] === '"' || valor[0] === "'") && valor.at(-1) === valor[0]) valor = valor.slice(1, -1)
    valores[nombre] = valor
  }
  return valores
}

// Lo que ya está en el entorno gana a lo del archivo, como en Spring. TALLER_ENV
// cambia el archivo (las pruebas usan uno falso) y TALLER_ROLES, el de los roles.
export function cargarConfiguracion(entorno = process.env) {
  const archivo = entorno.TALLER_ENV ?? path.join(CARPETA_RAIZ, '.env')
  const delArchivo = existsSync(archivo) ? leerEnv(readFileSync(archivo, 'utf8')) : {}
  const valor = (nombre, porOmision = '') => entorno[nombre] ?? delArchivo[nombre] ?? porOmision
  return {
    eduApiUrl: valor('EDU_API_URL', 'http://127.0.0.1:8080'),
    clave: valor('TALLER_CLAVE'),
    // Donde el revisor y el trabajador abren los juegos (el Vite de esta Mac).
    juegoUrl: valor('TALLER_JUEGO_URL', 'http://127.0.0.1:5174/'),
    roles: entorno.TALLER_ROLES ?? path.join(CARPETA_TALLER, 'roles.local.json'),
    trabajos: entorno.TALLER_TRABAJOS ?? path.join(CARPETA_TALLER, 'trabajos'),
    // 12 minutos por trabajo: Spring da por perdido uno que pasa 15 en proceso.
    limiteMs: Number(entorno.TALLER_LIMITE_MS ?? 12 * 60 * 1000),
    esperaMs: Number(entorno.TALLER_ESPERA_MS ?? 5000),
  }
}
