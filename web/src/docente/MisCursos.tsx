import { useState } from 'react'
import type { ContextosPropuestas } from '../servicios/propuestas'
import { CabeceraDocente, CargandoDocente, IconoCurso, MensajeDocente } from './ElementosDocente'
import { identidadCurso, normalizarBusqueda } from './utilidadesDocente'
import { IconoDocente } from './IconoDocente'

export function MisCursos({ contextos, error, crear, recargar }: { contextos: ContextosPropuestas | null; error: string; crear: (curso: string) => void; recargar: () => void }) {
  const [buscar, establecerBuscar] = useState('')
  const [seccion, establecerSeccion] = useState('')
  const asignaciones = contextos?.contextos ?? []
  const secciones = [...new Map(asignaciones.flatMap((c) => c.seccion_id ? [[c.seccion_id, { nombre: c.seccion_nombre, anio: c.anio_escolar }] as const] : [])).entries()]
  const visibles = asignaciones.filter((c) => (!seccion || c.seccion_id === seccion) && normalizarBusqueda(c.curso_nombre + ' ' + (c.seccion_nombre ?? '')).includes(normalizarBusqueda(buscar)))
  return <section className="doc-pagina" aria-label="Mis cursos y secciones">
    <CabeceraDocente titulo="Mis cursos" descripcion="Un lugar para cada curso. Elige qué quieres trabajar con tus estudiantes." />
    {error && <MensajeDocente titulo="No pudimos actualizar tus cursos" error><p>{error}</p><button type="button" className="secundario" onClick={recargar}>Volver a cargar cursos</button></MensajeDocente>}
    {!contextos && !error && <CargandoDocente texto="Cargando tus cursos y secciones…" />}
    {contextos && !asignaciones.length && <MensajeDocente titulo="Tus cursos aparecerán aquí"><p>El administrador debe asignarte un curso y una sección. Cuando lo haga, podrás crear propuestas para tu clase.</p></MensajeDocente>}
    {!!asignaciones.length && <>
      <div className="doc-herramientas">
        <div className="doc-busqueda"><label htmlFor="doc-buscar-curso">Buscar curso o sección</label><div><IconoDocente nombre="buscar" /><input id="doc-buscar-curso" type="search" value={buscar} onChange={(e) => establecerBuscar(e.target.value)} placeholder="Por ejemplo, Matemática" /></div></div>
        <div className="doc-filtro"><label htmlFor="doc-seccion-curso">Sección</label><select id="doc-seccion-curso" value={seccion} onChange={(e) => establecerSeccion(e.target.value)}><option value="">Todas las secciones</option>{secciones.map(([id, s]) => <option key={id} value={id}>{s.nombre} · {s.anio}</option>)}</select></div>
      </div>
      <p className="doc-resultados" role="status">{visibles.length} {visibles.length === 1 ? 'asignación' : 'asignaciones'}{buscar || seccion ? ' en esta búsqueda' : ' para primero de primaria'}</p>
      {!visibles.length && <MensajeDocente titulo="No encontramos ese curso"><p>Prueba otro nombre o vuelve a mostrar todas tus asignaciones.</p><button className="secundario" type="button" onClick={() => { establecerBuscar(''); establecerSeccion('') }}>Limpiar búsqueda y filtros</button></MensajeDocente>}
      <div className="doc-cursos">{visibles.map((c) => <article className={'doc-curso doc-tono-' + identidadCurso(c.curso_nombre).tono} key={c.curso_id + '/' + (c.seccion_id ?? '')}>
        <div className="doc-curso-cabecera"><IconoCurso nombre={c.curso_nombre} /><span>{c.anio_escolar ?? 'Primaria'}</span></div>
        <h2>{c.curso_nombre}</h2><p>Primero de primaria{c.seccion_nombre ? ' · Sección ' + c.seccion_nombre : ''}</p>
        <button type="button" className="doc-boton-curso" onClick={() => crear(c.curso_id + '/' + (c.seccion_id ?? ''))}>Crear propuesta<IconoDocente nombre="flecha" /></button>
      </article>)}</div>
      <p className="doc-nota"><IconoDocente nombre="info" />Las asignaciones las organiza el administrador. Aquí trabajas con los cursos autorizados para tu cuenta.</p>
    </>}
  </section>
}
