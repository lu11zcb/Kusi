import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { crearAsignacion, listarAsignaciones } from '../servicios/educacion'
import type { AsignacionDocente } from '../servicios/educacion'

export function AsignarDocentes() {
  const [docente, setDocente] = useState(''); const [curso, setCurso] = useState(''); const [seccion, setSeccion] = useState(''); const [anio, setAnio] = useState(String(new Date().getFullYear()))
  const [asignaciones, setAsignaciones] = useState<AsignacionDocente[]>([]); const [error, setError] = useState(''); const [mensaje, setMensaje] = useState(''); const [ocupado, setOcupado] = useState(false)
  async function cargar() { try { setAsignaciones((await listarAsignaciones()).asignaciones); setError('') } catch (e) { setError(e instanceof Error ? e.message : 'No se pudieron cargar las asignaciones.') } }
  useEffect(() => { void cargar() }, [])
  async function guardar(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setError(''); setMensaje(''); if (!Number.isInteger(Number(anio)) || Number(anio)<1000 || Number(anio)>9999) { setError('Ingresa un año escolar de cuatro cifras.'); return }
    setOcupado(true); try { await crearAsignacion({docente_id:docente.trim(),curso_id:curso.trim(),seccion_id:seccion.trim(),anio_escolar:Number(anio)}); setMensaje('Docente asignado correctamente.'); setDocente(''); await cargar() } catch(e) {setError(e instanceof Error?e.message:'No se pudo guardar la asignación.')} finally {setOcupado(false)} }
  return <section><h1>Asignar docentes a cursos</h1><p>Relaciona una cuenta docente, un curso del catálogo, una sección existente y el año escolar. Los UUID se validan en el servidor.</p>
    <form onSubmit={guardar}><div className="campo"><label htmlFor="asig-docente">UUID del docente</label><input id="asig-docente" value={docente} onChange={e=>setDocente(e.target.value)} required /></div>
    <div className="campo"><label htmlFor="asig-curso">UUID del curso</label><input id="asig-curso" value={curso} onChange={e=>setCurso(e.target.value)} required /></div>
    <div className="campo"><label htmlFor="asig-seccion">UUID de la sección</label><input id="asig-seccion" value={seccion} onChange={e=>setSeccion(e.target.value)} required /></div>
    <div className="campo"><label htmlFor="asig-anio">Año escolar</label><input id="asig-anio" type="number" min="1000" max="9999" value={anio} onChange={e=>setAnio(e.target.value)} required /></div>
    <button type="submit" disabled={ocupado}>{ocupado?'Guardando…':'Asignar docente'}</button></form>
    {error && <p role="alert" className="error-resumen">{error}</p>}{mensaje && <p role="status">{mensaje}</p>}
    <h2>Asignaciones existentes</h2><ul>{asignaciones.map(a=><li key={a.id}>Docente {a.docente_id} · Curso {a.curso_id} · {a.seccion.nombre} · {a.anio_escolar}</li>)}</ul>
  </section>
}
