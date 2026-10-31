// Solo el catálogo actual. El fondo, los personajes y la interfaz tienen cargadores propios.
import { OBJETOS_KIT } from './kitFinal.js'
export function clavesDelPaquete() { return new Map(OBJETOS_KIT.map(tipo => [tipo, 'producto'])) }
export function pedirDibujos(escena, claves) {
  escena.load.maxRetries = 0
  for (const [clave] of claves) escena.load.image(clave, 'dibujos/' + clave + '.png')
}
export function completarConFiguras(escena, claves) {
  const faltantes = [...claves.keys()].filter(clave => !escena.textures.exists(clave))
  if (faltantes.length) throw new Error('[arte] Faltan ilustraciones: ' + faltantes.join(', '))
  return []
}
export function ajustarATamano(imagen, anchoMaximo, altoMaximo) {
  return imagen.setScale(Math.min(anchoMaximo / imagen.width, altoMaximo / imagen.height))
}
