import { useEffect, useId, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import {
  aprobarVersion, consultarSolicitud, enviarObservaciones, listarVersiones,
  modificarVersion, pedirAlternativa, rechazarVersion,
} from '../servicios/propuestas'
import type { Propuesta, SolicitudPropuesta } from '../servicios/propuestas'

const nombreRevision = { pendiente: 'Pendiente de revisión', aprobada: 'Aprobada', rechazada: 'Rechazada' }
const listaATexto = (valores: string[] | null | undefined) => (valores ?? []).join('\n')
const textoALista = (valor: string) => valor.split('\n').map((linea) => linea.trim()).filter(Boolean)
const mensaje = (fallo: unknown) => fallo instanceof Error ? fallo.message : 'No se pudo completar la operación.'

function Parte({ titulo, valor }: { titulo: string; valor: string | string[] | null | undefined }) {
  // HU20: lo que falte se identifica como pendiente.
  const vacio = valor === null || valor === undefined || valor.length === 0
  return <><dt>{titulo}</dt><dd className="texto-conservado">{vacio ? <em>Pendiente</em> : Array.isArray(valor) ? <ul>{valor.map((item, i) => <li key={i}>{item}</li>)}</ul> : valor}</dd></>
}

type Propiedades = {
  solicitud: SolicitudPropuesta
  alCambiar: (solicitud: SolicitudPropuesta) => void
  alOcupar?: (ocupado: boolean) => void
}

// La creación y el listado comparten contenido, edición y revisión de versiones.
export function RevisionPropuesta({ solicitud: actual, alCambiar, alOcupar }: Propiedades) {
  const id = useId()
  const titulo = useRef<HTMLHeadingElement>(null)
  useEffect(() => { titulo.current?.focus() }, [])
  const bloqueo = useRef(false)
  const [versiones, establecerVersiones] = useState<Propuesta[] | null>(null)
  const [observaciones, establecerObservaciones] = useState('')
  const [edicion, establecerEdicion] = useState<Record<string, string> | null>(null)
  const [error, establecerError] = useState('')
  const [aviso, establecerAviso] = useState('')
  const [ocupado, establecerOcupado] = useState(false)

  async function ejecutar(accion: () => Promise<SolicitudPropuesta>, exito: string) {
    if (bloqueo.current) return
    bloqueo.current = true; alOcupar?.(true)
    establecerOcupado(true); establecerError(''); establecerAviso('')
    try {
      const resultado = await accion()
      alCambiar(resultado); establecerVersiones(null); establecerEdicion(null); establecerObservaciones('')
      establecerAviso(exito)
    } catch (fallo) {
      establecerError(mensaje(fallo))
      // Si otra pestaña cambió la propuesta, se muestra la versión vigente.
      if (actual) await consultarSolicitud(actual.id_solicitud).then(alCambiar).catch(() => undefined)
    } finally { bloqueo.current = false; establecerOcupado(false); alOcupar?.(false) }
  }

  function editar(propuesta: Propuesta) {
    establecerEdicion({
      objetivo: propuesta.objetivo, historia: propuesta.historia, acciones: listaATexto(propuesta.acciones), reglas: listaATexto(propuesta.reglas),
      retos: listaATexto(propuesta.retos), ayudas: listaATexto(propuesta.ayudas), recursos: listaATexto(propuesta.recursos),
    })
  }

  function guardarEdicion(evento: FormEvent, solicitud: SolicitudPropuesta, propuesta: Propuesta) {
    evento.preventDefault()
    if (!edicion || !propuesta.version) return
    const recursos = textoALista(edicion.recursos)
    void ejecutar(() => modificarVersion(solicitud.id_solicitud, propuesta.version as number, {
      objetivo: edicion.objetivo, historia: edicion.historia, acciones: textoALista(edicion.acciones), reglas: textoALista(edicion.reglas),
      retos: textoALista(edicion.retos), ayudas: textoALista(edicion.ayudas), recursos: recursos.length ? recursos : null,
    }), 'Se guardó una versión nueva. Necesita tu aprobación.')
  }

  const propuesta = actual.propuesta
  const version = propuesta?.version ?? 0
  return (
    <div className="confirmacion">
      {error && <p role="alert" className="error-resumen">{error}</p>}
      {aviso && <p role="status">{aviso}</p>}
      <h3 ref={titulo} tabIndex={-1}>{actual.tema}</h3>
      <p>Propósito: {actual.proposito === 'refuerzo' ? 'refuerzo' : 'preparación'}{actual.instrucciones ? '' : ' · sin instrucciones adicionales'}</p>
      {actual.instrucciones && <p className="texto-conservado">Instrucciones: {actual.instrucciones}</p>}
      {!propuesta && <p>La propuesta aún no se ha generado (estado: {actual.estado}).</p>}
      {propuesta && <>
        <p>Versión {propuesta.version} · {propuesta.origen === 'docente' ? 'modificada por ti' : 'generada por IA'} · {nombreRevision[propuesta.estado_revision ?? 'pendiente']}
          {propuesta.apta_para_juego ? ' · lista para generar el juego' : ''}</p>
        <dl>
          <Parte titulo={propuesta.origen_objetivo === 'docente' ? 'Objetivo (tuyo)' : 'Objetivo sugerido por IA'} valor={propuesta.objetivo} />
          <Parte titulo="Historia" valor={propuesta.historia} />
          <Parte titulo="Acciones" valor={propuesta.acciones} />
          <Parte titulo="Reglas" valor={propuesta.reglas} />
          <Parte titulo="Retos" valor={propuesta.retos} />
          <Parte titulo="Ayudas" valor={propuesta.ayudas} />
          <Parte titulo="Recursos" valor={propuesta.recursos} />
        </dl>
        <div className="acciones">
          {propuesta.estado_revision === 'pendiente' && <>
            <button type="button" disabled={ocupado} onClick={() => void ejecutar(() => aprobarVersion(actual.id_solicitud, version), 'Versión ' + version + ' aprobada.')}>Aprobar versión {version}</button>
            <button type="button" className="secundario" disabled={ocupado} onClick={() => void ejecutar(() => rechazarVersion(actual.id_solicitud, version), 'Versión ' + version + ' rechazada. No generará un juego.')}>Rechazar</button>
          </>}
          {propuesta.estado_revision === 'rechazada' && <button type="button" disabled={ocupado} onClick={() => void ejecutar(() => pedirAlternativa(actual.id_solicitud), 'Se generó otra alternativa.')}>Pedir otra alternativa</button>}
          <button type="button" className="secundario" disabled={ocupado} onClick={() => editar(propuesta)}>Modificar</button>
          <button type="button" className="secundario" disabled={ocupado} onClick={() => listarVersiones(actual.id_solicitud).then(establecerVersiones).catch((fallo) => establecerError(mensaje(fallo)))}>Ver versiones anteriores</button>
        </div>

        <form onSubmit={(evento) => { evento.preventDefault(); void ejecutar(() => enviarObservaciones(actual.id_solicitud, version, observaciones), 'La IA generó una versión ajustada.') }}>
          <div className="campo"><label htmlFor={id + '-observaciones'}>Observaciones para la IA sobre la versión {version}</label>
            <textarea id={id + '-observaciones'} disabled={ocupado} value={observaciones} onChange={(evento) => establecerObservaciones(evento.target.value)} maxLength={4000} rows={3} required /></div>
          <button type="submit" disabled={ocupado}>Enviar observaciones</button>
        </form>

        {edicion && <form onSubmit={(evento) => guardarEdicion(evento, actual, propuesta)}>
          <p>Escribe un elemento por línea en las listas. Se guardará como una versión nueva.</p>
          {(['objetivo', 'historia', 'acciones', 'reglas', 'retos', 'ayudas', 'recursos'] as const).map((campo) => <div className="campo" key={campo}>
            <label htmlFor={id + '-editar-' + campo}>{campo[0].toUpperCase() + campo.slice(1)}{campo === 'recursos' ? ' (opcional)' : ''}</label>
            <textarea id={id + '-editar-' + campo} disabled={ocupado} value={edicion[campo]} rows={campo === 'historia' ? 6 : 3}
              onChange={(evento) => establecerEdicion({ ...edicion, [campo]: evento.target.value })} />
          </div>)}
          <button type="submit" disabled={ocupado}>Guardar versión nueva</button>
          <button type="button" className="secundario" disabled={ocupado} onClick={() => establecerEdicion(null)}>Cancelar</button>
        </form>}

        {versiones && <div>
          <h4>Versiones (la más reciente primero)</h4>
          <ol reversed>
            {versiones.map((v) => <li key={v.id}>
              Versión {v.version} · {v.origen === 'docente' ? 'modificada por el docente' : 'generada por IA'} · {v.creado_en ? new Date(v.creado_en).toLocaleString() : ''} · {nombreRevision[v.estado_revision ?? 'pendiente']}
              {v.version_base ? ' · ajusta la versión ' + v.version_base : ''}{v.observaciones ? ' · observaciones: ' + v.observaciones : ''}
            </li>)}
          </ol>
        </div>}
      </>}
    </div>
  )
}
