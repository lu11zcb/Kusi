// Convierte las claves del paquete (sin tildes, con guiones) en lo que se lee en pantalla.

// Palabras que en la clave van sin tilde, pero en pantalla sí la llevan.
const PALABRAS_CON_TILDE = {
  platano: 'plátano',
  pina: 'piña',
  lucuma: 'lúcuma',
  azucar: 'azúcar',
  chupetin: 'chupetín',
  maiz: 'maíz',
  vicuna: 'vicuña',
  condor: 'cóndor',
}

// "maiz-morado" → "maíz morado": cada guion pasa a ser un espacio.
export function nombreVisible(clave) {
  return clave
    .split('-')
    .map((palabra) => PALABRAS_CON_TILDE[palabra] ?? palabra)
    .join(' ')
}

// Palabra del letrero de cada tipo de puesto.
const PALABRA_DEL_LETRERO = {
  pan: 'Pan',
  frutas: 'Frutas',
  verduras: 'Verduras',
  granja: 'Granja',
  granos: 'Granos',
  dulces: 'Dulces',
}

// "puesto-pan" → "pan".
export function tipoDePuesto(clavePuesto) {
  return clavePuesto.replace(/^puesto-/, '')
}

// "puesto-pan" → "Pan". Si llega un tipo nuevo, se usa su nombre con mayúscula.
export function palabraDelLetrero(clavePuesto) {
  const tipo = tipoDePuesto(clavePuesto)
  if (PALABRA_DEL_LETRERO[tipo]) return PALABRA_DEL_LETRERO[tipo]
  const nombre = nombreVisible(tipo)
  return nombre.charAt(0).toUpperCase() + nombre.slice(1)
}

// 1 → "1 sol"; 3 → "3 soles".
export function textoSoles(cantidad) {
  return cantidad === 1 ? '1 sol' : `${cantidad} soles`
}
