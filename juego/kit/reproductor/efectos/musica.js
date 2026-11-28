// La música de fondo de un juego: suena bajita, una pista tras otra del ánimo elegido, baja cuando Kusi
// habla y se apaga con el botón Sonido del hud (la misma marca que los efectos, efectos/silencio.js).
// La pausa del juego la detiene sola: mensajes/pausaJuego.js llama a juego.sound.pauseAll().
//
//   this.hud = crearHud(this, { … })
//   this.musica = crearMusica(this, { animo: 'andina', fiesta: 'fiesta_andina' })
//   this.hud.celebrar()   // al ganar un nivel también suena la fiesta un momento (si el juego eligió una)
//   this.musica.fiesta()  // la fiesta se queda sonando hasta que termina la escena (el cierre del juego)
//
// Los ánimos y sus pistas están en logica/musica.js. Las pistas se cargan recién cuando hacen falta:
// no alargan la carga del juego, y cada juego baja solo lo que suena.

import { leerSilencio } from './silencio.js'
import { vozOcupada } from '../logica/voz.js'
import { MUSICA, VOLUMEN, acercarVolumen, rutaPista, siguientePista, volumenDeMusica } from '../logica/musica.js'

// Baja rápido cuando Kusi empieza a hablar y vuelve despacio cuando termina.
const BAJAR_MS = 1000
const SUBIR_MS = 4000
const CELEBRAR_MS = 12000
const porEscena = new WeakMap()

// El hud la usa para celebrar y para el botón Sonido sin que el juego tenga que avisarle.
export function musicaDeLaEscena(escena) {
  return porEscena.get(escena) ?? null
}

export function crearMusica(escena, { animo, fiesta = null } = {}) {
  const lista = MUSICA[animo]
  if (!lista) throw new Error('No hay música «' + animo + '» en el kit.')
  if (fiesta !== null && !MUSICA[fiesta]) throw new Error('No hay música «' + fiesta + '» en el kit.')
  const estado = {
    silenciado: leerSilencio(), destruida: false,
    fondo: null, nombreFondo: null,
    fiesta: null, nombreFiesta: null, fiestaHasta: 0,
  }
  const clave = (nombre) => 'musica-' + nombre

  function cargar(nombre, listo) {
    const llave = clave(nombre)
    if (escena.cache.audio.exists(llave)) {
      listo(llave)
      return
    }
    escena.load.once('filecomplete-audio-' + llave, () => {
      if (!estado.destruida) listo(llave)
    })
    escena.load.audio(llave, rutaPista(nombre))
    if (!escena.load.isLoading()) escena.load.start()
  }

  // Una pista tras otra, sin repetir la que acaba de sonar.
  function tocarFondo() {
    const nombre = siguientePista(lista, estado.nombreFondo)
    estado.nombreFondo = nombre
    cargar(nombre, (llave) => {
      const sonido = escena.sound.add(llave, { volume: 0 })
      sonido.once('complete', () => {
        sonido.destroy()
        if (estado.fondo !== sonido) return
        estado.fondo = null
        if (!estado.destruida) tocarFondo()
      })
      estado.fondo = sonido
      sonido.play({ volume: 0 })
    })
  }

  function sonarFiesta(hasta) {
    if (fiesta === null || estado.destruida) return
    estado.fiestaHasta = Math.max(estado.fiestaHasta, hasta)
    if (estado.fiesta) return
    const nombre = siguientePista(MUSICA[fiesta], estado.nombreFiesta)
    estado.nombreFiesta = nombre
    cargar(nombre, (llave) => {
      if (estado.fiesta || escena.time.now >= estado.fiestaHasta) return
      const sonido = escena.sound.add(llave, { volume: 0, loop: true })
      estado.fiesta = sonido
      sonido.play({ volume: 0, loop: true })
    })
  }

  function fundir(sonido, objetivo, delta) {
    const actual = sonido.volume
    const volumen = acercarVolumen(actual, objetivo, delta, objetivo < actual ? BAJAR_MS : SUBIR_MS)
    if (volumen !== actual) sonido.setVolume(volumen)
    return volumen
  }

  function actualizar(_tiempo, delta) {
    const hablando = vozOcupada()
    const enFiesta = estado.fiesta !== null && escena.time.now < estado.fiestaHasta
    // Mientras suena la fiesta, el fondo se calla: nunca dos músicas a la vez.
    if (estado.fondo) {
      fundir(estado.fondo, volumenDeMusica({ base: enFiesta ? 0 : VOLUMEN.fondo, hablando, silenciado: estado.silenciado }), delta)
    }
    if (estado.fiesta) {
      const volumen = fundir(estado.fiesta,
        volumenDeMusica({ base: enFiesta ? VOLUMEN.fiesta : 0, hablando, silenciado: estado.silenciado }), delta)
      if (!enFiesta && volumen === 0) {
        estado.fiesta.stop()
        estado.fiesta.destroy()
        estado.fiesta = null
      }
    }
  }

  function destruir() {
    if (estado.destruida) return
    estado.destruida = true
    escena.events.off('update', actualizar)
    for (const sonido of [estado.fondo, estado.fiesta]) {
      sonido?.stop()
      sonido?.destroy()
    }
    estado.fondo = null
    estado.fiesta = null
    porEscena.delete(escena)
  }

  const musica = {
    // El botón Sonido del hud: apaga la música y la vuelve a prender donde iba.
    silenciar(apagado) {
      estado.silenciado = Boolean(apagado)
    },
    // Al ganar un nivel: la fiesta suena un momento y el fondo vuelve solo.
    celebrar() {
      sonarFiesta(escena.time.now + CELEBRAR_MS)
    },
    // El cierre del juego: la fiesta se queda hasta que termina la escena.
    fiesta() {
      sonarFiesta(Infinity)
    },
    destruir,
  }
  porEscena.set(escena, musica)
  escena.events.on('update', actualizar)
  escena.events.once('shutdown', destruir)
  escena.events.once('destroy', destruir)
  // El navegador no deja sonar nada antes del primer toque: Phaser avisa cuando ya se puede.
  const empezar = () => {
    if (!estado.destruida && !estado.fondo) tocarFondo()
  }
  if (escena.sound.locked) escena.sound.once('unlocked', empezar)
  else empezar()
  return musica
}
