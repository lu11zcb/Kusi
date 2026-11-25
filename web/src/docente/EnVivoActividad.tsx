import { useEffect, useState } from 'react'
import { iniciales } from '../componentes/apariencia'
import { estudiantesEnVivo } from '../servicios/resultados'
import type { ActividadResultado, EstudianteEnVivo } from '../servicios/resultados'
import { CargandoDocente, MensajeDocente } from './ElementosDocente'
import { IconoDocente } from './IconoDocente'

const INTERVALO_ACTUALIZACION = 5000
const MINIMO_ERRORES_PARA_AYUDA = 3

function necesitaAyuda(estudiante: EstudianteEnVivo) {
  return estudiante.errores_nivel >= MINIMO_ERRORES_PARA_AYUDA
}

function ultimaActividad(segundos: number | null) {
  if (segundos === null) return 'Sin avisos todavía'
  if (segundos < 5) return 'Ahora mismo'
  if (segundos < 60) return 'Hace ' + segundos + ' s'
  if (segundos < 3600) return 'Hace ' + Math.floor(segundos / 60) + ' min'
  if (segundos < 86400) return 'Hace ' + Math.floor(segundos / 3600) + ' h'
  const dias = Math.floor(segundos / 86400)
  return 'Hace ' + dias + (dias === 1 ? ' día' : ' días')
}

export function TarjetasEnVivo({ estudiantes }: { estudiantes: EstudianteEnVivo[] }) {
  // El orden alfabético del servidor se conserva dentro de cada grupo.
  const ordenados = [...estudiantes].sort((a, b) => Number(necesitaAyuda(b)) - Number(necesitaAyuda(a)))
  return <ul className="doc-en-vivo-lista" role="list">{ordenados.map(estudiante => {
    const jugando = estudiante.estado === 'jugando'
    const pendiente = necesitaAyuda(estudiante)
    const estado = estudiante.estado === 'completada' ? 'Completada' : estudiante.estado === 'sin_iniciar' ? 'Sin iniciar' : estudiante.pausa_guardada ? 'En pausa' : ''
    return <li className={'tarjeta doc-en-vivo-tarjeta' + (pendiente ? ' doc-en-vivo-ayuda' : '')} key={estudiante.id}>
      <div className="doc-en-vivo-cabecera">
        <div className="doc-persona">
          <span className="doc-avatar" aria-hidden="true">{iniciales(estudiante.nombre)}</span>
          <h3>{estudiante.nombre}</h3>
        </div>
        <span className={'doc-estado doc-en-vivo-estado' + (jugando ? ' doc-en-vivo-jugando doc-estado-aprobada' : '')}><IconoDocente nombre="reloj" />{jugando ? 'Jugando' : 'Sin actividad'}</span>
      </div>
      {(pendiente || estado) && <div className="doc-en-vivo-etiquetas">
        {pendiente && <strong className="doc-estado"><IconoDocente nombre="info" />Puede necesitar ayuda</strong>}
        {estado && <span>{estado}</span>}
      </div>}
      <dl className="doc-en-vivo-datos">
        <div><dt>Nivel</dt><dd>{estudiante.nivel ?? '—'}</dd></div>
        <div><dt>Errores del nivel</dt><dd>{estudiante.errores_nivel}</dd></div>
        <div><dt>Errores totales</dt><dd>{estudiante.errores_total}</dd></div>
        <div><dt>Ayudas</dt><dd>{estudiante.ayudas_usadas}</dd></div>
        <div className="doc-en-vivo-puntos"><dt>Puntos</dt><dd>{estudiante.puntos} / 20</dd></div>
      </dl>
      <div className="doc-en-vivo-pie">
        <span>Última actividad · {ultimaActividad(estudiante.segundos_desde_ultimo_aviso)}</span>
        {estudiante.incidencias_tecnicas > 0 && <span>Incidencias técnicas · {estudiante.incidencias_tecnicas}</span>}
      </div>
    </li>
  })}</ul>
}

export function EnVivoActividad({ actividad }: { actividad: ActividadResultado }) {
  const [datos, establecerDatos] = useState<EstudianteEnVivo[] | null>(null)
  const [error, establecerError] = useState(false)

  useEffect(() => {
    const controlador = new AbortController()
    let consultando = false
    async function actualizar() {
      // Evita consultas superpuestas y descarta la respuesta al salir de la vista.
      if (consultando || controlador.signal.aborted) return
      consultando = true
      try {
        const estudiantes = await estudiantesEnVivo(actividad.id, controlador.signal)
        if (!controlador.signal.aborted) {
          establecerDatos(estudiantes)
          establecerError(false)
        }
      } catch {
        if (!controlador.signal.aborted) {
          establecerDatos(null)
          establecerError(true)
        }
      } finally {
        consultando = false
      }
    }
    void actualizar()
    const intervalo = window.setInterval(() => void actualizar(), INTERVALO_ACTUALIZACION)
    return () => { window.clearInterval(intervalo); controlador.abort() }
  }, [actividad.id])

  return <section className="doc-en-vivo" aria-label="Avance en vivo">
    {error ? <MensajeDocente titulo="No pudimos actualizar el avance" error><p>Volveremos a consultarlo automáticamente.</p></MensajeDocente>
      : datos === null ? <CargandoDocente texto="Buscando el avance en vivo…" />
        : datos.length ? <TarjetasEnVivo estudiantes={datos} /> : <MensajeDocente titulo="Esta actividad aún no tiene estudiantes" />}
  </section>
}
