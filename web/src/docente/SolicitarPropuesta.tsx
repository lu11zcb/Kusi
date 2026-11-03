import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { RevisionPropuesta } from './RevisionPropuesta'
import { GestorSolicitud, obtenerContextosPropuestas } from '../servicios/propuestas'
import type { ContextosPropuestas, Proposito, SolicitudPropuesta } from '../servicios/propuestas'
import { CabeceraDocente, CargandoDocente, IconoCurso, MensajeDocente } from './ElementosDocente'
import { IconoDocente } from './IconoDocente'
import { mensajeDocente } from './trabajosDocente'

export type BorradorPropuesta = { seleccion: string; tema: string; objetivo: string; proposito: Proposito; instrucciones: string }
type Propiedades = { borrador: BorradorPropuesta; alCambiarBorrador: (valor: BorradorPropuesta) => void; alOcupar: (valor: boolean) => void; activo?: boolean; alSalir?: () => void }
export function SolicitarPropuesta({ borrador, alCambiarBorrador, alOcupar, activo = true, alSalir }: Propiedades) {
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
      if (!controlador.signal.aborted) { establecerErrorContexto(mensajeDocente(fallo, 'No pudimos abrir tus cursos. Puedes seguir escribiendo mientras vuelves a intentarlo.')); establecerCargando(false) }
    })
    return () => controlador.abort()
  }, [recarga])
  const seleccionVigente = contextos && !contextos.contextos.some((c) => c.curso_id + '/' + (c.seccion_id ?? '') === seleccion) ? '' : seleccion
  const contexto = contextos?.contextos.find((c) => c.curso_id + '/' + (c.seccion_id ?? '') === seleccionVigente)
  function cambiar<K extends keyof BorradorPropuesta>(campo: K, valor: BorradorPropuesta[K]) { alCambiarBorrador({ ...borrador, [campo]: valor }); establecerError('') }
  function ocuparRevision(valor: boolean) { establecerRevisando(valor); alOcupar(valor) }
  function nuevaPropuesta() {
    establecerResultado(null); establecerError(''); establecerIntentoPara('')
    alCambiarBorrador({ ...borrador, tema: '', objetivo: '', instrucciones: '' })
    window.scrollTo({ top: 0 })
  }
  async function enviar(evento: FormEvent) {
    evento.preventDefault()
    if (bloqueo.current || revisando) return
    if (!contexto) { establecerError('Elige un curso y una sección para tu juego.'); return }
    bloqueo.current = true; establecerOcupado(true); alOcupar(true); establecerError(''); establecerIntentoPara(huella)
    try {
      const respuesta = await gestor.current.enviar({ curso_id: contexto.curso_id, seccion_id: contexto.seccion_id, tema, objetivo, proposito, instrucciones })
      establecerResultado({ huella, solicitud: respuesta })
    } catch (fallo) { establecerError(mensajeDocente(fallo, 'No pudimos terminar tu idea. Conservamos lo que escribiste. Intenta otra vez para recuperar lo que ya se guardó.')) }
    finally { bloqueo.current = false; establecerOcupado(false); alOcupar(false) }
  }
  return <section id="solicitar-propuesta" className="doc-pagina" aria-label="Crear propuesta">
    {solicitud ? <>
      <div className="doc-volver"><button type="button" className="secundario" disabled={revisando} onClick={alSalir}><IconoDocente nombre="atras" />Mis juegos</button><button type="button" className="doc-texto-boton secundario" disabled={revisando} onClick={nuevaPropuesta}>Crear otra propuesta</button></div>
      <RevisionPropuesta key={solicitud.id_solicitud} solicitud={solicitud} seccion={contexto?.seccion_nombre ?? undefined} alCambiar={(valor) => establecerResultado({ huella, solicitud: valor })} alOcupar={ocuparRevision} activo={activo} />
    </> : <>
      <CabeceraDocente icono="editar" color="c-dorado" titulo="Una idea para tu clase" descripcion="Cuéntale a Kusi qué quieres enseñar. Podrás revisar la idea y pedir cambios antes de preparar tu juego." />
      {cargando && <CargandoDocente texto="Buscando tus cursos…" />}
      {errorContexto && <MensajeDocente titulo="Vamos a buscar tus cursos otra vez" error><p>{errorContexto}</p><button type="button" className="secundario" onClick={() => { establecerCargando(true); establecerErrorContexto(''); establecerRecarga((n) => n + 1) }} disabled={cargando || ocupado}>Volver a cargar cursos</button></MensajeDocente>}
      {contextos && !contextos.contextos.length && <MensajeDocente titulo="Tus cursos aparecerán aquí"><p>El administrador debe vincular tu cuenta con un curso y una sección.</p></MensajeDocente>}
      {error && <div ref={errorRef} tabIndex={-1}><MensajeDocente titulo="Vamos a recuperar tu idea" error><p>{error}</p></MensajeDocente></div>}
      <div className="doc-crear-distribucion"><form className="doc-formulario" onSubmit={enviar}>
        <fieldset disabled={ocupado || revisando}><legend>¿Qué quieres trabajar en clase?</legend>
          <div className="campo"><label htmlFor="curso-propuesta">Curso y sección</label><select id="curso-propuesta" value={seleccionVigente} onChange={(e) => cambiar('seleccion', e.target.value)} disabled={cargando || !contextos?.contextos.length} required><option value="">Elige un curso de tu clase</option>{contextos?.contextos.map((c) => <option key={c.curso_id + '/' + (c.seccion_id ?? '')} value={c.curso_id + '/' + (c.seccion_id ?? '')}>{c.curso_nombre}{c.seccion_nombre ? ' · ' + c.seccion_nombre : ''}</option>)}</select></div>
          <div className="campo"><label htmlFor="tema-propuesta">¿Qué tema quieres enseñar? <span>Obligatorio</span></label><textarea id="tema-propuesta" value={tema} onChange={(e) => cambiar('tema', e.target.value)} required maxLength={2000} rows={3} placeholder="Por ejemplo: patrones con frutas" /><p className="doc-ayuda">Puedes contar qué necesitan practicar tus estudiantes.</p></div>
          <fieldset className="doc-propositos"><legend>¿Cuándo usarán el juego?</legend>{([{ valor: 'preparacion', titulo: 'Antes de la clase', texto: 'Para descubrir un tema' }, { valor: 'refuerzo', titulo: 'Después de la clase', texto: 'Para practicar lo aprendido' }] as const).map((p) => <label className={'doc-proposito' + (proposito === p.valor ? ' seleccionado' : '')} key={p.valor}><input type="radio" name="doc-proposito" value={p.valor} checked={proposito === p.valor} onChange={() => cambiar('proposito', p.valor)} /><span><strong>{p.titulo}</strong><small>{p.texto}</small></span></label>)}</fieldset>
          <div className="campo"><label htmlFor="objetivo-propuesta">¿Qué deben aprender? <span>Opcional</span></label><textarea id="objetivo-propuesta" value={objetivo} onChange={(e) => cambiar('objetivo', e.target.value)} maxLength={4000} rows={3} placeholder="Por ejemplo: reconocer un patrón y continuarlo" /><p className="doc-ayuda">Si lo dejas vacío, Kusi te propondrá un objetivo.</p></div>
          <details className="doc-opcional" open={instrucciones ? true : undefined}><summary>Algo más que Kusi deba saber <span>Opcional</span></summary><div className="campo"><label htmlFor="instrucciones-propuesta">Tus indicaciones</label><textarea id="instrucciones-propuesta" value={instrucciones} onChange={(e) => cambiar('instrucciones', e.target.value)} maxLength={4000} rows={3} placeholder="Por ejemplo: dar instrucciones cortas y pistas sencillas" /></div></details>
        </fieldset>
        <div className="doc-formulario-pie"><p>Primero revisarás la idea. Después podrás probar el juego y enviarlo a tu clase.</p><button type="submit" disabled={ocupado || revisando || cargando || !contextos?.contextos.length}><IconoDocente nombre={ocupado ? 'reloj' : 'editar'} />{ocupado ? 'Preparando tu idea…' : intentoPara === huella ? 'Recuperar mi idea' : 'Preparar propuesta'}</button></div>
        {ocupado && <p role="status">Estamos preparando tu idea. Espera un momento.</p>}
      </form><aside className="doc-guia"><IconoCurso nombre={contexto?.curso_nombre ?? 'Curso'} /><h2>{contexto?.curso_nombre ?? 'Tu clase, tu idea'}</h2><p>{contexto?.seccion_nombre ?? 'Primero de primaria'}</p><hr /><h3>Empieza con lo que tu clase necesita</h3><p>Kusi preparará una idea para aprender jugando. Puedes pedirle cambios con tus palabras.</p><h3>Revísala y pruébala</h3><p>Tú decides cuándo el juego está listo para compartirlo con tus estudiantes.</p></aside></div>
      <p className="doc-nota"><IconoDocente nombre="info" />Puedes cambiar de sección y volver a lo que estás escribiendo. Antes de cerrar el panel, prepara tu propuesta para guardarla.</p>
    </>}
  </section>
}
