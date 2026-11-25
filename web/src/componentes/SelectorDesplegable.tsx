import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { Icono } from './Icono'

type Propiedades = {
  id: string
  opciones: readonly { id: string; nombre: string }[]
  valor: string
  alCambiar: (valor: string) => void
  textoVacio?: string
  disabled?: boolean
  required?: boolean
  descritoPor?: string
}

export function SelectorDesplegable({ id, opciones, valor, alCambiar, textoVacio = 'Elige de la lista', disabled = false, required = false, descritoPor }: Propiedades) {
  const [activo, establecerActivo] = useState<number | null>(null)
  const [mostrarError, establecerMostrarError] = useState(false)
  const boton = useRef<HTMLButtonElement>(null)
  const lista = useRef<HTMLUListElement>(null)
  const opcionActiva = useRef<HTMLLIElement>(null)
  const seleccionado = opciones.findIndex((opcion) => opcion.id === valor)
  const invalido = required && !disabled && (!valor || seleccionado === -1)
  const abierto = !disabled && opciones.length > 0 && activo !== null
  const indice = Math.min(activo ?? 0, opciones.length - 1)
  const listaId = id + '-opciones'
  const etiquetaId = id + '-etiqueta'
  const errorId = id + '-error'
  const mostrarMensaje = mostrarError && invalido

  useLayoutEffect(() => {
    if (!abierto || !boton.current || !lista.current) return
    const ancla = boton.current
    const menu = lista.current

    function ubicarLista() {
      const rect = ancla.getBoundingClientRect()
      const alto = document.documentElement.clientHeight
      const ancho = document.documentElement.clientWidth
      const margen = 8
      const separacion = 4
      const abajo = alto - rect.bottom - margen - separacion
      const arriba = rect.top - margen - separacion
      const abrirArriba = abajo < menu.scrollHeight && arriba > abajo
      const anchoLista = Math.min(rect.width, ancho - margen * 2)
      menu.style.width = anchoLista + 'px'
      menu.style.left = Math.max(margen, Math.min(rect.left, ancho - anchoLista - margen)) + 'px'
      menu.style.maxHeight = 'min(16rem, ' + Math.max(0, abrirArriba ? arriba : abajo) + 'px)'
      menu.style.top = abrirArriba ? 'auto' : rect.bottom + separacion + 'px'
      menu.style.bottom = abrirArriba ? alto - rect.top + separacion + 'px' : 'auto'
      menu.style.visibility = rect.bottom <= 0 || rect.top >= alto ? 'hidden' : ''
    }

    // El portal evita que la tarjeta recorte la lista. También hay que seguir
    // al botón cuando se desplaza una tarjeta o cambia el tamaño de la ventana.
    ubicarLista()
    const observador = new ResizeObserver(ubicarLista)
    observador.observe(ancla)
    window.addEventListener('resize', ubicarLista)
    window.addEventListener('scroll', ubicarLista, true)
    return () => {
      observador.disconnect()
      window.removeEventListener('resize', ubicarLista)
      window.removeEventListener('scroll', ubicarLista, true)
    }
  }, [abierto, opciones.length])

  useLayoutEffect(() => {
    if (!abierto || !lista.current || !opcionActiva.current) return
    const menu = lista.current
    const opcion = opcionActiva.current
    // Desplazamos solo la lista para que el teclado no mueva la página.
    const inicio = opcion.offsetTop
    const fin = inicio + opcion.offsetHeight
    if (inicio < menu.scrollTop) menu.scrollTop = inicio
    else if (fin > menu.scrollTop + menu.clientHeight) menu.scrollTop = fin - menu.clientHeight
  }, [abierto, indice])

  useEffect(() => {
    if (!abierto) return
    function cerrarFuera(evento: PointerEvent) {
      if (evento.target instanceof Node && !boton.current?.contains(evento.target) && !lista.current?.contains(evento.target)) {
        establecerActivo(null)
      }
    }
    document.addEventListener('pointerdown', cerrarFuera)
    return () => document.removeEventListener('pointerdown', cerrarFuera)
  }, [abierto])

  function elegir(posicion: number) {
    establecerActivo(null)
    establecerMostrarError(false)
    alCambiar(opciones[posicion].id)
    boton.current?.focus()
  }

  function usarTeclado(evento: KeyboardEvent<HTMLButtonElement>) {
    if (!opciones.length) return
    switch (evento.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        evento.preventDefault()
        const haciaAbajo = evento.key === 'ArrowDown'
        const inicial = seleccionado >= 0 ? seleccionado : haciaAbajo ? 0 : opciones.length - 1
        const destino = abierto ? indice + (haciaAbajo ? 1 : -1) : inicial
        establecerActivo(Math.max(0, Math.min(destino, opciones.length - 1)))
        break
      }
      case 'Home':
      case 'End':
        evento.preventDefault()
        establecerActivo(evento.key === 'Home' ? 0 : opciones.length - 1)
        break
      case 'Enter':
      case ' ':
        evento.preventDefault()
        if (abierto) elegir(indice)
        else establecerActivo(Math.max(0, seleccionado))
        break
      case 'Escape':
        if (abierto) {
          evento.preventDefault()
          evento.stopPropagation()
          establecerActivo(null)
        }
        break
      case 'Tab':
        establecerActivo(null)
        break
    }
  }

  return <>
    <button ref={boton} id={id} type="button" className="selector-desplegable" role="combobox"
      aria-labelledby={etiquetaId} aria-describedby={[id + '-valor', descritoPor, mostrarMensaje ? errorId : undefined].filter(Boolean).join(' ')}
      aria-required={required || undefined} aria-invalid={mostrarMensaje || undefined}
      aria-expanded={abierto} aria-controls={abierto ? listaId : undefined}
      aria-activedescendant={abierto ? listaId + '-' + indice : undefined}
      disabled={disabled} onClick={(evento) => {
        evento.currentTarget.focus()
        if (opciones.length) establecerActivo(abierto ? null : Math.max(0, seleccionado))
      }}
      onKeyDown={usarTeclado} onBlur={() => establecerActivo(null)}>
      <span id={id + '-valor'}>{opciones[seleccionado]?.nombre ?? textoVacio}</span>
      <Icono nombre="abajo" />
    </button>
    {abierto && createPortal(
      <ul ref={lista} id={listaId} className="selector-desplegable-lista" role="listbox" aria-labelledby={etiquetaId}>
        {opciones.map((opcion, posicion) => <li key={opcion.id} id={listaId + '-' + posicion}
          ref={posicion === indice ? opcionActiva : undefined} data-activa={posicion === indice}
          role="option" aria-selected={posicion === seleccionado}
          onMouseDown={(evento) => evento.preventDefault()} onClick={() => elegir(posicion)}>
          <span>{opcion.nombre}</span>{posicion === seleccionado && <Icono nombre="check" />}
        </li>)}
      </ul>, document.body)}
    {/* Una casilla sin nombre conserva la validación del formulario, incluso
        dentro de un fieldset deshabilitado. El control visible muestra el error. */}
    {required && <input type="checkbox" hidden tabIndex={-1} aria-hidden="true" required checked={!invalido}
      disabled={disabled} onChange={() => {}} onInvalid={(evento) => {
        evento.preventDefault()
        establecerMostrarError(true)
        boton.current?.focus()
      }} />}
    {mostrarMensaje && <p id={errorId} className="error-campo" role="alert">Elige una opción para continuar.</p>}
  </>
}
