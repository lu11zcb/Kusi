// Lista de todo lo que pasa en el juego (compras, pagos que no alcanzan, lista completa).
// Más adelante estos avisos se mandarán a la app por KusiPuente; por ahora solo se muestran en la consola.

export const avisos = []

// Guarda un aviso con su hora y lo muestra en la consola con «[Kusi]».
export function avisar(tipo, datos = {}) {
  const aviso = { tipo, ...datos, momento: new Date().toISOString() }
  avisos.push(aviso)
  // Como texto JSON para que se lea igual en el navegador y en los registros de Android.
  console.log(`[Kusi] ${JSON.stringify(aviso)}`)
  return aviso
}
