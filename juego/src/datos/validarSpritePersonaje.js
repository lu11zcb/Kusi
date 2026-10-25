// Contrato común de las hojas dibujadas: cada personaje conserva su manifiesto,
// pero el cargador y las comprobaciones no dependen de su especie o su nombre.
export const DIRECCIONES_PERSONAJE = ['frente', 'espaldas', 'derecha', 'izquierda']
export const ESTADOS_PERSONAJE = ['reposo', 'caminar']

export function validarSpritePersonaje(datos, personaje = 'personaje') {
  const exigir = (condicion, mensaje) => {
    if (!condicion) throw new Error('[' + personaje + '] ' + mensaje)
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
  for (const direccion of DIRECCIONES_PERSONAJE) {
    const animaciones = datos.animaciones?.[direccion]
    for (const estado of ESTADOS_PERSONAJE) {
      exigir(animaciones?.[estado] != null, 'Falta la animación de ' + direccion + '/' + estado)
    }
    // Los estados expresivos y laterales pasan las mismas comprobaciones que
    // caminar. Un estado «siguiente» debe existir en esa misma dirección para
    // poder volver a quieto al terminar sin inventar fotogramas en JavaScript.
    for (const [estado, animacion] of Object.entries(animaciones)) {
      const nombre = direccion + '/' + estado
      exigir(positivo(animacion?.fps), 'Falta la cadencia de ' + nombre)
      exigir(Array.isArray(animacion.fotogramas) && animacion.fotogramas.length > 0, 'Faltan fotogramas de ' + nombre)
      exigir(animacion.fotogramas.every((indice) => Number.isInteger(indice) && indice >= 0 && indice < columnas * filas), 'Índice fuera de la hoja en ' + nombre)
      exigir(animacion.repetir === undefined || (Number.isInteger(animacion.repetir) && animacion.repetir >= -1), 'Repetición inválida de ' + nombre)
      exigir(animacion.voltear === undefined || typeof animacion.voltear === 'boolean', 'Volteo inválido de ' + nombre)
      exigir(!animacion.voltear || direccion === 'izquierda' || direccion === 'derecha', 'No se puede voltear una vista frontal: ' + nombre)
      exigir(animacion.siguiente === undefined || (typeof animacion.siguiente === 'string' && animaciones[animacion.siguiente] != null), 'Estado siguiente inexistente en ' + nombre)
      exigir(animacion.siguiente === undefined || (animacion.repetir !== undefined && animacion.repetir >= 0), 'El estado siguiente necesita una animación finita en ' + nombre)
    }
  }
  return datos
}
