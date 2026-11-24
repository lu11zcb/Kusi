import { register } from 'node:module'
import { isMainThread } from 'node:worker_threads'

const trabajador = new URL('../../taller/trabajador.js', import.meta.url).href
const procesar = new URL('../../taller/trabajador/procesar.js', import.meta.url).href

// Inyecta un archivo ausente en el proceso de prueba. La comprobación del motor
// y la decisión de omitir la grabación las toma el trabajador real.
const modulo = `
import { procesarTrabajo as procesar } from ${JSON.stringify(procesar)}
export const procesarTrabajo = (trabajo, dependencias) => procesar(trabajo, {
  ...dependencias,
  archivosMotor: [process.env.ARCHIVO_MOTOR_DE_PRUEBA],
})
`

// El mismo archivo se precarga en el proceso y luego se ejecuta como cargador.
if (isMainThread) register(import.meta.url)

export function resolve(especificador, contexto, siguiente) {
  if (contexto.parentURL === trabajador && especificador === './trabajador/procesar.js') {
    return { url: 'data:text/javascript,' + encodeURIComponent(modulo), shortCircuit: true }
  }
  return siguiente(especificador, contexto)
}
