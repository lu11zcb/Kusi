// Cancela a mano un trabajo que quedó «en proceso» en Spring (por ejemplo, porque se apagó
// el taller a la mitad): le avisa al buzón que falló, y así el panel deja de decir «se está
// preparando» y el docente puede borrarlo o intentarlo de nuevo.
//
//   node taller/liberar.mjs <id del trabajo> ["motivo"]
//
// Usa la misma configuración que el trabajador (la clave sale del .env y no se imprime).

import { cargarConfiguracion } from './trabajador/configuracion.js'
import { crearBuzon } from './trabajador/buzon.js'
import { esIdTrabajo } from '../kit/reproductor/datos/registroJuegos.js'

const [id, motivo = 'Cancelado a mano.'] = process.argv.slice(2)
if (!esIdTrabajo(id)) {
  console.error('Uso: node taller/liberar.mjs <id del trabajo> ["motivo"]')
  process.exit(2)
}
const configuracion = cargarConfiguracion()
if (!configuracion.clave) {
  console.error('Falta TALLER_CLAVE en el .env.')
  process.exit(1)
}
const buzon = crearBuzon({ url: configuracion.eduApiUrl, clave: configuracion.clave })
const respuesta = await buzon.fallo(id, motivo)
const significado = { 200: 'listo: el trabajo quedó como fallido y el panel ya lo libera.',
  404: 'ese trabajo no existe.', 409: 'el trabajo ya no estaba en proceso (ya terminó o ya se liberó).' }
console.log('Spring respondió ' + respuesta.estado + (significado[respuesta.estado] ? ': ' + significado[respuesta.estado] : '.'))
process.exit(respuesta.estado === 200 ? 0 : 1)
