import { useEffect, useState } from 'react'
import { Icono } from '../componentes/Icono'
import { iniciales } from '../componentes/apariencia'
import { consultarJuegosDocente } from '../servicios/juegosAdministracion'
import type { DocenteConJuegos, EstadoJuegoAdministrado, JuegoAdministrado } from '../servicios/juegosAdministracion'
import { useResumenJuegos } from './useResumenJuegos'

const nombresEstado: Record<EstadoJuegoAdministrado, string> = {
  generando: 'Generando',
  listo_para_probar: 'Listo para probar',
  publicado: 'Publicado',
  retirado: 'Retirado',
  fallido: 'Fallido',
}
const fechaJuego = new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeZone: 'America/Lima' })
const cantidadJuegos = (cantidad: number) => cantidad + (cantidad === 1 ? ' juego' : ' juegos')

export function JuegosPorDocente() {
  const { resumen, error, reintentar } = useResumenJuegos()
  const [docente, establecerDocente] = useState<DocenteConJuegos | null>(null)
  return <section className="admin-superficie" aria-labelledby="admin-juegos-titulo">
    {docente && <button type="button" className="secundario admin-volver" onClick={() => establecerDocente(null)}>
      <Icono nombre="atras" /> Volver a docentes
    </button>}
    <header className="admin-encabezado">
      <div><h1 id="admin-juegos-titulo">{docente ? docente.nombre : 'Juegos por docente'}</h1>
        {!docente && <p>Abre un docente para consultar sus juegos.</p>}
      </div>
      <span className="admin-ilustracion-icono"><Icono nombre="varita" /></span>
    </header>
    {docente ? <DetalleJuegosDocente key={docente.id} docente={docente.id} /> : <>
      {error && <div className="admin-juegos-aviso">
        <p role="status">No se pudo cargar la lista de docentes.</p>
        <button type="button" className="secundario" onClick={reintentar}>Reintentar</button>
      </div>}
      {!resumen && !error && <p role="status">Cargando docentes…</p>}
      {resumen && (resumen.docentes.length === 0 ? <p>Aún no hay docentes con juegos o asignaciones.</p> :
        <ul className="admin-personas">
          {resumen.docentes.map((persona) => <li key={persona.id}>
            <span className="admin-avatar docente" aria-hidden="true">{iniciales(persona.nombre)}</span>
            <div className="admin-persona-nombre"><strong>{persona.nombre}</strong><span>{cantidadJuegos(persona.juegos_creados)}</span></div>
            <button type="button" className="secundario" onClick={() => establecerDocente(persona)} aria-label={'Ver juegos de ' + persona.nombre}>
              Ver juegos <Icono nombre="flecha" />
            </button>
          </li>)}
        </ul>)}
    </>}
  </section>
}

function DetalleJuegosDocente({ docente }: { docente: string }) {
  const [juegos, establecerJuegos] = useState<JuegoAdministrado[] | null>(null)
  const [error, establecerError] = useState(false)
  const [consulta, establecerConsulta] = useState(0)

  useEffect(() => {
    const controlador = new AbortController()
    // Al volver a la lista, se cancela la lectura del docente que se dejó.
    consultarJuegosDocente(docente, controlador.signal)
      .then((datos) => { if (!controlador.signal.aborted) establecerJuegos(datos.juegos) })
      .catch(() => { if (!controlador.signal.aborted) establecerError(true) })
    return () => controlador.abort()
  }, [docente, consulta])

  if (error) return <div className="admin-juegos-aviso">
    <p role="status">No se pudo cargar la lista de juegos.</p>
    <button type="button" className="secundario" onClick={() => {
      establecerError(false)
      establecerConsulta((anterior) => anterior + 1)
    }}>Reintentar</button>
  </div>
  return juegos ? <TablaJuegos juegos={juegos} /> : <p role="status">Cargando juegos…</p>
}

export function TablaJuegos({ juegos }: { juegos: JuegoAdministrado[] }) {
  if (juegos.length === 0) return <p>Este docente todavía no tiene juegos registrados.</p>
  return <div className="admin-juegos-desplazamiento" role="region" aria-label="Listado de juegos" tabIndex={0}>
    <table className="admin-juegos-tabla">
      <caption>{cantidadJuegos(juegos.length)}</caption>
      <thead><tr><th scope="col">Título</th><th scope="col">Curso</th><th scope="col">Sección</th>
        <th scope="col">Estado</th><th scope="col">Fecha de creación</th><th scope="col">Falló la generación</th></tr></thead>
      <tbody>{juegos.map((juego) => <tr key={juego.id}>
        <th scope="row">{juego.titulo}</th>
        <td>{juego.curso}</td>
        <td>{juego.seccion ? juego.seccion + (juego.anio_escolar ? ' · ' + juego.anio_escolar : '') : 'Sin sección'}</td>
        <td><span className="admin-estado" data-estado={juego.estado}>{nombresEstado[juego.estado]}</span></td>
        <td><time dateTime={juego.creado_en}>{fechaJuego.format(new Date(juego.creado_en))}</time></td>
        <td><span className={juego.fallo_generacion ? 'admin-juego-fallo' : undefined}>{juego.fallo_generacion ? 'Sí' : 'No'}</span></td>
      </tr>)}</tbody>
    </table>
  </div>
}
