import { useEffect, useRef, useState } from 'react'
import { Icono } from '../componentes/Icono'
import { consultarDetalleJuego } from '../servicios/juegosAdministracion'
import type { DetalleJuegoAdministrado, GeneracionJuego, VersionPropuestaJuego } from '../servicios/juegosAdministracion'

const fecha = new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Lima' })
const nombresRevision: Record<VersionPropuestaJuego['estado_revision'], string> = { pendiente: 'Sin revisar', aprobada: 'Aprobada', rechazada: 'Rechazada' }
const nombresGeneracion: Record<string, string> = {
  pendiente: 'En espera', generando: 'Escribiendo el guion', correccion: 'Corrigiendo el guion', comprobando: 'Comprobando',
  lista: 'Lista', fallida: 'Falló',
}
// Cada paso que dio Kusi al preparar el guion; un paso nuevo se muestra con su nombre interno.
const nombresEtapa: Record<string, string> = {
  generacion: 'Kusi escribe el guion', correccion: 'Kusi corrige el guion', comprobacion: 'Comprobación', mapa_base: 'Mapas de respaldo',
}
const nombresEstadoEtapa: Record<string, string> = { en_progreso: 'En curso', completada: 'Bien', fallida: 'Con problemas' }

// Quién escribió cada versión: el docente a mano, el taller de Kusi o la IA de respaldo.
function autorDe(version: VersionPropuestaJuego) {
  if (version.origen === 'docente') return 'Editada por el docente'
  return version.autor === 'taller' ? 'Escrita por Kusi (taller)' : 'Escrita por Kusi (IA de respaldo)'
}

export function DetalleJuegoAdmin({ juego, volver }: { juego: string; volver: () => void }) {
  const [detalle, establecerDetalle] = useState<DetalleJuegoAdministrado | null>(null)
  const [error, establecerError] = useState(false)
  const [consulta, establecerConsulta] = useState(0)
  const titulo = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    const controlador = new AbortController()
    consultarDetalleJuego(juego, controlador.signal)
      .then((datos) => { if (!controlador.signal.aborted) establecerDetalle(datos) })
      .catch(() => { if (!controlador.signal.aborted) establecerError(true) })
    return () => controlador.abort()
  }, [juego, consulta])
  useEffect(() => { if (detalle) titulo.current?.focus() }, [detalle])

  return <section className="admin-detalle-juego" aria-label={detalle ? undefined : 'Detalle del juego'} aria-labelledby={detalle ? 'admin-detalle-juego-titulo' : undefined}>
    <button type="button" className="secundario admin-volver" onClick={volver}><Icono nombre="atras" /> Volver a sus juegos</button>
    {error ? <p className="error-resumen" role="alert">No se pudo abrir el detalle del juego. <button type="button" className="secundario" onClick={() => { establecerError(false); establecerConsulta((n) => n + 1) }}>Reintentar</button></p>
      : !detalle ? <p role="status">Cargando el detalle del juego…</p> : <>
        <header className="admin-detalle-cabecera">
          <span className="admin-detalle-icono" aria-hidden="true"><Icono nombre="carpeta" /></span>
          <div>
            <h2 id="admin-detalle-juego-titulo" ref={titulo} tabIndex={-1}>{detalle.juego.titulo}</h2>
            <p>{detalle.juego.curso}{detalle.juego.seccion ? ' · Sección ' + detalle.juego.seccion : ''} · creado el <time dateTime={detalle.juego.creado_en}>{fecha.format(new Date(detalle.juego.creado_en))}</time></p>
          </div>
        </header>

        <section className="tarjeta admin-detalle-bloque" aria-labelledby="admin-detalle-pedido">
          <h3 id="admin-detalle-pedido">Lo que pidió el docente</h3>
          <dl className="admin-detalle-pedido">
            <div><dt>Tema que quiere enseñar</dt><dd>{detalle.pedido.tema}</dd></div>
            <div><dt>Qué deben aprender</dt><dd>{detalle.pedido.objetivo_docente || <span className="admin-detalle-vacio">No lo escribió: Kusi lo propuso.</span>}</dd></div>
            <div><dt>Algo más que Kusi debía saber</dt><dd>{detalle.pedido.instrucciones || <span className="admin-detalle-vacio">No escribió nada más.</span>}</dd></div>
          </dl>
        </section>

        <section className="tarjeta admin-detalle-bloque" aria-labelledby="admin-detalle-versiones">
          <h3 id="admin-detalle-versiones">Propuestas y correcciones</h3>
          <p>De la más nueva a la primera. Cada corrección que pidió el docente crea una versión nueva.</p>
          <ol className="admin-detalle-lista" role="list">{detalle.versiones.map((version) => <VersionPropuesta key={version.version} version={version} />)}</ol>
        </section>

        <section className="tarjeta admin-detalle-bloque" aria-labelledby="admin-detalle-guiones">
          <h3 id="admin-detalle-guiones">Guiones del juego</h3>
          <p>Cada vez que se preparó el juego: las comprobaciones y los arreglos que hizo Kusi, y el guion que recibió la app.</p>
          {detalle.generaciones.length === 0 ? <p>Todavía no se preparó ningún guion.</p> :
            <ol className="admin-detalle-lista" role="list">{detalle.generaciones.map((generacion) => <GuionJuego key={generacion.id} generacion={generacion} />)}</ol>}
        </section>
      </>}
  </section>
}

