// Entrega a mano un juego del taller que falló y que el equipo terminó de corregir en su carpeta
// (taller/trabajos/<id>/). Reabre el trabajo en Spring, comprueba la carpeta con las mismas
// comprobaciones que usa el trabajador y entrega el resultado por la ruta de siempre: Spring lo
// revisa igual que cualquier entrega y el docente ve su juego listo en el panel.
//
//   node taller/reentregar.mjs <id del trabajo> ["qué corrigió el equipo"]
//
// Si la carpeta no pasa las comprobaciones, no se reabre nada. Si Spring rechaza la entrega, el
// trabajo vuelve a quedar fallido: abierto, vencería y el taller lo haría de nuevo desde cero.
// Usa la misma configuración que el trabajador (la clave sale del .env y no se imprime). Spring y
// el servidor del juego (5174) tienen que estar prendidos.

import path from 'node:path'
import { existsSync } from 'node:fs'
import { cargarConfiguracion, CARPETA_TALLER } from './trabajador/configuracion.js'
import { crearBuzon } from './trabajador/buzon.js'
import { comprobarJuego } from './trabajador/comprobar.js'
import { escribirJson, leerJson, piezasNuevas } from './trabajador/carpeta.js'
import { esIdTrabajo } from '../kit/reproductor/datos/registroJuegos.js'

const [id, nota = 'El equipo corrigió el juego a mano después del fallo del taller.'] = process.argv.slice(2)
if (!esIdTrabajo(id)) {
  console.error('Uso: node taller/reentregar.mjs <id del trabajo> ["qué corrigió el equipo"]')
  process.exit(2)
}
const carpeta = path.join(CARPETA_TALLER, 'trabajos', id)
if (!existsSync(path.join(carpeta, 'juego'))) {
  console.error('No existe la carpeta del juego: ' + path.join(carpeta, 'juego'))
  process.exit(1)
}
const configuracion = cargarConfiguracion()
if (!configuracion.clave) {
  console.error('Falta TALLER_CLAVE en el .env.')
  process.exit(1)
}

// 1. Las mismas comprobaciones del trabajador, antes de tocar Spring.
console.log('Compruebo la carpeta del juego…')
const revision = await comprobarJuego({ carpeta, trabajo: id, juegoUrl: configuracion.juegoUrl })
for (const aviso of revision.avisos ?? []) console.log('Aviso: ' + aviso)
if (revision.motivos.length > 0 || !revision.paquete) {
  console.error('La carpeta no pasa las comprobaciones; no se entrega nada:')
  for (const motivo of revision.motivos) console.error('- ' + motivo)
  process.exit(1)
}

// 2. Reabrir en Spring.
const buzon = crearBuzon({ url: configuracion.eduApiUrl, clave: configuracion.clave })
const reabierto = await buzon.reabrir(id)
if (reabierto.estado !== 200) {
  console.error('Spring no reabrió el trabajo (' + reabierto.estado + '): ' + (reabierto.datos?.mensaje ?? reabierto.datos?.detail ?? ''))
  process.exit(1)
}

// 3. Entregar. La evidencia es la del trabajo, con el resultado nuevo y la nota del equipo.
const anterior = (await leerJson(path.join(carpeta, 'evidencia.json')).catch(() => null)) ?? {}
const evidencia = {
  ...anterior,
  trabajo: id,
  resultado: 'listo',
  motivo: null,
  motivo_del_fallo: anterior.motivo ?? null,
  entrega_del_equipo: { nota, fecha: new Date().toISOString() },
}
delete evidencia.pausa
const piezas = await piezasNuevas(carpeta)
const respuesta = await buzon.resultado(id, { paquete: revision.paquete, piezas, evidencia })
if (respuesta.estado === 200) {
  await escribirJson(path.join(carpeta, 'evidencia.json'), evidencia)
  console.log('Listo: Spring recibió el juego (' + piezas.length + (piezas.length === 1 ? ' pieza nueva' : ' piezas nuevas') +
    '). El docente ya lo ve en su panel.')
  process.exit(0)
}

// 4. No pasó: se vuelve a cerrar para que el taller no lo tome de nuevo.
const motivos = respuesta.datos?.motivos ?? [respuesta.datos?.mensaje ?? 'sin detalle']
console.error('Spring rechazó la entrega (' + respuesta.estado + '):')
for (const motivo of motivos) console.error('- ' + motivo)
const cerrado = await buzon.fallo(id, 'La entrega del equipo no pasó la revisión de Spring: ' + motivos.join(' | '))
console.error('El trabajo volvió a quedar fallido (Spring respondió ' + cerrado.estado + ').')
process.exit(1)
