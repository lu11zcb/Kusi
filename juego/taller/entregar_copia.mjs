// Entrega un juego ya terminado a un trabajo nuevo del buzón. Sirve cuando el docente borró su idea por error:
// vuelve a pedirla desde el panel, la aprueba y pulsa «Generar juego»; en vez de que el taller haga otro juego
// desde cero, este script toma ese trabajo y le entrega el que ya está en taller/trabajos/<id original>/.
//
//   node taller/entregar_copia.mjs <id del juego terminado>
//
// Antes: apaga los trabajadores (si no, alguno toma el trabajo y empieza a crearlo) y deja prendidos Spring y el
// servidor del juego (5174). Toma el trabajo pendiente más antiguo: si no es un juego del mismo curso, lo devuelve
// a la cola sin tocarlo. Usa la misma configuración que el trabajador (la clave sale del .env y no se imprime).

import path from 'node:path'
import { cp, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { cargarConfiguracion, CARPETA_TALLER } from './trabajador/configuracion.js'
import { crearBuzon } from './trabajador/buzon.js'
import { comprobarJuego } from './trabajador/comprobar.js'
import { escribirJson, leerJson, piezasNuevas } from './trabajador/carpeta.js'
import { esIdTrabajo } from '../kit/reproductor/datos/registroJuegos.js'

const [original] = process.argv.slice(2)
if (!esIdTrabajo(original)) {
  console.error('Uso: node taller/entregar_copia.mjs <id del juego terminado>')
  process.exit(2)
}
const trabajos = path.join(CARPETA_TALLER, 'trabajos')
const desde = path.join(trabajos, original)
if (!existsSync(path.join(desde, 'juego'))) {
  console.error('No existe el juego terminado: ' + path.join(desde, 'juego'))
  process.exit(1)
}
const configuracion = cargarConfiguracion()
if (!configuracion.clave) {
  console.error('Falta TALLER_CLAVE en el .env.')
  process.exit(1)
}
const buzon = crearBuzon({ url: configuracion.eduApiUrl, clave: configuracion.clave })
const cursoDe = (trabajo) => trabajo?.entrada?.solicitud?.curso ?? trabajo?.datos_entrada?.solicitud?.curso ?? null
const cursoOriginal = cursoDe(await leerJson(path.join(desde, 'trabajo.json')).catch(() => null))

// 1. Tomar el trabajo pendiente más antiguo y comprobar que es el juego que se volvió a pedir.
const trabajo = await buzon.siguiente()
if (!trabajo) {
  console.error('No hay ningún trabajo pendiente. Pide la idea en el panel, apruébala y pulsa «Generar juego».')
  process.exit(1)
}
const curso = cursoDe(trabajo)
if (trabajo.tipo !== 'crear_juego' || (cursoOriginal && curso !== cursoOriginal)) {
  // No es el nuestro: vuelve a la cola sin gastar un intento, para que un trabajador lo haga.
  await buzon.pausar(trabajo, { pausa: { hasta: Date.now() }, motivo: 'No era el juego que se iba a entregar a mano.' })
  console.error('El trabajo pendiente era otro (' + trabajo.tipo + ', ' + (curso ?? 'sin curso') + '): lo devolví a la cola.')
  process.exit(1)
}

// 2. Copiar el juego a la carpeta del trabajo nuevo (sin la evidencia ni la pausa del trabajo viejo).
const carpeta = path.join(trabajos, trabajo.id)
await cp(desde, carpeta, { recursive: true })
for (const archivo of ['evidencia.json', 'pausa.json']) await rm(path.join(carpeta, archivo), { force: true })
await escribirJson(path.join(carpeta, 'trabajo.json'), trabajo)

// 3. Las mismas comprobaciones del trabajador y la entrega de siempre.
console.log('Compruebo el juego en su carpeta nueva…')
const revision = await comprobarJuego({ carpeta, trabajo: trabajo.id, juegoUrl: configuracion.juegoUrl })
if (revision.motivos.length > 0 || !revision.paquete) {
  console.error('El juego no pasa las comprobaciones; no se entrega:')
  for (const motivo of revision.motivos) console.error('- ' + motivo)
  await buzon.fallo(trabajo.id, 'La copia del juego terminado no pasó las comprobaciones.')
  process.exit(1)
}
const anterior = (await leerJson(path.join(desde, 'evidencia.json')).catch(() => null)) ?? {}
const evidencia = {
  ...anterior, trabajo: trabajo.id, resultado: 'listo', motivo: null,
  entrega_del_equipo: { nota: 'El docente borró su idea por error; se entregó el juego ya terminado del trabajo ' + original + '.',
    fecha: new Date().toISOString() },
}
delete evidencia.pausa
const piezas = await piezasNuevas(carpeta)
const respuesta = await buzon.resultado(trabajo.id, { paquete: revision.paquete, piezas, evidencia })
if (respuesta.estado === 200) {
  await escribirJson(path.join(carpeta, 'evidencia.json'), evidencia)
  console.log('Listo: el juego volvió al panel del docente (trabajo ' + trabajo.id + ').')
  process.exit(0)
}
console.error('Spring rechazó la entrega (' + respuesta.estado + '):')
for (const motivo of respuesta.datos?.motivos ?? [respuesta.datos?.mensaje ?? 'sin detalle']) console.error('- ' + motivo)
await buzon.fallo(trabajo.id, 'La entrega de la copia no pasó la revisión de Spring.')
process.exit(1)
