import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { crearSeccion } from '../servicios/secciones'
import type { Seccion } from '../servicios/secciones'

export function CrearSeccion() {
  const [nombre, establecerNombre] = useState('')
  const [anio, establecerAnio] = useState(String(new Date().getFullYear()))
  const [error, establecerError] = useState('')
  const [resultado, establecerResultado] = useState<Seccion | null>(null)
  const [ocupado, establecerOcupado] = useState(false)
  const bloqueo = useRef(false)
  async function guardar(evento: FormEvent) {
    evento.preventDefault()
    if (bloqueo.current) return
    bloqueo.current = true; establecerOcupado(true); establecerError(''); establecerResultado(null)
    try {
      const datos = await crearSeccion({ grado: 1, nombre, anio_escolar: Number(anio) })
      establecerResultado(datos.seccion); establecerNombre('')
    } catch (fallo) { establecerError((fallo as Error).message) }
    finally { bloqueo.current = false; establecerOcupado(false) }
  }
  return <>
    <h1>Crear sección</h1><p>Organiza un grupo de primero de primaria para un año escolar.</p>
    {error && <p className="error-resumen" role="alert">{error}</p>}
    {resultado && <p role="status">Sección {resultado.nombre} creada para {resultado.anio_escolar}.</p>}
    <form onSubmit={guardar}><fieldset disabled={ocupado}>
      <div className="campo"><label htmlFor="grado-seccion">Grado</label><select id="grado-seccion" value="1" disabled><option value="1">Primero de primaria</option></select></div>
      <div className="campo"><label htmlFor="nombre-seccion">Nombre de la sección</label><input id="nombre-seccion" value={nombre} onChange={(evento) => establecerNombre(evento.target.value)} required maxLength={80} /></div>
      <div className="campo"><label htmlFor="anio-seccion">Año escolar</label><input id="anio-seccion" type="number" value={anio} onChange={(evento) => establecerAnio(evento.target.value)} min="1000" max="9999" step="1" required /></div>
    </fieldset><button type="submit" disabled={ocupado}>{ocupado ? 'Creando…' : 'Crear sección'}</button></form>
  </>
}
