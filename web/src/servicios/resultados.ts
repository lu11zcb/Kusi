import { enviar, solicitar } from './http'
import { ErrorApi } from './django'

// curso_id: para mostrar el ícono y el nombre del curso (las respuestas anteriores no lo traen).
export type ActividadResultado = { id: string; titulo: string; seccion: string; retirada?: boolean; curso_id?: string }
export type DestinatarioActividad = { id: string; nombre: string; asignado: boolean }
export type EstadoResultado = 'sin_iniciar' | 'en_curso' | 'completada'
export type EstudianteResultado = { id: string; nombre: string; estado: EstadoResultado; partidas: number; ayudas_usadas: number }
export type EstadoEnVivo = 'jugando' | 'en_pausa' | 'sin_iniciar' | 'completada'
export type EstudianteEnVivo = {
  id: string; nombre: string; estado: EstadoEnVivo; pausa_guardada: boolean; nivel: number | null
  errores_nivel: number; errores_total: number; ayudas_usadas: number; puntos: number
  incidencias_tecnicas: number; segundos_desde_ultimo_aviso: number | null
}
export type RespuestaResultado = { respuesta: string; correcto: boolean | null; tipo: 'primera' | 'correccion' | 'siguiente'; ayudas: number[] }
export type IncidenciaResultado = { orden: number; momento: string; detalle: string; nivel: number }
export type PartidaResultado = { incidencias?: IncidenciaResultado[]; juego_id: string; enviado_en: string; envio: number; estado: EstadoResultado; ayudas_usadas: number; retos: { reto: string; respuestas: RespuestaResultado[] }[] }
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

export async function estudiantesEnVivo(actividad: string, signal?: AbortSignal): Promise<EstudianteEnVivo[]> {
  return lista(await solicitar<unknown>(base + encodeURIComponent(actividad) + '/en-vivo/', { signal }), 'estudiantes',
    d => objeto(d) && texto(d.id) && texto(d.nombre) && typeof d.estado === 'string'
      && ['jugando', 'en_pausa', 'sin_iniciar', 'completada'].includes(d.estado) && typeof d.pausa_guardada === 'boolean'
      && (d.nivel === null || (cantidad(d.nivel) && Number(d.nivel) >= 1 && Number(d.nivel) <= 5))
      && cantidad(d.errores_nivel) && cantidad(d.errores_total) && Number(d.errores_nivel) <= Number(d.errores_total)
      && cantidad(d.ayudas_usadas) && cantidad(d.puntos) && Number(d.puntos) <= 20 && cantidad(d.incidencias_tecnicas)
      && (d.segundos_desde_ultimo_aviso === null || cantidad(d.segundos_desde_ultimo_aviso))) as EstudianteEnVivo[]
}

export async function destinatariosActividad(actividad: string, signal?: AbortSignal): Promise<DestinatarioActividad[]> {
  return lista(await solicitar<unknown>(base + encodeURIComponent(actividad) + '/asignaciones/', { signal }), 'estudiantes',
    d => objeto(d) && texto(d.id) && texto(d.nombre) && typeof d.asignado === 'boolean') as DestinatarioActividad[]
}