function VersionPropuesta({ version }: { version: VersionPropuestaJuego }) {
  const c = version.contenido
  return <li className="admin-detalle-item">
    <div className="admin-detalle-item-cabecera">
      <h4>Versión {version.version}{version.titulo ? ' · ' + version.titulo : ''}</h4>
      <span className="admin-estado" data-estado={version.estado_revision}>{nombresRevision[version.estado_revision]}</span>
    </div>
    <p className="admin-detalle-meta">{autorDe(version)} · <time dateTime={version.creado_en}>{fecha.format(new Date(version.creado_en))}</time></p>
    {version.observaciones && <p className="admin-detalle-correccion"><strong>Corrección que pidió el docente:</strong> «{version.observaciones}»</p>}
    <details className="admin-detalle-desplegable"><summary>Ver la propuesta<Icono nombre="abajo" /></summary>
      <dl className="admin-detalle-propuesta">
        {c.objetivo && <div><dt>Objetivo</dt><dd>{c.objetivo}</dd></div>}
        {c.historia && <div><dt>Historia</dt><dd>{c.historia}</dd></div>}
        {([['acciones', 'Acciones'], ['reglas', 'Reglas'], ['retos', 'Retos'], ['ayudas', 'Ayudas'], ['recursos', 'Dibujos y recursos']] as const)
          .map(([campo, etiqueta]) => c[campo]?.length ? <div key={campo}><dt>{etiqueta}</dt><dd><ul>{c[campo]!.map((texto, i) => <li key={i}>{texto}</li>)}</ul></dd></div> : null)}
        {!!version.fuentes?.length && <div><dt>Fuentes del contenido</dt><dd><ul>{version.fuentes.map((fuente, i) => <li key={i}>{[fuente.documento, fuente.referencia].filter(Boolean).join(' · ')}{fuente.tema ? ' (' + fuente.tema + ')' : ''}</li>)}</ul></dd></div>}
      </dl>
    </details>
  </li>
}

function GuionJuego({ generacion }: { generacion: GeneracionJuego }) {
  return <li className="admin-detalle-item">
    <div className="admin-detalle-item-cabecera">
      <h4>Guion de la versión {generacion.version_propuesta}</h4>
      <span className="admin-estado" data-estado={generacion.publicada ? 'publicado' : generacion.estado}>{generacion.publicada ? 'Enviado a la clase' : nombresGeneracion[generacion.estado] ?? generacion.estado}</span>
    </div>
    <p className="admin-detalle-meta">{generacion.taller ? 'Preparado en el taller' : 'Preparado por Kusi'} · <time dateTime={generacion.creado_en}>{fecha.format(new Date(generacion.creado_en))}</time></p>
    {generacion.ultimo_error && <p className="admin-detalle-correccion admin-detalle-fallo"><strong>Motivo del fallo:</strong> {generacion.ultimo_error}</p>}
    {!!generacion.etapas.length && <ol className="admin-detalle-etapas" aria-label="Pasos y comprobaciones" role="list">
      {generacion.etapas.map((etapa, i) => <li key={i} data-estado={etapa.estado}>
        <span className="admin-detalle-etapa-numero" aria-hidden="true">{i + 1}</span>
        <div>
          <div className="admin-detalle-etapa-cabecera">
            <strong>{nombresEtapa[etapa.etapa] ?? etapa.etapa}</strong>
            <span className="admin-estado" data-estado={etapa.estado}>{nombresEstadoEtapa[etapa.estado] ?? etapa.estado}</span>
          </div>
          {etapa.mensaje && <p>{etapa.mensaje}</p>}
        </div>
      </li>)}
    </ol>}
    {generacion.guion != null && <details className="admin-detalle-desplegable"><summary>Ver el guion<Icono nombre="abajo" /></summary>
      <pre className="admin-detalle-guion" tabIndex={0} role="region" aria-label="Guion en formato JSON"><code>{JSON.stringify(generacion.guion, null, 2)}</code></pre>
    </details>}
  </li>
}
