// Los segundos vienen del juego: si la escena se pausa, también se pausa la espera de Kusi.
const SEGUNDOS_ENTRE_FRASES = 6
const SEGUNDOS_PARA_FELICITAR = 0.65
const partidasVistas = new Set()
const referenciasVistas = new WeakSet()

function idDePartida(partida) {
  if (typeof partida === 'string') return partida
  return partida?.id
}

// Una partida restaurada puede tener otro objeto en memoria y conservar el mismo id.
export function tutorialVisto(partida) {
  const id = idDePartida(partida)
  return id ? partidasVistas.has(id) : referenciasVistas.has(partida)
}

export function marcarTutorial(partida) {
  const id = idDePartida(partida)
  if (id) partidasVistas.add(id)
  else if (partida && typeof partida === 'object') referenciasVistas.add(partida)
}

export function debeMostrarTutorial(partida, busqueda = '') {
  return new URLSearchParams(busqueda).get('tutorial') !== '0' && !tutorialVisto(partida)
}

export function crearAvanceTutorial(pasos) {
  let indice = 0
  let espera = 0
  let pausa = 0

  return {
    get paso() { return pasos[indice] },
    get terminado() { return indice >= pasos.length },
    actualizar(segundos) {
      const paso = pasos[indice]
      if (!paso) return
      // Entre pasos se deja un momento para la felicitación, con la mano escondida.
      if (pausa > 0) {
        pausa = Math.max(0, pausa - segundos)
        return pausa === 0 ? 'paso' : 'pausa'
      }
      // Primero cuenta el gesto: si coincide con el recordatorio, Kusi felicita al niño.
      if (paso.hecho()) {
        indice += 1
        espera = 0
        if (indice === pasos.length) return 'fin'
        pausa = SEGUNDOS_PARA_FELICITAR
        return 'celebrar'
      }
      espera += segundos
      if (espera + 1e-9 >= SEGUNDOS_ENTRE_FRASES) {
        // Un cuadro largo produce un solo recordatorio, aunque cubra varios intervalos.
        espera = 0
        return 'repetir'
      }
    },
  }
}
