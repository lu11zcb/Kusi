import { useEffect, useId, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { aprobarVersion, consultarSolicitud, enviarObservaciones, listarVersiones, modificarVersion, pedirAlternativa, rechazarVersion } from '../servicios/propuestas'
import type { Propuesta, SolicitudPropuesta } from '../servicios/propuestas'
import { GeneracionPropuesta } from './GeneracionPropuesta'
import { etiquetaReglaJuego } from './utilidadesGeneracion'
import { EtiquetaPropuesta, MensajeDocente } from './ElementosDocente'
import { IconoDocente } from './IconoDocente'
import type { IconoDocenteNombre } from './IconoDocente'

const nombreRevision = { pendiente: 'Pendiente de revisión', aprobada: 'Aprobada', rechazada: 'Rechazada' }
const listaATexto = (valores: string[] | null | undefined) => (valores ?? []).join('\n')
const textoALista = (valor: string) => valor.split('\n').map((linea) => linea.trim()).filter(Boolean)
const mensaje = (fallo: unknown) => fallo instanceof Error ? fallo.message : 'No se pudo completar la operación.'
const campos = [
  { campo: 'objetivo', etiqueta: 'Qué aprenderán', icono: 'check' },
  { campo: 'historia', etiqueta: 'De qué trata', icono: 'cursos' },
  { campo: 'acciones', etiqueta: 'Qué hará el niño', icono: 'personas' },
  { campo: 'reglas', etiqueta: 'Reglas del juego', icono: 'info' },
  { campo: 'retos', etiqueta: 'Retos para practicar', icono: 'matematica' },
  { campo: 'ayudas', etiqueta: 'Si necesita ayuda', icono: 'comunicacion' },
  { campo: 'recursos', etiqueta: 'Qué aparece en el juego', icono: 'arte' },
] as const

function Parte({ titulo, valor, icono }: { titulo: string; valor: string | string[] | null | undefined; icono: IconoDocenteNombre }) {
  const vacio = valor === null || valor === undefined || valor.length === 0
  return <div className="doc-parte"><dt><IconoDocente nombre={icono} />{titulo}</dt><dd className="texto-conservado">{vacio ? <em>Pendiente</em> : Array.isArray(valor) ? <ul>{valor.map((item, i) => <li key={i}>{item}</li>)}</ul> : valor}</dd></div>
}
type Propiedades = { solicitud: SolicitudPropuesta; alCambiar: (solicitud: SolicitudPropuesta) => void; alOcupar?: (ocupado: boolean) => void; activo?: boolean }
type Edicion = { version: number; campos: Record<string, string> }

export function RevisionPropuesta({ solicitud: actual, alCambiar, alOcupar, activo = true }: Propiedades) {
  const id = useId()
  const titulo = useRef<HTMLHeadingElement>(null)
  const tituloEdicion = useRef<HTMLHeadingElement>(null)
  useEffect(() => { titulo.current?.focus() }, [])
  const bloqueo = useRef(false)
  const [versiones, establecerVersiones] = useState<Propuesta[] | null>(null)
  const [cargandoVersiones, establecerCargandoVersiones] = useState(false)
  const [observaciones, establecerObservaciones] = useState('')
  const [edicion, establecerEdicion] = useState<Edicion | null>(null)
  const [error, establecerError] = useState('')
  const [aviso, establecerAviso] = useState('')
  const [ocupado, establecerOcupado] = useState(false)

  async function ejecutar(accion: () => Promise<SolicitudPropuesta>, exito: string) {
    if (bloqueo.current) return
    bloqueo.current = true; alOcupar?.(true); establecerOcupado(true); establecerError(''); establecerAviso('')
    try {
      const resultado = await accion()
      alCambiar(resultado); establecerVersiones(null); establecerEdicion(null); establecerObservaciones(''); establecerAviso(exito)
      requestAnimationFrame(() => titulo.current?.focus())
    } catch (fallo) {
      establecerError(mensaje(fallo))
      // Se consulta la versión vigente sin sustituir el borrador de edición.
      // La escritura conserva su versión base para no sobrescribir cambios ajenos.
      await consultarSolicitud(actual.id_solicitud).then(alCambiar).catch(() => undefined)
    } finally { bloqueo.current = false; establecerOcupado(false); alOcupar?.(false) }
  }
  function editar(propuesta: Propuesta) {
    establecerEdicion({ version: propuesta.version ?? 0, campos: Object.fromEntries(campos.map(({ campo }) => [campo, Array.isArray(propuesta[campo]) || propuesta[campo] == null ? listaATexto(propuesta[campo] as string[] | null) : propuesta[campo] as string])) })
    requestAnimationFrame(() => tituloEdicion.current?.focus())
  }
  function guardarEdicion(evento: FormEvent) {
    evento.preventDefault()
    if (!edicion?.version) return
    const datos = edicion.campos
    const recursos = textoALista(datos.recursos)
    void ejecutar(() => modificarVersion(actual.id_solicitud, edicion.version, {
      objetivo: datos.objetivo, historia: datos.historia, acciones: textoALista(datos.acciones), reglas: textoALista(datos.reglas), retos: textoALista(datos.retos), ayudas: textoALista(datos.ayudas), recursos: recursos.length ? recursos : null,
    }), 'Se guardó una versión nueva. Necesita tu aprobación.')
  }
  async function cargarVersiones() {
    if (cargandoVersiones) return
    establecerCargandoVersiones(true); establecerError('')
    try { establecerVersiones(await listarVersiones(actual.id_solicitud)) }
    catch (fallo) { establecerError(mensaje(fallo)) }
    finally { establecerCargandoVersiones(false) }
  }
  const propuesta = actual.propuesta
  const version = propuesta?.version ?? 0
  return <article className="doc-revision" aria-label="Revisar propuesta educativa">
    {error && <MensajeDocente titulo="No se pudo completar el cambio" error><p>{error}</p>{edicion && edicion.version !== version && <p>Existe una versión más reciente. Tu texto sigue en el formulario; compáralo antes de volver a editar la versión vigente.</p>}</MensajeDocente>}
    {aviso && <div className="doc-confirmacion" role="status"><IconoDocente nombre="check" /><span>{aviso}</span></div>}
    <header className="doc-revision-cabecera"><div><h2 ref={titulo} tabIndex={-1}>{actual.tema}</h2><p>{actual.proposito === 'refuerzo' ? 'Refuerzo · Después de la clase' : 'Preparación · Antes de la clase'}{propuesta && ' · Versión ' + version}</p></div><EtiquetaPropuesta solicitud={actual} /></header>
    {!propuesta ? <MensajeDocente titulo="Esta solicitud aún no tiene una propuesta"><p>Estado: {actual.estado === 'generando' ? 'la IA está preparando el contenido' : actual.estado === 'fallida' ? 'necesita un reintento' : 'pendiente de generación'}. Conserva los datos de la solicitud para consultar o reintentar su creación.</p></MensajeDocente> : <div className="doc-revision-distribucion">
      <div className="doc-revision-lectura">
        <div className="doc-origen"><IconoDocente nombre={propuesta.origen === 'docente' ? 'editar' : 'cursos'} /><span>{propuesta.origen === 'docente' ? 'Versión modificada por ti' : 'Propuesta generada por IA'}<small>{propuesta.origen_objetivo === 'docente' ? 'El objetivo conserva tu texto original.' : 'El objetivo fue sugerido por IA; revísalo con tu clase en mente.'}</small></span></div>
        <dl className="doc-contenido-propuesta"><Parte titulo="Regla elegida para el laberinto" icono="secciones" valor={etiquetaReglaJuego(propuesta.regla_juego)} /></dl>
        {edicion ? <form className="doc-editor" onSubmit={guardarEdicion}>
          <h3 ref={tituloEdicion} tabIndex={-1}>Modificar la propuesta</h3><p>Editas la versión {edicion.version}. Cada lista lleva un elemento por línea; guardar creará una versión nueva.</p>
          {campos.map(({ campo, etiqueta }) => <div className="campo" key={campo}><label htmlFor={id + '-editar-' + campo}>{etiqueta}{campo === 'recursos' ? ' (opcional)' : ''}</label><textarea id={id + '-editar-' + campo} disabled={ocupado} value={edicion.campos[campo]} rows={campo === 'historia' ? 5 : 3} maxLength={campo === 'historia' ? 10000 : campo === 'objetivo' ? 4000 : undefined} required={campo !== 'recursos'} onChange={(e) => establecerEdicion({ ...edicion, campos: { ...edicion.campos, [campo]: e.target.value } })} /></div>)}
          <div className="acciones"><button type="submit" disabled={ocupado}>Guardar versión nueva</button><button type="button" className="secundario" disabled={ocupado} onClick={() => { establecerEdicion(null); requestAnimationFrame(() => titulo.current?.focus()) }}>Cancelar edición</button></div>
        </form> : <dl className="doc-contenido-propuesta">{campos.map(({ campo, etiqueta, icono }) => <Parte key={campo} titulo={etiqueta} icono={icono} valor={propuesta[campo]} />)}</dl>}
        {actual.instrucciones && <details className="doc-instrucciones"><summary>Tus indicaciones para la IA</summary><p className="texto-conservado">{actual.instrucciones}</p></details>}
        {versiones && <section className="doc-versiones" aria-label="Historial de versiones"><h3>Versiones anteriores</h3><p>La más reciente aparece primero. Estas versiones se consultan sin cambiar la vigente.</p><ol reversed>{versiones.map((v) => <li key={v.id}><details><summary><strong>Versión {v.version}</strong><span>{nombreRevision[v.estado_revision ?? 'pendiente']}</span></summary><p>{v.origen === 'docente' ? 'Modificada por el docente' : 'Generada por IA'}{v.creado_en ? ' · ' + new Date(v.creado_en).toLocaleString('es-PE') : ''}{v.version_base ? ' · Ajusta la versión ' + v.version_base : ''}</p>{v.observaciones && <p className="texto-conservado">Observaciones: {v.observaciones}</p>}<dl><Parte titulo="Regla elegida para el laberinto" icono="secciones" valor={etiquetaReglaJuego(v.regla_juego)} />{campos.map(({ campo, etiqueta, icono }) => <Parte key={campo} titulo={etiqueta} icono={icono} valor={v[campo]} />)}</dl></details></li>)}</ol></section>}
      </div>
      <aside className="doc-decisiones" aria-label="Decisiones sobre la propuesta">
        <h3>¿Lista para tu clase?</h3><p>Revisa el objetivo, las reglas y las ayudas antes de decidir.</p>
        <div className="doc-acciones-revision">
          {propuesta.estado_revision === 'pendiente' && <><button type="button" disabled={ocupado || !!edicion} onClick={() => void ejecutar(() => aprobarVersion(actual.id_solicitud, version), 'Versión ' + version + ' aprobada.')}><IconoDocente nombre="check" />Aprobar versión {version}</button><button type="button" className="secundario" disabled={ocupado || !!edicion} onClick={() => void ejecutar(() => rechazarVersion(actual.id_solicitud, version), 'Versión ' + version + ' rechazada. No generará un juego.')}>Rechazar</button></>}
          {propuesta.estado_revision === 'rechazada' && <button type="button" disabled={ocupado || !!edicion} onClick={() => void ejecutar(() => pedirAlternativa(actual.id_solicitud), 'Se generó otra alternativa.')}>Pedir otra alternativa</button>}
          <button type="button" className="secundario" disabled={ocupado || !!edicion} onClick={() => editar(propuesta)}><IconoDocente nombre="editar" />Modificar</button>
          <button type="button" className="secundario" disabled={ocupado || cargandoVersiones} onClick={() => void cargarVersiones()}><IconoDocente nombre="reloj" />{cargandoVersiones ? 'Cargando versiones…' : 'Ver versiones anteriores'}</button>
        </div>
        {ocupado && <p role="status">Guardando el cambio… Espera a que termine.</p>}
        <details className="doc-pedir-ajustes"><summary><IconoDocente nombre="comunicacion" />Pedir ajustes a la IA</summary><form onSubmit={(e) => { e.preventDefault(); void ejecutar(() => enviarObservaciones(actual.id_solicitud, version, observaciones), 'La IA generó una versión ajustada.') }}><div className="campo"><label htmlFor={id + '-observaciones'}>Observaciones para la IA sobre la versión {version}</label><textarea id={id + '-observaciones'} disabled={ocupado || !!edicion} value={observaciones} onChange={(e) => establecerObservaciones(e.target.value)} maxLength={4000} rows={4} required placeholder="Cuéntale qué debe cambiar y por qué" /></div><button type="submit" disabled={ocupado || !!edicion}>Enviar observaciones</button></form></details>
        <p className="doc-decisiones-nota"><IconoDocente nombre="info" />{propuesta.apta_para_juego ? 'La idea está aprobada. Abajo puedes generar el juego o consultar los que ya se guardaron.' : 'Aprobar esta propuesta valida la idea. No publica ni asigna un juego a tus estudiantes.'}</p>
      </aside>
    </div>}
    {/* Las secciones visitadas permanecen montadas para conservar borradores.
        Al ocultar esta revisión se desmonta el seguimiento: cancela sus GET y
        libera el iframe; al volver recupera el último estado guardado en Spring. */}
    {activo && <GeneracionPropuesta key={actual.id_solicitud} solicitud={actual.id_solicitud} version={version} aprobada={propuesta?.estado_revision === 'aprobada'} bloqueada={ocupado || !!edicion} />}
  </article>
}
