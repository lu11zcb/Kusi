// Cada fila empieza tres cuadros después de la anterior.
export const FILAS_KUSI = Object.freeze({ hablar: 0, saludar: 3, parpadear: 6, respirar: 9, celebrar: 12 })
const CICLO = [0, 1, 2, 1]
const DURACION_CELEBRACION = 2.5
const PASO_CELEBRACION = DURACION_CELEBRACION / 16

export function crearHablaKusi(activo = true) {
  return { activo, tiempo: 0, tiempoHabla: 0, restante: 0, vozActiva: false, saludo: 1.2,
    esperaParpadeo: 3.4, parpadeo: null, celebracion: null,
    animacion: activo ? 'saludar' : 'respirar', cuadro: activo ? FILAS_KUSI.saludar : FILAS_KUSI.respirar }
}
export function iniciarHablaKusi(estado, texto) {
  estado.restante = Math.min(12, Math.max(1.5, texto.length * .065))
  estado.tiempoHabla = 0
  estado.vozActiva = false
}
export function terminarHablaKusi(estado) { estado.restante = 0; estado.vozActiva = false }

export function iniciarCelebracionKusi(estado) {
  estado.celebracion = 0
  estado.saludo = 0
  estado.parpadeo = null
  estado.esperaParpadeo = 3.4
}

export function animarVozKusi(estado, texto) {
  return {
    alEmpezar() {
      iniciarHablaKusi(estado, texto)
      estado.saludo = 0
      estado.vozActiva = true
    },
    alTerminar: () => terminarHablaKusi(estado),
  }
}

export function avanzarHablaKusi(estado, segundos) {
  if (!estado.activo) return { entrada: 0, rebote: 0, boca: false, cuadro: FILAS_KUSI.respirar, animacion: 'respirar', hablando: false }
  const dt = Number.isFinite(segundos) ? Math.max(0, segundos) : 0
  estado.tiempo += dt; estado.tiempoHabla += dt
  estado.restante = estado.vozActiva ? Math.max(1, estado.restante) : Math.max(0, estado.restante - dt)
  estado.saludo = Math.max(0, estado.saludo - dt)
  if (estado.celebracion !== null) {
    estado.celebracion += dt
    if (estado.celebracion >= DURACION_CELEBRACION && !estado.vozActiva) estado.celebracion = null
  }

  let animacion, cuadro
  let rebote = 0
  if (estado.celebracion !== null) {
    // Las poses de la fiesta ya alternan la boca. La voz prolonga el gesto
    // sin cambiar de fila ni reiniciar el ciclo al empezar a sonar.
    const fase = estado.celebracion / PASO_CELEBRACION % CICLO.length
    animacion = 'celebrar'; cuadro = FILAS_KUSI.celebrar + CICLO[Math.floor(fase)]
    // Los dibujos tienen los pies alineados y el HUD levanta el cuadro durante el salto.
    rebote = Math.max(0, 1 - Math.abs(fase - 1.5))
  } else if (estado.saludo > 0) {
    animacion = 'saludar'; cuadro = FILAS_KUSI.saludar + CICLO[Math.floor(estado.tiempo / .25) % 4]
  } else if (estado.restante > 0) {
    animacion = 'hablar'; cuadro = FILAS_KUSI.hablar + CICLO[Math.floor(estado.tiempoHabla / .13) % 4]
  } else {
    if (estado.parpadeo === null) {
      estado.esperaParpadeo -= dt
      if (estado.esperaParpadeo <= 0) estado.parpadeo = 0
    } else estado.parpadeo += dt
    if (estado.parpadeo !== null && estado.parpadeo < .30) {
      animacion = 'parpadear'; cuadro = FILAS_KUSI.parpadear + [0, 1, 2, 1, 0][Math.min(4, Math.floor(estado.parpadeo / .06))]
    } else {
      if (estado.parpadeo !== null) { estado.parpadeo = null; estado.esperaParpadeo = 3.4 }
      animacion = 'respirar'; cuadro = FILAS_KUSI.respirar + CICLO[Math.floor(estado.tiempo / .65) % 4]
    }
  }
  estado.animacion = animacion; estado.cuadro = cuadro
  const boca = (animacion === 'hablar' && cuadro > FILAS_KUSI.hablar) ||
    (animacion === 'celebrar' && cuadro > FILAS_KUSI.celebrar)
  return { entrada: 0, rebote, boca,
    cuadro, animacion, hablando: estado.restante > 0 }
}
