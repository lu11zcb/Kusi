import type { ReactNode } from 'react'
import type { SolicitudPropuesta } from '../servicios/propuestas'
import { IconoDocente } from './IconoDocente'
import { estadoPropuesta, identidadCurso } from './utilidadesDocente'
export function IconoCurso({ nombre }: { nombre: string }) {
  const curso = identidadCurso(nombre)
  return <span className={'doc-icono-curso doc-tono-' + curso.tono}><IconoDocente nombre={curso.icono} /></span>
}
export function CabeceraDocente({ titulo, descripcion, children }: { titulo: string; descripcion: string; children?: ReactNode }) {
  return <header className="doc-cabecera"><div><h1>{titulo}</h1><p>{descripcion}</p></div>{children && <div className="doc-cabecera-acciones">{children}</div>}</header>
}
export function MensajeDocente({ titulo, children, error = false }: { titulo: string; children?: ReactNode; error?: boolean }) {
  return <div className={'doc-mensaje' + (error ? ' doc-mensaje-error' : '')} role={error ? 'alert' : 'status'}><IconoDocente nombre="info" /><div><strong>{titulo}</strong>{children}</div></div>
}
export function EtiquetaPropuesta({ solicitud }: { solicitud: SolicitudPropuesta }) {
  const estado = estadoPropuesta(solicitud)
  return <span className={'doc-estado doc-estado-' + estado.clave}><IconoDocente nombre={estado.clave === 'aprobada' ? 'check' : estado.clave === 'rechazada' || estado.clave === 'fallida' ? 'info' : 'reloj'} />{estado.etiqueta}</span>
}
export function CargandoDocente({ texto }: { texto: string }) {
  return <div className="doc-cargando" role="status"><span>{texto}</span><div aria-hidden="true"><i /><i /><i /></div></div>
}
