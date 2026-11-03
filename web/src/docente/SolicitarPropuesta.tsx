import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { RevisionPropuesta } from './RevisionPropuesta'
import { ErrorApi } from '../servicios/django'
import { GestorSolicitud, obtenerContextosPropuestas } from '../servicios/propuestas'
import type { ContextosPropuestas, Proposito, SolicitudPropuesta } from '../servicios/propuestas'
import { CabeceraDocente, IconoCurso, MensajeDocente } from './ElementosDocente'
import { IconoDocente } from './IconoDocente'

export type BorradorPropuesta = { seleccion: string; tema: string; objetivo: string; proposito: Proposito; instrucciones: string }
type Propiedades = { borrador: BorradorPropuesta; alCambiarBorrador: (valor: BorradorPropuesta) => void; alOcupar: (valor: boolean) => void; activo?: boolean }

export function SolicitarPropuesta({ borrador, alCambiarBorrador, alOcupar, activo = true }: Propiedades) {
  const { seleccion, tema, objetivo, proposito, instrucciones } = borrador
  const [contextos, establecerContextos] = useState<ContextosPropuestas | null>(null)
  const [cargando, establecerCargando] = useState(true)
  const [errorContexto, establecerErrorContexto] = useState('')
  const [recarga, establecerRecarga] = useState(0)
  const [error, establecerError] = useState('')
  const [resultado, establecerResultado] = useState<{ huella: string; solicitud: SolicitudPropuesta } | null>(null)
  const [ocupado, establecerOcupado] = useState(false)
  const [revisando, establecerRevisando] = useState(false)
  const [intentoPara, establecerIntentoPara] = useState('')
  const gestor = useRef<GestorSolicitud>(new GestorSolicitud())
  const bloqueo = useRef(false)
  const errorRef = useRef<HTMLDivElement>(null)
  const huella = JSON.stringify(borrador)
  const solicitud = resultado?.huella === huella ? resultado.solicitud : null
  useEffect(() => { if (error) errorRef.current?.focus() }, [error])
  useEffect(() => {
    const controlador = new AbortController()
    obtenerContextosPropuestas(controlador.signal).then((datos) => {
      if (!controlador.signal.aborted) { establecerContextos(datos); establecerCargando(false) }
    }).catch((fallo: unknown) => {
      if (!controlador.signal.aborted) {
        establecerErrorContexto(fallo instanceof ErrorApi && (fallo.estado === 401 || fallo.estado === 403)
          ? 'Tu sesión no tiene acceso a estos cursos. Vuelve a ingresar o consulta con el administrador.'
          : 'El servicio educativo no está disponible. Puedes seguir escribiendo; vuelve a cargar tus cursos para enviar la solicitud.')
        establecerCargando(false)
      }
    })
    return () => controlador.abort()
  }, [recarga])
  const seleccionVigente = contextos && !contextos.contextos.some((c) => c.curso_id + '/' + (c.seccion_id ?? '') === seleccion) ? '' : seleccion
  const contexto = contextos?.contextos.find((c) => c.curso_id + '/' + (c.seccion_id ?? '') === seleccionVigente)
  function recargar() { establecerCargando(true); establecerErrorContexto(''); establecerRecarga((valor) => valor + 1) }
  function cambiar<K extends keyof BorradorPropuesta>(campo: K, valor: BorradorPropuesta[K]) { alCambiarBorrador({ ...borrador, [campo]: valor }); establecerError('') }
  function ocuparRevision(valor: boolean) { establecerRevisando(valor); alOcupar(valor) }
  async function enviar(evento: FormEvent) {
    evento.preventDefault()
    if (bloqueo.current || revisando) return
    if (!contexto) { establecerError('Selecciona un curso autorizado.'); return }
    bloqueo.current = true; establecerOcupado(true); alOcupar(true); establecerError(''); establecerIntentoPara(huella)
    try {
      const respuesta = await gestor.current.enviar({ curso_id: contexto.curso_id, seccion_id: contexto.seccion_id, tema, objetivo, proposito, instrucciones })
      establecerResultado({ huella, solicitud: respuesta })
    } catch (fallo) {
      establecerError(fallo instanceof Error ? fallo.message : 'No se pudo confirmar la solicitud. Consulta su estado antes de reintentar.')
    } finally { bloqueo.current = false; establecerOcupado(false); alOcupar(false) }
  }
  const formulario = <div className="doc-crear-distribucion"><form className="doc-formulario" onSubmit={enviar}>
    <fieldset disabled={ocupado || revisando}>
      <legend>¿Qué quieres trabajar en clase?</legend>
      <div className="campo"><label htmlFor="curso-propuesta">Curso y sección</label><select id="curso-propuesta" value={seleccionVigente} onChange={(e) => cambiar('seleccion', e.target.value)} disabled={cargando || !contextos?.contextos.length} required><option value="">Elige un curso de tu clase</option>{contextos?.contextos.map((c) => <option key={c.curso_id + '/' + (c.seccion_id ?? '')} value={c.curso_id + '/' + (c.seccion_id ?? '')}>{c.curso_nombre}{c.seccion_nombre ? ' · Sección ' + c.seccion_nombre + ' · ' + c.anio_escolar : ''}</option>)}</select></div>
      <div className="campo"><label htmlFor="tema-propuesta">Tema de la propuesta <span>Obligatorio</span></label><textarea id="tema-propuesta" value={tema} onChange={(e) => cambiar('tema', e.target.value)} required maxLength={2000} rows={3} placeholder="Por ejemplo: patrones con frutas" aria-describedby="doc-ayuda-tema" /><p id="doc-ayuda-tema" className="doc-ayuda">Escribe un tema de primero de primaria. Puedes añadir qué les cuesta o qué quieres practicar.</p></div>
      <fieldset className="doc-propositos"><legend>¿Cuándo usarás la propuesta?</legend>{([{ valor: 'preparacion', titulo: 'Antes de la clase', texto: 'Para explorar un tema nuevo' }, { valor: 'refuerzo', titulo: 'Después de la clase', texto: 'Para practicar lo aprendido' }] as const).map((p) => <label className={'doc-proposito' + (proposito === p.valor ? ' seleccionado' : '')} key={p.valor}><input type="radio" name="doc-proposito" value={p.valor} checked={proposito === p.valor} onChange={() => cambiar('proposito', p.valor)} /><span><strong>{p.titulo}</strong><small>{p.texto}</small></span></label>)}</fieldset>
      <div className="campo"><label htmlFor="objetivo-propuesta">¿Qué deben aprender? <span>Opcional</span></label><textarea id="objetivo-propuesta" value={objetivo} onChange={(e) => cambiar('objetivo', e.target.value)} maxLength={4000} rows={3} placeholder="Por ejemplo: resolver sumas con cantidades hasta 20" aria-describedby="ayuda-objetivo" /><p id="ayuda-objetivo" className="doc-ayuda">Si lo dejas vacío, la IA sugerirá un objetivo. Si escribes uno, se conservará tal como lo indiques.</p></div>
      <details className="doc-opcional" open={instrucciones ? true : undefined}><summary>Indicaciones adicionales para la IA <span>Opcional</span></summary><div className="campo"><label htmlFor="instrucciones-propuesta">¿Algo que Kusi deba tener en cuenta?</label><textarea id="instrucciones-propuesta" value={instrucciones} onChange={(e) => cambiar('instrucciones', e.target.value)} maxLength={4000} rows={3} placeholder="Por ejemplo: usar instrucciones breves y dar ayuda al equivocarse" /></div></details>
    </fieldset>
    <div className="doc-formulario-pie"><p><IconoDocente nombre="info" />Revisarás la propuesta antes de aprobarla.</p><button type="submit" disabled={ocupado || revisando || cargando || !contextos?.contextos.length}><IconoDocente nombre={ocupado ? 'reloj' : 'editar'} />{ocupado ? 'Comprobando solicitud…' : intentoPara === huella ? 'Consultar estado y reintentar' : contextos?.ia_configurada ? 'Crear propuesta con IA' : 'Guardar solicitud'}</button></div>
    {ocupado && <p role="status">Estamos comprobando y preparando tu propuesta. Espera aquí para evitar otra solicitud.</p>}
  </form><aside className="doc-guia" aria-label="Ayuda para crear una propuesta">
    <IconoCurso nombre={contexto?.curso_nombre ?? 'Curso'} /><h2>{contexto?.curso_nombre ?? 'Una idea para tu clase'}</h2><p>{contexto?.seccion_nombre ? 'Sección ' + contexto.seccion_nombre + ' · ' : ''}Primero de primaria</p>
    <hr /><h3>La IA te ayuda a empezar</h3><p>Kusi propondrá una historia, acciones, reglas, retos y ayudas a partir de tu tema.</p><h3>Tú tienes la última palabra</h3><p>Podrás modificar el texto, pedir ajustes y revisar las versiones antes de aprobar la idea.</p><p className="doc-guia-nota">Esta solicitud crea una propuesta educativa. El juego jugable es una etapa posterior.</p>
  </aside></div>
  return <section id="solicitar-propuesta" className="doc-pagina" aria-label="Crear propuesta">
    <CabeceraDocente titulo="Crear una propuesta" descripcion="Tú conoces a tu clase. Cuéntale a Kusi qué necesita y prepara una idea con ayuda de IA." />
    <ol className="doc-pasos" aria-label="Recorrido de la propuesta"><li aria-current={!ocupado && !solicitud?.propuesta ? 'step' : undefined}><span>1</span>Define tu idea</li><li aria-current={ocupado ? 'step' : undefined}><span>2</span>La IA la prepara</li><li aria-current={solicitud?.propuesta ? 'step' : undefined}><span>3</span>Revisa y decide</li></ol>
    {cargando && <p role="status">Cargando tus cursos autorizados…</p>}
    {errorContexto && <MensajeDocente titulo="Necesitamos comprobar tus cursos" error><p>{errorContexto} Conservaremos lo escrito mientras el panel esté abierto.</p><button type="button" className="secundario" onClick={recargar} disabled={cargando || ocupado}>Volver a cargar cursos</button></MensajeDocente>}
    {contextos && !contextos.contextos.length && <MensajeDocente titulo="Aún no tienes cursos asignados"><p>Consulta con el administrador para crear propuestas para tu clase.</p></MensajeDocente>}
    {contextos && !contextos.ia_configurada && <MensajeDocente titulo="La IA aún no está configurada"><p>Puedes guardar tu solicitud. El contenido se generará cuando el servicio esté habilitado y vuelvas a intentarlo.</p></MensajeDocente>}
    {error && <div ref={errorRef} tabIndex={-1}><MensajeDocente titulo="No pudimos confirmar la propuesta" error><p>{error}</p><p>Tu texto se conserva. Usa «Consultar estado y reintentar» para comprobar primero lo guardado.</p></MensajeDocente></div>}
    {solicitud?.propuesta ? <details className="doc-solicitud-datos"><summary>Ver los datos de esta solicitud</summary>{formulario}</details> : formulario}
    <p className="doc-nota"><IconoDocente nombre="check" />Tu borrador se conserva al cambiar entre estas secciones. Recargar la página, cerrar sesión o cambiar de panel borra lo que aún no guardaste. Cambiar una solicitud guardada creará otra.</p>
    {solicitud && !solicitud.propuesta && <MensajeDocente titulo="Solicitud guardada"><p>{solicitud.estado === 'pendiente' ? 'Quedó pendiente de generación. Puedes consultar su estado y reintentar después.' : solicitud.estado === 'generando' ? 'La generación sigue en curso. Consulta su estado antes de enviar otra solicitud.' : solicitud.estado === 'fallida' ? 'La IA no pudo preparar el contenido. Tus datos se conservan para reintentar.' : 'Consulta el estado para recuperar la propuesta.'}</p></MensajeDocente>}
    {solicitud?.propuesta && <RevisionPropuesta key={solicitud.id_solicitud} solicitud={solicitud} alCambiar={(valor) => establecerResultado({ huella, solicitud: valor })} alOcupar={ocuparRevision} activo={activo} />}
  </section>
}
