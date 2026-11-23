import { callarVoz } from '../logica/voz.js'

// Pausa común para todas las familias: no exige código especial a cada juego.
// El anfitrión guarda después el reto confirmado; mientras la página sigue abierta
// las escenas pausadas conservan también su estado dentro de ese reto.
export function instalarPausaJuego(juego, puente, callar = callarVoz) {
  let pausadas = []
  let entradaAnterior = true
  let pausado = false
  puente.controlar((orden) => {
    if (orden.tipo === 'reanudar') {
      if (!pausado) return
      for (const escena of pausadas) juego.scene.resume(escena)
      juego.input.enabled = entradaAnterior
      juego.sound.resumeAll()
      pausadas = []; pausado = false
      puente.avisar({ tipo: 'reanudado' })
      return
    }
    const escenas = pausado ? pausadas : juego.scene.getScenes(true).filter((escena) => escena.sys.settings.key !== 'carga')
    const escena = escenas.find((actual) => actual.partida || actual.sys.settings.data?.partida)
    const partida = escena?.partida ?? escena?.sys.settings.data?.partida
    if (!partida || partida.cerrada) return
    if (!pausado) {
      pausadas = escenas
      entradaAnterior = juego.input.enabled
      juego.input.enabled = false
      // El administrador de escenas pausa en el acto. this.scene.pause() lo deja para el
      // cuadro siguiente: una flecha que llega antes todavía mueve al protagonista
      // aunque la página ya recibió «pausado».
      for (const actual of escenas) juego.scene.pause(actual)
      juego.sound.pauseAll()
      callar()
      pausado = true
    }
    const nivel = (escena.indiceNivel ?? escena.sys.settings.data?.indiceNivel ?? 0) + 1
    puente.avisar({ tipo: 'pausado', partida: partida.id, orden: partida.orden, nivel })
  })
}
