// La física de un juego de plataformas, sin Phaser (para probarla con node --test): el protagonista
// camina con el joystick, salta con un botón, cae por la gravedad y aterriza sobre las plataformas.
// Es amable con niños de 6 años: perdona un salto pedido un poco tarde (tiempo de gracia al salir de
// una plataforma) o un poco temprano (el salto queda guardado), y si se cae al vacío vuelve a la última
// plataforma en la que estuvo, sin perder nada. Las posiciones son los PIES del personaje (centro,
// abajo), en píxeles, con la y hacia abajo.
//
//   const cuerpo = crearCuerpo({ x: 200, y: 400 })
//   avanzarCuerpo(cuerpo, { x: vector.x, saltar }, PLATAFORMAS, segundos, { limites })
//
// Cada plataforma es { x, y, ancho }: su borde izquierdo y la altura de su superficie. Solo se pisa por
// arriba (se puede saltar desde abajo, atravesándola).

export const FISICA = Object.freeze({
  gravedad: 2600, // px/s²
  velocidad: 380, // px/s al caminar
  salto: 1020, // px/s hacia arriba al saltar
  graciaSalto: 0.12, // s después de salir del borde en que todavía se puede saltar
  guardaSalto: 0.14, // s que un salto pedido antes de aterrizar espera
  caidaMaxima: 1500, // px/s
  margenBorde: 14, // px que se perdona fuera del borde de una plataforma
  aceleracion: 3200, // px/s² al arrancar o frenar en el suelo
  aceleracionAire: 2200, // px/s² en el aire
})

export function crearCuerpo({ x, y }) {
  return { x, y, vx: 0, vy: 0, enSuelo: false, plataforma: null, sinSuelo: 0, guardaSalto: 0, seguro: { x, y }, reaparecio: false, aterrizo: false, salto: false }
}

function acercar(valor, meta, paso) {
  if (valor < meta) return Math.min(meta, valor + paso)
  if (valor > meta) return Math.max(meta, valor - paso)
  return valor
}

// Avanza el cuerpo «segundos» (un cuadro). «entrada» = { x: -1..1, saltar: se pidió saltar en este cuadro }.
// «mundo.limites» = { izquierda, derecha, abajo }; cae por debajo de «abajo» = reaparece.
// Devuelve el mismo cuerpo, con las banderas de este cuadro: salto, aterrizo y reaparecio.
export function avanzarCuerpo(cuerpo, entrada, plataformas, segundos, mundo = {}, fisica = FISICA) {
  const dt = Math.min(Math.max(segundos, 0), 0.05)
  cuerpo.salto = false
  cuerpo.aterrizo = false
  cuerpo.reaparecio = false

  // Horizontal: arranca y frena con suavidad.
  const meta = Math.max(-1, Math.min(1, entrada.x ?? 0)) * fisica.velocidad
  cuerpo.vx = acercar(cuerpo.vx, meta, (cuerpo.enSuelo ? fisica.aceleracion : fisica.aceleracionAire) * dt)

  // Salto: pedido ahora o guardado hace un momento, y permitido en el suelo o recién salido de él.
  if (entrada.saltar) cuerpo.guardaSalto = fisica.guardaSalto
  else cuerpo.guardaSalto = Math.max(0, cuerpo.guardaSalto - dt)
  if (cuerpo.guardaSalto > 0 && (cuerpo.enSuelo || cuerpo.sinSuelo < fisica.graciaSalto) && cuerpo.vy >= 0) {
    cuerpo.vy = -fisica.salto
    cuerpo.enSuelo = false
    cuerpo.plataforma = null
    cuerpo.sinSuelo = fisica.graciaSalto
    cuerpo.guardaSalto = 0
    cuerpo.salto = true
  }

  const antes = { x: cuerpo.x, y: cuerpo.y }
  cuerpo.vy = Math.min(fisica.caidaMaxima, cuerpo.vy + fisica.gravedad * dt)
  cuerpo.x += cuerpo.vx * dt
  cuerpo.y += cuerpo.vy * dt
  if (mundo.limites) cuerpo.x = Math.min(mundo.limites.derecha, Math.max(mundo.limites.izquierda, cuerpo.x))

  // Aterrizaje: cayendo, los pies cruzaron la superficie de una plataforma por arriba.
  let aterrizoEn = null
  if (cuerpo.vy >= 0) {
    for (const plataforma of plataformas) {
      const dentro = cuerpo.x >= plataforma.x - fisica.margenBorde && cuerpo.x <= plataforma.x + plataforma.ancho + fisica.margenBorde
      if (dentro && antes.y <= plataforma.y + 1 && cuerpo.y >= plataforma.y) {
        if (!aterrizoEn || plataforma.y < aterrizoEn.y) aterrizoEn = plataforma
      }
    }
  }
  if (aterrizoEn) {
    cuerpo.aterrizo = !cuerpo.enSuelo
    cuerpo.y = aterrizoEn.y
    cuerpo.vy = 0
    cuerpo.enSuelo = true
    cuerpo.plataforma = aterrizoEn
    cuerpo.sinSuelo = 0
    cuerpo.seguro = { x: Math.min(aterrizoEn.x + aterrizoEn.ancho - 20, Math.max(aterrizoEn.x + 20, cuerpo.x)), y: aterrizoEn.y }
  } else if (cuerpo.enSuelo) {
    // Caminó fuera del borde: empieza a caer, con su tiempo de gracia.
    const p = cuerpo.plataforma
    const sigue = p && cuerpo.x >= p.x - fisica.margenBorde && cuerpo.x <= p.x + p.ancho + fisica.margenBorde
    if (!sigue) { cuerpo.enSuelo = false; cuerpo.plataforma = null; cuerpo.sinSuelo = 0 }
  }
  if (!cuerpo.enSuelo) cuerpo.sinSuelo += dt

  // Al vacío: vuelve a la última plataforma segura, sin perder nada.
  if (mundo.limites?.abajo !== undefined && cuerpo.y > mundo.limites.abajo) {
    cuerpo.x = cuerpo.seguro.x
    cuerpo.y = cuerpo.seguro.y
    cuerpo.vx = 0
    cuerpo.vy = 0
    cuerpo.enSuelo = true
    cuerpo.sinSuelo = 0
    cuerpo.reaparecio = true
  }
  return cuerpo
}

// ¿Llega un salto desde una plataforma a otra? Sirve para armar niveles que se puedan cruzar: con la
// física de arriba, el salto más largo y el más alto. Devuelve { alcanceX, alturaMaxima }.
export function alcanceDelSalto(fisica = FISICA) {
  const tiempoSubida = fisica.salto / fisica.gravedad
  const alturaMaxima = (fisica.salto * fisica.salto) / (2 * fisica.gravedad)
  // En el aire: sube, y baja hasta el nivel de salida (2 × tiempoSubida), a toda velocidad.
  const alcanceX = fisica.velocidad * 2 * tiempoSubida
  return { alcanceX, alturaMaxima }
}

// La separación más larga entre dos plataformas, a la misma altura, que el niño puede cruzar con
// comodidad (el 70 % del alcance), y el desnivel más alto que puede subir (el 70 % de la altura).
export function separacionComoda(fisica = FISICA) {
  const { alcanceX, alturaMaxima } = alcanceDelSalto(fisica)
  return { hueco: Math.floor(alcanceX * 0.7), subida: Math.floor(alturaMaxima * 0.7) }
}
