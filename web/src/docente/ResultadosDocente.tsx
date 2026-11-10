import { useEffect, useRef, useState } from 'react'
import { actividadesResultados, estudiantesResultados, respuestasResultados } from '../servicios/resultados'
import type { ActividadResultado, EstadoResultado, EstudianteResultado, PartidaResultado } from '../servicios/resultados'
import { CabeceraDocente, CargandoDocente, MensajeDocente } from './ElementosDocente'
import { IconoDocente } from './IconoDocente'
import { normalizarBusqueda } from './utilidadesDocente'
import { mensajeDocente } from './trabajosDocente'

const estados: Record<EstadoResultado, string> = { sin_iniciar: 'Sin iniciar', en_curso: 'En curso', completada: 'Completada' }
const tipos = { primera: 'Primera respuesta', correccion: 'Corrección', siguiente: 'Respuesta siguiente' }
function Estado({ valor }: { valor: EstadoResultado }) { return <span className={'doc-estado doc-resultado-' + valor}>{estados[valor]}</span> }

export function PartidasEstudiante({ partidas }: { partidas: PartidaResultado[] }) {
  const fecha = new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'America/Lima' })
  return <>{partidas.map((partida, indice) => <article className="tarjeta doc-partida" key={indice}>
    <div className="doc-resultado-cabecera"><h3>Partida {indice + 1}</h3><Estado valor={partida.estado} /></div>
    <p>Juego recibido: envío {partida.envio} · {fecha.format(new Date(partida.enviado_en))}</p>
    <p className="doc-nota">Ayudas utilizadas: {partida.ayudas_usadas}. Las ayudas se muestran aparte de los puntos.</p>
    {!partida.retos.length && <p>Todavía no hay respuestas registradas en esta partida.</p>}
    {partida.retos.map((reto, numeroReto) => <section key={reto.reto}><h4>Reto {/^[1-9]\d{0,4}$/.test(reto.reto) ? reto.reto : numeroReto + 1}</h4>
      <table className="doc-tabla"><caption className="solo-lectores">Respuestas de este reto</caption><thead><tr><th scope="col">Intento</th><th scope="col">Respuesta</th><th scope="col">Resultado</th><th scope="col">Ayudas</th></tr></thead><tbody>
        {reto.respuestas.map((respuesta, numero) => <tr key={numero}><th scope="row">{tipos[respuesta.tipo]}</th><td data-etiqueta="Respuesta">{respuesta.respuesta}</td><td data-etiqueta="Resultado">{respuesta.correcto === null ? 'Sin comprobar' : respuesta.correcto ? 'Correcta' : 'Por corregir'}</td><td data-etiqueta="Ayudas">{respuesta.ayudas.length ? respuesta.ayudas.map(a => 'Ayuda ' + a).join(', ') : 'Sin ayuda'}</td></tr>)}
      </tbody></table></section>)}
  </article>)}</>
}

function RespuestasEstudiante({ actividad, estudiante }: { actividad: string; estudiante: EstudianteResultado }) {
  const encabezado = useRef<HTMLHeadingElement>(null)
  const [partidas, establecerPartidas] = useState<PartidaResultado[] | null>(null)
  const [error, establecerError] = useState('')
  const [recarga, establecerRecarga] = useState(0)
  useEffect(() => { encabezado.current?.focus() }, [])
  useEffect(() => {
    const controlador = new AbortController()
    respuestasResultados(actividad, estudiante.id, controlador.signal).then(datos => { if (!controlador.signal.aborted) establecerPartidas(datos) })
      .catch(fallo => { if (!controlador.signal.aborted) establecerError(mensajeDocente(fallo, 'No pudimos abrir las respuestas. Intenta otra vez.')) })
    return () => controlador.abort()
  }, [actividad, estudiante.id, recarga])
  return <section className="doc-respuestas" aria-label={'Respuestas de ' + estudiante.nombre}>
    <h2 ref={encabezado} tabIndex={-1}>{estudiante.nombre}</h2><p>Respuestas y ayudas, en el orden en que se jugaron.</p>
    {error ? <MensajeDocente titulo="No pudimos cargar las respuestas" error><p>{error}</p><button type="button" className="secundario" onClick={() => { establecerError(''); establecerRecarga(n => n + 1) }}>Volver a intentar</button></MensajeDocente>
      : partidas === null ? <CargandoDocente texto="Buscando las respuestas…" /> : !partidas.length ? <MensajeDocente titulo="Aún no hay respuestas"><p>Las respuestas aparecerán cuando el estudiante juegue esta actividad.</p></MensajeDocente>
        : <PartidasEstudiante partidas={partidas} />}
  </section>
}

