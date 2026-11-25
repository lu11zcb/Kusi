import { Fragment, useEffect, useRef, useState } from 'react'
import { iniciales } from '../componentes/apariencia'
import { Icono } from '../componentes/Icono'
import { ordenarRanking } from '../componentes/puestos'
import { fichaEstudianteResultados, respuestasResultados } from '../servicios/resultados'
import type { EstadoResultado, FichaEstudianteResultado, JuegoDelEstudiante, PartidaResultado, SeccionRanking } from '../servicios/resultados'
import { CargandoDocente, MensajeDocente, IconoCurso } from './ElementosDocente'
import { IconoDocente } from './IconoDocente'
import { PartidasEstudiante } from './ResultadosDocente'
import { mensajeDocente } from './trabajosDocente'
import './ranking.css'

const estados: Record<EstadoResultado, string> = { sin_iniciar: 'Sin iniciar', en_curso: 'En curso', completada: 'Completado' }
const totales = [
  { clave: 'juegos', etiqueta: 'Juegos recibidos', icono: 'carpeta', color: 'c-morado' },
  { clave: 'completados', etiqueta: 'Terminados', icono: 'check', color: 'c-verde' },
  { clave: 'puntos', etiqueta: 'Puntos', icono: 'chispa', color: 'c-dorado' },
  { clave: 'errores', etiqueta: 'Errores', icono: 'cerrar', color: 'c-rojo' },
  { clave: 'ayudas_usadas', etiqueta: 'Ayudas pedidas', icono: 'info', color: 'c-cielo' },
] as const
const fecha = new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'America/Lima' })

// «Quién va mejor»: en cada sección, solo el estudiante que va primero (más puntos; con los
// mismos puntos, quien llegó antes). El resto se ve en el ranking de la sección.
export function QuienVaMejor({ secciones, nombres, verRanking }: { secciones: SeccionRanking[]; nombres: Map<string, string>; verRanking: (seccion: SeccionRanking) => void }) {
  if (!secciones.length) return null
  return <section className="doc-ranking" aria-labelledby="doc-ranking-titulo">
    <header className="doc-encabezado-seccion">
      <div>
        <h2 id="doc-ranking-titulo">Quién va mejor</h2>
        <p>Puntos que ganaron en tus juegos. Pedir ayuda no resta puntos.</p>
      </div>
    </header>
    <div className="doc-ranking-secciones">{secciones.map((seccion) => {
      const primero = ordenarRanking(seccion.estudiantes.filter((e) => e.puntos > 0), (e) => e.puntos, (e) => e.puntos_hasta)[0]?.item
      return <article className="doc-curso doc-ranking-seccion" key={seccion.id} aria-label={'Sección ' + seccion.nombre}>
        <header className="doc-cabecera-titulo">
          <span className="icono-grande c-verde"><IconoDocente nombre="secciones" /></span>
          <h3>{seccion.nombre} · {seccion.anio_escolar}</h3>
        </header>
        {!primero ? <p>Aún nadie ganó puntos en esta sección.</p> : <div className="doc-ranking-primero" data-puesto={1}>
          <span className="doc-estado"><span className="solo-lectores">Puesto </span>1</span>
          <strong>{nombres.get(primero.id) ?? 'Estudiante'}</strong>
          <span><strong className="doc-puntos">{primero.puntos}</strong> {primero.puntos === 1 ? 'punto' : 'puntos'}</span>
        </div>}
        {seccion.estudiantes.length > 0 && <button type="button" className="secundario doc-ranking-ver" data-ranking={seccion.id} onClick={() => verRanking(seccion)}>
          Ver el ranking de la sección<IconoDocente nombre="flecha" />
        </button>}
      </article>
    })}</div>
  </section>
}

