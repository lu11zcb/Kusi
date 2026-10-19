// Medidas y colores compartidos por todo el juego.

// Tamaño fijo del juego; Scale.FIT lo agranda o achica para que quepa en la pantalla.
export const ANCHO = 1280
export const ALTO = 720

// Línea donde pisan Kusi y el cuy (el pasillo, delante de los puestos).
export const PISO_PERSONAJES = 590
// Los puestos se apoyan un poco más atrás, sobre el piso de piedras.
export const PISO_PUESTOS = 540
// Dónde empieza el piso de piedras.
export const INICIO_PISO = 500

// Posición de Kusi y del cuy al empezar.
export const KUSI_X = 170
export const CUY_INICIO_X = 360

// Espacio para Kusi al principio del mundo y distancia entre puestos.
export const PRIMER_PUESTO_X = 760
export const SEPARACION_PUESTOS = 600

// Movimiento del cuy.
export const VELOCIDAD_MAXIMA = 260 // px por segundo
export const ZONA_MUERTA = 10 // px del joystick que no cuentan
export const ALTURA_SALTO = 80 // px
export const DURACION_SALTO = 500 // ms, subida y bajada
export const DISTANCIA_PARA_HABLAR = 120 // px en horizontal desde el centro del puesto
export const MARGEN_BORDE = 60 // el cuy no se acerca más que esto a los bordes del mundo

// Capas de fondo: cuánto se mueven respecto de la cámara.
export const VELOCIDAD_CERROS = 0.2
export const VELOCIDAD_CASAS = 0.5
export const VELOCIDAD_PISO = 1

// Orden de dibujo (lo que tiene más profundidad se ve encima).
export const PROFUNDIDAD = {
  cerros: 0,
  casas: 1,
  piso: 2,
  vendedor: 10,
  puesto: 11,
  producto: 12,
  letrero: 12,
  personajes: 20,
  globoHablar: 30,
  controles: 100,
  globoKusi: 200,
  ventana: 1000,
  cartel: 1100,
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
