import { validarPaquete } from './validarPaquete.js'

// Simula la respuesta de un generador de juegos.
// Por ahora utiliza el paquete de ejemplo; no llama a una IA real.
export async function generarPaquetePrueba(paqueteBase) {
  const validacion = validarPaquete(paqueteBase)

  if (!validacion.valido) {
    throw new Error(
      `No se puede generar el juego: ${validacion.errores.join('; ')}`
    )
  }

  // Copia independiente para evitar modificar el paquete original.
  const paqueteGenerado = structuredClone(paqueteBase)

  return paqueteGenerado
}