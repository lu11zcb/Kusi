// Contrato de la hoja del jugador; los índices recorren filas de izquierda a derecha.
export const DIRECCIONES_CUY = ['frente', 'espaldas', 'derecha', 'izquierda']
export const ESTADOS_CUY = ['reposo', 'caminar']

export function validarSpriteCuy(datos) {
  const exigir = (condicion, mensaje) => {
    if (!condicion) throw new Error('[cuy] ' + mensaje)
  }
  const positivo = (valor) => Number.isFinite(valor) && valor > 0
  const enteroPositivo = (valor) => Number.isInteger(valor) && valor > 0

  exigir(datos?.formato === 'kusi-sprite/1', 'Formato de manifiesto desconocido')
  exigir(typeof datos.imagen === 'string' && /^[a-z0-9][a-z0-9-]*\.png$/i.test(datos.imagen), 'La imagen debe ser un PNG de dibujos/')
  const { ancho, alto } = datos.fotograma ?? {}
  const { columnas, filas } = datos.cuadricula ?? {}
  exigir(enteroPositivo(ancho) && enteroPositivo(alto), 'Dimensiones de fotograma inválidas')
  exigir(enteroPositivo(columnas) && enteroPositivo(filas), 'Cuadrícula inválida')
  const { x, y } = datos.anclaje ?? {}
  exigir(Number.isFinite(x) && x >= 0 && x <= ancho && Number.isFinite(y) && y >= 0 && y <= alto, 'Anclaje fuera del fotograma')
  exigir(positivo(datos.escala), 'La escala debe ser un número positivo')
  exigir(positivo(datos.velocidadReferencia), 'Velocidad de referencia inválida')
  for (const direccion of DIRECCIONES_CUY) {
    const animaciones = datos.animaciones?.[direccion]
    for (const estado of ESTADOS_CUY) {
      exigir(animaciones?.[estado] != null, 'Falta la animación de ' + direccion + '/' + estado)
    }
    // Además de los estados de movimiento, se validan quieto y cualquier estado
    // expresivo presente. Así ningún cuadro adicional evita los mismos controles.
    for (const [estado, animacion] of Object.entries(animaciones)) {
      const nombre = direccion + '/' + estado
      exigir(positivo(animacion?.fps), 'Falta la cadencia de ' + nombre)
      exigir(Array.isArray(animacion.fotogramas) && animacion.fotogramas.length > 0, 'Faltan fotogramas de ' + nombre)
      exigir(animacion.fotogramas.every((indice) => Number.isInteger(indice) && indice >= 0 && indice < columnas * filas), 'Índice fuera de la hoja en ' + nombre)
      exigir(animacion.repetir === undefined || (Number.isInteger(animacion.repetir) && animacion.repetir >= -1), 'Repetición inválida de ' + nombre)
    }
  }
  return datos
}
