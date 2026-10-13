import type { CSSProperties, ReactNode } from 'react'
import cuarto from '../assets/kusi/cuarto-vacio.webp'
import avatar from '../assets/kusi/cuy-avatar.webp'

// Pantallas intermedias (cambiar contraseña, elegir panel) sobre el cuarto del cuy.
export function PantallaCuarto({ children }: { children: ReactNode }) {
  const fondo = { '--fondo-cuarto': 'url(' + cuarto + ')' } as CSSProperties
  return <main className="pantalla-cuarto" style={fondo}>
    <div className="tarjeta-acceso">
      <img className="mascota" src={avatar} alt="" />
      {children}
    </div>
  </main>
}