// El ranking completo de una sección: todos sus estudiantes en orden, con sus puntos y los
// juegos que terminaron, y el acceso al avance de cada uno.
export function RankingSeccion({ seccion, nombres, volver, verAvance }: { seccion: SeccionRanking; nombres: Map<string, string>; volver: () => void; verAvance: (estudiante: string) => void }) {
  const titulo = useRef<HTMLHeadingElement>(null)
  useEffect(() => { titulo.current?.focus() }, [])
  const puestos = ordenarRanking(seccion.estudiantes, (e) => e.puntos, (e) => e.puntos_hasta)
  return <section className="doc-ranking-completo" aria-labelledby="doc-ranking-completo-titulo">
    <button type="button" className="secundario doc-volver" onClick={volver}><IconoDocente nombre="atras" />Volver a mis estudiantes</button>
    <header className="doc-cabecera">
      <div className="doc-cabecera-titulo">
        <span className="icono-grande c-verde"><IconoDocente nombre="secciones" /></span>
        <div>
          <h1 id="doc-ranking-completo-titulo" ref={titulo} tabIndex={-1}>Ranking de {seccion.nombre} · {seccion.anio_escolar}</h1>
          <p>Ordenado por los puntos que ganaron en tus juegos. Con los mismos puntos va primero quien llegó antes.</p>
        </div>
      </div>
    </header>
    <div className="doc-listado doc-seguimiento-listado">
      <div className="doc-tabla-marco"><table className="doc-tabla doc-tabla-seguimiento" role="table">
        <caption className="solo-lectores">Puestos de la sección {seccion.nombre}</caption>
        <thead role="rowgroup"><tr role="row"><th scope="col" role="columnheader">Estudiante</th><th scope="col" role="columnheader">Puesto</th><th scope="col" role="columnheader">Puntos</th><th scope="col" role="columnheader">Juegos terminados</th><th scope="col" role="columnheader"><span className="solo-lectores">Avance</span></th></tr></thead>
        <tbody role="rowgroup">{puestos.map(({ item: e, puesto }) => {
          const nombre = nombres.get(e.id) ?? 'Estudiante'
          return <tr role="row" key={e.id} data-puesto={puesto}>
            <th scope="row" role="rowheader"><span className="doc-persona"><span className="doc-avatar" aria-hidden="true">{iniciales(nombre)}</span><strong>{nombre}</strong></span></th>
            <td role="cell"><span className="doc-tabla-etiqueta" aria-hidden="true">Puesto</span><span className={puesto === 1 ? 'doc-estado' : 'doc-seccion-etiqueta'}>{puesto}</span></td>
            <td role="cell"><span className="doc-tabla-etiqueta" aria-hidden="true">Puntos</span><span><strong className="doc-puntos">{e.puntos}</strong> {e.puntos === 1 ? 'punto' : 'puntos'}</span></td>
            <td role="cell"><span className="doc-tabla-etiqueta" aria-hidden="true">Juegos terminados</span><span>{e.completados + (e.completados === 1 ? ' juego terminado' : ' juegos terminados')}</span></td>
            <td role="cell" className="doc-tabla-accion"><button type="button" className="secundario" data-avance-ranking={e.id} aria-label={'Ver el avance de ' + (nombres.get(e.id) ?? 'este estudiante')} onClick={() => verAvance(e.id)}>Ver avance<IconoDocente nombre="flecha" /></button></td>
          </tr>
        })}</tbody>
      </table></div>
    </div>
  </section>
}

