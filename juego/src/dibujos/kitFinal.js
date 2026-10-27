export const OBJETOS_KIT = Object.freeze(['fresa', 'platano', 'mango', 'mandarina', 'pina', 'zanahoria', 'papa', 'choclo'])
export const PIEZAS_MURO = Object.freeze(Array.from({ length: 16 }, (_, n) => n.toString(2).padStart(4, '0'))
  .flatMap(codigo => ['a', 'b'].map(v => 'muro-' + codigo + '-' + v)))
export const PIEZAS_PANEL = Object.freeze(['barra-frutas', 'globo-dialogo-160', 'globo-dialogo-232', 'globo-dialogo-304', 'boton-voz', 'boton-ayuda',
  'boton-silencio', 'boton-sonido', 'check-fruta', 'joystick-base', 'joystick-perilla'])
export const IMAGENES_KIT = Object.freeze(['tierra-patio', 'borde-pasto', 'portal-cerrado', 'portal-abierto',
  ...PIEZAS_MURO, ...PIEZAS_PANEL, ...OBJETOS_KIT.map(tipo => tipo + '-silueta')])
export function vecinosMuro(mapa, fila, columna) {
  return [[fila - 1, columna], [fila, columna + 1], [fila + 1, columna], [fila, columna - 1]]
    .map(([f, c]) => mapa[f]?.[c] === '#' ? '1' : '0').join('')
}
export function varianteMuro(semilla, fila, columna) {
  let valor = 2166136261
  for (const letra of String(semilla) + ':' + fila + ':' + columna) valor = Math.imul(valor ^ letra.charCodeAt(0), 16777619) >>> 0
  return valor % 5 === 0 ? 'b' : 'a'
}
export function texturaMuro(mapa, fila, columna, semilla) { return 'muro-' + vecinosMuro(mapa, fila, columna) + '-' + varianteMuro(semilla, fila, columna) }
export function pedirKitFinal(escena) {
  for (const clave of IMAGENES_KIT) {
    if (!escena.textures.exists(clave)) escena.load.image(clave, 'dibujos/kit-final/' + clave + '.png')
  }
}
