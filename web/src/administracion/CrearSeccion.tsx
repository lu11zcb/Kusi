import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Icono } from '../componentes/Icono'
import { SelectorDesplegable } from '../componentes/SelectorDesplegable'
import { crearSeccion } from '../servicios/secciones'
import type { Seccion } from '../servicios/secciones'
import { listarSecciones } from '../servicios/educacion'
import { compararSecciones, nombreGrado } from '../servicios/opcionesEducativas'
import { IconoDocente as IconoGestion } from '../docente/IconoDocente'

const grados = [1, 2].map((grado) => ({ id: String(grado), nombre: nombreGrado(grado) }))
const seccionesPorPagina = 8

export function CrearSeccion({ alCambiarBloqueo }: { alCambiarBloqueo?: (bloqueado: boolean) => void }) {
  const [grado, establecerGrado] = useState(1)
  const [nombre, establecerNombre] = useState('')
  const [anio, establecerAnio] = useState(String(new Date().getFullYear()))
  const [error, establecerError] = useState('')
  const [errorLista, establecerErrorLista] = useState('')
  const [secciones, establecerSecciones] = useState<Seccion[] | null>(null)
  const [revision, establecerRevision] = useState(0)
  const [resultado, establecerResultado] = useState<Seccion | null>(null)
  const [ocupado, establecerOcupado] = useState(false)
  const bloqueo = useRef(false)
  useEffect(() => {
    let vigente = true
    listarSecciones().then((datos) => { if (vigente) { establecerSecciones(datos.secciones); establecerErrorLista('') } }).catch((fallo: Error) => { if (vigente) establecerErrorLista(fallo.message) })
    return () => { vigente = false }
  }, [revision])
  useEffect(() => { alCambiarBloqueo?.(ocupado); return () => alCambiarBloqueo?.(false) }, [ocupado, alCambiarBloqueo])
  async function guardar(evento: FormEvent) {
    evento.preventDefault()
    if (bloqueo.current) return
    bloqueo.current = true; establecerOcupado(true); establecerError(''); establecerResultado(null)
    try {
      const datos = await crearSeccion({ grado, nombre, anio_escolar: Number(anio) })
      establecerResultado(datos.seccion); establecerNombre('')
      establecerSecciones((previas) => [...(previas ?? []).filter((s) => s.id !== datos.seccion.id), datos.seccion])
    } catch (fallo) { establecerError((fallo as Error).message) }
    finally { bloqueo.current = false; establecerOcupado(false) }
  }
  return <>
    <header className="admin-encabezado"><div><h1>Secciones</h1><p>Organiza los grupos de primero y segundo de primaria por año escolar.</p></div></header>
    {error && <p className="error-resumen" role="alert">{error}</p>}
    {resultado && <p role="status" className="admin-exito"><IconoGestion nombre="check" />Sección {resultado.nombre} creada para {resultado.anio_escolar}.</p>}
    <div className="admin-secciones"><form onSubmit={guardar}><h2>Crear una sección</h2><fieldset disabled={ocupado}>
      <div className="campo"><label id="grado-seccion-etiqueta" htmlFor="grado-seccion">Grado</label>
        <SelectorDesplegable id="grado-seccion" valor={String(grado)} opciones={grados} alCambiar={(valor) => establecerGrado(Number(valor))} disabled={ocupado} />
      </div>
      <div className="campo"><label htmlFor="nombre-seccion">Nombre de la sección</label><input id="nombre-seccion" placeholder="Por ejemplo, A o Los exploradores" value={nombre} onChange={(evento) => establecerNombre(evento.target.value)} required maxLength={80} /></div>
      <div className="campo"><label htmlFor="anio-seccion">Año escolar</label><input id="anio-seccion" type="number" value={anio} onChange={(evento) => establecerAnio(evento.target.value)} min="1000" max="9999" step="1" required /></div>
    </fieldset><button type="submit" disabled={ocupado}><IconoGestion nombre="mas" />{ocupado ? 'Creando…' : 'Crear sección'}</button></form>
    <section className="admin-secciones-listado" aria-labelledby="admin-tus-secciones">
      <h2 id="admin-tus-secciones">Tus secciones</h2>
      {errorLista && <p role="alert">{errorLista} <button type="button" className="secundario" onClick={() => establecerRevision((v) => v + 1)}>Volver a cargar</button></p>}
      {!secciones && !errorLista && <p role="status">Cargando secciones…</p>}
      {secciones?.length === 0 && <div className="admin-vacio"><IconoGestion nombre="secciones" /><h3>Prepara tu primer grupo</h3><p>Después podrás vincular estudiantes y asignar docentes.</p></div>}
      {!!secciones?.length && <ListadoSecciones secciones={secciones} />}
    </section></div>
  </>
}

function ListadoSecciones({ secciones }: { secciones: Seccion[] }) {
  const [anio, establecerAnio] = useState('')
  const [pagina, establecerPagina] = useState(1)
  const ordenadas = [...secciones].sort(compararSecciones)
  const anios = [...new Set(ordenadas.map((seccion) => String(seccion.anio_escolar)))]
  const anioVigente = anios.includes(anio) ? anio : anios[0]
  const delAnio = ordenadas.filter((seccion) => String(seccion.anio_escolar) === anioVigente)
  const paginas = Math.ceil(delAnio.length / seccionesPorPagina)
  const paginaVigente = Math.min(pagina, paginas)
  const inicio = (paginaVigente - 1) * seccionesPorPagina
  const visibles = delAnio.slice(inicio, inicio + seccionesPorPagina)
  const porGrado = grados.map((grado) => ({
    ...grado,
    secciones: visibles.filter((seccion) => String(seccion.grado) === grado.id),
  })).filter((grado) => grado.secciones.length > 0)

  return <>
    <div className="admin-secciones-controles">
      {anios.length > 1 ? <div className="campo">
        <label id="admin-secciones-anio-etiqueta" htmlFor="admin-secciones-anio">Año escolar</label>
        <SelectorDesplegable id="admin-secciones-anio" valor={anioVigente} opciones={anios.map((valor) => ({ id: valor, nombre: valor }))}
          alCambiar={(valor) => { establecerAnio(valor); establecerPagina(1) }} />
      </div> : <p className="admin-etiqueta">Año escolar {anioVigente}</p>}
      <p role="status">{paginas > 1
        ? (inicio + 1) + '–' + (inicio + visibles.length) + ' de ' + delAnio.length + ' secciones'
        : delAnio.length + (delAnio.length === 1 ? ' sección' : ' secciones')}</p>
    </div>
    {porGrado.map(({ id, nombre, secciones }) => <section className="admin-secciones-grado" key={id}>
      <h3>{nombre}</h3>
      <ul className="admin-grupos" role="list">{secciones.map((grupo) => <li key={grupo.id}>
        <span className={'icono-grande ' + (id === '1' ? 'c-verde' : 'c-morado')}><Icono nombre="aula" /></span>
        <strong>{grupo.nombre}</strong>
      </li>)}</ul>
    </section>)}
    {paginas > 1 && <div className="acciones admin-secciones-paginas">
      <button type="button" className="secundario" disabled={paginaVigente <= 1} onClick={() => establecerPagina(paginaVigente - 1)}>Anterior</button>
      <span>Página {paginaVigente} de {paginas}</span>
      <button type="button" className="secundario" disabled={paginaVigente >= paginas} onClick={() => establecerPagina(paginaVigente + 1)}>Siguiente</button>
    </div>}
  </>
}
