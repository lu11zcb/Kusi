import { callarVoz } from '../logica/voz.js'

const CLAVE_PAUSA = 'control-pausa'

export function pedirPausa(juego) {
  juego?.registry.get(CLAVE_PAUSA)?.()
}

// Pausa común para todas las familias: no exige código especial a cada juego.
// El anfitrión guarda después el reto confirmado; mientras la página sigue abierta
// las escenas pausadas conservan también su estado dentro de ese reto.
export function instalarPausaJuego(juego, puente, { pantalla, volverPortada, callar = callarVoz }) {
  let pausa = null

  function restaurar() {
    const { escenas, escena, entrada } = pausa
    pausa = null
    escena.sys.events.off('shutdown', restaurar)
    pantalla.ocultar()
    for (const actual of escenas) {
      if (actual.sys.isPaused()) juego.scene.resume(actual)
    }
    juego.input.enabled = entrada
    juego.sound.resumeAll()
  }

  function reanudar() {
    if (!pausa || pausa.saliendo) return
    restaurar()
    puente.avisar({ tipo: 'reanudado' })
  }

  function salir() {
    if (!pausa?.menu || pausa.saliendo) return
    // El anfitrión puede tardar en guardar. Hasta que cierre, el juego sigue quieto
    // y un segundo toque o una orden atrasada de reanudar no repite la salida.
    pausa.saliendo = true
    pantalla.despedir()
    if (puente.tieneAnfitrion()) puente.avisar({ tipo: 'salir' })
    else volverPortada()
  }

  function pausar(menu) {
    if (pausa?.saliendo || (menu && pausa?.menu)) return
    const escenas = pausa?.escenas ?? juego.scene.getScenes(true).filter((escena) => escena.sys.settings.key !== 'carga')
    const escena = escenas.find((actual) => actual.partida || actual.sys.settings.data?.partida)
    const partida = escena?.partida ?? escena?.sys.settings.data?.partida
    if (!partida || partida.cerrada) return
    if (!pausa) {
      pausa = { escenas, escena, entrada: juego.input.enabled, menu: false, saliendo: false }
      // Si el anfitrión reemplaza o reinicia la partida, la nueva debe recibir
      // los controles aunque el juego anterior haya quedado pausado.
      escena.sys.events.once('shutdown', restaurar)
      juego.input.enabled = false
      // El administrador de escenas pausa en el acto. this.scene.pause() lo deja para el
      // cuadro siguiente: una flecha que llega antes todavía mueve al protagonista
      // aunque la página ya recibió «pausado».
      for (const actual of escenas) juego.scene.pause(actual)
      juego.sound.pauseAll()
      callar()
    }
    if (menu) pantalla.mostrar({ seguir: reanudar, salir })
    else if (pausa.menu) pantalla.ocultar()
    pausa.menu = menu
    const nivel = (escena.indiceNivel ?? escena.sys.settings.data?.indiceNivel ?? 0) + 1
    puente.avisar({ tipo: 'pausado', partida: partida.id, orden: partida.orden, nivel })
  }

  juego.registry.set(CLAVE_PAUSA, () => pausar(true))
  puente.controlar((orden) => {
    if (orden.tipo === 'reanudar') reanudar()
    else pausar(false)
  })
}
