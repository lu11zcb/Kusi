// Cuatro filas ilustradas: hablar, saludar, parpadear y respirar; tres cuadros cada una.
export const FILAS_KUSI = Object.freeze({ hablar: 0, saludar: 3, parpadear: 6, respirar: 9 })
export function crearHablaKusi(activo = true) {
  return { activo, tiempo: 0, tiempoHabla: 0, restante: 0, vozActiva: false, saludo: 1.2,
    esperaParpadeo: 3.4, parpadeo: null, animacion: activo ? 'saludar' : 'respirar', cuadro: activo ? 3 : 9 }
}
export function iniciarHablaKusi(estado, texto) {
  estado.restante = Math.min(12, Math.max(1.5, texto.length * .065))
  estado.tiempoHabla = 0
  estado.vozActiva = false
}
export function terminarHablaKusi(estado) { estado.restante = 0; estado.vozActiva = false }
export function avanzarHablaKusi(estado, segundos) {
  if (!estado.activo) return { entrada: 0, rebote: 0, boca: false, cuadro: 9, animacion: 'respirar', hablando: false }
  const dt = Number.isFinite(segundos) ? Math.max(0, segundos) : 0
  estado.tiempo += dt; estado.tiempoHabla += dt
  estado.restante = estado.vozActiva ? Math.max(1, estado.restante) : Math.max(0, estado.restante - dt)
  estado.saludo = Math.max(0, estado.saludo - dt)
  let animacion, cuadro
  if (estado.saludo > 0) {
    animacion = 'saludar'; cuadro = 3 + [0, 1, 2, 1][Math.floor(estado.tiempo / .25) % 4]
  } else if (estado.restante > 0) {
    animacion = 'hablar'; cuadro = [0, 1, 2, 1][Math.floor(estado.tiempoHabla / .13) % 4]
  } else {
    if (estado.parpadeo === null) {
      estado.esperaParpadeo -= dt
      if (estado.esperaParpadeo <= 0) estado.parpadeo = 0
    } else estado.parpadeo += dt
    if (estado.parpadeo !== null && estado.parpadeo < .30) {
      animacion = 'parpadear'; cuadro = 6 + [0, 1, 2, 1, 0][Math.min(4, Math.floor(estado.parpadeo / .06))]
    } else {
      if (estado.parpadeo !== null) { estado.parpadeo = null; estado.esperaParpadeo = 3.4 }
      animacion = 'respirar'; cuadro = 9 + [0, 1, 2, 1][Math.floor(estado.tiempo / .65) % 4]
    }
  }
  estado.animacion = animacion; estado.cuadro = cuadro
  return { entrada: 0, rebote: 0, boca: animacion === 'hablar' && cuadro > 0,
    cuadro, animacion, hablando: estado.restante > 0 }
}
