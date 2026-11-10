import { solicitar } from './http'
import { ErrorApi } from './django'

export type ActividadResultado = { id: string; titulo: string; seccion: string }
export type EstadoResultado = 'sin_iniciar' | 'en_curso' | 'completada'
export type EstudianteResultado = { id: string; nombre: string; estado: EstadoResultado; partidas: number; ayudas_usadas: number }
export type RespuestaResultado = { respuesta: string; correcto: boolean | null; tipo: 'primera' | 'correccion' | 'siguiente'; ayudas: number[] }
export type PartidaResultado = { juego_id: string; enviado_en: string; envio: number; estado: EstadoResultado; ayudas_usadas: number; retos: { reto: string; respuestas: RespuestaResultado[] }[] }
const objeto = (dato: unknown): dato is Record<string, unknown> => !!dato && typeof dato === 'object' && !Array.isArray(dato)
const texto = (dato: unknown): dato is string => typeof dato === 'string' && dato.trim().length > 0
const cantidad = (dato: unknown) => Number.isSafeInteger(dato) && Number(dato) >= 0
const estado = (dato: unknown) => ['sin_iniciar', 'en_curso', 'completada'].includes(String(dato))
const base = '/api/edu/resultados/actividades/'
function lista(datos: unknown, clave: string, validar: (dato: unknown) => boolean): unknown[] {
  if (!objeto(datos) || !Array.isArray(datos[clave]) || !datos[clave].every(validar)) throw new ErrorApi('No pudimos confirmar los resultados. Vuelve a cargarlos.', 502)
  return datos[clave]
}
export async function actividadesResultados(signal?: AbortSignal): Promise<ActividadResultado[]> {
  return lista(await solicitar<unknown>(base, { signal }), 'actividades', d => objeto(d) && texto(d.id) && texto(d.titulo) && texto(d.seccion)) as ActividadResultado[]
}
export async function estudiantesResultados(actividad: string, signal?: AbortSignal): Promise<EstudianteResultado[]> {
  return lista(await solicitar<unknown>(base + encodeURIComponent(actividad) + '/estudiantes/', { signal }), 'estudiantes',
    d => objeto(d) && texto(d.id) && texto(d.nombre) && estado(d.estado) && cantidad(d.partidas) && cantidad(d.ayudas_usadas)) as EstudianteResultado[]
}
function respuestaValida(d: unknown): boolean {
  return objeto(d) && texto(d.respuesta) && (d.correcto === null || typeof d.correcto === 'boolean')
    && ['primera', 'correccion', 'siguiente'].includes(String(d.tipo)) && Array.isArray(d.ayudas) && d.ayudas.every(a => a === 1 || a === 2)
}
export async function respuestasResultados(actividad: string, estudiante: string, signal?: AbortSignal): Promise<PartidaResultado[]> {
  return lista(await solicitar<unknown>(base + encodeURIComponent(actividad) + '/estudiantes/' + encodeURIComponent(estudiante) + '/', { signal }), 'partidas',
    d => objeto(d) && texto(d.juego_id) && texto(d.enviado_en) && Number.isFinite(Date.parse(d.enviado_en)) && cantidad(d.envio) && Number(d.envio) > 0 && estado(d.estado) && cantidad(d.ayudas_usadas)
      && Array.isArray(d.retos) && d.retos.every(r => objeto(r) && texto(r.reto) && Array.isArray(r.respuestas) && r.respuestas.every(respuestaValida))) as PartidaResultado[]
}
