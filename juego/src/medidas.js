// Medidas y colores compartidos por todo el juego.

// Tamaño base del laberinto; Scale.EXPAND amplía el lienzo según la pantalla.
export const ANCHO = 1280
export const ALTO = 720

// Colores cálidos de Kusi (los mismos tonos del panel web).
export const COLOR = {
  tinta: '#4b211b',
  tintaSuave: '#805340',
  crema: '#fff7e8',
  papel: '#fffcf4',
  arena: '#ffe8bf',
  naranja: '#f3a12b',
  naranjaClaro: '#f7b34b',
  terracota: '#b55229',
  verde: '#5aa04a',
  rojo: '#c2412f',
}

// Los mismos colores como número, que es lo que piden las figuras de Phaser.
export const NUMERO = Object.fromEntries(
  Object.entries(COLOR).map(([nombre, hex]) => [nombre, parseInt(hex.slice(1), 16)]),
)

// Letra redonda y fácil de leer para niños de 6 años.
export const LETRA = 'Fredoka'

// Estilo de texto: tamaño en px, color y extras opcionales (ancho para partir líneas, alineación).
export function estiloTexto(tamano, color = COLOR.tinta, extras = {}) {
  return {
    fontFamily: LETRA,
    fontSize: `${tamano}px`,
    fontStyle: '600',
    color,
    align: 'center',
    padding: { top: 4, bottom: 4 },
    ...extras,
  }
}
