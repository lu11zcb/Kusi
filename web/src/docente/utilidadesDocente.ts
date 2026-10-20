import type { SolicitudPropuesta } from '../servicios/propuestas'
import type { IconoDocenteNombre } from './IconoDocente'

export const normalizarBusqueda = (texto: string) => texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').trim()
const cursos: Record<string, { tono: string; icono: IconoDocenteNombre }> = {
  matematica: { tono: 'cielo', icono: 'matematica' }, comunicacion: { tono: 'terracota', icono: 'comunicacion' },
  'personal social': { tono: 'dorado', icono: 'personal' }, 'ciencia y tecnologia': { tono: 'verde', icono: 'ciencia' },
  'arte y cultura': { tono: 'rosa', icono: 'arte' }, 'educacion religiosa': { tono: 'morado', icono: 'religion' }, ingles: { tono: 'vino', icono: 'ingles' },
}
export function identidadCurso(nombre: string) { return cursos[normalizarBusqueda(nombre)] ?? { tono: 'terracota', icono: 'cursos' as const } }
export function estadoPropuesta(solicitud: SolicitudPropuesta) {
  if (solicitud.propuesta) {
    const estado = solicitud.propuesta.estado_revision ?? 'pendiente'
    return { clave: estado, etiqueta: { pendiente: 'Por revisar', aprobada: 'Aprobada', rechazada: 'Rechazada' }[estado] }
  }
  return { clave: solicitud.estado, etiqueta: { pendiente: 'Solicitud guardada', generando: 'Preparando con IA', generada: 'Por consultar', fallida: 'Necesita reintento' }[solicitud.estado] }
}
