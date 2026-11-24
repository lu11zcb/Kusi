import { solicitar } from './http'

export type DocenteConJuegos = { id: string; nombre: string; juegos_creados: number }
export type ResumenJuegosAdministracion = {
  totales: { creados: number; publicados: number; en_preparacion: number }
  docentes: DocenteConJuegos[]
}
export type EstadoJuegoAdministrado = 'generando' | 'listo_para_probar' | 'publicado' | 'retirado' | 'fallido'
export type JuegoAdministrado = {
  id: string
  titulo: string
  curso: string
  seccion: string | null
  anio_escolar: number | null
  estado: EstadoJuegoAdministrado
  creado_en: string
  fallo_generacion: boolean
}

const ruta = '/api/edu/administracion/juegos/'
export const consultarResumenJuegos = (signal?: AbortSignal) => solicitar<ResumenJuegosAdministracion>(ruta, { signal })
export const consultarJuegosDocente = (docente: string, signal?: AbortSignal) =>
  solicitar<{ juegos: JuegoAdministrado[] }>(ruta + encodeURIComponent(docente) + '/', { signal })
