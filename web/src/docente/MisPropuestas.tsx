import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import {
  aprobarVersion, consultarSolicitud, enviarObservaciones, listarSolicitudes, listarVersiones,
  modificarVersion, pedirAlternativa, rechazarVersion,
} from '../servicios/propuestas'
import type { Propuesta, SolicitudPropuesta } from '../servicios/propuestas'

// HU20-HU25. Pantalla provisional: el diseño final está a cargo de Luis.
const nombreRevision = { pendiente: 'Pendiente de revisión', aprobada: 'Aprobada', rechazada: 'Rechazada' }
const listaATexto = (valores: string[] | null | undefined) => (valores ?? []).join('\n')
const textoALista = (valor: string) => valor.split('\n').map((linea) => linea.trim()).filter(Boolean)
const mensaje = (fallo: unknown) => fallo instanceof Error ? fallo.message : 'No se pudo completar la operación.'

function Parte({ titulo, valor }: { titulo: string; valor: string | string[] | null | undefined }) {
  // HU20: lo que falte se identifica como pendiente.
  const vacio = valor === null || valor === undefined || valor.length === 0
  return <><dt>{titulo}</dt><dd className="texto-conservado">{vacio ? <em>Pendiente</em> : Array.isArray(valor) ? <ul>{valor.map((item, i) => <li key={i}>{item}</li>)}</ul> : valor}</dd></>
}

export function MisPropuestas() {
  const [solicitudes, establecerSolicitudes] = useState<SolicitudPropuesta[] | null>(null)
  const [actual, establecerActual] = useState<SolicitudPropuesta | null>(null)
  const [versiones, establecerVersiones] = useState<Propuesta[] | null>(null)
  const [observaciones, establecerObservaciones] = useState('')
  const [edicion, establecerEdicion] = useState<Record<string, string> | null>(null)
  const [error, establecerError] = useState('')
  const [aviso, establecerAviso] = useState('')
  const [ocupado, establecerOcupado] = useState(false)

  const cargar = useCallback(() => {
    listarSolicitudes().then(establecerSolicitudes).catch((fallo) => establecerError(mensaje(fallo)))
  }, [])
  useEffect(() => { cargar() }, [cargar])

  async function ejecutar(accion: () => Promise<SolicitudPropuesta>, exito: string) {
    establecerOcupado(true); establecerError(''); establecerAviso('')
    try {
      const resultado = await accion()
      establecerActual(resultado); establecerVersiones(null); establecerEdicion(null); establecerObservaciones('')
      establecerAviso(exito); cargar()
    } catch (fallo) {
      establecerError(mensaje(fallo))
      // Si otra pestaña cambió la propuesta, se muestra la versión vigente.
      if (actual) consultarSolicitud(actual.id_solicitud).then(establecerActual).catch(() => undefined)
    } finally { establecerOcupado(false) }
  }

  function abrir(solicitud: SolicitudPropuesta) {
    establecerActual(solicitud); establecerVersiones(null); establecerEdicion(null); establecerError(''); establecerAviso('')
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

  const propuesta = actual?.propuesta ?? null
  const version = propuesta?.version ?? 0
  return <section id="mis-propuestas" aria-labelledby="titulo-mis-propuestas">
    <h2 id="titulo-mis-propuestas">Mis propuestas</h2>
    {error && <p role="alert" className="error-resumen">{error}</p>}
    {aviso && <p role="status">{aviso}</p>}
    {solicitudes === null && !error && <p role="status">Cargando tus propuestas…</p>}
    {solicitudes?.length === 0 && <p>Aún no tienes solicitudes de propuestas.</p>}
    {!!solicitudes?.length && <ul>
      {solicitudes.map((s) => <li key={s.id_solicitud}>
        <button type="button" className="secundario" onClick={() => abrir(s)} disabled={ocupado}>
          {s.tema} · {s.proposito === 'refuerzo' ? 'Refuerzo' : 'Preparación'} · {s.propuesta ? 'Versión ' + s.propuesta.version + ' · ' + nombreRevision[s.propuesta.estado_revision ?? 'pendiente'] : 'Sin propuesta (' + s.estado + ')'}
        </button>
      </li>)}
    </ul>}

    {actual && <div className="confirmacion">
      <h3>{actual.tema}</h3>
      <p>Propósito: {actual.proposito === 'refuerzo' ? 'refuerzo' : 'preparación'}{actual.instrucciones ? '' : ' · sin instrucciones adicionales'}</p>
      {actual.instrucciones && <p className="texto-conservado">Instrucciones: {actual.instrucciones}</p>}
      {!propuesta && <p>La propuesta aún no se ha generado (estado: {actual.estado}).</p>}
      {propuesta && <>
        <p>Versión {propuesta.version} · {propuesta.origen === 'docente' ? 'modificada por ti' : 'generada por IA'} · {nombreRevision[propuesta.estado_revision ?? 'pendiente']}
          {propuesta.apta_para_juego ? ' · lista para generar el juego (Sprint 2)' : ''}</p>
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
          <div className="campo"><label htmlFor="observaciones-propuesta">Observaciones para la IA sobre la versión {version}</label>
            <textarea id="observaciones-propuesta" value={observaciones} onChange={(evento) => establecerObservaciones(evento.target.value)} maxLength={4000} rows={3} required /></div>
          <button type="submit" disabled={ocupado}>Enviar observaciones</button>
        </form>

        {edicion && <form onSubmit={(evento) => guardarEdicion(evento, actual, propuesta)}>
          <p>Escribe un elemento por línea en las listas. Se guardará como una versión nueva.</p>
          {(['objetivo', 'historia', 'acciones', 'reglas', 'retos', 'ayudas', 'recursos'] as const).map((campo) => <div className="campo" key={campo}>
            <label htmlFor={'editar-' + campo}>{campo[0].toUpperCase() + campo.slice(1)}{campo === 'recursos' ? ' (opcional)' : ''}</label>
            <textarea id={'editar-' + campo} value={edicion[campo]} rows={campo === 'historia' ? 6 : 3}
              onChange={(evento) => establecerEdicion({ ...edicion, [campo]: evento.target.value })} />
          </div>)}
          <button type="submit" disabled={ocupado}>Guardar versión nueva</button>
          <button type="button" className="secundario" onClick={() => establecerEdicion(null)}>Cancelar</button>
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
    </div>}
  </section>
}
