import { useEffect, useRef, useState } from 'react'
import { Icono } from '../componentes/Icono'
import { iniciales } from '../componentes/apariencia'
import { IconoDocente as IconoGestion } from '../docente/IconoDocente'
import { consultarJuegosDocente } from '../servicios/juegosAdministracion'
import type { DocenteConJuegos, EstadoJuegoAdministrado, JuegoAdministrado } from '../servicios/juegosAdministracion'
import { nombreJuegosDocentes, TotalesJuegos } from './ResumenJuegos'
import { DetalleJuegoAdmin } from './DetalleJuegoAdmin'
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
  const detalle = useRef<HTMLHeadingElement>(null)
  const volverA = useRef<string | null>(null)
  const listaDocentes = useRef<HTMLUListElement>(null)

  useEffect(() => {
    // Al abrir un detalle se anuncia el nombre. Al volver, se retoma en la misma fila.
    if (docente) detalle.current?.focus()
    else if (volverA.current) listaDocentes.current?.querySelector<HTMLButtonElement>('[data-docente="' + CSS.escape(volverA.current) + '"]')?.focus()
  }, [docente])

  return <section className={'admin-superficie admin-juegos-pagina' + (docente ? ' admin-ficha-usuario' : '')} aria-labelledby="admin-juegos-titulo">
    {docente ? <>
      <button type="button" className="secundario admin-volver" onClick={() => establecerDocente(null)}>
        <Icono nombre="atras" /> Volver a la lista de docentes
      </button>
      <header className="admin-ficha-cabecera">
        <span className="admin-avatar grande docente" aria-hidden="true">{iniciales(docente.nombre)}</span>
        <div className="admin-ficha-identidad">
          <h1 id="admin-juegos-titulo" ref={detalle} tabIndex={-1}>{docente.nombre}</h1>
          <p className="admin-ficha-resumen">{nombreJuegosDocentes}</p>
        </div>
      </header>
      <DetalleJuegosDocente key={docente.id} docente={docente.id} />
    </> : <>
      <header className="admin-encabezado">
        <div>
          <h1 id="admin-juegos-titulo">{nombreJuegosDocentes}</h1>
          <p>Consulta cuántos juegos han creado los docentes para sus clases y en qué estado están.</p>
        </div>
        <span className="admin-ilustracion-icono"><IconoGestion nombre="juegos" /></span>
      </header>
      {error && <p className="error-resumen" role="alert">
        No se pudo cargar el resumen de juegos. <button type="button" className="secundario" onClick={reintentar}>Reintentar</button>
      </p>}
      {!resumen && !error && <p role="status">Cargando docentes…</p>}
      {resumen && <>
        <TotalesJuegos totales={resumen.totales} />
        <section className="admin-juegos-docentes" aria-labelledby="admin-juegos-docentes-titulo">
          <h2 id="admin-juegos-docentes-titulo">Juegos por docente</h2>
          {resumen.docentes.length === 0 ? <div className="admin-vacio"><IconoGestion nombre="docente" /><p>Aún no hay docentes con juegos o asignaciones.</p></div> :
            <ul ref={listaDocentes} className="admin-personas" role="list">
              {resumen.docentes.map((persona) => <li key={persona.id}>
                <span className="admin-avatar docente" aria-hidden="true">{iniciales(persona.nombre)}</span>
                <div className="admin-persona-nombre"><strong>{persona.nombre}</strong><span>{cantidadJuegos(persona.juegos_creados)} en total</span></div>
                <button data-docente={persona.id} type="button" className="secundario"
                  aria-label={'Ver juegos de ' + persona.nombre} onClick={() => {
                    volverA.current = persona.id
                    establecerDocente(persona)
                  }}>Ver juegos <Icono nombre="flecha" /></button>
              </li>)}
            </ul>}
        </section>
      </>}
    </>}
  </section>
}

