import { useEffect, useRef, useState } from 'react'
import { consultarSolicitud, eliminarSolicitud } from '../servicios/propuestas'
import type { ContextosPropuestas, SolicitudPropuesta } from '../servicios/propuestas'
import { CabeceraDocente, CargandoDocente, IconoCurso, MensajeDocente } from './ElementosDocente'
import { normalizarBusqueda } from './utilidadesDocente'
import { IconoDocente } from './IconoDocente'
import { RevisionPropuesta } from './RevisionPropuesta'
import { cargarTrabajos, estadoTrabajo, mensajeDocente } from './trabajosDocente'
import type { TrabajoDocente } from './trabajosDocente'

const filtros = [{ id: '', nombre: 'Todos' }, { id: 'revisar', nombre: 'Por revisar' }, { id: 'preparando', nombre: 'En preparación' }, { id: 'probar', nombre: 'Para probar' }, { id: 'enviado', nombre: 'Enviados' }, { id: 'retomar', nombre: 'Por terminar' }]
function ConfirmarEliminacion({ solicitud, ocupado, cancelar, confirmar }: { solicitud: SolicitudPropuesta; ocupado: boolean; cancelar: () => void; confirmar: () => void }) {
  const dialogo = useRef<HTMLDialogElement>(null)
  useEffect(() => { dialogo.current?.showModal() }, [])
  return <dialog ref={dialogo} className="doc-dialogo" aria-labelledby="titulo-eliminar-juego" onCancel={(e) => { e.preventDefault(); if (!ocupado) cancelar() }}>
    <h2 id="titulo-eliminar-juego">¿Eliminar este juego?</h2><p>Eliminarás «{solicitud.tema}», su idea y los juegos que preparaste con ella. También dejará de aparecer en la app de tu clase. No se puede recuperar.</p>
    <div className="acciones"><button type="button" className="secundario" autoFocus disabled={ocupado} onClick={cancelar}>Conservar mi juego</button><button type="button" className="doc-eliminar" disabled={ocupado} onClick={confirmar}>{ocupado ? 'Eliminando…' : 'Eliminar juego'}</button></div>
  </dialog>
}
export function MisPropuestas({ contextos, crear, alOcupar, activo, abrirId }: { contextos: ContextosPropuestas | null; crear: () => void; alOcupar: (valor: boolean) => void; activo: boolean; abrirId?: string | null }) {
  const [trabajos, establecerTrabajos] = useState<TrabajoDocente[] | null>(null)
  const [actual, establecerActual] = useState<SolicitudPropuesta | null>(null)
  const [porEliminar, establecerPorEliminar] = useState<SolicitudPropuesta | null>(null)
  const [error, establecerError] = useState('')
  const [ocupado, establecerOcupado] = useState(false)
  const [buscar, establecerBuscar] = useState('')
  const [estado, establecerEstado] = useState('')
  const [curso, establecerCurso] = useState('')
  const [recarga, establecerRecarga] = useState(0)
  const lista = useRef<HTMLDivElement>(null)
  const bloqueo = useRef(false)
  useEffect(() => {
    if (!activo) return
    let vigente = true
    cargarTrabajos().then((datos) => { if (vigente) { establecerTrabajos(datos); establecerError('') } })
      .catch((fallo: unknown) => { if (vigente) establecerError(mensajeDocente(fallo, 'No pudimos abrir tus juegos. Comprueba tu conexión e intenta otra vez.')) })
    return () => { vigente = false }
  }, [recarga, activo])
  useEffect(() => {
    if (!activo || !abrirId) return
    let vigente = true
    consultarSolicitud(abrirId).then((datos) => { if (vigente) establecerActual(datos) })
      .catch((fallo) => { if (vigente) establecerError(mensajeDocente(fallo, 'No pudimos abrir ese juego. Búscalo en la lista e intenta otra vez.')) })
    return () => { vigente = false }
  }, [abrirId, activo])
  const cursos = [...new Map((contextos?.contextos ?? []).map((c) => [c.curso_id, c.curso_nombre])).entries()]
  const nombreCurso = (id: string) => cursos.find(([clave]) => clave === id)?.[1] ?? 'Tu clase'
  const seccionDe = (solicitud: SolicitudPropuesta) => contextos?.contextos.find((c) => c.curso_id === solicitud.curso_id && c.seccion_id === solicitud.seccion_id)?.seccion_nombre ?? undefined
  const visibles = (trabajos ?? []).filter((trabajo) => (!curso || trabajo.solicitud.curso_id === curso)
    && (!estado || estadoTrabajo(trabajo).clave === estado)
    && normalizarBusqueda(trabajo.solicitud.tema + ' ' + nombreCurso(trabajo.solicitud.curso_id)).includes(normalizarBusqueda(buscar)))
  function ocupar(valor: boolean) { establecerOcupado(valor); alOcupar(valor) }
  function actualizar(solicitud: SolicitudPropuesta) { establecerActual(solicitud); establecerRecarga((n) => n + 1) }
  function volver() { establecerActual(null); establecerRecarga((n) => n + 1); requestAnimationFrame(() => lista.current?.focus()) }
  async function eliminar() {
    if (!porEliminar || bloqueo.current) return
    bloqueo.current = true; ocupar(true); establecerError('')
    try { await eliminarSolicitud(porEliminar.id_solicitud); establecerTrabajos((anteriores) => anteriores?.filter((item) => item.solicitud.id_solicitud !== porEliminar.id_solicitud) ?? null); establecerPorEliminar(null); establecerRecarga((n) => n + 1); requestAnimationFrame(() => lista.current?.focus()) }
    catch (fallo) { establecerPorEliminar(null); establecerError(mensajeDocente(fallo, 'No pudimos confirmar que se eliminó. Vuelve a cargar tus juegos antes de intentarlo otra vez.')) }
    finally { bloqueo.current = false; ocupar(false) }
  }
  return <section id="mis-propuestas" className="doc-pagina" aria-label="Mis juegos">
    {actual ? <><div className="doc-volver"><button className="secundario" type="button" disabled={ocupado} onClick={volver}><IconoDocente nombre="atras" />Mis juegos</button><span>{nombreCurso(actual.curso_id)}</span></div><RevisionPropuesta key={actual.id_solicitud} solicitud={actual} seccion={seccionDe(actual)} alCambiar={actualizar} alOcupar={ocupar} activo={activo} /></> : <div ref={lista} tabIndex={-1}>
      <CabeceraDocente icono="juegos" color="c-morado" titulo="Mis juegos" descripcion="Tus ideas y juegos, listos para seguir trabajando con tu clase."><button type="button" onClick={crear}><IconoDocente nombre="mas" />Crear propuesta</button></CabeceraDocente>
      {error && <MensajeDocente titulo="Vamos a buscar tus juegos otra vez" error><p>{error}</p><button className="secundario" type="button" onClick={() => establecerRecarga((n) => n + 1)}>Volver a cargar</button></MensajeDocente>}
      {trabajos === null && !error && <CargandoDocente texto="Buscando tus juegos…" />}
      {trabajos?.length === 0 && <MensajeDocente titulo="Tu primer juego empieza con una idea"><p>Elige qué quieres enseñar y prepara una propuesta para tu clase.</p><button type="button" onClick={crear}>Crear mi primera propuesta<IconoDocente nombre="flecha" /></button></MensajeDocente>}
      {!!trabajos?.length && <>
        <div className="doc-herramientas"><div className="doc-busqueda"><label htmlFor="doc-buscar-propuesta">Buscar juego</label><div><IconoDocente nombre="buscar" /><input id="doc-buscar-propuesta" type="search" value={buscar} onChange={(e) => establecerBuscar(e.target.value)} placeholder="Tema o curso" /></div></div><div className="doc-filtro"><label htmlFor="doc-curso-propuesta">Curso</label><select id="doc-curso-propuesta" value={curso} onChange={(e) => establecerCurso(e.target.value)}><option value="">Todos los cursos</option>{cursos.map(([id, nombre]) => <option value={id} key={id}>{nombre}</option>)}</select></div></div>
        <div className="doc-filtros-estado" role="group" aria-label="Filtrar mis juegos">{filtros.map((f) => <button type="button" className="secundario" key={f.id} aria-pressed={estado === f.id} onClick={() => establecerEstado(f.id)}>{f.nombre}<span>{(trabajos ?? []).filter((s) => !f.id || estadoTrabajo(s).clave === f.id).length}</span></button>)}</div>
        <p className="doc-resultados" role="status">{visibles.length} {visibles.length === 1 ? 'juego' : 'juegos'}{buscar || estado || curso ? ' en esta búsqueda' : ''}</p>
        {!visibles.length && <MensajeDocente titulo="No hay juegos con estos filtros"><p>Prueba otro tema, curso o estado.</p><button className="secundario" type="button" onClick={() => { establecerBuscar(''); establecerCurso(''); establecerEstado('') }}>Mostrar todos mis juegos</button></MensajeDocente>}
        <ul className="doc-propuestas">{visibles.map((trabajo) => { const s = trabajo.solicitud; const situacion = estadoTrabajo(trabajo); return <li key={s.id_solicitud}>
          <div className="doc-juego-ficha"><IconoCurso nombre={nombreCurso(s.curso_id)} /><div className="doc-propuesta-datos"><h2>{s.tema}</h2><p>{nombreCurso(s.curso_id)}{seccionDe(s) ? ' · ' + seccionDe(s) : ''}</p></div><span className={'doc-estado doc-estado-' + situacion.clave}>{situacion.etiqueta}</span></div>
          <div className="doc-juego-acciones"><button type="button" className="doc-eliminar secundario" disabled={ocupado} onClick={() => establecerPorEliminar(s)} aria-label={'Eliminar ' + s.tema}>Eliminar</button><button type="button" disabled={ocupado} onClick={() => establecerActual(s)}>{situacion.accion}<IconoDocente nombre="flecha" /></button></div>
        </li> })}</ul>
      </>}
    </div>}
    {porEliminar && <ConfirmarEliminacion solicitud={porEliminar} ocupado={ocupado} cancelar={() => establecerPorEliminar(null)} confirmar={() => void eliminar()} />}
  </section>
}
