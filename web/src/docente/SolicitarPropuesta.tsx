import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { ErrorApi } from '../servicios/django'
import { GestorSolicitud, obtenerContextosPropuestas } from '../servicios/propuestas'
import type { ContextosPropuestas, SolicitudPropuesta } from '../servicios/propuestas'

export function SolicitarPropuesta() {
  const [contextos, establecerContextos] = useState<ContextosPropuestas | null>(null)
  const [cargando, establecerCargando] = useState(true)
  const [errorContexto, establecerErrorContexto] = useState('')
  const [recarga, establecerRecarga] = useState(0)
  const [seleccion, establecerSeleccion] = useState('')
  const [tema, establecerTema] = useState('')
  const [objetivo, establecerObjetivo] = useState('')
  const [error, establecerError] = useState('')
  const [solicitud, establecerSolicitud] = useState<SolicitudPropuesta | null>(null)
  const [ocupado, establecerOcupado] = useState(false)
  const [intentado, establecerIntentado] = useState(false)
  const gestor = useRef<GestorSolicitud>(new GestorSolicitud())
  const bloqueo = useRef(false)
  useEffect(() => {
    const controlador = new AbortController()
    obtenerContextosPropuestas(controlador.signal).then((datos) => {
      if (!controlador.signal.aborted) { establecerContextos(datos); establecerCargando(false) }
    }).catch((fallo: unknown) => {
      if (!controlador.signal.aborted) {
        establecerErrorContexto(fallo instanceof ErrorApi && (fallo.estado === 401 || fallo.estado === 403)
          ? 'Tu sesión no tiene acceso a estos cursos. Vuelve a ingresar o consulta con el administrador. Conservaremos lo escrito mientras permanezcas en este panel.'
          : 'El servicio educativo no está disponible. Puedes escribir el tema y el objetivo; conservaremos lo ingresado mientras permanezcas en este panel.')
        establecerCargando(false)
      }
    })
    return () => controlador.abort()
  }, [recarga])
  // HU17: si el curso deja de estar asignado al recargar, la selección se descarta.
  const seleccionVigente = contextos && !contextos.contextos.some((valor) => valor.curso_id + '/' + (valor.seccion_id ?? '') === seleccion) ? '' : seleccion
  function recargar() { establecerCargando(true); establecerErrorContexto(''); establecerRecarga((valor) => valor + 1) }
  function cambio() { establecerSolicitud(null); establecerIntentado(false); establecerError('') }
  async function enviar(evento: FormEvent) {
    evento.preventDefault()
    if (bloqueo.current) return
    const contexto = contextos?.contextos.find((valor) => valor.curso_id + '/' + (valor.seccion_id ?? '') === seleccionVigente)
    if (seleccionVigente === '' || !contexto) { establecerError('Selecciona un curso autorizado.'); return }
    bloqueo.current = true; establecerOcupado(true); establecerError(''); establecerIntentado(true)
    try {
      const resultado = await gestor.current.enviar({ curso_id: contexto.curso_id, seccion_id: contexto.seccion_id, tema, objetivo })
      establecerSolicitud(resultado)
    } catch (fallo) {
      establecerError(fallo instanceof Error ? fallo.message : 'No se pudo confirmar la solicitud. Conserva los datos y consulta su estado antes de reintentar.')
    } finally { bloqueo.current = false; establecerOcupado(false) }
  }
  return <section id="solicitar-propuesta" aria-labelledby="titulo-propuesta">
    <h2 id="titulo-propuesta">Solicitar propuesta educativa</h2>
    <p>Indica qué quieres trabajar en primero de primaria. La propuesta quedará pendiente de revisión; no se aprobará ni publicará automáticamente.</p>
    {cargando && <p role="status">Cargando tus cursos autorizados…</p>}
    {errorContexto && <div><p role="alert" className="error-resumen">{errorContexto}</p><button type="button" className="secundario" onClick={recargar} disabled={cargando || ocupado}>Volver a cargar cursos</button></div>}
    {contextos && !contextos.contextos.length && <p role="status">Aún no tienes cursos autorizados para solicitar propuestas. Consulta con el administrador.</p>}
    {contextos && !contextos.ia_configurada && <p role="status">La IA está pendiente de configuración. Puedes guardar la solicitud; no se generará contenido hasta habilitarla.</p>}
    {error && <p className="error-resumen" role="alert">{error}</p>}
    <form onSubmit={enviar}>
      <fieldset disabled={ocupado}>
        <legend>Tema y objetivo</legend>
        <div className="campo"><label htmlFor="curso-propuesta">Curso y contexto autorizado</label>
          <select id="curso-propuesta" value={seleccionVigente} onChange={(evento) => { establecerSeleccion(evento.target.value); cambio() }} disabled={cargando || !contextos?.contextos.length} required>
            <option value="">Selecciona un curso</option>
            {contextos?.contextos.map((contexto) => <option key={contexto.curso_id + '/' + (contexto.seccion_id ?? '')} value={contexto.curso_id + '/' + (contexto.seccion_id ?? '')}>{contexto.curso_nombre}{contexto.seccion_nombre ? ' · ' + contexto.seccion_nombre + ' · ' + contexto.anio_escolar : ''}</option>)}
          </select>
        </div>
        <div className="campo"><label htmlFor="tema-propuesta">Tema</label><textarea id="tema-propuesta" value={tema} onChange={(evento) => { establecerTema(evento.target.value); cambio() }} required maxLength={2000} rows={3} /></div>
        <div className="campo"><label htmlFor="objetivo-propuesta">Objetivo (opcional)</label><textarea id="objetivo-propuesta" value={objetivo} onChange={(evento) => { establecerObjetivo(evento.target.value); cambio() }} maxLength={4000} rows={4} aria-describedby="ayuda-objetivo" /><p id="ayuda-objetivo">Tu texto se conservará tal como lo escribas. Si lo dejas vacío, la IA propondrá un objetivo para que lo revises cuando esté configurada.</p></div>
      </fieldset>
      <button type="submit" disabled={ocupado || cargando || !contextos?.contextos.length}>{ocupado ? 'Comprobando solicitud…' : intentado ? 'Consultar estado y reintentar' : contextos?.ia_configurada ? 'Guardar y solicitar propuesta' : 'Guardar solicitud'}</button>
    </form>
    <p>Los datos permanecen en este panel ante un fallo. Salir o cambiar de panel borra lo que aún no se haya guardado. Si una solicitud ya se guardó, cambiar sus datos creará otra sin sustituirla.</p>
    {solicitud && <div className="confirmacion" role="status">
      <h3>{solicitud.estado === 'generada' ? 'Propuesta generada, pendiente de revisión' : 'Solicitud guardada'}</h3>
      <p>Identificador: {solicitud.id_solicitud}</p>
      <p>{solicitud.estado === 'pendiente' ? 'Pendiente de generación. Si la IA no está configurada, tu solicitud se conserva para reintentar después.' : solicitud.estado === 'generando' ? 'La generación sigue en curso. Consulta su estado antes de enviar otra solicitud.' : solicitud.estado === 'fallida' ? 'No se pudo generar la propuesta. La solicitud y tus datos se conservan; puedes reintentar.' : 'No se ha aprobado, publicado ni generado ningún juego.'}</p>
      {solicitud.propuesta && <><h4>{solicitud.propuesta.origen_objetivo === 'docente' ? 'Objetivo aportado por ti' : 'Objetivo sugerido por IA, pendiente de revisión'}</h4><p className="texto-conservado">{solicitud.propuesta.objetivo}</p></>}
    </div>}
  </section>
}
