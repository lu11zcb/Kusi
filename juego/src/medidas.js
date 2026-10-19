// Medidas y colores compartidos por todo el juego.

// Tamaño fijo del juego; Scale.FIT lo agranda o achica para que quepa en la pantalla.
export const ANCHO = 1280
export const ALTO = 720

// La plaza (su tamaño, lo que no se pisa, dónde van Kusi y los puestos) está en src/datos/plaza.json,
// en px del dibujo fondo-plaza.png. La cámara sigue al cuy.

// Puestos, del tamaño de la pantalla aprobada.
export const ANCHO_PUESTO = 360
export const ALTO_PUESTO = 320
export const FRENTE_PUESTO = 70 // el cuy se para esta distancia delante del mostrador para hablar

// Patitas del cuy: lo que ocupa en el piso para no atravesar los puestos.
export const PATITAS_CUY = { ancho: 68, alto: 32 }

// La cámara mira un poco por delante del cuy: así el cartel no tapa los puestos que tiene enfrente.
export const ADELANTO_CAMARA = 150

// Movimiento del cuy.
export const VELOCIDAD_MAXIMA = 260 // px por segundo
export const ZONA_MUERTA = 10 // px del joystick que no cuentan
export const DISTANCIA_FRENADO = 70 // px antes de llegar a donde se tocó, empieza a frenar
export const DISTANCIA_PARA_HABLAR = 110 // px desde el lugar para hablar frente al puesto

// Orden de dibujo (lo que tiene más profundidad se ve encima).
// Lo que está parado en la plaza usa su y como profundidad (de 0 a 1152): lo que está más abajo
// tapa a lo que está más arriba. Por eso todo lo demás va por encima.
export const PROFUNDIDAD = {
  fondo: 0,
  marca: 1,
  depurar: 1500,
  globoHablar: 2000,
  controles: 3000,
  globoKusi: 4000,
  ventana: 5000,
  cartel: 6000,
}

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
