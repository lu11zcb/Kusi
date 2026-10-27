import { CLASES_LABERINTO } from '../datos/validarLaberinto.js'

// Mando a la izquierda y Kusi con su consigna a la derecha del mapa.
export const COLUMNAS = Object.freeze({ izquierda: 200, derecha: 350, barra: 88 })
export function calcularDisposicion({ ancho, filas, columnas }) {
  const casilla = Math.max(64, Math.min(90, Math.floor(1050 / columnas), Math.floor(630 / filas)))
  const mundoAncho = Math.max(1600, ancho, COLUMNAS.izquierda + columnas * casilla + COLUMNAS.derecha)
  const mundoAlto = Math.max(720, COLUMNAS.barra + filas * casilla + 2)
  const area = { x: COLUMNAS.izquierda, y: 88, ancho: mundoAncho - 550, alto: mundoAlto - 90 }
  const origen = { x: area.x + (area.ancho - columnas * casilla) / 2,
    y: area.y + (area.alto - filas * casilla) / 2 }
  return { tipo: 'columnas', casilla, origen, mapa: { ...origen, ancho: columnas * casilla, alto: filas * casilla },
    diseno: { ancho: mundoAncho, alto: mundoAlto }, panel: { x: 0, y: 88, ancho: 200, alto: mundoAlto - 88 },
    columnaDerecha: { x: mundoAncho - 350, y: 88, ancho: 350, alto: mundoAlto - 88 }, decoracion: [] }
}

export function distribuirBarra(disposicion, regla, objetos = []) {
  const mundo = disposicion.diseno.ancho
  const caja = { x: mundo / 2 - 380, y: 4, ancho: 760, alto: 78 }
  const orden = regla.tipo === 'orden'
  // Una ficha por alimento real, incluidos los repetidos. En clasificación no
  // se inventa una secuencia ni se sustituye toda la clase por fresas.
  const objetivos = orden ? regla.secuencia.map(tipo => ({ tipo }))
    : objetos.flatMap((objeto, indiceObjeto) => CLASES_LABERINTO[regla.clase].includes(objeto.tipo)
      ? [{ tipo: objeto.tipo, indiceObjeto }] : [])
  const cantidad = objetivos.length
  const espacio = Math.min(178, (caja.ancho - 40) / cantidad)
  const lado = Math.min(46, espacio - 14)
  const inicio = caja.x + caja.ancho / 2 - cantidad * espacio / 2 + espacio / 2
  const fichas = Array.from({ length: cantidad }, (_, indice) => ({
    ...objetivos[indice],
    x: inicio + indice * espacio, y: 54, ancho: lado, alto: lado,
    imagen: { x: inicio + indice * espacio, y: 54, lado },
    marca: { x: inicio + indice * espacio + lado * .3, y: 62 },
  }))
  return { caja, titulo: { x: caja.x + caja.ancho / 2, y: 7 }, fichas, icono: null,
    botones: { escuchar: { x: mundo - 206, y: 45, ancho: 74, alto: 74 },
      ayuda: { x: mundo - 123, y: 45, ancho: 74, alto: 74 } } }
}

export function distribuirGuia(disposicion, texto = '') {
  const x = disposicion.diseno.ancho - COLUMNAS.derecha
  const h = texto.length > 65 ? 232 : 180
  const globo = { x: x + 14, y: 446 - h, ancho: 322, alto: h, altoMaximo: 304, bordeInferior: 446 }
  return { caja: { x: x + 8, y: 122, ancho: 332, alto: 592 }, franja: globo, globo,
    kusi: { x: x + 50, y: 464, ancho: 250, alto: 250 },
    etiqueta: { x: x + 175, y: 704, ancho: 322, alto: 0 },
    joystick: { x: 100, y: 616, radio: 92, radioPerilla: 44 } }
}

// Comparte la fila del altavoz y Ayuda, también al alejar la cámara.
export function ubicarSonidoSuperior({ mundoAncho, ancho, scrollX = 0 }, boton) {
  return { x: (mundoAncho ?? ancho + scrollX * 2) - 52.5, y: 28 + boton.alto / 2 }
}
