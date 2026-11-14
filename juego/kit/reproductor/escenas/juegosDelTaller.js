// Lo que necesita la carga para abrir un juego del taller dentro del navegador: traer
// su ficha, registrar su escena y dibujar una figura simple si falta una pieza. Las
// decisiones (qué juego, qué rutas, si la ficha está completa) están en
// ../datos/registroJuegos.js, que se prueba sin navegador.

import { COLOR } from '../medidas.js'
import { rutaFicha } from '../datos/registroJuegos.js'
import { avisarPartida } from '../../../juegos/laberinto/logica/partidaLaberinto.js'
import { leerPuente, AVISO_CARGADO } from '../mensajes/puenteGuion.js'

// Trae juego.js del trabajo cuando se abre el juego, no al arrancar Vite: un trabajo
// que terminó hace un minuto se abre sin reiniciar nada. La ruta sale de rutaFicha,
// que solo acepta un UUID, así que no se puede pedir otra carpeta.
export async function cargarFicha(trabajo) {
  const direccion = new URL(rutaFicha(trabajo), document.baseURI).href
  try {
    const modulo = await import(/* @vite-ignore */ direccion)
    return modulo.default
  } catch (error) {
    throw new Error('No se pudo abrir el juego del trabajo ' + trabajo + ': ' + (error?.message ?? error))
  }
}

// Phaser usa la clave que la escena pone en su constructor y no acepta dos escenas con
// la misma. Esta subclase le da a cada trabajo su propia clave («taller:<id>») y, al
// terminar su create(), avisa que el juego abrió (por si el juego no lo hizo).
export function escenaDelTrabajo(Escena, clave) {
  return class EscenaDelTaller extends Escena {
    constructor() {
      super()
      this.sys.settings.key = clave
    }

    create(...argumentos) {
      try {
        const resultado = super.create?.(...argumentos)
        avisarQueAbrio(this)
        return resultado
      } catch (error) {
        avisarQueSeCayo(this, error)
        throw error
      }
    }
  }
}

// El aviso «listo» es único por partida: si el juego ya lo mandó, este no se repite.
// Así el panel y la app se enteran igual aunque el juego lo haya olvidado.
function avisarQueAbrio(escena) {
  try {
    const datos = escena.sys.settings.data ?? {}
    const { paquete, partida, trabajo } = datos
    if (partida && paquete) {
      const primero = avisarPartida(partida, 'listo', { familia: paquete.familia, nivel: (datos.indiceNivel ?? 0) + 1 })
      // Cargado describe esta apertura, incluso si se reanuda una partida cuyo
      // aviso educativo «listo» ya quedó guardado.
      if (primero || (partida.reanudada && !partida.cargadoReanudado)) {
        partida.cargadoReanudado = true
        leerPuente(escena.game)?.avisar({ tipo: AVISO_CARGADO, niveles: paquete.retos.length })
      }
    }
    // Las pruebas y el revisor leen aquí qué juego quedó abierto.
    window.kusi = Object.assign(window.kusi ?? {}, {
      listo: true,
      juego: { familia: paquete?.familia ?? null, trabajo: trabajo ?? null, clave: escena.sys.settings.key },
    })
  } catch (error) {
    console.error('[carga] No se pudo avisar que abrió el juego del taller:', error)
  }
}

// Un juego que se cae al empezar también se registra: la página recibe un solo «fallo».
function avisarQueSeCayo(escena, error) {
  const motivo = 'El juego del taller se cayó al empezar: ' + String(error?.message ?? error)
  console.error('[carga] ' + motivo, error)
  const partida = escena.sys.settings.data?.partida
  if (partida) avisarPartida(partida, 'fallo', { motivo })
  leerPuente(escena.game)?.avisar({ tipo: 'error', motivo })
}

// Si una pieza no llegó (no existe o no se pudo leer), el juego no se cae: usa una
// figura simple, una forma redonda con el contorno de tinta del kit (reglas.md, regla 10).
export function dibujarFiguraSimple(escena, clave) {
  const lado = 256
  const figura = escena.make.graphics({ x: 0, y: 0 }, false)
  figura.fillStyle(Number.parseInt(COLOR.arena.slice(1), 16), 1)
  figura.fillCircle(lado / 2, lado / 2, 100)
  figura.lineStyle(8, Number.parseInt(COLOR.tinta.slice(1), 16), 1)
  figura.strokeCircle(lado / 2, lado / 2, 100)
  figura.generateTexture(clave, lado, lado)
  figura.destroy()
}