function EstudiantesActividad({ actividad }: { actividad: ActividadResultado }) {
  const [estudiantes, establecerEstudiantes] = useState<EstudianteResultado[] | null>(null)
  const [elegido, establecerElegido] = useState<EstudianteResultado | null>(null)
  const [buscar, establecerBuscar] = useState('')
  const [filtro, establecerFiltro] = useState('')
  const [error, establecerError] = useState('')
  const [recarga, establecerRecarga] = useState(0)
  useEffect(() => {
    const controlador = new AbortController()
    estudiantesResultados(actividad.id, controlador.signal).then(datos => { if (!controlador.signal.aborted) establecerEstudiantes(datos) })
      .catch(fallo => { if (!controlador.signal.aborted) establecerError(mensajeDocente(fallo, 'No pudimos cargar esta actividad. Intenta otra vez.')) })
    return () => controlador.abort()
  }, [actividad.id, recarga])
  const visibles = (estudiantes ?? []).filter(e => (!filtro || e.estado === filtro) && normalizarBusqueda(e.nombre).includes(normalizarBusqueda(buscar)))
  return <>
    <div className="doc-resultado-cabecera"><div><h2>{actividad.titulo}</h2><p>Sección {actividad.seccion}</p></div><button type="button" className="secundario" onClick={() => { establecerError(''); establecerEstudiantes(null); establecerElegido(null); establecerRecarga(n => n + 1) }}>Actualizar</button></div>
    {error ? <MensajeDocente titulo="No pudimos cargar los resultados" error><p>{error}</p></MensajeDocente> : estudiantes === null ? <CargandoDocente texto="Buscando el avance de tu clase…" /> : <>
      <div className="doc-filtros-estado" role="group" aria-label="Filtrar por avance"><button type="button" className="secundario" aria-pressed={!filtro} onClick={() => establecerFiltro('')}>Todos <span>{estudiantes.length}</span></button>{Object.entries(estados).map(([clave, nombre]) => <button type="button" className="secundario" aria-pressed={filtro === clave} key={clave} onClick={() => establecerFiltro(clave)}>{nombre} <span>{estudiantes.filter(e => e.estado === clave).length}</span></button>)}</div>
      <div className="doc-herramientas"><div className="doc-busqueda"><label htmlFor="resultado-buscar">Buscar estudiante</label><div><IconoDocente nombre="buscar" /><input type="search" id="resultado-buscar" value={buscar} onChange={e => establecerBuscar(e.target.value)} placeholder="Nombre del estudiante" /></div></div></div>
      {!visibles.length ? <MensajeDocente titulo={estudiantes.length ? 'No hay estudiantes con estos filtros' : 'Esta actividad aún no tiene estudiantes'}><p>{estudiantes.length ? 'Prueba con otro nombre o estado.' : 'Aquí aparecerán los estudiantes que recibieron la actividad.'}</p></MensajeDocente>
        : <table className="doc-tabla"><caption className="solo-lectores">Avance de los estudiantes en {actividad.titulo}</caption><thead><tr><th scope="col">Estudiante</th><th scope="col">Estado</th><th scope="col">Ayudas</th><th scope="col">Respuestas</th></tr></thead><tbody>{visibles.map(estudiante => <tr key={estudiante.id}><th scope="row">{estudiante.nombre}</th><td data-etiqueta="Estado"><Estado valor={estudiante.estado} /></td><td data-etiqueta="Ayudas">{estudiante.ayudas_usadas}</td><td data-etiqueta="Respuestas"><button type="button" className="secundario" aria-pressed={elegido?.id === estudiante.id} aria-label={'Ver respuestas de ' + estudiante.nombre} onClick={() => establecerElegido(estudiante)}>Ver respuestas</button></td></tr>)}</tbody></table>}
    </>}
    {elegido && <RespuestasEstudiante key={elegido.id + '/' + recarga} actividad={actividad.id} estudiante={elegido} />}
  </>
}

export function ResultadosDocente({ activo }: { activo: boolean }) {
  const [actividades, establecerActividades] = useState<ActividadResultado[] | null>(null)
  const [elegida, establecerElegida] = useState<ActividadResultado | null>(null)
  const [error, establecerError] = useState('')
  const [recarga, establecerRecarga] = useState(0)
  useEffect(() => {
    if (!activo) return
    const controlador = new AbortController()
    actividadesResultados(controlador.signal).then(datos => { if (!controlador.signal.aborted) { establecerActividades(datos); establecerError('') } })
      .catch(fallo => { if (!controlador.signal.aborted) { establecerActividades(null); establecerElegida(null); establecerError(mensajeDocente(fallo, 'No pudimos abrir los resultados. Intenta otra vez.')) } })
    return () => controlador.abort()
  }, [activo, recarga])
  return <section className="doc-pagina" aria-label="Resultados de mi clase">
    <CabeceraDocente icono="check" color="c-verde" titulo="Resultados" descripcion="Consulta quiénes completaron cada actividad y cómo respondieron." />
    {error ? <MensajeDocente titulo="No pudimos abrir los resultados" error><p>{error}</p><button type="button" className="secundario" onClick={() => establecerRecarga(n => n + 1)}>Volver a intentar</button></MensajeDocente>
      : actividades === null ? <CargandoDocente texto="Buscando las actividades de tus secciones…" /> : !actividades.length ? <MensajeDocente titulo="Aún no hay actividades enviadas"><p>Cuando envíes un juego a tu clase, podrás consultar aquí sus resultados.</p></MensajeDocente>
        : <><div className="doc-herramientas"><div className="doc-filtro"><label htmlFor="resultado-actividad">Actividad</label><select id="resultado-actividad" value={elegida?.id ?? ''} onChange={e => establecerElegida(actividades.find(a => a.id === e.target.value) ?? null)}><option value="">Elige una actividad</option>{actividades.map(a => <option key={a.id} value={a.id}>{a.titulo} · {a.seccion}</option>)}</select></div></div>{elegida && activo && <EstudiantesActividad key={elegida.id + '/' + recarga} actividad={elegida} />}</>}
  </section>
}
