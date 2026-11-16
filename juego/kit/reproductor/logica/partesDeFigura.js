// Una figura entera que el juego corta en partes. El dibujante dibuja la figura completa
// (un muñeco, una casa, un animal quieto…, id «figura-<nombre>», 768 × 768) y el juego la
// corta con rectángulos: cada parte es un recorte de la MISMA imagen, así que armada queda
// exactamente igual que la figura entera, sin costuras ni piezas que no encajan.
//
// Sin Phaser, para probarlo con node --test. Los rectángulos van en fracciones de la
// imagen (de 0 a 1), así no dependen del tamaño del PNG:
//   { cabeza: { x: 0.30, y: 0.02, ancho: 0.40, alto: 0.30 }, tronco: { … } }

export const LADO_FIGURA = 768

// Revisa los rectángulos: nombres válidos, números dentro de la imagen y sin repetir.
export function revisarPartes(partes) {
  const errores = []
  if (!partes || typeof partes !== 'object' || Array.isArray(partes) || Object.keys(partes).length < 2) {
    return ['Hacen falta al menos 2 partes: { nombre: { x, y, ancho, alto } } en fracciones de 0 a 1.']
  }
  for (const [nombre, caja] of Object.entries(partes)) {
    if (!/^[a-z][a-z0-9_]{1,30}$/.test(nombre)) errores.push('La parte «' + nombre + '» necesita un nombre en minúsculas, sin tildes.')
    const { x, y, ancho, alto } = caja ?? {}
    const numeros = [x, y, ancho, alto]
    if (!numeros.every((valor) => Number.isFinite(valor))) { errores.push('La parte «' + nombre + '» necesita x, y, ancho y alto.'); continue }
    if (x < 0 || y < 0 || ancho <= 0 || alto <= 0 || x + ancho > 1.0001 || y + alto > 1.0001) {
      errores.push('La parte «' + nombre + '» se sale de la imagen o no tiene tamaño.')
    }
  }
  return errores
}

// Los marcos en píxeles de una imagen de «lado» × «lado».
export function marcosDeFigura(partes, lado = LADO_FIGURA) {
  const errores = revisarPartes(partes)
  if (errores.length) throw new Error(errores.join(' '))
  return Object.entries(partes).map(([nombre, caja]) => ({
    nombre, x: Math.round(caja.x * lado), y: Math.round(caja.y * lado),
    ancho: Math.round(caja.ancho * lado), alto: Math.round(caja.alto * lado),
  }))
}

// Dónde queda el centro de una parte, respecto del centro de la figura entera, cuando la
// figura se muestra con «escala» (1 = 768 px). Armar una parte es llevar su imagen a
// figura.x + dx, figura.y + dy.
export function desplazamientoDeParte(caja, escala = 1, lado = LADO_FIGURA) {
  return {
    dx: ((caja.x + caja.ancho / 2) * lado - lado / 2) * escala,
    dy: ((caja.y + caja.alto / 2) * lado - lado / 2) * escala,
  }
}
