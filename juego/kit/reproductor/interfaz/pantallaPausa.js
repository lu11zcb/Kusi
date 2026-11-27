import './pantallaPausa.css'

export function crearPantallaPausa(documento) {
  // La tarjeta vive fuera del lienzo para poder recibir toques con Phaser
  // detenido. El diálogo también impide enfocar o tocar lo que queda debajo.
  const dialogo = documento.createElement('dialog')
  dialogo.className = 'pantalla-pausa'
  dialogo.setAttribute('aria-labelledby', 'titulo-pausa')
  dialogo.innerHTML = `
    <h2 id="titulo-pausa">Pausa</h2>
    <div class="pantalla-pausa-botones">
      <button type="button" autofocus>
        <img src="dibujos/interfaz/boton-seguir.png" alt="" width="128" height="128">
        Seguir
      </button>
      <button type="button">
        <img src="dibujos/interfaz/boton-salir.png" alt="" width="128" height="128">
        Salir
      </button>
    </div>`
  const titulo = dialogo.querySelector('h2')
  const botones = dialogo.querySelector('.pantalla-pausa-botones')
  const [seguir, salir] = botones.querySelectorAll('button')
  // Cerrar por Esc dejaría el juego congelado sin el botón para reanudarlo.
  dialogo.addEventListener('cancel', (evento) => evento.preventDefault())

  return {
    mostrar(acciones) {
      titulo.textContent = 'Pausa'
      botones.hidden = false
      seguir.onclick = acciones.seguir
      salir.onclick = acciones.salir
      documento.body.append(dialogo)
      dialogo.showModal()
    },
    ocultar() {
      dialogo.close()
      dialogo.remove()
    },
    despedir() {
      titulo.textContent = '¡Hasta pronto!'
      botones.hidden = true
    },
  }
}
