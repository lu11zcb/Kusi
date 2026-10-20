import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { crearSeccion } from '../servicios/secciones'
import type { Seccion } from '../servicios/secciones'
import { listarSecciones } from '../servicios/educacion'
import { IconoDocente as IconoGestion } from '../docente/IconoDocente'

export function CrearSeccion({ alCambiarBloqueo }: { alCambiarBloqueo?: (bloqueado: boolean) => void }) {
  const [nombre, establecerNombre] = useState('')
  const [anio, establecerAnio] = useState(String(new Date().getFullYear()))
  const [error, establecerError] = useState('')
  const [errorLista, establecerErrorLista] = useState('')
  const [secciones, establecerSecciones] = useState<Seccion[] | null>(null)
  const [revision, establecerRevision] = useState(0)
  const [resultado, establecerResultado] = useState<Seccion | null>(null)
  const [ocupado, establecerOcupado] = useState(false)
  const bloqueo = useRef(false)
  useEffect(() => {
    let vigente = true
    listarSecciones().then((datos) => { if (vigente) { establecerSecciones(datos.secciones); establecerErrorLista('') } }).catch((fallo: Error) => { if (vigente) establecerErrorLista(fallo.message) })
    return () => { vigente = false }
  }, [revision])
  useEffect(() => { alCambiarBloqueo?.(ocupado); return () => alCambiarBloqueo?.(false) }, [ocupado, alCambiarBloqueo])
  async function guardar(evento: FormEvent) {
    evento.preventDefault()
    if (bloqueo.current) return
    bloqueo.current = true; establecerOcupado(true); establecerError(''); establecerResultado(null)
    try {
      const datos = await crearSeccion({ grado: 1, nombre, anio_escolar: Number(anio) })
      establecerResultado(datos.seccion); establecerNombre('')
      establecerSecciones((previas) => [...(previas ?? []).filter((s) => s.id !== datos.seccion.id), datos.seccion])
    } catch (fallo) { establecerError((fallo as Error).message) }
    finally { bloqueo.current = false; establecerOcupado(false) }
  }
  return <>
    <header className="admin-encabezado"><div><span className="admin-antetitulo">UN LUGAR PARA APRENDER JUNTOS</span><h1>Secciones</h1><p>Organiza los grupos de primero de primaria por año escolar.</p></div><span className="admin-ilustracion-icono"><IconoGestion nombre="secciones" /></span></header>
    {error && <p className="error-resumen" role="alert">{error}</p>}
    {resultado && <p role="status" className="admin-exito"><IconoGestion nombre="check" />Sección {resultado.nombre} creada para {resultado.anio_escolar}.</p>}
    <div className="admin-secciones"><form onSubmit={guardar}><h2>Crear una sección</h2><fieldset disabled={ocupado}>
      <div className="campo"><label htmlFor="grado-seccion">Grado</label><select id="grado-seccion" value="1" disabled><option value="1">Primero de primaria</option></select></div>
      <div className="campo"><label htmlFor="nombre-seccion">Nombre de la sección</label><input id="nombre-seccion" placeholder="Por ejemplo, A o Los exploradores" value={nombre} onChange={(evento) => establecerNombre(evento.target.value)} required maxLength={80} /></div>
      <div className="campo"><label htmlFor="anio-seccion">Año escolar</label><input id="anio-seccion" type="number" value={anio} onChange={(evento) => establecerAnio(evento.target.value)} min="1000" max="9999" step="1" required /></div>
    </fieldset><button type="submit" disabled={ocupado}><IconoGestion nombre="mas" />{ocupado ? 'Creando…' : 'Crear sección'}</button></form>
    <section aria-label="Secciones existentes"><h2>Tus secciones</h2>{errorLista && <p role="alert">{errorLista} <button type="button" className="secundario" onClick={() => establecerRevision((v) => v + 1)}>Volver a cargar</button></p>}{!secciones && !errorLista && <p role="status">Cargando secciones…</p>}{secciones?.length === 0 && <div className="admin-vacio"><IconoGestion nombre="secciones" /><h3>Prepara tu primer grupo</h3><p>Después podrás vincular estudiantes y asignar docentes.</p></div>}<ul className="admin-grupos">{secciones?.map((grupo) => <li key={grupo.id}><IconoGestion nombre="secciones" /><div><strong>{grupo.nombre}</strong><span>{grupo.grado}° de primaria · {grupo.anio_escolar}</span></div></li>)}</ul></section></div>
  </>
}
