// Detalles visuales compartidos por los paneles (colores, emojis y saludos).

// Iniciales para el avatar del perfil: "Ana Ruiz" → "AR".
export function iniciales(nombre: string) {
  return nombre.split(/\s+/).filter(Boolean).slice(0, 2).map((parte) => parte[0].toUpperCase()).join('')
}

// Saludo según la hora, como la pantalla de inicio de un juego.
export function saludo() {
  const hora = new Date().getHours()
  return hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches'
}

export const primerNombre = (nombre: string) => nombre.trim().split(/\s+/)[0] ?? nombre

const colores = ['c-dorado', 'c-rojo', 'c-verde', 'c-cielo', 'c-morado', 'c-rosa'] as const

// Color estable por texto: el mismo estudiante o sección siempre tiene el mismo color.
export function colorPara(texto: string) {
  let suma = 0
  for (const letra of texto) suma = (suma * 31 + letra.charCodeAt(0)) >>> 0
  return colores[suma % colores.length]
}

// Cada curso del catálogo inicial tiene su emoji y su color; otros usan uno estable.
const cursos: Record<string, { emoji: string; color: string }> = {
  'matemática': { emoji: '🔢', color: 'c-cielo' },
  'comunicación': { emoji: '📖', color: 'c-rojo' },
  'personal social': { emoji: '🤝', color: 'c-dorado' },
  'ciencia y tecnología': { emoji: '🔬', color: 'c-verde' },
  'arte y cultura': { emoji: '🎨', color: 'c-rosa' },
  'educación religiosa': { emoji: '🕊️', color: 'c-morado' },
  'inglés': { emoji: '🌎', color: 'c-vino' },
}

export function aparienciaCurso(nombre: string) {
  return cursos[nombre.trim().toLowerCase()] ?? { emoji: '📚', color: colorPara(nombre) }
}
