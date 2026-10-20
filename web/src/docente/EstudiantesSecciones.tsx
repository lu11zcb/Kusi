import { useEffect, useState } from 'react'
import { iniciales } from '../componentes/apariencia'
import { misEstudiantesDocente } from '../servicios/educacion'
import type { VinculoEstudiante } from '../servicios/educacion'
import { CabeceraDocente, CargandoDocente, MensajeDocente } from './ElementosDocente'
import { normalizarBusqueda } from './utilidadesDocente'
import { IconoDocente } from './IconoDocente'

export function EstudiantesSecciones() {
  const [items, establecerItems] = useState<VinculoEstudiante[] | null>(null)
  const [error, establecerError] = useState('')
  const [buscar, establecerBuscar] = useState('')
  const [seccion, establecerSeccion] = useState('')
  const [recarga, establecerRecarga] = useState(0)
  useEffect(() => {
    let vigente = true
    misEstudiantesDocente().then((r) => { if (vigente) { establecerItems(r.estudiantes); establecerError('') } })
      .catch((e: unknown) => { if (vigente) establecerError(e instanceof Error ? e.message : 'No se pudieron cargar los estudiantes.') })
    return () => { vigente = false }
  }, [recarga])
  const filtro = normalizarBusqueda(buscar)
  const secciones = [...new Map((items ?? []).map((v) => [v.seccion.id, v.seccion])).values()]
  const visibles = (items ?? []).filter((v) => (!seccion || v.seccion.id === seccion) && (!filtro || normalizarBusqueda(v.estudiante_nombre ?? '').includes(filtro) || (v.estudiante_dni ?? '').includes(filtro)))
    .sort((a, b) => (a.estudiante_nombre ?? '').localeCompare(b.estudiante_nombre ?? '', 'es'))
  function limpiar() { establecerBuscar(''); establecerSeccion(''); document.getElementById('doc-buscar-estudiante')?.focus() }
  return <section className="doc-pagina" aria-label="Mis estudiantes">
    <CabeceraDocente titulo="Mis estudiantes" descripcion="Encuentra a los estudiantes de tus secciones y consulta sus datos de acceso." />
    {error && <MensajeDocente titulo="No pudimos cargar tus estudiantes" error><p>{error}</p><button className="secundario" type="button" onClick={() => establecerRecarga((n) => n + 1)}>Volver a intentar</button></MensajeDocente>}
    {!error && items === null && <CargandoDocente texto="Cargando los estudiantes de tus secciones…" />}
    {items?.length === 0 && <MensajeDocente titulo="Tu grupo aún no tiene estudiantes vinculados"><p>El administrador puede vincularlos a tus secciones. Después aparecerán aquí.</p></MensajeDocente>}
    {!!items?.length && <div className="doc-listado">
      <div className="doc-herramientas">
        <div className="doc-busqueda"><label htmlFor="doc-buscar-estudiante">Buscar estudiante</label><div><IconoDocente nombre="buscar" /><input id="doc-buscar-estudiante" type="search" value={buscar} onChange={(e) => establecerBuscar(e.target.value)} placeholder="Nombre o DNI" /></div></div>
        <div className="doc-filtro"><label htmlFor="doc-seccion-estudiante">Sección</label><select id="doc-seccion-estudiante" value={seccion} onChange={(e) => establecerSeccion(e.target.value)}><option value="">Todas las secciones</option>{secciones.map((s) => <option value={s.id} key={s.id}>{s.nombre} · {s.anio_escolar}</option>)}</select></div>
      </div>
      <div className="doc-resultado-linea"><p className="doc-resultados" role="status">{new Set(visibles.map((v) => v.estudiante_id)).size} {new Set(visibles.map((v) => v.estudiante_id)).size === 1 ? 'estudiante' : 'estudiantes'}{buscar || seccion ? ' en esta búsqueda' : ' en tus secciones'}</p>{(buscar || seccion) && <button className="doc-texto-boton secundario" type="button" onClick={limpiar}>Limpiar filtros</button>}</div>
      {!visibles.length ? <MensajeDocente titulo="No hay coincidencias"><p>Revisa el nombre, el DNI o la sección seleccionada.</p><button type="button" className="secundario" onClick={limpiar}>Mostrar todos</button></MensajeDocente> : <table className="doc-tabla"><caption className="solo-lectores">Estudiantes de las secciones asignadas al docente</caption><thead><tr><th scope="col">Estudiante</th><th scope="col">DNI</th><th scope="col">Sección</th><th scope="col">Año escolar</th></tr></thead><tbody>
        {visibles.map((v) => <tr key={v.id}><th scope="row"><span className="doc-persona"><span className="doc-avatar" aria-hidden="true">{iniciales(v.estudiante_nombre ?? 'Estudiante')}</span><strong>{v.estudiante_nombre ?? 'Estudiante'}</strong></span></th><td data-etiqueta="DNI">{v.estudiante_dni || 'Sin DNI registrado'}</td><td data-etiqueta="Sección"><span className="doc-seccion-etiqueta">{v.seccion.nombre}</span></td><td data-etiqueta="Año escolar">{v.anio_escolar}</td></tr>)}
      </tbody></table>}
    </div>}
    <p className="doc-nota"><IconoDocente nombre="info" />El administrador genera las contraseñas. Como docente, puedes comunicarlas a tus estudiantes por el canal acordado con la escuela.</p>
  </section>
}