function DetalleJuegosDocente({ docente }: { docente: string }) {
  const [juegos, establecerJuegos] = useState<JuegoAdministrado[] | null>(null)
  const [error, establecerError] = useState(false)
  const [consulta, establecerConsulta] = useState(0)
  // El juego abierto en detalle; al volver, el foco regresa a su botón «Ver detalle».
  const [abierto, establecerAbierto] = useState<string | null>(null)
  const volverAJuego = useRef<string | null>(null)
  const listado = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!abierto && volverAJuego.current) listado.current?.querySelector<HTMLButtonElement>('[data-juego="' + CSS.escape(volverAJuego.current) + '"]')?.focus()
  }, [abierto])

  useEffect(() => {
    const controlador = new AbortController()
    // Al volver a la lista, se cancela la lectura del docente que se dejó.
    consultarJuegosDocente(docente, controlador.signal)
      .then((datos) => { if (!controlador.signal.aborted) establecerJuegos(datos.juegos) })
      .catch(() => { if (!controlador.signal.aborted) establecerError(true) })
    return () => controlador.abort()
  }, [docente, consulta])

  if (error) return <p className="error-resumen" role="alert">
    No se pudo cargar la lista de juegos. <button type="button" className="secundario" onClick={() => {
      establecerError(false)
      establecerConsulta((anterior) => anterior + 1)
    }}>Reintentar</button>
  </p>
  if (abierto) return <DetalleJuegoAdmin juego={abierto} volver={() => establecerAbierto(null)} />
  return juegos ? <div ref={listado}><ListadoJuegos juegos={juegos} abrir={(id) => { volverAJuego.current = id; establecerAbierto(id) }} /></div> : <p role="status">Cargando juegos…</p>
}

function ListadoJuegos({ juegos, abrir }: { juegos: JuegoAdministrado[]; abrir: (juego: string) => void }) {
  if (juegos.length === 0) return <div className="admin-vacio"><IconoGestion nombre="juegos" /><p>Este docente todavía no tiene juegos registrados.</p></div>
  return <section aria-labelledby="admin-juegos-listado">
    <div className="admin-juegos-listado-cabecera">
      <h2 id="admin-juegos-listado">Juegos creados</h2>
      <span>{cantidadJuegos(juegos.length) + ' en total'}</span>
    </div>
    <div className="admin-juegos-tabla">
      <table role="table" aria-labelledby="admin-juegos-listado">
        <thead role="rowgroup"><tr role="row">
          <th scope="col" role="columnheader">Juego</th>
          <th scope="col" role="columnheader">Estado</th>
          <th scope="col" role="columnheader">Curso</th>
          <th scope="col" role="columnheader">Sección</th>
          <th scope="col" role="columnheader">Fecha de creación</th>
          <th scope="col" role="columnheader">Falló la generación</th>
          <th scope="col" role="columnheader"><span className="solo-lectores">Detalle</span></th>
        </tr></thead>
        <tbody role="rowgroup">{juegos.map((juego) => <tr key={juego.id} role="row">
          <th scope="row" role="rowheader">{juego.titulo}</th>
          <td role="cell"><span className="admin-juegos-etiqueta" aria-hidden="true">Estado</span><span className="admin-estado" data-estado={juego.estado}>{nombresEstado[juego.estado]}</span></td>
          <td role="cell"><span className="admin-juegos-etiqueta" aria-hidden="true">Curso</span>{juego.curso}</td>
          <td role="cell"><span className="admin-juegos-etiqueta" aria-hidden="true">Sección</span>{juego.seccion ? juego.seccion + (juego.anio_escolar ? ' · ' + juego.anio_escolar : '') : 'Sin sección'}</td>
          <td role="cell"><span className="admin-juegos-etiqueta" aria-hidden="true">Fecha de creación</span><time dateTime={juego.creado_en}>{fechaJuego.format(new Date(juego.creado_en))}</time></td>
          <td role="cell"><span className="admin-juegos-etiqueta" aria-hidden="true">Falló la generación</span><span className={juego.fallo_generacion ? 'admin-juego-fallo' : undefined}>{juego.fallo_generacion ? 'Sí' : 'No'}</span></td>
          <td role="cell"><button type="button" className="secundario" data-juego={juego.id} aria-label={'Ver detalle de ' + juego.titulo} onClick={() => abrir(juego.id)}>Ver detalle <Icono nombre="flecha" /></button></td>
        </tr>)}</tbody>
      </table>
    </div>
  </section>
}
