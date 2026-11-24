import { COLOR, NUMERO, estiloTexto } from '../medidas.js'
import { crearBoton } from './piezas.js'
import { dibujarEstrellaPuntos, textoPuntos } from './hud.js'
import { FRASE_PRUEBA_DOCENTE } from '../datos/frases.js'

const ANCHO_TARJETA = 600
const ALTO_TARJETA = 300

function dibujarMoneda(escena) {
  const moneda = escena.add.graphics()
  moneda.fillStyle(NUMERO.terracota).fillCircle(0, 2, 19)
  moneda.fillStyle(NUMERO.naranjaClaro).fillCircle(0, 0, 17)
  moneda.lineStyle(2, NUMERO.tinta).strokeCircle(0, 1, 19)
  moneda.lineStyle(2, NUMERO.papel).strokeCircle(0, 0, 12)
  moneda.lineStyle(3, NUMERO.terracota).lineBetween(0, -6, 0, 6)
  return moneda
}

export function mostrarPremio(escena, { puntos, monedas, alContinuar }) {
  const velo = escena.add.rectangle(0, 0, 1, 1, NUMERO.arena).setDepth(4010)
    .setInteractive()
  const fondo = escena.add.rectangle(0, 0, ANCHO_TARJETA, ALTO_TARJETA, NUMERO.crema).setRounded(36)
    .setStrokeStyle(5, NUMERO.tinta)
  const cabecera = escena.add.text(0, -92, '¡Lo lograste!', estiloTexto(52)).setOrigin(0.5)
  const pruebaDocente = monedas === null
  const estrella = dibujarEstrellaPuntos(escena, 19)
  const total = escena.add.text(0, 0, textoPuntos(puntos), estiloTexto(35)).setOrigin(0, 0.5)
  const piezas = [fondo, cabecera, estrella, total]
  // Se centra la fila con el ancho real de Fredoka para que tanto «+0» como
  // «+25 monedas» quepan en la tarjeta con el mismo espacio alrededor.
  const fila = [{ dibujo: estrella, ancho: 38, origenX: 19 }, { dibujo: total, ancho: total.width }]
  if (pruebaDocente) {
    piezas.push(escena.add.text(0, 38, FRASE_PRUEBA_DOCENTE, estiloTexto(25, COLOR.tintaSuave)).setOrigin(0.5))
  } else {
    const separador = escena.add.circle(0, 0, 4, NUMERO.tintaSuave)
    const moneda = dibujarMoneda(escena)
    const textoMonedas = '+' + monedas + (monedas === 1 ? ' moneda' : ' monedas')
    const ganadas = escena.add.text(0, 0, textoMonedas, estiloTexto(35)).setOrigin(0, 0.5)
    piezas.push(separador, moneda, ganadas)
    fila.push({ dibujo: separador, ancho: 16, origenX: 8 },
      { dibujo: moneda, ancho: 38, origenX: 19 }, { dibujo: ganadas, ancho: ganadas.width })
  }
  const separacion = 12
  let x = -(fila.reduce((suma, pieza) => suma + pieza.ancho, 0) + (fila.length - 1) * separacion) / 2
  for (const { dibujo, ancho, origenX = 0 } of fila) {
    dibujo.setPosition(x + origenX, -9)
    x += ancho + separacion
  }
  piezas.push(crearBoton(escena, 0, 86, {
    ancho: 212, alto: 58, tamano: 28, texto: 'Continuar', alTocar: alContinuar,
  }))
  const tarjeta = escena.add.container(0, 0, piezas).setDepth(4011)
    .setData('hud', true).setData('idPantalla', 'Premio de la partida')

  const colocar = () => {
    const { width: ancho, height: alto } = escena.scale
    velo.setPosition(ancho / 2, alto / 2).setSize(ancho, alto)
    tarjeta.setPosition(ancho / 2, alto / 2)
      .setScale(Math.min(1, (ancho - 24) / ANCHO_TARJETA, (alto - 24) / ALTO_TARJETA))
  }
  colocar()
  escena.scale.on('resize', colocar)
  return () => {
    escena.scale.off('resize', colocar)
    velo.destroy()
    tarjeta.destroy()
  }
}
