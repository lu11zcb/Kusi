import { CLASES_LABERINTO } from '../datos/validarLaberinto.js'

// El paquete describe el reto y permanece intacto. Cada partida conserva su
// propia lista de objetos, para que una captura o un nuevo intento de movimiento
// no reconstruyan ni borren los alimentos que el niño ya recogió.
export function crearRegla(reto) {
  return {
    recogidos: 0,
    completada: false,
    errores: 0,
    objetos: reto.objetos.map((objeto) => ({ ...objeto, recogido: false })),
  }
}

// Esta función se llama al entrar al centro de una casilla, no en cada cuadro.
// Un error conserva el objeto en su lugar; la escena solo anima ese dibujo y
// muestra la pista indicada. La segunda ayuda se mantiene en errores posteriores.
export function comerEnCasilla(estado, regla, fila, columna) {
  if (estado.completada) return null

  const indice = estado.objetos.findIndex((objeto) =>
    !objeto.recogido && objeto.fila === fila && objeto.columna === columna)
  if (indice === -1) return null

  const objeto = estado.objetos[indice]
  const correcto = regla.tipo === 'orden'
    ? objeto.tipo === regla.secuencia[estado.recogidos]
    : CLASES_LABERINTO[regla.clase].includes(objeto.tipo)

  if (correcto) {
    objeto.recogido = true
    estado.recogidos += 1
    const meta = regla.tipo === 'orden' ? regla.secuencia.length : regla.meta
    estado.completada = estado.recogidos >= meta
  } else {
    estado.errores += 1
  }

  // La escena recibe solo los datos de esta entrada. Ni Phaser, ni la voz, ni
  // los avisos forman parte de las reglas y pueden probarse por separado.
  return {
    indice,
    objeto: objeto.tipo,
    correcto,
    completada: estado.completada,
    ayuda: correcto ? null : Math.min(estado.errores, 2),
  }
}
