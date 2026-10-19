// Medidas y colores compartidos por todo el juego.

// Tamaño fijo del juego; Scale.FIT lo agranda o achica para que quepa en la pantalla.
export const ANCHO = 1280
export const ALTO = 720

// La plaza se ve desde arriba, un poco inclinada. Mide 2 pantallas de ancho por 1,5 de alto
// y la cámara sigue al cuy.
export const ANCHO_PLAZA = 2560
export const ALTO_PLAZA = 1080

// Dónde pueden pisar las patitas del cuy: debajo de las casas de arriba, entre las jardineras
// de los lados y antes del muro de abajo.
export const ZONA_CAMINABLE = { izquierda: 100, derecha: 2460, arriba: 300, abajo: 1010 }

// Pileta del centro de la plaza (el cuy la rodea).
export const PILETA = { x: 1280, y: 650, radioX: 170, radioY: 80 }

// Kusi espera abajo al centro, en la entrada; el cuy del niño empieza a su lado.
export const KUSI = { x: 1280, y: 985 }
export const CUY_INICIO = { x: 1160, y: 990 }

// Lugar de cada puesto, en el orden del paquete: x del centro e y del piso, donde se apoya el mostrador.
// Los dos primeros quedan cerca de la entrada; los tres siguientes, contra las casas.
export const LUGARES_PUESTOS = [
  { x: 780, y: 860 },
  { x: 1780, y: 860 },
  { x: 520, y: 470 },
  { x: 1280, y: 420 },
  { x: 2040, y: 470 },
  { x: 2260, y: 860 },
  { x: 300, y: 860 },
]
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
// Lo que está parado en la plaza usa su y como profundidad (de 0 a 1080): lo que está más abajo
// tapa a lo que está más arriba. Por eso todo lo demás va por encima de 1080.
export const PROFUNDIDAD = {
  fondo: 0,
  marca: 1,
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
