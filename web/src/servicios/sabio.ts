import { enviar, solicitar } from './http'
import { ErrorApi } from './django'

// «Kusi Sabio»: el docente pregunta sobre su clase o sobre el panel, sin elegir la actividad: Kusi Sabio conoce las
// actividades recientes del docente y elige de cuál habla. Spring guarda la pregunta y responde el taller (o la IA de
// reserva); el panel consulta cada poco hasta que la respuesta está lista. Los nombres solo los pone Spring al final.

export type TipoGrafico = 'errores_por_nivel' | 'ayudas_por_nivel' | 'avance_por_estudiante' | 'comparacion_entre_actividades'
export type BarraSabio = { etiqueta: string; valor: number; total: number | null; detalle: string | null }
// «propio» es un gráfico que pidió el docente («hazme un gráfico de…»): trae su propio título.
export type GraficoSabio = { tipo: TipoGrafico | 'propio'; titulo: string | null; barras: BarraSabio[] }
export type ApoyoSabio = { nombre: string; motivos: string[] }
export type TurnoSabio = { pregunta: string; respuesta: string }
export type ActividadSabio = { titulo: string; seccion: string }
export type EstudiantesSabio = { seccion: string; nombres: string[] }
export type RespuestaSabio =
  | { estado: 'pensando' }
  | { estado: 'lista'; texto: string; actividad: ActividadSabio | null; graficos: GraficoSabio[]; quienes_necesitan_ayuda: ApoyoSabio[] | null
      estudiantes: EstudiantesSabio[] | null }

export const TIPOS_GRAFICO: readonly TipoGrafico[] = ['errores_por_nivel', 'ayudas_por_nivel', 'avance_por_estudiante', 'comparacion_entre_actividades']
export const TITULOS_GRAFICO: Record<TipoGrafico, string> = {
  errores_por_nivel: 'Errores por nivel',
  ayudas_por_nivel: 'Ayudas por nivel',
  avance_por_estudiante: 'Avance de cada estudiante',
  comparacion_entre_actividades: 'Terminaron cada actividad',
}
// Spring acepta hasta 4 intercambios anteriores y preguntas de hasta 600 caracteres.
export const MAX_HISTORIAL = 4
export const MAX_PREGUNTA = 600

const base = '/api/edu/sabio/consultas/'
const objeto = (dato: unknown): dato is Record<string, unknown> => !!dato && typeof dato === 'object' && !Array.isArray(dato)
const texto = (dato: unknown): dato is string => typeof dato === 'string' && dato.trim().length > 0
const entero = (dato: unknown) => Number.isSafeInteger(dato) && Number(dato) >= 0
const invalida = () => new ErrorApi('No pudimos leer la respuesta de Kusi Sabio. Vuelve a preguntar.', 502)

function barra(dato: unknown): dato is BarraSabio {
  return objeto(dato) && texto(dato.etiqueta) && entero(dato.valor) && (dato.total === null || dato.total === undefined || entero(dato.total))
    && (dato.detalle === null || dato.detalle === undefined || typeof dato.detalle === 'string')
}

/** Revisa lo que devolvió Spring antes de mostrarlo. */
export function leerRespuestaSabio(datos: unknown): RespuestaSabio {
  if (!objeto(datos)) throw invalida()
  if (datos.estado === 'pensando') return { estado: 'pensando' }
  if (datos.estado !== 'lista' || !texto(datos.texto) || !Array.isArray(datos.graficos)) throw invalida()
  const graficos = datos.graficos.map((grafico) => {
    const propio = objeto(grafico) && grafico.tipo === 'propio' && texto(grafico.titulo)
    if (!objeto(grafico) || !(propio || TIPOS_GRAFICO.includes(grafico.tipo as TipoGrafico)) || !Array.isArray(grafico.barras)
      || !grafico.barras.every(barra)) throw invalida()
    return { tipo: grafico.tipo as TipoGrafico | 'propio', titulo: propio ? String(grafico.titulo) : null, barras: grafico.barras.map((b: BarraSabio) => ({ etiqueta: b.etiqueta, valor: b.valor, total: b.total ?? null, detalle: b.detalle ?? null })) }
  })
  const actividad = datos.actividad
  if (actividad !== null && actividad !== undefined && (!objeto(actividad) || !texto(actividad.titulo) || typeof actividad.seccion !== 'string')) throw invalida()
  const estudiantes = datos.estudiantes
  if (estudiantes !== null && estudiantes !== undefined && (!Array.isArray(estudiantes)
    || !estudiantes.every((fila) => objeto(fila) && texto(fila.seccion) && Array.isArray(fila.nombres) && fila.nombres.every(texto)))) throw invalida()
  const lista = datos.quienes_necesitan_ayuda
  if (lista !== null && lista !== undefined && (!Array.isArray(lista)
    || !lista.every((fila) => objeto(fila) && texto(fila.nombre) && Array.isArray(fila.motivos) && fila.motivos.every(texto)))) throw invalida()
  return { estado: 'lista', texto: datos.texto, actividad: objeto(actividad) ? { titulo: String(actividad.titulo), seccion: String(actividad.seccion) } : null,
    graficos, quienes_necesitan_ayuda: (lista as ApoyoSabio[] | null | undefined) ?? null,
    estudiantes: (estudiantes as EstudiantesSabio[] | null | undefined) ?? null }
}

/** Envía la pregunta. Devuelve el id para consultar la respuesta. */
export async function preguntarASabio(pregunta: string, historial: TurnoSabio[]): Promise<string> {
  const limpia = pregunta.trim()
  if (!limpia || limpia.length > MAX_PREGUNTA) throw new ErrorApi('Escribe una pregunta de hasta 600 caracteres.', 400)
  const datos = await enviar<unknown>(base, {
    pregunta: limpia,
    historial: historial.slice(-MAX_HISTORIAL).map((turno) => ({ pregunta: turno.pregunta, respuesta: turno.respuesta.slice(0, 2000) })),
  })
  if (!objeto(datos) || !texto(datos.id)) throw invalida()
  return datos.id
}

export async function respuestaDeSabio(id: string, signal?: AbortSignal): Promise<RespuestaSabio> {
  return leerRespuestaSabio(await solicitar<unknown>(base + encodeURIComponent(id) + '/', { signal }))
}

/** La altura de cada barra, de 0 a 1: frente a su total si lo tiene (avance), o frente a la barra más alta. */
export function proporciones(barras: BarraSabio[]): number[] {
  const maximo = Math.max(1, ...barras.map((b) => b.valor))
  return barras.map((b) => Math.min(1, b.total ? b.valor / Math.max(1, b.total) : b.valor / maximo))
}
