import { useEffect, useState } from 'react'
import { misEstudiantesDocente } from '../servicios/educacion'
import type { VinculoEstudiante } from '../servicios/educacion'

export function EstudiantesSecciones() {
  const [items, setItems] = useState<VinculoEstudiante[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    let vigente = true
    misEstudiantesDocente()
      .then(r => { if (vigente) setItems(r.estudiantes) })
      .catch(e => {
        if (vigente) setError(e instanceof Error ? e.message : 'No se pudieron cargar los estudiantes.')
      })
    return () => { vigente = false }
  }, [])

  return <section aria-labelledby="estudiantes-secciones">
    <h2 id="estudiantes-secciones">Estudiantes de mis secciones</h2>
    {error && <p role="alert" className="error-resumen">{error}</p>}
    {!error && items.length === 0 && <p>No tienes estudiantes vinculados a tus secciones asignadas.</p>}
    {items.length > 0 && <ul>
      {items.map(v => <li key={v.id}>
        {v.estudiante_nombre ?? 'Estudiante ' + v.estudiante_id}{v.estudiante_dni ? ' · DNI ' + v.estudiante_dni : ''} · Sección {v.seccion.nombre} · Año escolar {v.anio_escolar}
      </li>)}
    </ul>}
  </section>
}
