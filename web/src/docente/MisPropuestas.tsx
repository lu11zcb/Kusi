import { useCallback, useEffect, useState } from 'react'
import { listarSolicitudes } from '../servicios/propuestas'
import type { SolicitudPropuesta } from '../servicios/propuestas'
import { RevisionPropuesta } from './RevisionPropuesta'

const nombreRevision = { pendiente: 'Pendiente de revisión', aprobada: 'Aprobada', rechazada: 'Rechazada' }

export function MisPropuestas() {
  const [solicitudes, establecerSolicitudes] = useState<SolicitudPropuesta[] | null>(null)
  const [actual, establecerActual] = useState<SolicitudPropuesta | null>(null)
  const [error, establecerError] = useState('')
  const [ocupado, establecerOcupado] = useState(false)
  const cargar = useCallback(() => {
    listarSolicitudes().then((datos) => { establecerSolicitudes(datos); establecerError('') })
      .catch((fallo: unknown) => establecerError(fallo instanceof Error ? fallo.message : 'No se pudieron cargar tus propuestas.'))
  }, [])
  useEffect(() => { cargar() }, [cargar])

  function actualizar(solicitud: SolicitudPropuesta) { establecerActual(solicitud); cargar() }

  return <section id="mis-propuestas" aria-labelledby="titulo-mis-propuestas">
    <h2 id="titulo-mis-propuestas">Mis propuestas</h2>
    {error && <p role="alert" className="error-resumen">{error}</p>}
    {solicitudes === null && !error && <p role="status">Cargando tus propuestas…</p>}
    {solicitudes?.length === 0 && <p>Aún no tienes solicitudes de propuestas.</p>}
    {!!solicitudes?.length && <ul>
      {solicitudes.map((s) => <li key={s.id_solicitud}>
        <button type="button" className="secundario" onClick={() => establecerActual(s)} disabled={ocupado}>
          {s.tema} · {s.proposito === 'refuerzo' ? 'Refuerzo' : 'Preparación'} · {s.propuesta ? 'Versión ' + s.propuesta.version + ' · ' + nombreRevision[s.propuesta.estado_revision ?? 'pendiente'] : 'Sin propuesta (' + s.estado + ')'}
        </button>
      </li>)}
    </ul>}
    {actual && <RevisionPropuesta key={actual.id_solicitud} solicitud={actual} alCambiar={actualizar} alOcupar={establecerOcupado} />}
  </section>
}
