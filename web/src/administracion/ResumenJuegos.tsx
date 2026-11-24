import { Icono } from '../componentes/Icono'
import type { ResumenJuegosAdministracion } from '../servicios/juegosAdministracion'
import { useResumenJuegos } from './useResumenJuegos'

export function ResumenJuegos({ abrir }: { abrir: () => void }) {
  const { resumen, error, reintentar } = useResumenJuegos()
  return <section className="tarjeta admin-juegos-resumen" aria-labelledby="admin-juegos-inicio">
    <div className="admin-juegos-cabecera">
      <h2 id="admin-juegos-inicio"><Icono nombre="varita" />Juegos</h2>
      <button type="button" className="secundario" onClick={abrir}>Ver juegos por docente <Icono nombre="flecha" /></button>
    </div>
    {error && <div className="admin-juegos-aviso">
      <p role="status">No se pudo cargar el resumen de juegos.</p>
      <button type="button" className="secundario" onClick={reintentar}>Reintentar</button>
    </div>}
    {!resumen && !error && <p role="status">Cargando el resumen de juegos…</p>}
    {resumen && <IndicadoresJuegos resumen={resumen} />}
  </section>
}

export function IndicadoresJuegos({ resumen }: { resumen: ResumenJuegosAdministracion }) {
  const destacados = resumen.docentes
    .filter((docente) => docente.juegos_creados > 0)
    .sort((a, b) => b.juegos_creados - a.juegos_creados)
    .slice(0, 5)
  return <div className="admin-juegos-indicadores">
    <dl className="admin-juegos-totales">
      <div><dt>Creados</dt><dd>{resumen.totales.creados}</dd></div>
      <div><dt>Publicados</dt><dd>{resumen.totales.publicados}</dd></div>
      <div><dt>En preparación</dt><dd>{resumen.totales.en_preparacion}</dd></div>
    </dl>
    <div className="admin-juegos-destacados">
      <h3>Docentes con más juegos creados</h3>
      {destacados.length === 0 ? <p>Aún no hay juegos registrados.</p> : <ol>
        {destacados.map((docente) => <li key={docente.id}>
          <span>{docente.nombre}</span> <strong>{docente.juegos_creados}</strong>
        </li>)}
      </ol>}
    </div>
  </div>
}
