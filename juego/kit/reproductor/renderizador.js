// Qué lienzo se pidió al abrir el juego y cuál quedó funcionando de verdad. AUTO
// se convierte en WebGL si el equipo lo permite y en Canvas si no; Phaser pisa el
// valor pedido al crear el renderizador, así que se guarda aparte en el registro
// del juego. Esta lectura solo la usan las pruebas, junto al resto del estado.
import * as Phaser from 'phaser'

export const CLAVE_RENDERIZADOR_PEDIDO = 'renderizadorPedido'

export function leerRenderizador(juego) {
  return {
    pedido: juego.registry.get(CLAVE_RENDERIZADOR_PEDIDO) ?? 'auto',
    activo: juego.renderer.type === Phaser.CANVAS ? 'canvas' : 'webgl',
  }
}
