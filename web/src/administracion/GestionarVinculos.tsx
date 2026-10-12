import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { crearVinculo, listarVinculos } from '../servicios/educacion'
import type { VinculoEstudiante } from '../servicios/educacion'

export function GestionarVinculos() {
  const [estudiante, setEstudiante] = useState('')
  const [seccion, setSeccion] = useState('')
  const [anio, setAnio] = useState(String(new Date().getFullYear()))
  const [vinculos, setVinculos] = useState<VinculoEstudiante[]>([])
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [ocupado, setOcupado] = useState(false)
  async function cargar() { try { setVinculos((await listarVinculos()).vinculos); setError('') } catch (e) { setError(e instanceof Error ? e.message : 'No se pudieron cargar los vínculos.') } }
  useEffect(() => { void cargar() }, [])
  async function guardar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setMensaje('')
    if (!Number.isInteger(Number(anio)) || Number(anio) < 1000 || Number(anio) > 9999) { setError('Ingresa un año escolar de cuatro cifras.'); return }
    setOcupado(true)
    try { await crearVinculo({ estudiante_id: estudiante.trim(), seccion_id: seccion.trim(), anio_escolar: Number(anio) }); setMensaje('Estudiante vinculado correctamente.'); setEstudiante(''); await cargar() }
    catch (e) { setError(e instanceof Error ? e.message : 'No se pudo guardar el vínculo.') }
    finally { setOcupado(false) }
  }
  return <section><h1>Vincular estudiantes a secciones</h1><p>Usa los UUID de una cuenta estudiante y una sección existente. El servicio valida las cuentas y rechaza duplicados.</p>
    <form onSubmit={guardar}><div className="campo"><label htmlFor="vinculo-estudiante">UUID del estudiante</label><input id="vinculo-estudiante" value={estudiante} onChange={e => setEstudiante(e.target.value)} required /></div>
    <div className="campo"><label htmlFor="vinculo-seccion">UUID de la sección</label><input id="vinculo-seccion" value={seccion} onChange={e => setSeccion(e.target.value)} required /></div>
    <div className="campo"><label htmlFor="vinculo-anio">Año escolar</label><input id="vinculo-anio" type="number" min="1000" max="9999" value={anio} onChange={e => setAnio(e.target.value)} required /></div>
    <button disabled={ocupado} type="submit">{ocupado ? 'Guardando…' : 'Vincular estudiante'}</button></form>
    {error && <p role="alert" className="error-resumen">{error}</p>}{mensaje && <p role="status">{mensaje}</p>}
    <h2>Vínculos existentes</h2><ul>{vinculos.map(v => <li key={v.id}>Estudiante {v.estudiante_id} · {v.seccion.nombre} · {v.anio_escolar}</li>)}</ul>
  </section>
}
