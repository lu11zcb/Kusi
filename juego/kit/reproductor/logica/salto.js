// El salto sobre un obstáculo pequeño, sin Phaser (para probarlo con node --test). Un salto es una parábola:
// el personaje sube y baja mientras avanza de un punto a otro, con un aplastón al despegar y otro al caer.
// Es para escalones, charcos, cajas o huecos chicos DENTRO de un lugar (reglas.md, 13.11): nunca para viajar
// entre lugares. El juego lo dibuja con ../efectos/salto.js.

// La posición en el instante t (de 0 a 1): avanza en línea recta y se levanta en arco.
export function puntoDelSalto(inicio, fin, t, altura) {
  const avance = Math.min(1, Math.max(0, t))
  return {
    x: inicio.x + (fin.x - inicio.x) * avance,
    y: inicio.y + (fin.y - inicio.y) * avance - 4 * altura * avance * (1 - avance),
  }
}

// La duración del salto según la distancia: ni tan corto que no se vea, ni tan largo que aburra.
export function duracionDelSalto(inicio, fin, { minima = 380, maxima = 760, velocidad = 1.1 } = {}) {
  const distancia = Math.hypot(fin.x - inicio.x, fin.y - inicio.y)
  return Math.round(Math.min(maxima, Math.max(minima, distancia / velocidad)))
}

// El estirón y el aplastón del cuerpo: estirado al subir, aplastado al despegar y al aterrizar.
export function formaDelSalto(t) {
  const avance = Math.min(1, Math.max(0, t))
  const aire = Math.sin(avance * Math.PI)
  const apoyo = avance < 0.15 ? 1 - avance / 0.15 : avance > 0.85 ? (avance - 0.85) / 0.15 : 0
  return { escalaX: 1 - 0.1 * aire + 0.12 * apoyo, escalaY: 1 + 0.14 * aire - 0.14 * apoyo }
}