// La ficha de un estudiante para su docente: cada juego que recibió, si lo jugó, sus
// errores, ayudas y puntos; y, al pedirlo, sus respuestas de cada juego.
export function AvanceEstudiante({ estudiante, nombre, seccion, volver, nombreCurso = () => 'Tu clase' }: { estudiante: string; nombre: string; seccion: string; volver: () => void; nombreCurso?: (id: string) => string }) {
  const [ficha, establecerFicha] = useState<FichaEstudianteResultado | null>(null)
  const [error, establecerError] = useState('')
  const [recarga, establecerRecarga] = useState(0)
  const [abierto, establecerAbierto] = useState<JuegoDelEstudiante | null>(null)
  const titulo = useRef<HTMLHeadingElement>(null)
  useEffect(() => { titulo.current?.focus() }, [])
  useEffect(() => {
    const controlador = new AbortController()
    fichaEstudianteResultados(estudiante, controlador.signal).then((datos) => { if (!controlador.signal.aborted) { establecerFicha(datos); establecerError('') } })
      .catch((fallo) => { if (!controlador.signal.aborted) establecerError(mensajeDocente(fallo, 'No pudimos abrir el avance de este estudiante. Intenta otra vez.')) })
    return () => controlador.abort()
  }, [estudiante, recarga])

  return <section className="doc-avance-estudiante" aria-labelledby="doc-avance-titulo">
    <button type="button" className="secundario doc-volver" onClick={volver}><IconoDocente nombre="atras" />Volver a mis estudiantes</button>
    <header className="doc-cabecera doc-avance-cabecera">
      <div className="doc-cabecera-titulo">
        <span className="doc-avatar grande" aria-hidden="true">{iniciales(nombre)}</span>
        <div><h1 id="doc-avance-titulo" ref={titulo} tabIndex={-1}>{nombre}</h1><p>Sección {seccion}</p></div>
      </div>
    </header>
    {error ? <MensajeDocente titulo="No pudimos cargar su avance" error><p>{error}</p><button type="button" className="secundario" onClick={() => establecerRecarga((n) => n + 1)}>Volver a intentar</button></MensajeDocente>
      : !ficha ? <CargandoDocente texto="Buscando sus juegos y respuestas…" /> : <>
        <dl className="estadisticas doc-avance-totales">
          {totales.map(({ clave, etiqueta, icono, color }) => <div className="estadistica" key={clave}>
            <dt><span className={'icono-grande ' + color}><Icono nombre={icono} /></span><small>{etiqueta}</small></dt>
            <dd><strong>{ficha.totales[clave]}</strong></dd>
          </div>)}
        </dl>
        <section className="doc-listado doc-seguimiento-listado doc-avance-juegos" aria-labelledby="doc-avance-juegos-titulo">
          <h2 id="doc-avance-juegos-titulo">Sus juegos</h2>
          {!ficha.juegos.length ? <MensajeDocente titulo="Todavía no recibió juegos tuyos"><p>Cuando envíes un juego a su sección, aquí verás si lo jugó y cómo le fue.</p></MensajeDocente>
            : <div className="doc-tabla-marco"><table className="doc-tabla doc-tabla-seguimiento" role="table">
              <caption className="solo-lectores">Juegos de {nombre}</caption>
              <thead role="rowgroup"><tr role="row"><th scope="col" role="columnheader">Juego</th><th scope="col" role="columnheader">Estado</th><th scope="col" role="columnheader">Errores</th><th scope="col" role="columnheader">Ayudas</th><th scope="col" role="columnheader">Puntos</th><th scope="col" role="columnheader">Última vez</th><th scope="col" role="columnheader"><span className="solo-lectores">Respuestas</span></th></tr></thead>
              <tbody role="rowgroup">{ficha.juegos.map((juego) => <Fragment key={juego.id}>
                <tr role="row">
                  <th scope="row" role="rowheader"><span className="doc-persona">
                    {/* El mismo ícono de curso que en «Mis juegos» y en Resultados. */}
                    <IconoCurso nombre={juego.curso_id ? nombreCurso(juego.curso_id) : 'Tu clase'} /><strong>{juego.titulo}</strong>
                  </span></th>
                  <td role="cell"><span className="doc-tabla-etiqueta" aria-hidden="true">Estado</span><span className={'doc-estado doc-resultado-' + juego.estado}>{estados[juego.estado]}</span></td>
                  <td role="cell"><span className="doc-tabla-etiqueta" aria-hidden="true">Errores</span><span>{juego.errores}</span></td>
                  <td role="cell"><span className="doc-tabla-etiqueta" aria-hidden="true">Ayudas</span><span>{juego.ayudas_usadas}</span></td>
                  <td role="cell"><span className="doc-tabla-etiqueta" aria-hidden="true">Puntos</span><strong className="doc-puntos">{juego.puntos}</strong></td>
                  <td role="cell"><span className="doc-tabla-etiqueta" aria-hidden="true">Última vez</span>{juego.ultima_vez ? <time dateTime={juego.ultima_vez}>{fecha.format(new Date(juego.ultima_vez))}</time> : <span>Aún no juega</span>}</td>
                  <td role="cell" className="doc-tabla-accion">{juego.partidas > 0 && <button type="button" className="secundario" aria-expanded={abierto?.id === juego.id}
                    aria-controls={abierto?.id === juego.id ? 'doc-avance-respuestas' : undefined}
                    aria-label={(abierto?.id === juego.id ? 'Ocultar respuestas de ' : 'Ver respuestas de ') + juego.titulo}
                    onClick={() => establecerAbierto(abierto?.id === juego.id ? null : juego)}>{abierto?.id === juego.id ? 'Ocultar respuestas' : 'Ver respuestas'}<IconoDocente nombre="abajo" /></button>}</td>
                </tr>
                {abierto?.id === juego.id && <tr role="row" className="doc-tabla-respuestas"><td role="cell" colSpan={7}>
                  {/* El contenido sigue a su botón en el orden de lectura y de teclado. */}
                  <RespuestasDelJuego nombreCurso={nombreCurso} juego={abierto} estudiante={estudiante} />
                </td></tr>}
              </Fragment>)}</tbody>
            </table></div>}
        </section>
      </>}
  </section>
}

function RespuestasDelJuego({ juego, estudiante, nombreCurso }: { juego: JuegoDelEstudiante; estudiante: string; nombreCurso: (id: string) => string }) {
  const [partidas, establecerPartidas] = useState<PartidaResultado[] | null>(null)
  const [error, establecerError] = useState('')
  useEffect(() => {
    const controlador = new AbortController()
    respuestasResultados(juego.id, estudiante, controlador.signal).then((datos) => { if (!controlador.signal.aborted) establecerPartidas(datos) })
      .catch((fallo) => { if (!controlador.signal.aborted) establecerError(mensajeDocente(fallo, 'No pudimos abrir las respuestas. Intenta otra vez.')) })
    return () => controlador.abort()
  }, [juego.id, estudiante])
  return <section id="doc-avance-respuestas" className="doc-listado doc-respuestas" aria-label={'Respuestas en ' + juego.titulo}>
    <header className="doc-cabecera doc-respuestas-cabecera"><div className="doc-cabecera-titulo">
      <IconoCurso nombre={juego.curso_id ? nombreCurso(juego.curso_id) : 'Tu clase'} />
      <div><h2>{juego.titulo}</h2><p>Respuestas y ayudas, en el orden en que jugó.</p></div>
    </div></header>
    {error ? <MensajeDocente titulo="No pudimos cargar las respuestas" error><p>{error}</p></MensajeDocente>
      : !partidas ? <CargandoDocente texto="Buscando sus respuestas…" /> : <PartidasEstudiante partidas={partidas} />}
  </section>
}
