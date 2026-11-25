import { useEffect, useRef, useState } from 'react'
import type { ReactNode, Ref } from 'react'
import { iniciales } from '../componentes/apariencia'
import { actividadesResultados, estudiantesResultados, respuestasResultados, retirarActividad } from '../servicios/resultados'
import type { ActividadResultado, EstadoResultado, EstudianteResultado, PartidaResultado } from '../servicios/resultados'
import { CabeceraDocente, CargandoDocente, IconoCurso, MensajeDocente } from './ElementosDocente'
import { IconoDocente } from './IconoDocente'
import { normalizarBusqueda } from './utilidadesDocente'
import { mensajeDocente } from './trabajosDocente'
import { AsignacionesActividad } from './AsignacionesActividad'
import { EnVivoActividad } from './EnVivoActividad'

const estados: Record<EstadoResultado, string> = { sin_iniciar: 'Sin iniciar', en_curso: 'En curso', completada: 'Completada' }
const ordenResumen = ['completada', 'en_curso', 'sin_iniciar'] as const
const iconosResumen = {
  completada: { icono: 'check', color: 'c-verde' },
  en_curso: { icono: 'reloj', color: 'c-dorado' },
  sin_iniciar: { icono: 'estudiante', color: 'c-morado' },
} as const
const tipos = { primera: 'Primera respuesta', correccion: 'Corrección', siguiente: 'Respuesta siguiente' }
function Estado({ valor }: { valor: EstadoResultado }) {
  return <span className={'doc-estado doc-resultado-' + valor}><IconoDocente nombre={iconosResumen[valor].icono} />{estados[valor]}</span>
}

function CabeceraActividad({ actividad, curso, encabezado, children }: { actividad: ActividadResultado; curso: string; encabezado?: Ref<HTMLHeadingElement>; children?: ReactNode }) {
  return <header className="doc-cabecera doc-resultado-cabecera doc-actividad-cabecera">
    <div className="doc-cabecera-titulo">
      <IconoCurso nombre={curso} />
      <div><h2 ref={encabezado} tabIndex={encabezado ? -1 : undefined}>{actividad.titulo}</h2><p>Sección {actividad.seccion}</p></div>
    </div>
    {children}
  </header>
}

