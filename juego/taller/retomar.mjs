// Retoma un juego que se detuvo: uno que falló (por ejemplo, por el tiempo límite que había
// antes) o uno que quedó en pausa hasta más tarde. Spring lo devuelve a la cola desde ya y el
// primer trabajador libre lo sigue donde quedó: el supervisor lee plan.md, evidencia.json y lo
// que hay en piezas/, juego/ y revision/, y continúa desde el primer paso pendiente.
//
//   node taller/retomar.mjs <id del trabajo>
//
// Usa la misma configuración que el trabajador (la clave sale del .env y no se imprime).
// Los trabajadores tienen que estar prendidos con el código de hoy: uno que quedó esperando
// una pausa hasta mañana no toma nada hasta entonces (se reinicia con Ctrl+C y npm run taller).

import { existsSync } from 'node:fs'
import path from 'node:path'
import { cargarConfiguracion } from './trabajador/configuracion.js'
import { crearBuzon } from './trabajador/buzon.js'
import { carpetaDe, escribirJson, leerJson } from './trabajador/carpeta.js'
import { esIdTrabajo } from '../kit/reproductor/datos/registroJuegos.js'

const [id] = process.argv.slice(2)
if (!esIdTrabajo(id)) {
  console.error('Uso: node taller/retomar.mjs <id del trabajo>')
  process.exit(2)
}
const configuracion = cargarConfiguracion()
if (!configuracion.clave) {
  console.error('Falta TALLER_CLAVE en el .env.')
  process.exit(1)
}
const carpeta = carpetaDe(configuracion.trabajos, id)
if (!existsSync(path.join(carpeta, 'trabajo.json'))) {
  console.error('No encuentro la carpeta de ese trabajo en ' + configuracion.trabajos + '.')
  process.exit(1)
}

// pausa.json le dice al trabajador que el trabajo se retoma y no empieza de cero. Un juego en
// pausa ya lo tiene; a uno que falló se le arma con lo que guardó su evidencia (los pasos y las
// correcciones), sin contar como intento el que se cortó.
const archivoPausa = path.join(carpeta, 'pausa.json')
if (!existsSync(archivoPausa)) {
  const evidencia = existsSync(path.join(carpeta, 'evidencia.json')) ? await leerJson(path.join(carpeta, 'evidencia.json')) : {}
  await escribirJson(archivoPausa, {
    intento: 0, motivos: null, pasos: evidencia.pasos ?? [], correcciones: evidencia.correcciones ?? [], avisos: [],
    pausa: { rol: 'supervisor', hasta: Date.now(), sondear: false },
  })
}

const buzon = crearBuzon({ url: configuracion.eduApiUrl, clave: configuracion.clave })
const respuesta = await buzon.retomar(id)
const significado = {
  200: 'listo: el juego volvió a la cola y el primer trabajador libre lo sigue donde quedó.',
  404: 'ese trabajo no existe (o Spring no se reinició con la ruta nueva).',
  409: respuesta.datos?.mensaje ?? 'ese trabajo no se puede retomar.',
}
console.log('Spring respondió ' + respuesta.estado + (significado[respuesta.estado] ? ': ' + significado[respuesta.estado] : '.'))
process.exit(respuesta.estado === 200 ? 0 : 1)