export async function asignarActividad(actividad: string, estudiantes: string[]): Promise<void> {
  // Solo se envían las elecciones explícitas del docente; nunca se incorpora a
  // quienes llegaron después por el simple hecho de consultar los resultados.
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!estudiantes.length || estudiantes.some(id => !uuid.test(id)) || new Set(estudiantes).size !== estudiantes.length) {
    throw new ErrorApi('Elige a los estudiantes que recibirán la actividad.', 400)
  }
  const respuesta = await enviar<unknown>(base + encodeURIComponent(actividad) + '/asignaciones/', { estudiantes })
  if (!objeto(respuesta) || respuesta.guardado !== true) {
    throw new ErrorApi('No pudimos confirmar la asignación. Actualiza la lista antes de volver a intentarlo.', 502)
  }
}
function respuestaValida(d: unknown): boolean {
  return objeto(d) && texto(d.respuesta) && (d.correcto === null || typeof d.correcto === 'boolean')
    && ['primera', 'correccion', 'siguiente'].includes(String(d.tipo)) && Array.isArray(d.ayudas) && d.ayudas.every(a => a === 1 || a === 2)
}
export async function respuestasResultados(actividad: string, estudiante: string, signal?: AbortSignal): Promise<PartidaResultado[]> {
  return lista(await solicitar<unknown>(base + encodeURIComponent(actividad) + '/estudiantes/' + encodeURIComponent(estudiante) + '/', { signal }), 'partidas',
    d => objeto(d) && texto(d.juego_id) && texto(d.enviado_en) && Number.isFinite(Date.parse(d.enviado_en)) && cantidad(d.envio) && Number(d.envio) > 0 && estado(d.estado) && cantidad(d.ayudas_usadas)
      && (d.incidencias === undefined || (Array.isArray(d.incidencias) && d.incidencias.every(i => objeto(i) && cantidad(i.orden) && texto(i.detalle) && texto(i.momento) && Number.isFinite(Date.parse(i.momento)) && cantidad(i.nivel))))
      && Array.isArray(d.retos) && d.retos.every(r => objeto(r) && texto(r.reto) && Array.isArray(r.respuestas) && r.respuestas.every(respuestaValida))) as PartidaResultado[]
}

export async function retirarActividad(actividad: string): Promise<void> {
  const datos = await enviar<{ guardado: boolean }>(base + encodeURIComponent(actividad) + '/retirar/', {})
  if (datos.guardado !== true) throw new ErrorApi('Actualiza la actividad para confirmar su retiro.', 502)
}

// «Mis estudiantes»: la ficha de un estudiante (cada juego que recibió, si lo jugó, sus
// errores, ayudas y puntos) y quién va mejor en cada sección. Spring manda identificadores
// y números; los nombres salen de la lista de estudiantes del docente.
export type JuegoDelEstudiante = {
  id: string; titulo: string; seccion: string; curso_id?: string; estado: EstadoResultado; partidas: number
  errores: number; ayudas_usadas: number; puntos: number; ultima_vez: string | null
}
export type FichaEstudianteResultado = {
  estudiante: string
  totales: { juegos: number; completados: number; puntos: number; errores: number; ayudas_usadas: number }
  juegos: JuegoDelEstudiante[]
}
// puntos_hasta: cuándo ganó su último punto (con los mismos puntos, va primero quien llegó antes).
export type PuestoRanking = { id: string; puntos: number; completados: number; puntos_hasta?: string | null }
export type SeccionRanking = { id: string; nombre: string; anio_escolar: number; estudiantes: PuestoRanking[] }
const resultados = '/api/edu/resultados/'
export async function fichaEstudianteResultados(estudiante: string, signal?: AbortSignal): Promise<FichaEstudianteResultado> {
  const datos = await solicitar<unknown>(resultados + 'estudiantes/' + encodeURIComponent(estudiante) + '/', { signal })
  const ficha = objeto(datos) ? datos.ficha : null
  if (!objeto(ficha) || !objeto(ficha.totales) || !Array.isArray(ficha.juegos) || !ficha.juegos.every(j => objeto(j) && texto(j.id) && texto(j.titulo) && estado(j.estado)
    && cantidad(j.errores) && cantidad(j.ayudas_usadas) && cantidad(j.puntos) && cantidad(j.partidas)))
    throw new ErrorApi('No pudimos confirmar el avance de este estudiante. Vuelve a cargarlo.', 502)
  return ficha as FichaEstudianteResultado
}
export async function rankingResultados(signal?: AbortSignal): Promise<SeccionRanking[]> {
  return lista(await solicitar<unknown>(resultados + 'ranking/', { signal }), 'secciones', s => objeto(s) && texto(s.id) && texto(s.nombre)
    && Array.isArray(s.estudiantes) && s.estudiantes.every(e => objeto(e) && texto(e.id) && cantidad(e.puntos) && cantidad(e.completados))) as SeccionRanking[]
}
