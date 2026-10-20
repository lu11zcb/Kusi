import { useEffect, useId, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import avatar from '../assets/kusi/cuy-avatar.webp'
import { Icono } from './Icono'
import type { NombreIcono } from './Icono'
import { iniciales } from './apariencia'

export type OpcionMenu = { id: string; etiqueta: string; icono: NombreIcono; iconoVisual?: ReactNode }

type Propiedades = {
  rol: string
  nombre: string
  opciones: readonly OpcionMenu[]
  actual: string
  alElegir: (id: string) => void
  bloqueado?: boolean
  fichas?: ReactNode
  promo?: ReactNode
  salir: () => void
  cambiarRol?: () => void
  etiquetaMenu?: string
  menuPlegable?: boolean
  children: ReactNode
}

// Estructura común de los paneles administrador y docente: menú lateral con el
// cuy, barra superior con la fecha y el contenido de la sección elegida.
export function Tablero({ rol, nombre, opciones, actual, alElegir, bloqueado, fichas, promo, salir, cambiarRol, menuPlegable = false, etiquetaMenu = 'Menú del docente', children }: Propiedades) {
  const [menuAbierto, establecerMenuAbierto] = useState(false)
  const menuId = useId()
  const contenido = useRef<HTMLElement>(null)
  // Al cambiar de sección el foco va al contenido, para lectores de pantalla y teclado.
  const primeraVez = useRef(true)
  useEffect(() => {
    if (primeraVez.current) { primeraVez.current = false; return }
    contenido.current?.focus()
  }, [actual])
  const fecha = new Date().toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })
  return <div className="tablero">
    <a className="saltar-contenido" href="#contenido">Ir al contenido</a>
    <aside className="tablero-lateral">
      <div className="marca">
        <img src={avatar} alt="" />
        <div><strong>Kusi</strong><small>Aprende · Juega · Crea</small></div>
      </div>
      {menuPlegable && <button type="button" className="doc-alternar-menu secundario" aria-expanded={menuAbierto} aria-controls={menuId} onClick={() => establecerMenuAbierto(!menuAbierto)}>{menuAbierto ? 'Cerrar menú' : etiquetaMenu}<Icono nombre="estudiantes" /></button>}
      <nav id={menuId} className={'menu' + (menuPlegable ? ' doc-menu-plegable' : '') + (menuAbierto ? ' doc-menu-abierto' : '')} aria-label={'Panel ' + rol} onKeyDown={(evento) => { if (menuPlegable && evento.key === 'Escape') { establecerMenuAbierto(false); evento.currentTarget.parentElement?.querySelector<HTMLButtonElement>('.doc-alternar-menu')?.focus() } }}>
        {opciones.map((opcion) => <button key={opcion.id} type="button" disabled={bloqueado}
          aria-current={actual === opcion.id ? 'page' : undefined} onClick={() => { alElegir(opcion.id); establecerMenuAbierto(false) }}>
          <span className="icono-menu">{opcion.iconoVisual ?? <Icono nombre={opcion.icono} />}</span>{opcion.etiqueta}
        </button>)}
      </nav>
      <div className="lateral-pie">
        {promo}
        <div className="perfil">
          <span className="iniciales" aria-hidden="true">{iniciales(nombre)}</span>
          <div><strong>{nombre}</strong><small>{rol}</small></div>
          {cambiarRol && <button type="button" className="boton-icono" disabled={bloqueado} onClick={cambiarRol} aria-label="Cambiar de panel" title="Cambiar de panel"><Icono nombre="cambiar" /></button>}
          <button type="button" className="boton-icono" disabled={bloqueado} onClick={salir} aria-label="Cerrar sesión" title="Cerrar sesión"><Icono nombre="salir" /></button>
        </div>
      </div>
    </aside>
    <div className="tablero-cuerpo">
      <div className="barra-superior">
        <span className="fecha">{fecha}</span>
        <div className="fichas">{fichas}</div>
      </div>
      <main id="contenido" ref={contenido} tabIndex={-1}>{children}</main>
    </div>
  </div>
}
