import { useEffect, useRef, useState } from 'react'
import { eliminarSolicitud, listarSolicitudes } from '../servicios/propuestas'
import type { ContextosPropuestas, SolicitudPropuesta } from '../servicios/propuestas'
import { CabeceraDocente, CargandoDocente, EtiquetaPropuesta, IconoCurso, MensajeDocente } from './ElementosDocente'
import { estadoPropuesta, normalizarBusqueda } from './utilidadesDocente'
import { IconoDocente } from './IconoDocente'
import { RevisionPropuesta } from './RevisionPropuesta'

const filtros = [{ id: '', nombre: 'Todas' }, { id: 'pendiente', nombre: 'Por revisar' }, { id: 'aprobada', nombre: 'Aprobadas' }, { id: 'rechazada', nombre: 'Rechazadas' }, { id: 'sin-propuesta', nombre: 'Sin propuesta' }]

export function MisPropuestas({ contextos, crear, alOcupar, activo }: { contextos: ContextosPropuestas | null; crear: () => void; alOcupar: (valor: boolean) => void; activo: boolean }) {
  const [solicitudes, establecerSolicitudes] = useState<SolicitudPropuesta[] | null>(null)
  const [actual, establecerActual] = useState<SolicitudPropuesta | null>(null)
  const [error, establecerError] = useState('')
  const [ocupado, establecerOcupado] = useState(false)
  const [buscar, establecerBuscar] = useState('')
  const [estado, establecerEstado] = useState('')
  const [curso, establecerCurso] = useState('')
  const [recarga, establecerRecarga] = useState(0)
  const lista = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!activo) return
    let vigente = true
    listarSolicitudes().then((datos) => { if (vigente) { establecerSolicitudes(datos); establecerError('') } })
      .catch((fallo: unknown) => { if (vigente) establecerError(fallo instanceof Error ? fallo.message : 'No se pudieron cargar tus propuestas.') })
    return () => { vigente = false }
  }, [recarga, activo])
  const cursos = [...new Map((contextos?.contextos ?? []).map((c) => [c.curso_id, c.curso_nombre])).entries()]
  const nombreCurso = (id: string) => cursos.find(([clave]) => clave === id)?.[1] ?? 'Curso asignado'
  const visibles = (solicitudes ?? []).filter((s) => (!curso || s.curso_id === curso)
    && (!estado || (estado === 'sin-propuesta' ? !s.propuesta : !!s.propuesta && estadoPropuesta(s).clave === estado))
    && normalizarBusqueda(s.tema + ' ' + nombreCurso(s.curso_id)).includes(normalizarBusqueda(buscar)))
  function ocupar(valor: boolean) { establecerOcupado(valor); alOcupar(valor) }
  function actualizar(solicitud: SolicitudPropuesta) { establecerActual(solicitud); establecerRecarga((n) => n + 1) }
  function volver() { establecerActual(null); requestAnimationFrame(() => lista.current?.focus()) }
  // Eliminar no se puede deshacer: se confirma antes y se avisa que también se borran sus juegos.
  async function eliminar(solicitud: SolicitudPropuesta) {
    if (!window.confirm('¿Eliminar la propuesta «' + solicitud.tema + '» y sus juegos? No se puede deshacer.')) return
    ocupar(true); establecerError('')
    try { await eliminarSolicitud(solicitud.id_solicitud); establecerRecarga((n) => n + 1) }
    catch (fallo) { establecerError(fallo instanceof Error ? fallo.message : 'No se pudo eliminar la propuesta.') }
    finally { ocupar(false) }
  }
  return <section id="mis-propuestas" className="doc-pagina" aria-label="Mis propuestas">
    {actual ? <>
      <div className="doc-volver"><button className="doc-texto-boton secundario" type="button" disabled={ocupado} onClick={volver}><IconoDocente nombre="atras" />Volver a mis propuestas</button><span>{nombreCurso(actual.curso_id)}</span></div>
      <RevisionPropuesta key={actual.id_solicitud} solicitud={actual} alCambiar={actualizar} alOcupar={ocupar} activo={activo} />
    </> : <div ref={lista} tabIndex={-1}>
      <CabeceraDocente titulo="Mis propuestas" descripcion="Tus ideas para la clase, desde el primer borrador hasta la propuesta aprobada."><button type="button" onClick={crear}><IconoDocente nombre="mas" />Crear propuesta</button></CabeceraDocente>
      {error && <MensajeDocente titulo="No pudimos actualizar tus propuestas" error><p>{error}</p><button className="secundario" type="button" onClick={() => establecerRecarga((n) => n + 1)}>Volver a intentar</button></MensajeDocente>}
      {solicitudes === null && !error && <CargandoDocente texto="Cargando tus propuestas…" />}
      {solicitudes?.length === 0 && <MensajeDocente titulo="Tu próxima clase empieza con una idea"><p>Elige un curso y cuéntale a Kusi qué quieres enseñar. Después podrás revisar la propuesta aquí.</p><button type="button" onClick={crear}>Crear mi primera propuesta<IconoDocente nombre="flecha" /></button></MensajeDocente>}
      {!!solicitudes?.length && <>
        <div className="doc-herramientas"><div className="doc-busqueda"><label htmlFor="doc-buscar-propuesta">Buscar propuesta</label><div><IconoDocente nombre="buscar" /><input id="doc-buscar-propuesta" type="search" value={buscar} onChange={(e) => establecerBuscar(e.target.value)} placeholder="Tema o nombre del curso" /></div></div><div className="doc-filtro"><label htmlFor="doc-curso-propuesta">Curso</label><select id="doc-curso-propuesta" value={curso} onChange={(e) => establecerCurso(e.target.value)}><option value="">Todos los cursos</option>{cursos.map(([id, nombre]) => <option value={id} key={id}>{nombre}</option>)}</select></div></div>
        <div className="doc-filtros-estado" role="group" aria-label="Filtrar propuestas por estado">{filtros.map((f) => <button type="button" className="secundario" key={f.id} aria-pressed={estado === f.id} onClick={() => establecerEstado(f.id)}>{f.nombre}<span>{(solicitudes ?? []).filter((s) => !f.id || (f.id === 'sin-propuesta' ? !s.propuesta : !!s.propuesta && estadoPropuesta(s).clave === f.id)).length}</span></button>)}</div>
        <p className="doc-resultados" role="status">{visibles.length} {visibles.length === 1 ? 'propuesta' : 'propuestas'}{buscar || estado || curso ? ' en esta búsqueda' : ''}</p>
        {!visibles.length && <MensajeDocente titulo="No hay propuestas con estos filtros"><p>Prueba otro tema, curso o estado.</p><button className="secundario" type="button" onClick={() => { establecerBuscar(''); establecerCurso(''); establecerEstado('') }}>Limpiar búsqueda y filtros</button></MensajeDocente>}
        <ul className="doc-propuestas">{visibles.map((s) => <li key={s.id_solicitud}><button type="button" className="doc-propuesta-fila" onClick={() => establecerActual(s)}><IconoCurso nombre={nombreCurso(s.curso_id)} /><span className="doc-propuesta-datos"><strong>{s.tema}</strong><small>{nombreCurso(s.curso_id)} · {s.proposito === 'refuerzo' ? 'Refuerzo' : 'Preparación'}{s.propuesta?.version ? ' · Versión ' + s.propuesta.version : ''}</small></span><EtiquetaPropuesta solicitud={s} /><span className="doc-propuesta-abrir">Ver propuesta<IconoDocente nombre="flecha" /></span></button><button type="button" className="doc-texto-boton secundario" disabled={ocupado} onClick={() => void eliminar(s)} aria-label={'Eliminar la propuesta ' + s.tema}>Eliminar</button></li>)}</ul>
      </>}
    </div>}
  </section>
}
