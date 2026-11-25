import { useEffect, useRef, useState } from 'react'
import { SelectorDesplegable } from '../componentes/SelectorDesplegable'
import { iniciales } from '../componentes/apariencia'
import { misEstudiantesDocente } from '../servicios/educacion'
import { rankingResultados } from '../servicios/resultados'
import type { SeccionRanking } from '../servicios/resultados'
import { AvanceEstudiante, QuienVaMejor, RankingSeccion } from './AvanceEstudiante'
import type { VinculoEstudiante } from '../servicios/educacion'
import { CabeceraDocente, CargandoDocente, MensajeDocente } from './ElementosDocente'
import { normalizarBusqueda } from './utilidadesDocente'
import { IconoDocente } from './IconoDocente'

export function EstudiantesSecciones({ nombreCurso }: { nombreCurso?: (id: string) => string }) {
  const [items, establecerItems] = useState<VinculoEstudiante[] | null>(null)
  const [error, establecerError] = useState('')
  const [buscar, establecerBuscar] = useState('')
  const [seccion, establecerSeccion] = useState('')
  const [recarga, establecerRecarga] = useState(0)
  // Los puntos de cada estudiante en los juegos del docente; si no cargan, la lista se ve igual.
  const [ranking, establecerRanking] = useState<SeccionRanking[] | null>(null)
  const [elegido, establecerElegido] = useState<VinculoEstudiante | null>(null)
  // El ranking completo de una sección; al volver de un avance abierto desde ahí, sigue abierto.
  const [rankingAbierto, establecerRankingAbierto] = useState<SeccionRanking | null>(null)
  const pagina = useRef<HTMLElement>(null)
  const volverA = useRef<{ atributo: 'data-avance' | 'data-ranking' | 'data-avance-ranking'; id: string } | null>(null)
  useEffect(() => {
    let vigente = true
    misEstudiantesDocente().then((r) => { if (vigente) { establecerItems(r.estudiantes); establecerError('') } })
      .catch(() => { if (vigente) establecerError('No pudimos abrir la lista. Comprueba tu conexión e intenta otra vez.') })
    rankingResultados().then((r) => { if (vigente) establecerRanking(r) }).catch(() => { if (vigente) establecerRanking(null) })
    return () => { vigente = false }
  }, [recarga])
  useEffect(() => {
    // El listado y el ranking se montan de nuevo al volver de la ficha.
    if (elegido || !volverA.current) return
    const { atributo, id } = volverA.current
    pagina.current?.querySelector<HTMLButtonElement>('[' + atributo + '="' + CSS.escape(id) + '"]')?.focus()
    volverA.current = null
  }, [elegido, rankingAbierto])
  const nombres = new Map((items ?? []).map((v) => [v.estudiante_id, v.estudiante_nombre ?? 'Estudiante']))
  const puntos = new Map((ranking ?? []).flatMap((s) => s.estudiantes.map((e) => [s.id + '/' + e.id, e.puntos] as const)))
  const filtro = normalizarBusqueda(buscar)
  const secciones = [...new Map((items ?? []).map((v) => [v.seccion.id, v.seccion])).values()]
  const visibles = (items ?? []).filter((v) => (!seccion || v.seccion.id === seccion) && (!filtro || normalizarBusqueda(v.estudiante_nombre ?? '').includes(filtro) || (v.estudiante_dni ?? '').includes(filtro)))
    .sort((a, b) => (a.estudiante_nombre ?? '').localeCompare(b.estudiante_nombre ?? '', 'es'))
  function limpiar() { establecerBuscar(''); establecerSeccion(''); document.getElementById('doc-buscar-estudiante')?.focus() }
  if (!elegido && rankingAbierto) return <section className="doc-pagina doc-estudiantes-pagina" aria-label="Mis estudiantes" ref={pagina}>
    <RankingSeccion seccion={ranking?.find((s) => s.id === rankingAbierto.id) ?? rankingAbierto} nombres={nombres}
      volver={() => {
        volverA.current = { atributo: 'data-ranking', id: rankingAbierto.id }
        establecerRankingAbierto(null)
      }}
      verAvance={(estudiante) => {
        const vinculo = (items ?? []).find((v) => v.estudiante_id === estudiante && v.seccion.id === rankingAbierto.id)
        if (vinculo) {
          volverA.current = { atributo: 'data-avance-ranking', id: estudiante }
          establecerElegido(vinculo)
        }
      }} />
  </section>
  if (elegido) return <section className="doc-pagina doc-estudiantes-pagina" aria-label="Mis estudiantes" ref={pagina}>
    <AvanceEstudiante nombreCurso={nombreCurso} estudiante={elegido.estudiante_id} nombre={elegido.estudiante_nombre ?? 'Estudiante'} seccion={elegido.seccion.nombre}
      volver={() => { establecerElegido(null); establecerRecarga((n) => n + 1) }} />
  </section>
  return <section className="doc-pagina doc-estudiantes-pagina" aria-label="Mis estudiantes" ref={pagina}>
    <CabeceraDocente icono="personas" color="c-rojo" titulo="Mis estudiantes" descripcion="Encuentra a los estudiantes de tu clase y mira cómo le va a cada uno en tus juegos." />
    {!!items?.length && ranking && <QuienVaMejor secciones={ranking.filter((s) => !seccion || s.id === seccion)} nombres={nombres} verRanking={establecerRankingAbierto} />}
    {error && <MensajeDocente titulo="No pudimos cargar tus estudiantes" error><p>{error}</p><button className="secundario" type="button" onClick={() => establecerRecarga((n) => n + 1)}>Volver a intentar</button></MensajeDocente>}
    {!error && items === null && <CargandoDocente texto="Cargando los estudiantes de tus secciones…" />}
    {items?.length === 0 && <MensajeDocente titulo="Tu grupo aún no tiene estudiantes vinculados"><p>El administrador puede vincularlos a tus secciones. Después aparecerán aquí.</p></MensajeDocente>}
    {!!items?.length && <div className="doc-listado doc-seguimiento-listado">
      <div className="doc-herramientas">
        <div className="doc-busqueda"><label htmlFor="doc-buscar-estudiante">Buscar estudiante</label><div><IconoDocente nombre="buscar" /><input id="doc-buscar-estudiante" type="search" value={buscar} onChange={(e) => establecerBuscar(e.target.value)} placeholder="Nombre o DNI" /></div></div>
        <div className="doc-filtro"><label id="doc-seccion-estudiante-etiqueta" htmlFor="doc-seccion-estudiante">Sección</label><SelectorDesplegable id="doc-seccion-estudiante" valor={seccion} alCambiar={establecerSeccion}
          opciones={[{ id: '', nombre: 'Todas las secciones' }, ...secciones.map((s) => ({ id: s.id, nombre: s.nombre + ' · ' + s.anio_escolar }))]} /></div>
      </div>
      <div className="doc-resultado-linea"><p className="doc-resultados" role="status">{new Set(visibles.map((v) => v.estudiante_id)).size} {new Set(visibles.map((v) => v.estudiante_id)).size === 1 ? 'estudiante' : 'estudiantes'}{buscar || seccion ? ' en esta búsqueda' : ' en tus secciones'}</p>{(buscar || seccion) && <button className="doc-texto-boton secundario" type="button" onClick={limpiar}>Limpiar filtros</button>}</div>
      {!visibles.length ? <MensajeDocente titulo="No hay coincidencias"><p>Revisa el nombre, el DNI o la sección seleccionada.</p><button type="button" className="secundario" onClick={limpiar}>Mostrar todos</button></MensajeDocente>
        : <div className="doc-tabla-marco"><table className="doc-tabla doc-tabla-seguimiento" role="table">
          <caption className="solo-lectores">Estudiantes de las secciones asignadas al docente</caption>
          <thead role="rowgroup"><tr role="row"><th scope="col" role="columnheader">Estudiante</th><th scope="col" role="columnheader">DNI</th><th scope="col" role="columnheader">Sección</th><th scope="col" role="columnheader">Año escolar</th><th scope="col" role="columnheader">Puntos</th><th scope="col" role="columnheader"><span className="solo-lectores">Avance</span></th></tr></thead>
          <tbody role="rowgroup">{visibles.map((v) => <tr role="row" key={v.id}>
            <th scope="row" role="rowheader"><span className="doc-persona"><span className="doc-avatar" aria-hidden="true">{iniciales(v.estudiante_nombre ?? 'Estudiante')}</span><strong>{v.estudiante_nombre ?? 'Estudiante'}</strong></span></th>
            <td role="cell"><span className="doc-tabla-etiqueta" aria-hidden="true">DNI</span><span>{v.estudiante_dni || 'Sin DNI registrado'}</span></td>
            <td role="cell"><span className="doc-tabla-etiqueta" aria-hidden="true">Sección</span><span className="doc-seccion-etiqueta">{v.seccion.nombre}</span></td>
            <td role="cell"><span className="doc-tabla-etiqueta" aria-hidden="true">Año escolar</span><span>{v.anio_escolar}</span></td>
            <td role="cell"><span className="doc-tabla-etiqueta" aria-hidden="true">Puntos</span><strong className="doc-puntos">{ranking ? puntos.get(v.seccion.id + '/' + v.estudiante_id) ?? 0 : '—'}</strong></td>
            <td role="cell" className="doc-tabla-accion">
              <button type="button" data-avance={v.id} className="secundario" aria-label={'Ver el avance de ' + (v.estudiante_nombre ?? 'este estudiante')} onClick={() => {
                volverA.current = { atributo: 'data-avance', id: v.id }
                establecerElegido(v)
              }}>Ver avance<IconoDocente nombre="flecha" /></button>
            </td>
          </tr>)}</tbody>
        </table></div>}
    </div>}
    <p className="doc-nota"><IconoDocente nombre="info" />El administrador genera las contraseñas. Como docente, puedes comunicarlas a tus estudiantes por el canal acordado con la escuela.</p>
  </section>
}
