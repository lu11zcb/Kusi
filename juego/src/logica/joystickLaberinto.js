export const JOYSTICK = Object.freeze({ radio: 60, radioPerilla: 27, zonaMuerta: 18 })

// Las medidas son píxeles visibles del navegador, no casillas ni píxeles del
// mundo de Phaser. El mismo gesto conserva su sensibilidad al girar el móvil.
export function leerGestoJoystick(inicio, punto, opciones = JOYSTICK) {
  const x = punto.x - inicio.x
  const y = punto.y - inicio.y
  const distancia = Math.hypot(x, y)
  if (!Number.isFinite(distancia)) return { direccion: null, x: 0, y: 0 }
  const limite = opciones.radio - opciones.radioPerilla
  const proporcion = distancia > limite ? limite / distancia : 1
  const direccion = distancia < opciones.zonaMuerta ? null
    : Math.abs(x) >= Math.abs(y) ? (x >= 0 ? 'derecha' : 'izquierda')
      : (y >= 0 ? 'abajo' : 'arriba')
  return { direccion, x: x * proporcion, y: y * proporcion }
}
