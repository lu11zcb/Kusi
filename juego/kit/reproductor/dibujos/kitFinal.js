export const OBJETOS_KIT = Object.freeze(['fresa', 'platano', 'mango', 'mandarina', 'pina', 'zanahoria', 'papa', 'choclo'])
// Los muros son dos cubos de adobe sueltos: «a», el de siempre, y «b», una variante
// con otra textura. Cada «#» del mapa es un cubo; la semilla del nivel elige cuál.
export const PIEZAS_MURO = Object.freeze(['muro-a', 'muro-b'])
export const PIEZAS_PANEL = Object.freeze(['barra-frutas', 'globo-dialogo-160', 'globo-dialogo-232', 'globo-dialogo-304', 'boton-voz', 'boton-ayuda',
  'boton-silencio', 'boton-sonido', 'check-fruta', 'joystick-base', 'joystick-perilla'])
// Dónde está cada pieza dentro de dibujos/: el mundo o la interfaz. La clave de
// Phaser no cambia aunque el archivo esté en otra carpeta.
export const RUTAS_KIT = Object.freeze({
  ...Object.fromEntries(['tierra-patio', 'borde-pasto', 'portal-cerrado', 'portal-abierto', ...PIEZAS_MURO]
    .map(clave => [clave, 'mundo/' + clave + '.png'])),
  ...Object.fromEntries(PIEZAS_PANEL.map(clave => [clave, 'interfaz/' + clave + '.png'])),
})
export const IMAGENES_KIT = Object.freeze(Object.keys(RUTAS_KIT))
export function varianteMuro(semilla, fila, columna) {
  let valor = 2166136261
  for (const letra of String(semilla) + ':' + fila + ':' + columna) valor = Math.imul(valor ^ letra.charCodeAt(0), 16777619) >>> 0
  return valor % 5 === 0 ? 'b' : 'a'
}
// El mapa ya no cambia la pieza: los cubos van sueltos y solo varía su textura.
// Se conserva el mismo orden de datos para que el laberinto lo llame igual que antes.
export function texturaMuro(mapa, fila, columna, semilla) { return 'muro-' + varianteMuro(semilla, fila, columna) }
export function pedirKitFinal(escena) {
  for (const [clave, ruta] of Object.entries(RUTAS_KIT)) {
    if (!escena.textures.exists(clave)) escena.load.image(clave, 'dibujos/' + ruta)
  }
}
