import { useEffect, useRef, useState } from 'react'
import { asignarActividad, destinatariosActividad } from '../servicios/resultados'
import type { DestinatarioActividad } from '../servicios/resultados'
import { CargandoDocente, MensajeDocente } from './ElementosDocente'
import { mensajeDocente } from './trabajosDocente'

export function ListaDestinatarios({ estudiantes, seleccion, bloqueada, alElegir }: {
  estudiantes: DestinatarioActividad[]; seleccion: string[]; bloqueada: boolean
  alElegir: (id: string, elegida: boolean) => void
}) {
  return <fieldset className="doc-asignacion-lista" disabled={bloqueada}>
    <legend>Estudiantes de esta sección</legend>
    {estudiantes.map(estudiante => <label key={estudiante.id}>
      <input type="checkbox" checked={estudiante.asignado || seleccion.includes(estudiante.id)}
        disabled={estudiante.asignado} onChange={evento => alElegir(estudiante.id, evento.target.checked)} />
      <span>{estudiante.nombre}</span>
      {estudiante.asignado && <small>Ya recibió la actividad</small>}
    </label>)}
  </fieldset>
}

export function AsignacionesActividad({ actividad, alAsignar }: { actividad: string; alAsignar: () => void }) {
  const [estudiantes, establecerEstudiantes] = useState<DestinatarioActividad[] | null>(null)
  const [seleccion, establecerSeleccion] = useState<string[]>([])
  const [error, establecerError] = useState('')
  const [confirmacion, establecerConfirmacion] = useState('')
  const [enviando, establecerEnviando] = useState(false)
  const [recarga, establecerRecarga] = useState(0)
  const bloqueo = useRef(false)
  const montado = useRef(true)
  useEffect(() => { montado.current = true; return () => { montado.current = false } }, [])
  useEffect(() => {
    const controlador = new AbortController()
    destinatariosActividad(actividad, controlador.signal).then(datos => {
      if (!controlador.signal.aborted) establecerEstudiantes(datos)
    }).catch(fallo => {
      if (!controlador.signal.aborted) establecerError(mensajeDocente(fallo, 'No pudimos consultar quiénes recibieron la actividad.'))
    })
    return () => controlador.abort()
  }, [actividad, recarga])
  async function asignar() {
    if (bloqueo.current || !seleccion.length) return
    bloqueo.current = true; establecerEnviando(true); establecerError(''); establecerConfirmacion('')
    try {
      await asignarActividad(actividad, seleccion)
      if (!montado.current) return
      establecerSeleccion([])
      establecerEstudiantes(null)
      establecerConfirmacion('La actividad quedó asignada. Ya pueden encontrarla al entrar a la app.')
      establecerRecarga(valor => valor + 1)
      alAsignar()
    } catch (fallo) {
      if (montado.current) establecerError(mensajeDocente(fallo, 'No pudimos confirmar la asignación. Revisa la lista antes de intentarlo otra vez.'))
    } finally {
      bloqueo.current = false
      if (montado.current) establecerEnviando(false)
    }
  }
  return <section className="tarjeta doc-asignaciones" aria-label="Asignar esta actividad">
    <h3>Asignar a estudiantes nuevos</h3>
    <p>Quien se suma después a la sección recibe esta actividad solo cuando tú se la asignas.</p>
    {confirmacion && <MensajeDocente titulo="Asignación confirmada"><p>{confirmacion}</p></MensajeDocente>}
    {error && <MensajeDocente titulo="La asignación necesita revisión" error><p>{error}</p>
      <button type="button" className="secundario" disabled={enviando} onClick={() => {
        establecerError(''); establecerEstudiantes(null); establecerSeleccion([]); establecerRecarga(valor => valor + 1)
      }}>Actualizar la lista</button></MensajeDocente>}
    {estudiantes === null ? !error && <CargandoDocente texto="Consultando quiénes recibieron la actividad…" />
      : !estudiantes.length ? <p>No hay estudiantes vinculados a esta sección.</p> : <>
        <ListaDestinatarios estudiantes={estudiantes} seleccion={seleccion} bloqueada={enviando}
          alElegir={(id, elegida) => establecerSeleccion(actual => elegida ? [...new Set([...actual, id])] : actual.filter(valor => valor !== id))} />
        {!estudiantes.some(estudiante => !estudiante.asignado) ? <p>Todos los estudiantes actuales ya recibieron la actividad.</p>
          : <button type="button" disabled={enviando || !!error || !seleccion.length} onClick={() => void asignar()}>
            {enviando ? 'Asignando…' : 'Asignar a los elegidos (' + seleccion.length + ')'}
          </button>}
      </>}
  </section>
}