export function PartidasEstudiante({ partidas }: { partidas: PartidaResultado[] }) {
  const fecha = new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'America/Lima' })
  return <>{partidas.map((partida, indice) => <article className="tarjeta doc-partida" key={indice}>
    <div className="doc-resultado-cabecera"><h3>Partida {indice + 1}</h3><Estado valor={partida.estado} /></div>
    <p className="doc-partida-envio">Juego recibido: envío {partida.envio} · <time dateTime={partida.enviado_en}>{fecha.format(new Date(partida.enviado_en))}</time></p>
    <p className="doc-nota doc-partida-ayudas"><IconoDocente nombre="info" /><span>Ayudas utilizadas: <strong>{partida.ayudas_usadas}</strong>. Las ayudas se muestran aparte de los puntos.</span></p>
    {!!partida.incidencias?.length && <section className="doc-partida-incidencias" aria-label="Incidencias técnicas"><h4>Incidencias técnicas</h4><p>Estos avisos no cuentan como respuestas incorrectas ni descuentan puntos.</p><ul>{partida.incidencias.map(aviso => <li key={aviso.orden}>{aviso.detalle}{aviso.nivel > 0 ? ' · Nivel ' + aviso.nivel : ''} · {fecha.format(new Date(aviso.momento))}</li>)}</ul></section>}
    {!partida.retos.length && <p>Todavía no hay respuestas registradas en esta partida.</p>}
    {partida.retos.map((reto, numeroReto) => <section className="doc-partida-reto" key={reto.reto}>
      <h4>Reto {/^[1-9]\d{0,4}$/.test(reto.reto) ? reto.reto : numeroReto + 1}</h4>
      <table className="doc-tabla doc-tabla-seguimiento" role="table">
        <caption className="solo-lectores">Respuestas de este reto</caption>
        <thead role="rowgroup"><tr role="row"><th scope="col" role="columnheader">Intento</th><th scope="col" role="columnheader">Respuesta</th><th scope="col" role="columnheader">Resultado</th><th scope="col" role="columnheader">Ayudas</th></tr></thead>
        <tbody role="rowgroup">{reto.respuestas.map((respuesta, numero) => <tr role="row" key={numero}>
          <th scope="row" role="rowheader">{tipos[respuesta.tipo]}</th>
          <td role="cell"><span className="doc-tabla-etiqueta" aria-hidden="true">Respuesta</span><span>{respuesta.respuesta}</span></td>
          <td role="cell"><span className="doc-tabla-etiqueta" aria-hidden="true">Resultado</span><span className="doc-estado" data-respuesta={respuesta.correcto ?? 'sin-comprobar'}>{respuesta.correcto === null ? 'Sin comprobar' : respuesta.correcto ? 'Correcta' : 'Por corregir'}</span></td>
          <td role="cell"><span className="doc-tabla-etiqueta" aria-hidden="true">Ayudas</span><span>{respuesta.ayudas.length ? respuesta.ayudas.map(a => 'Ayuda ' + a).join(', ') : 'Sin ayuda'}</span></td>
        </tr>)}</tbody>
      </table>
    </section>)}
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
  return <section className="doc-listado doc-respuestas" aria-label={'Respuestas de ' + estudiante.nombre}>
    <header className="doc-cabecera doc-respuestas-cabecera">
      <div className="doc-cabecera-titulo">
        <span className="doc-avatar" aria-hidden="true">{iniciales(estudiante.nombre)}</span>
        <div><h2 ref={encabezado} tabIndex={-1}>{estudiante.nombre}</h2><p>Respuestas y ayudas, en el orden en que se jugaron.</p></div>
      </div>
    </header>
    {error ? <MensajeDocente titulo="No pudimos cargar las respuestas" error><p>{error}</p><button type="button" className="secundario" onClick={() => { establecerError(''); establecerRecarga(n => n + 1) }}>Volver a intentar</button></MensajeDocente>
      : partidas === null ? <CargandoDocente texto="Buscando las respuestas…" /> : !partidas.length ? <MensajeDocente titulo="Aún no hay respuestas"><p>Las respuestas aparecerán cuando el estudiante juegue esta actividad.</p></MensajeDocente>
        : <PartidasEstudiante partidas={partidas} />}
  </section>
}

function EstudiantesActividad({ actividad, curso, encabezado }: { actividad: ActividadResultado; curso: string; encabezado: Ref<HTMLHeadingElement> }) {
  const [retirada, establecerRetirada] = useState(!!actividad.retirada)
  const [retirando, establecerRetirando] = useState(false)
  const [asignando, establecerAsignando] = useState(false)
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
  async function retirar() {
    if (retirando || retirada || !window.confirm('¿Retirar esta actividad? Ya no se podrá abrir ni retomar. Los resultados se conservan.')) return
    establecerRetirando(true); establecerError('')
    try { await retirarActividad(actividad.id); establecerRetirada(true); establecerAsignando(false) }
    catch (fallo) { establecerError(mensajeDocente(fallo, 'No pudimos retirar la actividad.')) }
    finally { establecerRetirando(false) }
  }
  const visibles = (estudiantes ?? []).filter(e => (!filtro || e.estado === filtro) && normalizarBusqueda(e.nombre).includes(normalizarBusqueda(buscar)))
  return <>
    <CabeceraActividad actividad={actividad} curso={curso} encabezado={encabezado}>
      <div className="doc-resultado-acciones">
        <button type="button" className="secundario" disabled={retirada || retirando} aria-expanded={asignando} onClick={() => establecerAsignando(valor => !valor)}>Asignar a estudiantes nuevos</button>
        <button type="button" className="secundario" onClick={() => { establecerError(''); establecerEstudiantes(null); establecerElegido(null); establecerRecarga(n => n + 1) }}>Actualizar</button>
        <button type="button" className="secundario doc-eliminar" disabled={retirada || retirando} onClick={() => void retirar()}>{retirada ? 'Actividad retirada' : retirando ? 'Retirando…' : 'Retirar actividad'}</button>
      </div>
    </CabeceraActividad>
    {retirada && <p className="doc-resultado-retirada" role="status">Actividad retirada. Ya no se puede abrir ni retomar. Los resultados se conservan.</p>}
    {asignando && <AsignacionesActividad actividad={actividad.id} alAsignar={() => { establecerElegido(null); establecerRecarga(n => n + 1) }} />}
    {error ? <MensajeDocente titulo="No pudimos cargar los resultados" error><p>{error}</p></MensajeDocente> : estudiantes === null ? <CargandoDocente texto="Buscando el avance de tu clase…" /> : <>
      <section className="doc-resultado-resumen" aria-labelledby="resultado-resumen-titulo">
        <header className="doc-encabezado-seccion"><h3 id="resultado-resumen-titulo">Avance de la clase</h3></header>
        <div className="estadisticas doc-resultado-conteos" role="group" aria-label="Filtrar por avance">
          <button type="button" className="estadistica" aria-pressed={!filtro} onClick={() => establecerFiltro('')}>
            <span className="icono-grande c-vino"><IconoDocente nombre="personas" /></span>
            <span><strong>{estudiantes.length}</strong><small>Todos</small></span>
          </button>
          {ordenResumen.map(clave => <button type="button" className="estadistica" data-estado={clave} aria-pressed={filtro === clave} key={clave} onClick={() => establecerFiltro(clave)}>
            <span className={'icono-grande ' + iconosResumen[clave].color}><IconoDocente nombre={iconosResumen[clave].icono} /></span>
            <span><strong>{estudiantes.filter(e => e.estado === clave).length}</strong><small>{estados[clave]}</small></span>
          </button>)}
        </div>
      </section>
      <section className="doc-listado doc-seguimiento-listado" aria-labelledby="resultado-lista-titulo">
        <h3 id="resultado-lista-titulo">Estudiantes</h3>
        <div className="doc-herramientas"><div className="doc-busqueda"><label htmlFor="resultado-buscar">Buscar estudiante</label><div><IconoDocente nombre="buscar" /><input type="search" id="resultado-buscar" value={buscar} onChange={e => establecerBuscar(e.target.value)} placeholder="Nombre del estudiante" /></div></div></div>
        {!visibles.length ? <MensajeDocente titulo={estudiantes.length ? 'No hay estudiantes con estos filtros' : 'Esta actividad aún no tiene estudiantes'}><p>{estudiantes.length ? 'Prueba con otro nombre o estado.' : 'Aquí aparecerán los estudiantes que recibieron la actividad.'}</p></MensajeDocente>
          : <div className="doc-tabla-marco"><table className="doc-tabla doc-tabla-seguimiento" role="table">
            <caption className="solo-lectores">Avance de los estudiantes en {actividad.titulo}</caption>
            <thead role="rowgroup"><tr role="row"><th scope="col" role="columnheader">Estudiante</th><th scope="col" role="columnheader">Estado</th><th scope="col" role="columnheader">Ayudas</th><th scope="col" role="columnheader">Respuestas</th></tr></thead>
            <tbody role="rowgroup">{visibles.map(estudiante => <tr role="row" key={estudiante.id}>
              <th scope="row" role="rowheader"><span className="doc-persona"><span className="doc-avatar" aria-hidden="true">{iniciales(estudiante.nombre)}</span><strong>{estudiante.nombre}</strong></span></th>
              <td role="cell"><span className="doc-tabla-etiqueta" aria-hidden="true">Estado</span><Estado valor={estudiante.estado} /></td>
              <td role="cell"><span className="doc-tabla-etiqueta" aria-hidden="true">Ayudas</span><span>{estudiante.ayudas_usadas}</span></td>
              <td role="cell" className="doc-tabla-accion"><button type="button" className="secundario" aria-pressed={elegido?.id === estudiante.id} aria-label={'Ver respuestas de ' + estudiante.nombre} onClick={() => establecerElegido(estudiante)}>Ver respuestas<IconoDocente nombre="flecha" /></button></td>
            </tr>)}</tbody>
          </table></div>}
      </section>
    </>}
    {elegido && <RespuestasEstudiante key={elegido.id + '/' + recarga} actividad={actividad.id} estudiante={elegido} />}
  </>
}

// La lista de juegos enviados se ve apenas se entra a Resultados (antes había que elegirlo
// en una lista desplegable). Cada tarjeta abre los resultados de ese juego.
function ListaActividades({ actividades, abrir, nombreCurso }: { actividades: ActividadResultado[]; abrir: (actividad: ActividadResultado) => void; nombreCurso: (id: string) => string }) {
  return <section aria-labelledby="doc-actividades-titulo">
    <header className="doc-encabezado-seccion doc-actividades-cabecera">
      <h2 id="doc-actividades-titulo" className="doc-actividades-titulo">Juegos enviados a tu clase</h2>
      <p className="doc-resultados" role="status">{actividades.length + (actividades.length === 1 ? ' juego' : ' juegos')}</p>
    </header>
    <ul className="doc-propuestas doc-actividades" role="list">{actividades.map((actividad) => <li className="doc-actividad" key={actividad.id}>
      <div className="doc-juego-ficha">
        <IconoCurso nombre={actividad.curso_id ? nombreCurso(actividad.curso_id) : 'Tu clase'} />
        <div className="doc-propuesta-datos"><h3>{actividad.titulo}</h3><p>{(actividad.curso_id ? nombreCurso(actividad.curso_id) + ' · ' : '') + 'Sección ' + actividad.seccion}</p></div>
        {actividad.retirada && <span className="doc-estado doc-actividad-retirada">Retirada</span>}
      </div>
      <div className="doc-juego-acciones">
        <button type="button" className="secundario doc-actividad-abrir" data-actividad={actividad.id}
          aria-label={'Ver resultados de ' + actividad.titulo + ', sección ' + actividad.seccion + (actividad.retirada ? ', actividad retirada' : '')}
          onClick={() => abrir(actividad)}>Ver resultados<IconoDocente nombre="flecha" /></button>
      </div>
    </li>)}</ul>
  </section>
}

export function ResultadosDocente({ activo, nombreCurso = () => 'Tu clase' }: { activo: boolean; nombreCurso?: (id: string) => string }) {
  const [actividades, establecerActividades] = useState<ActividadResultado[] | null>(null)
  const [elegida, establecerElegida] = useState<ActividadResultado | null>(null)
  const [enVivo, establecerEnVivo] = useState(false)
  const [error, establecerError] = useState('')
  const [recarga, establecerRecarga] = useState(0)
  const curso = elegida?.curso_id ? nombreCurso(elegida.curso_id) : 'Tu clase'
  // Al volver a la lista, el foco regresa al botón del juego que se abrió.
  const volverA = useRef<string | null>(null)
  const lista = useRef<HTMLDivElement>(null)
  const encabezadoActividad = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    if (elegida) encabezadoActividad.current?.focus()
    else if (volverA.current) lista.current?.querySelector<HTMLButtonElement>('[data-actividad="' + CSS.escape(volverA.current) + '"]')?.focus()
  }, [elegida])
  useEffect(() => {
    if (!activo) return
    const controlador = new AbortController()
    actividadesResultados(controlador.signal).then(datos => { if (!controlador.signal.aborted) { establecerActividades(datos); establecerError('') } })
      .catch(fallo => { if (!controlador.signal.aborted) { establecerActividades(null); establecerElegida(null); establecerError(mensajeDocente(fallo, 'No pudimos abrir los resultados. Intenta otra vez.')) } })
    return () => controlador.abort()
  }, [activo, recarga])
  return <section className="doc-pagina doc-resultados-pagina" aria-label="Resultados de mi clase">
    <CabeceraDocente icono="check" color="c-verde" titulo="Resultados" descripcion="Sigue el avance de tu clase y consulta sus respuestas." />
    {error ? <MensajeDocente titulo="No pudimos abrir los resultados" error><p>{error}</p><button type="button" className="secundario" onClick={() => establecerRecarga(n => n + 1)}>Volver a intentar</button></MensajeDocente>
      : actividades === null ? <CargandoDocente texto="Buscando las actividades de tus secciones…" /> : !actividades.length ? <MensajeDocente titulo="Aún no hay actividades enviadas"><p>Cuando envíes un juego a tu clase, podrás consultar aquí sus resultados.</p></MensajeDocente>
        : !elegida ? <div ref={lista}><ListaActividades actividades={actividades} nombreCurso={nombreCurso} abrir={(actividad) => { volverA.current = actividad.id; establecerEnVivo(false); establecerElegida(actividad) }} /></div>
        : <>
          <div className="doc-herramientas doc-resultado-selector">
            <button type="button" className="secundario doc-volver" onClick={() => establecerElegida(null)}><IconoDocente nombre="atras" />Ver todos los juegos</button>
            {activo && <div className="doc-filtros-estado doc-resultado-vistas" role="group" aria-label="Vista de la actividad">
              <button type="button" className="secundario" aria-pressed={!enVivo} onClick={() => establecerEnVivo(false)}><IconoDocente nombre="check" />Resultados</button>
              <button type="button" className="secundario" aria-pressed={enVivo} onClick={() => establecerEnVivo(true)}><IconoDocente nombre="reloj" />En vivo</button>
            </div>}
          </div>
          {activo && (enVivo ? <>
            <CabeceraActividad actividad={elegida} curso={curso}>
              {elegida.retirada && <span className="doc-estado doc-actividad-retirada">Retirada</span>}
            </CabeceraActividad>
            <EnVivoActividad key={elegida.id} actividad={elegida} />
          </> : <EstudiantesActividad key={elegida.id + '/' + recarga} actividad={elegida} curso={curso} encabezado={encabezadoActividad} />)}
        </>}
  </section>
}
