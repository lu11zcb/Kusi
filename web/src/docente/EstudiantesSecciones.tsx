import { useEffect, useState } from 'react'
import { Icono } from '../componentes/Icono'
import { colorPara, iniciales } from '../componentes/apariencia'
import { misEstudiantesDocente } from '../servicios/educacion'
import type { VinculoEstudiante } from '../servicios/educacion'

// HU09: estudiantes de las secciones del docente, agrupados por sección.
// Solo consulta: las contraseñas las genera únicamente el administrador.
export function EstudiantesSecciones() {
  const [items, setItems] = useState<VinculoEstudiante[] | null>(null)
  const [error, setError] = useState('')
  const [buscar, setBuscar] = useState('')

  useEffect(() => {
    let vigente = true
    misEstudiantesDocente()
      .then(r => { if (vigente) setItems(r.estudiantes) })
      .catch(e => {
        if (vigente) setError(e instanceof Error ? e.message : 'No se pudieron cargar los estudiantes.')
      })
    return () => { vigente = false }
  }, [])

  const filtro = buscar.trim().toLowerCase()
  const visibles = (items ?? []).filter(v => !filtro
    || (v.estudiante_nombre ?? '').toLowerCase().includes(filtro) || (v.estudiante_dni ?? '').includes(filtro))
  const grupos = new Map<string, VinculoEstudiante[]>()
  for (const v of visibles) {
    const clave = v.seccion.nombre + ' · ' + v.anio_escolar
    grupos.set(clave, [...(grupos.get(clave) ?? []), v])
  }

  return <section aria-labelledby="estudiantes-secciones">
    <h2 id="estudiantes-secciones">Estudiantes de mis secciones</h2>
    {error && <p role="alert" className="error-resumen">{error}</p>}
    {!error && items === null && <p role="status">Cargando estudiantes…</p>}
    {!error && items?.length === 0 && <p>No tienes estudiantes vinculados a tus secciones asignadas.</p>}
    {!!items?.length && <>
      <div className="buscador campo">
        <label htmlFor="buscar-estudiante" className="solo-lectores">Buscar por nombre o DNI</label>
        <Icono nombre="buscar" />
        <input id="buscar-estudiante" placeholder="Buscar por nombre o DNI" value={buscar} onChange={e => setBuscar(e.target.value)} />
      </div>
      {grupos.size === 0 && <p>Ningún estudiante coincide con la búsqueda.</p>}
      {[...grupos.entries()].map(([seccion, lista]) => <div className="grupo-seccion" key={seccion}>
        <h3>Sección {seccion} <span className="etiqueta">{lista.length} {lista.length === 1 ? 'estudiante' : 'estudiantes'}</span></h3>
        <ul className="tarjetas-estudiantes">
          {lista.map(v => {
            const nombre = v.estudiante_nombre ?? 'Estudiante'
            return <li key={v.id}>
              <span className={'iniciales ' + colorPara(nombre)} aria-hidden="true">{iniciales(nombre)}</span>
              <span><strong>{nombre}</strong><small>{v.estudiante_dni ? 'DNI ' + v.estudiante_dni : 'Sin DNI registrado'}</small></span>
            </li>
          })}
        </ul>
      </div>)}
    </>}
  </section>
}
