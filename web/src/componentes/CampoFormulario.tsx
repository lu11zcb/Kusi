import type { ReactNode } from 'react'

type Propiedades = { id: string; etiqueta: string; errores?: string[]; children: ReactNode }

export function CampoFormulario({ id, etiqueta, errores, children }: Propiedades) {
  return (
    <div className="campo">
      <label htmlFor={id}>{etiqueta}</label>
      {children}
      {errores && errores.length > 0 && (
        <p className="error-campo" id={id + '-error'}>{errores.join(' ')}</p>
      )}
    </div>
  )
}
