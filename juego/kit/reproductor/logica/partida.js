// La partida y sus avisos, para cualquier juego. Un juego del taller importa de aquí
// (#kit/reproductor/logica/partida.js) y nunca de otro juego. Por ahora el código vive
// con el laberinto, que no tiene nada propio en él; los nombres neutrales son estos.
export {
  crearPartidaLaberinto as crearPartida,
  avisarPartida,
} from '../../../juegos/laberinto/logica/partidaLaberinto.js'

export { observarAvisosPartida } from './avisos.js'
