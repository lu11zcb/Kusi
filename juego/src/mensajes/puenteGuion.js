// El puente entre el juego y la página que lo contiene (por ejemplo, la vista previa
// del panel docente, que muestra el juego dentro de un iframe). Con él la página le
// manda al juego el guion que generó la IA, sin que el juego tenga que pedirlo a
// ningún servidor.
//
// Lo que la página le manda al juego (window.postMessage):
//   { tipo: 'paquete', paquete: <guion> }  el guion del laberinto, como objeto o como
//                                          texto JSON; el juego lo comprueba y empieza
//                                          por el primer nivel. Si ya había un juego, lo reemplaza.
//   { tipo: 'reiniciar' }                  vuelve al primer nivel del guion que se está jugando.
//
// Lo que el juego le avisa a la página (window.parent.postMessage):
//   { tipo: 'listo' }                      el juego ya puede recibir un guion; se avisa una sola vez.
//   { tipo: 'cargado', niveles: N }        el primer nivel del guion está en pantalla.
//   { tipo: 'error', motivo: '...' }       el guion no se puede jugar; el motivo dice por qué.
//
// Un mensaje que llega antes de que el juego esté listo no se pierde: espera su turno.

export const MENSAJE_PAQUETE = 'paquete'
export const MENSAJE_REINICIAR = 'reiniciar'
export const AVISO_LISTO = 'listo'
export const AVISO_CARGADO = 'cargado'
export const AVISO_ERROR = 'error'

// El juego no sabe en qué dirección está la página que lo contiene, y lo que avisa
// no lleva nada privado (solo si está listo, si cargó o por qué no pudo), así que
// el aviso va a cualquier origen.
const CUALQUIER_ORIGEN = '*'

// Convierte lo que llegó por postMessage en una orden para el juego, o null si el
// mensaje no es para él (otra página, otra librería, un texto cualquiera). Si el guion
// llega como texto y no es un JSON válido, la orden lleva paquete null: el juego lo
// rechaza y le explica el motivo a la página.
export function interpretarMensaje(datos) {
  if (!datos || typeof datos !== 'object' || Array.isArray(datos)) return null
  if (datos.tipo === MENSAJE_REINICIAR) return { tipo: MENSAJE_REINICIAR }
  if (datos.tipo !== MENSAJE_PAQUETE) return null
  let paquete = datos.paquete
  if (typeof paquete === 'string') {
    try {
      paquete = JSON.parse(paquete)
    } catch {
      paquete = null
    }
  }
  return { tipo: MENSAJE_PAQUETE, paquete }
}

// «ventana» es la ventana del juego. Las pruebas le pasan una de mentira.
export function crearPuente(ventana) {
  const pendientes = []
  let manejador = null
  let listoAvisado = false

  const alRecibir = (evento) => {
    // Solo se escucha a la página que contiene el juego. Con el juego abierto solo, esa
    // página es la propia ventana. Otra ventana o iframe cualquiera no puede mandarle guiones.
    if (evento.source !== ventana.parent) return
    const orden = interpretarMensaje(evento.data)
    if (!orden) return
    if (manejador) manejador(orden)
    else pendientes.push(orden)
  }
  ventana.addEventListener('message', alRecibir)

  const avisar = (mensaje) => {
    ventana.parent.postMessage(mensaje, CUALQUIER_ORIGEN)
  }

  return {
    // Quien atiende las órdenes (la carga, o el nivel que se está jugando) se registra
    // aquí; el que llega después reemplaza al anterior. Lo que esperaba se entrega en orden.
    // La primera vez que alguien atiende, el juego ya puede recibir: se le avisa a la página.
    conectar(funcion) {
      manejador = funcion
      while (pendientes.length > 0 && manejador === funcion) funcion(pendientes.shift())
      if (!listoAvisado) {
        listoAvisado = true
        avisar({ tipo: AVISO_LISTO })
      }
    },
    // Solo suelta al que se va: si otro ya tomó su lugar, no lo desconecta.
    desconectar(funcion) {
      if (manejador === funcion) manejador = null
    },
    avisar,
    cerrar() {
      ventana.removeEventListener('message', alRecibir)
    },
  }
}

// La clave con que main.js guarda el puente en el registro del juego, para que las
// escenas lo encuentren sin importarlo ni crearlo otra vez.
export const CLAVE_PUENTE = 'puente-guion'

// El puente del juego, o null si esta dirección no lo pidió (por ejemplo, la plaza).
export function leerPuente(juego) {
  return juego.registry.get(CLAVE_PUENTE) ?? null
}
