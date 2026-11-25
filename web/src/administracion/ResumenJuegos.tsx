import { Icono } from '../componentes/Icono'
import type { NombreIcono } from '../componentes/Icono'
import { iniciales } from '../componentes/apariencia'
import { ordenarRanking } from '../componentes/puestos'
import type { ResumenJuegosAdministracion } from '../servicios/juegosAdministracion'
import { useResumenJuegos } from './useResumenJuegos'

export const nombreJuegosDocentes = 'Juegos de los docentes'

const indicadores = [
  { clave: 'creados', etiqueta: 'Creados en total', icono: 'mas', color: 'c-morado' },
  { clave: 'publicados', etiqueta: 'Publicados', icono: 'check', color: 'c-verde' },
  { clave: 'en_preparacion', etiqueta: 'En preparación', icono: 'reloj', color: 'c-rojo' },
] satisfies readonly {
  clave: keyof ResumenJuegosAdministracion['totales']
  etiqueta: string
  icono: NombreIcono
  color: string
}[]

export function ResumenJuegos({ abrir }: { abrir: () => void }) {
  const { resumen, error, reintentar } = useResumenJuegos()
  return <section className="tarjeta admin-juegos-resumen" aria-labelledby="admin-juegos-inicio">
    <div className="admin-juegos-cabecera">
      <div className="admin-juegos-titulo">
        <span className="icono-grande c-vino">
          <svg className="icono" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M8 7h8a4 4 0 0 1 3.9 3.1l1 4.4a2.6 2.6 0 0 1-4.3 2.5L14.5 15h-5l-2.1 2a2.6 2.6 0 0 1-4.3-2.5l1-4.4A4 4 0 0 1 8 7ZM7 11h4m-2-2v4m6-2h.01m2 2h.01" />
          </svg>
        </span>
        <div>
          <h2 id="admin-juegos-inicio">{nombreJuegosDocentes}</h2>
          <p>Juegos que los docentes preparan para sus clases.</p>
        </div>
      </div>
      <button type="button" className="secundario" onClick={abrir}>Ver juegos por docente <Icono nombre="flecha" /></button>
    </div>
    {error && <div className="admin-juegos-aviso">
      <p role="status">No se pudo cargar el resumen de juegos.</p>
      <button type="button" className="secundario" onClick={reintentar}>Reintentar</button>
    </div>}
    {!resumen && !error && <p role="status">Cargando el resumen de juegos…</p>}
    {resumen && <div className="admin-juegos-indicadores">
      <TotalesJuegos totales={resumen.totales} />
      <DocentesDestacados docentes={resumen.docentes} abrir={abrir} />
    </div>}
  </section>
}

export function TotalesJuegos({ totales }: { totales: ResumenJuegosAdministracion['totales'] }) {
  return <dl className="admin-juegos-totales" aria-label="Total de juegos y estados">
    {indicadores.map(({ clave, etiqueta, icono, color }) => <div key={clave} className="estadistica">
      <dt><span className={'icono-grande ' + color}><Icono nombre={icono} /></span>{etiqueta}</dt>
      <dd>{totales[clave]}</dd>
    </div>)}
  </dl>
}

// Inicio muestra solo al docente que va primero; los demás se ven en «Juegos de los docentes».
// Con los mismos juegos va primero quien llegó antes a esa cantidad.
function DocentesDestacados({ docentes, abrir }: { docentes: ResumenJuegosAdministracion['docentes']; abrir: () => void }) {
  const conJuegos = ordenarRanking(docentes.filter((docente) => docente.juegos_creados > 0), (docente) => docente.juegos_creados, (docente) => docente.ultimo_juego_en)
  const primero = conJuegos[0]?.item

  return <div className="admin-juegos-destacados">
    <h3>Docente con más juegos creados</h3>
    {!primero ? <p>Aún no hay juegos registrados.</p> : <ol role="list">
      <li data-puesto={1}>
        <div>
          <span className="admin-juegos-puesto"><span className="solo-lectores">Puesto </span>1</span>
          <span className="admin-avatar docente" aria-hidden="true">{iniciales(primero.nombre)}</span>
          <span className="admin-juegos-destacado-nombre">{primero.nombre}</span>
          <strong>{primero.juegos_creados + (primero.juegos_creados === 1 ? ' juego' : ' juegos')}</strong>
        </div>
      </li>
    </ol>}
    {conJuegos.length > 1 && <button type="button" className="secundario admin-juegos-ver-todos" onClick={abrir}>
      {'Ver los otros ' + (conJuegos.length - 1) + (conJuegos.length - 1 === 1 ? ' docente' : ' docentes')} <Icono nombre="flecha" />
    </button>}
  </div>
}
