import { enviar } from './http'

export type DatosSeccion = { grado: number; nombre: string; anio_escolar: number }
export type Seccion = DatosSeccion & { id: string }
export const crearSeccion = (datos: DatosSeccion) => enviar<{ seccion: Seccion }>('/api/educacion/secciones/', datos)
