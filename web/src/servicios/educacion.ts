import { enviar, solicitar } from './http'

export type SeccionEducativa = { id: string; nombre: string; grado: number; anio_escolar: number }
export type VinculoEstudiante = { id: string; estudiante_id: string; seccion: SeccionEducativa; anio_escolar: number; creado_en: string }
export type AsignacionDocente = { id: string; docente_id: string; curso_id: string; seccion: SeccionEducativa; anio_escolar: number; creado_en: string }
export const listarVinculos = () => solicitar<{ vinculos: VinculoEstudiante[] }>('/api/educacion/vinculos-estudiantes/')
export const crearVinculo = (datos: { estudiante_id: string; seccion_id: string; anio_escolar: number }) => enviar<{ vinculo: VinculoEstudiante; mensaje?: string }>('/api/educacion/vinculos-estudiantes/crear/', datos)
export const listarAsignaciones = () => solicitar<{ asignaciones: AsignacionDocente[] }>('/api/educacion/asignaciones-docentes/')
export const crearAsignacion = (datos: { docente_id: string; curso_id: string; seccion_id: string; anio_escolar: number }) => enviar<{ asignacion: AsignacionDocente; mensaje?: string }>('/api/educacion/asignaciones-docentes/crear/', datos)
export const misAsignacionesDocente = () => solicitar<{ asignaciones: AsignacionDocente[] }>('/api/educacion/mis-asignaciones/')
export const misEstudiantesDocente = () => solicitar<{ estudiantes: VinculoEstudiante[] }>('/api/educacion/mis-estudiantes/')
