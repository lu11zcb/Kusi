import { useEffect, useState } from 'react'
import { misAsignacionesDocente } from '../servicios/educacion'
import type { AsignacionDocente } from '../servicios/educacion'

export function RecursosAsignados() {
  const [items, setItems] = useState<AsignacionDocente[]>([])
  const [error, setError] = useState('')
  useEffect(() => { let vigente=true; misAsignacionesDocente().then(r=>{if(vigente)setItems(r.asignaciones)}).catch(e=>{if(vigente)setError(e instanceof Error?e.message:'No se pudieron cargar tus asignaciones.')}); return ()=>{vigente=false} }, [])
  return <section aria-labelledby="recursos-asignados"><h2 id="recursos-asignados">Mis cursos y secciones asignados</h2>
    {error && <p role="alert" className="error-resumen">{error}</p>}
    {!error && items.length===0 && <p>No tienes asignaciones registradas para mostrar.</p>}
    {items.length>0 && <ul>{items.map(a=><li key={a.id}>{a.seccion.nombre} · Curso {a.curso_id} · Año escolar {a.anio_escolar}</li>)}</ul>}
  </section>
}
