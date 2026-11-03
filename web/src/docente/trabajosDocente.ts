import { listarSolicitudes } from '../servicios/propuestas'
import type { SolicitudPropuesta } from '../servicios/propuestas'
import { listarGeneraciones } from '../servicios/generaciones'
import type { ResumenGeneracion } from '../servicios/generaciones'

export type TrabajoDocente = { solicitud: SolicitudPropuesta; juego: ResumenGeneracion | null; sinConfirmar: boolean; preparadoAlgunaVez?: boolean; enviadoAlgunaVez?: boolean }
export type EstadoTrabajo = 'revisar' | 'preparando' | 'probar' | 'enviado' | 'retomar'

// Se usa la idea vigente y su juego real. Aprobar una idea no equivale a tener
// un juego terminado, y los cambios pendientes no heredan un envío anterior.
export function estadoTrabajo({ solicitud, juego, sinConfirmar }: TrabajoDocente): { clave: EstadoTrabajo; etiqueta: string; accion: string } {
  if (solicitud.estado === 'generando') return { clave: 'preparando', etiqueta: 'Preparando tu idea', accion: 'Ver mi juego' }
  if (!solicitud.propuesta || solicitud.propuesta.estado_revision === 'rechazada') return { clave: 'retomar', etiqueta: 'Por terminar', accion: 'Continuar' }
  if (solicitud.propuesta.estado_revision !== 'aprobada') return { clave: 'revisar', etiqueta: 'Por revisar', accion: 'Revisar idea' }
  if (sinConfirmar) return { clave: 'retomar', etiqueta: 'Por consultar', accion: 'Ver mi juego' }
  if (!juego || juego.estado === 'fallida') return { clave: 'retomar', etiqueta: 'Por terminar', accion: 'Continuar' }
  if (juego.estado !== 'lista') return { clave: 'preparando', etiqueta: 'Preparando tu juego', accion: 'Ver mi juego' }
  return juego.publicada ? { clave: 'enviado', etiqueta: 'Enviado a mi clase', accion: 'Ver juego' }
    : { clave: 'probar', etiqueta: 'Para probar', accion: 'Probar juego' }
}

export async function cargarTrabajos(): Promise<TrabajoDocente[]> {
  const solicitudes = await listarSolicitudes()
  return Promise.all(solicitudes.map(async (solicitud) => {
    if (!solicitud.propuesta) return { solicitud, juego: null, sinConfirmar: false }
    try {
      const juegos = await listarGeneraciones(solicitud.id_solicitud)
      return { solicitud, juego: juegos.find((juego) => juego.version_propuesta === solicitud.propuesta?.version) ?? null, sinConfirmar: false,
        preparadoAlgunaVez: juegos.some((juego) => juego.estado === 'lista'), enviadoAlgunaVez: juegos.some((juego) => juego.publicada === true) }
    } catch {
      // Una consulta fallida no convierte un juego enviado en un borrador.
      return { solicitud, juego: null, sinConfirmar: true }
    }
  }))
}

// La interfaz explica cómo seguir. Los detalles del servicio se mantienen en
// sus respuestas y registros, sin trasladar los diagnósticos al docente.
export function mensajeDocente(error: unknown, alternativa: string): string {
  const estado = error && typeof error === 'object' && 'estado' in error ? error.estado : null
  if (estado === 401) return 'Vuelve a ingresar para continuar. Lo que ya guardaste sigue en Mis juegos.'
  if (estado === 403) return 'No pudimos comprobar tu acceso. Vuelve a ingresar o pide ayuda al administrador.'
  if (estado === 409) return 'Este trabajo cambió mientras lo revisabas. Vuelve a abrirlo antes de continuar.'
  return alternativa
}
