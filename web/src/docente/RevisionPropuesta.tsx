import { useEffect, useId, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { consultarSolicitud, listarVersiones, modificarVersion, pedirAlternativa, rechazarVersion, reintentarSolicitud } from '../servicios/propuestas'
import type { Propuesta, SolicitudPropuesta } from '../servicios/propuestas'
import { useJuegoDocente } from './GeneracionPropuesta'
import { DetalleGeneracion } from './DetalleGeneracion'
import { MensajeDocente } from './ElementosDocente'
import { IconoDocente } from './IconoDocente'
import type { IconoDocenteNombre } from './IconoDocente'
import { estadoTrabajo, mensajeDocente } from './trabajosDocente'
import { CambiosPropuesta } from './cambiosPropuesta'

const campos = [
  { campo: 'objetivo', etiqueta: 'Qué aprenderán', icono: 'check' },
  { campo: 'historia', etiqueta: 'De qué trata', icono: 'cursos' },
  { campo: 'acciones', etiqueta: 'Cómo jugarán', icono: 'personas' },
  { campo: 'reglas', etiqueta: 'Reglas del juego', icono: 'info' },
  { campo: 'retos', etiqueta: 'Qué practicarán', icono: 'matematica' },
  { campo: 'ayudas', etiqueta: 'Cómo los ayudará Kusi', icono: 'comunicacion' },
] as const
function Parte({ titulo, valor, icono }: { titulo: string; valor: string | string[]; icono: IconoDocenteNombre }) {
  return <div className="doc-parte"><dt><IconoDocente nombre={icono} />{titulo}</dt><dd className="texto-conservado">{Array.isArray(valor) ? <ul>{valor.map((item, i) => <li key={i}>{item}</li>)}</ul> : valor}</dd></div>
}
function ContenidoPropuesta({ propuesta }: { propuesta: Propuesta }) {
  return <dl className="doc-contenido-propuesta">{campos.map(({ campo, etiqueta, icono }) => <Parte key={campo} titulo={etiqueta} icono={icono} valor={propuesta[campo]} />)}</dl>
}
type Propiedades = { solicitud: SolicitudPropuesta; alCambiar: (solicitud: SolicitudPropuesta) => void; alOcupar?: (ocupado: boolean) => void; activo?: boolean; seccion?: string }
type Edicion = { version: number; campos: Record<string, string>; recursos: string[] | null }

export function RevisionPropuesta({ solicitud: actual, alCambiar, alOcupar, activo = true, seccion }: Propiedades) {
  const id = useId()
  const titulo = useRef<HTMLHeadingElement>(null)
  const finalChat = useRef<HTMLDivElement>(null)
  const bloqueo = useRef(false)
  const cambios = useRef(new CambiosPropuesta())
  const alCambiarActual = useRef(alCambiar)
  useEffect(() => { alCambiarActual.current = alCambiar })
  const [mensajes, establecerMensajes] = useState<Propuesta[]>([])
  const [observaciones, establecerObservaciones] = useState('')
  const [edicion, establecerEdicion] = useState<Edicion | null>(null)
  const [error, establecerError] = useState('')
  const [aviso, establecerAviso] = useState('')
  const [ocupado, establecerOcupado] = useState(false)
  const [chatConsultado, establecerChatConsultado] = useState(false)
  const [recargaChat, establecerRecargaChat] = useState(0)
  const propuesta = actual.propuesta
  const version = propuesta?.version ?? 0
  const juego = useJuegoDocente(actual, activo, alCambiar, alOcupar)
  const preparando = juego.ocupado || (juego.preparando && juego.juego?.estado !== 'pendiente')
  const bloqueada = ocupado || preparando
  const listo = propuesta?.estado_revision === 'aprobada' && juego.juego?.estado === 'lista'
  const estado = estadoTrabajo({ solicitud: actual, juego: juego.juego, sinConfirmar: juego.cargando })
  useEffect(() => { titulo.current?.focus() }, [])
  useEffect(() => {
    if (!activo || !version) return
    let vigente = true
    // Las observaciones ya persistidas reconstruyen la conversación al volver.
    // Se omiten números, fechas y copias de las propuestas anteriores.
    listarVersiones(actual.id_solicitud).then((lista) => {
      if (vigente) { establecerMensajes(lista.filter((item) => item.observaciones).reverse()); establecerChatConsultado(true) }
    }).catch(() => { if (vigente) establecerChatConsultado(false) })
    return () => { vigente = false }
  }, [actual.id_solicitud, version, activo, recargaChat])
  useEffect(() => {
    if (!activo || actual.estado !== 'generando') return
    let vigente = true
    let temporizador: ReturnType<typeof setTimeout> | undefined
    async function consultar() {
      try {
        const datos = await consultarSolicitud(actual.id_solicitud)
        if (!vigente) return
        alCambiarActual.current(datos)
        if (datos.estado !== 'generando') return
      } catch { /* Una lectura fallida no repite la escritura anterior. */ }
      if (vigente) temporizador = setTimeout(() => void consultar(), 2500)
    }
    void consultar()
    return () => { vigente = false; clearTimeout(temporizador) }
  }, [actual.id_solicitud, actual.estado, activo])

  async function ejecutar(accion: () => Promise<SolicitudPropuesta>, exito: string) {
    if (bloqueo.current || preparando) return
    bloqueo.current = true; alOcupar?.(true); establecerOcupado(true); establecerError(''); establecerAviso('')
    try {
      const resultado = await accion()
      alCambiar(resultado); establecerEdicion(null); establecerObservaciones(''); establecerAviso(exito)
      requestAnimationFrame(() => finalChat.current?.scrollIntoView({ block: 'nearest' }))
    } catch (fallo) {
      establecerError(mensajeDocente(fallo, 'No pudimos confirmar el cambio. Conservamos lo que escribiste; vuelve a consultar antes de enviarlo otra vez.'))
      await consultarSolicitud(actual.id_solicitud).then(alCambiar).catch(() => undefined)
    } finally { bloqueo.current = false; establecerOcupado(false); alOcupar?.(false) }
  }
  function editar() {
    if (!propuesta) return
    establecerEdicion({ version, recursos: propuesta.recursos?.length ? propuesta.recursos : null, campos: Object.fromEntries(campos.map(({ campo }) => [campo, Array.isArray(propuesta[campo]) ? propuesta[campo].join('\n') : propuesta[campo]])) })
  }
  function guardarEdicion(evento: FormEvent) {
    evento.preventDefault()
    if (!edicion || !propuesta) return
    const datos = edicion.campos
    const lista = (campo: string) => datos[campo].split('\n').map((linea) => linea.trim()).filter(Boolean)
    void ejecutar(() => modificarVersion(actual.id_solicitud, edicion.version, { objetivo: datos.objetivo, historia: datos.historia,
      acciones: lista('acciones'), reglas: lista('reglas'), retos: lista('retos'), ayudas: lista('ayudas'), recursos: edicion.recursos }), 'Tu idea ya incluye los cambios. Revísala antes de preparar el juego.')
  }
  async function retomar() {
    await ejecutar(async () => {
      const guardada = await consultarSolicitud(actual.id_solicitud)
      return guardada.estado === 'pendiente' || guardada.estado === 'fallida' ? reintentarSolicitud(actual.id_solicitud) : guardada
    }, 'Tu idea está guardada aquí.')
  }
  return <article className="doc-revision" aria-label="Tu idea y tu juego">
    <header className="doc-revision-cabecera"><div><span className="doc-sobre-titulo">{seccion ?? 'Para tu clase'}</span><h2 ref={titulo} tabIndex={-1}>{actual.tema}</h2><p>{actual.proposito === 'refuerzo' ? 'Para practicar después de clase' : 'Para descubrir un tema nuevo'}</p></div><span className={'doc-estado doc-estado-' + estado.clave}>{estado.etiqueta}</span></header>
    {error && <MensajeDocente titulo="Vamos a comprobar tu cambio" error><p>{error}</p><button type="button" className="secundario" onClick={() => void consultarSolicitud(actual.id_solicitud).then((datos) => { alCambiar(datos); establecerError('') }).catch(() => undefined)}>Volver a consultar</button></MensajeDocente>}
    {aviso && <p className="doc-confirmacion" role="status"><IconoDocente nombre="check" />{aviso}</p>}
    {!propuesta ? <div className="doc-revision-lectura">{actual.estado === 'generando' ? <div className="doc-espera" role="status"><span className="doc-espera-puntos" aria-hidden="true"><i /><i /><i /></span><h2>Estamos preparando tu idea</h2><p>Puedes volver a Mis juegos mientras la preparamos.</p></div> : <MensajeDocente titulo="Tu idea está guardada"><p>Vamos a terminar de prepararla para que puedas revisarla.</p><button type="button" disabled={ocupado} onClick={() => void retomar()}>{ocupado ? 'Buscando tu idea…' : 'Continuar con mi idea'}</button></MensajeDocente>}</div> : <div className={'doc-trabajo-distribucion' + (listo ? ' doc-con-juego' : '')}>
      <div className="doc-trabajo-principal">
        {activo && juego.juego && propuesta.estado_revision === 'aprobada' && <DetalleGeneracion key={juego.juego.id} generacion={juego.juego} seccion={seccion} alEnviar={juego.actualizar} />}
        {juego.error && <MensajeDocente titulo="Tu juego sigue guardado" error><p>{juego.error}</p><button type="button" className="secundario" onClick={juego.recargar}>Volver a consultar</button></MensajeDocente>}
        {edicion ? <form className="doc-editor doc-revision-lectura" onSubmit={guardarEdicion}><h3>Editar mi idea</h3><p>Escribe cada regla, reto o ayuda en una línea.</p>{campos.map(({ campo, etiqueta }) => <div className="campo" key={campo}><label htmlFor={id + '-editar-' + campo}>{etiqueta}</label><textarea id={id + '-editar-' + campo} disabled={bloqueada} value={edicion.campos[campo]} rows={campo === 'historia' ? 5 : 3} maxLength={campo === 'historia' ? 10000 : campo === 'objetivo' ? 4000 : undefined} required onChange={(e) => establecerEdicion({ ...edicion, campos: { ...edicion.campos, [campo]: e.target.value } })} /></div>)}<div className="acciones"><button disabled={bloqueada}>Guardar cambios</button><button type="button" className="secundario" disabled={bloqueada} onClick={() => establecerEdicion(null)}>Cancelar</button></div></form>
          : listo || preparando ? <details className="doc-idea-resumen"><summary>Ver la idea de este juego</summary><ContenidoPropuesta propuesta={propuesta} /></details>
          : <section className="doc-revision-lectura"><span className="doc-sobre-titulo">La idea para tu juego</span><ContenidoPropuesta propuesta={propuesta} /></section>}
        {!edicion && !listo && !preparando && <div className="doc-siguiente">
          {propuesta.se_puede_generar === false ? <MensajeDocente titulo="Este tipo de juego todavía no está disponible"><p>Puedes pedirle a Kusi una idea de laberinto con frutas y verduras.</p></MensajeDocente>
            : propuesta.estado_revision === 'rechazada' ? <button disabled={bloqueada} onClick={() => void ejecutar(() => pedirAlternativa(actual.id_solicitud), 'Aquí tienes otra idea para revisar.')}>Proponer otra idea</button>
            : <><p>Cuando la idea te guste, prepararemos el juego para que puedas probarlo.</p><button type="button" disabled={bloqueada || juego.cargando || !!juego.error} onClick={() => void juego.preparar()}><IconoDocente nombre="check" />{propuesta.estado_revision === 'aprobada' ? 'Continuar preparando mi juego' : propuesta.observaciones ? 'Preparar juego con estos cambios' : 'Aprobar y preparar juego'}</button></>}
        </div>}
      </div>
      <aside className="doc-chat" aria-label="Conversación con Kusi"><div className="doc-chat-cabecera"><IconoDocente nombre="comunicacion" /><div><h3>Cuéntale a Kusi</h3><p>{listo ? '¿Qué quieres cambiar del juego?' : '¿Qué quieres cambiar de la idea?'}</p></div></div>
        <div className="doc-chat-mensajes" role="log" aria-label="Tus cambios y las respuestas de Kusi" aria-live="polite">
          <p className="doc-burbuja doc-burbuja-kusi"><strong>Kusi</strong>Puedes pedirme cambios con tus palabras. Por ejemplo: «Quiero instrucciones más cortas».</p>
          {mensajes.map((item) => <div key={item.id}><p className="doc-burbuja doc-burbuja-profe"><strong>Tú</strong>{item.observaciones}</p><p className="doc-burbuja doc-burbuja-kusi"><strong>Kusi</strong>Preparé la idea con tus indicaciones. Revísala antes de preparar el juego.</p></div>)}
          {ocupado && <p className="doc-burbuja doc-burbuja-kusi" role="status">Estoy preparando los cambios…</p>}<div ref={finalChat} />
        </div>
        {!chatConsultado && <p className="doc-ayuda">Estamos buscando tus mensajes anteriores. <button type="button" className="doc-texto-boton secundario" onClick={() => establecerRecargaChat((valor) => valor + 1)}>Volver a buscar</button></p>}
        <form onSubmit={(e) => { e.preventDefault(); if (observaciones.trim()) void ejecutar(() => cambios.current.enviar(actual.id_solicitud, version, observaciones), 'Tu idea ya incluye los cambios. Revísala antes de preparar el juego.') }}>
          <label htmlFor={id + '-cambios'}>¿Qué quieres cambiar?</label><textarea id={id + '-cambios'} disabled={bloqueada || !!edicion || !chatConsultado} value={observaciones} onChange={(e) => establecerObservaciones(e.target.value)} maxLength={4000} rows={4} required placeholder="Escribe aquí tus indicaciones…" />
          <button type="submit" disabled={bloqueada || !!edicion || !chatConsultado || !observaciones.trim()}><IconoDocente nombre="flecha" />{ocupado ? 'Preparando cambios…' : 'Pedir estos cambios'}</button>
        </form><p className="doc-ayuda">Los cambios se revisan antes de preparar el juego. Lo que ya enviaste a tu clase seguirá disponible hasta que envíes el juego actualizado.</p>
        <div className="doc-chat-opciones"><button type="button" className="doc-texto-boton secundario" disabled={bloqueada || !!edicion} onClick={editar}><IconoDocente nombre="editar" />Editar el texto</button>{propuesta.estado_revision === 'pendiente' && <button type="button" className="doc-texto-boton secundario" disabled={bloqueada || !!edicion} onClick={() => void ejecutar(() => rechazarVersion(actual.id_solicitud, version), 'Puedes pedir otra idea o contarle a Kusi qué cambiar.')}>Esta idea no me convence</button>}</div>
      </aside>
    </div>}
  </article>
}
