export function normalizarFrase(texto) {
  return typeof texto === 'string' ? texto.trim().replace(/\s+/g, ' ') : ''
}

// Tanto el listado de macOS como las voces del navegador pueden usar nombres en inglés.
export const PATRON_VOZ_NATURAL = /\b(?:Premium|Mejorada|Enhanced)\b/i
