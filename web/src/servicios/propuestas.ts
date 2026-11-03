import { ErrorApi } from './django'
import { solicitar } from './http'

const raiz = '/api/edu/'
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export type ContextoPropuesta = {
  curso_id: string; curso_nombre: string; grado: 1
  seccion_id: string | null; seccion_nombre: string | null; anio_escolar: number | null
}
export type ContextosPropuestas = { contextos: ContextoPropuesta[]; ia_configurada: boolean }
export type Proposito = 'preparacion' | 'refuerzo'
export type EntradaPropuesta = {
  curso_id: string; seccion_id: string | null; tema: string; objetivo: string
  proposito: Proposito; instrucciones: string
}
export type DatosSolicitud = Omit<EntradaPropuesta, 'objetivo' | 'instrucciones'> & { id_solicitud: string; objetivo: string | null; instrucciones: string | null }
export type Propuesta = {
  id: string; objetivo: string; origen_objetivo: 'docente' | 'ia'; historia: string
  acciones: string[]; reglas: string[]; retos: string[]; ayudas: string[]
  // HU20-HU25: datos de la versión y su revisión.
  version?: number; origen?: 'ia' | 'docente'; version_base?: number | null; observaciones?: string | null
  recursos?: string[] | null; estado_revision?: 'pendiente' | 'aprobada' | 'rechazada'
  regla_juego?: 'orden' | 'solo_clase' | null
  apta_para_juego?: boolean; revisada_en?: string | null; creado_en?: string
}
export type SolicitudPropuesta = {
  id_solicitud: string; curso_id: string; seccion_id: string | null; tema: string
  objetivo_docente: string | null; proposito: Proposito; instrucciones: string | null
  estado: 'pendiente' | 'generando' | 'generada' | 'fallida'
  propuesta: Propuesta | null; creado_en?: string
}
export type EdicionPropuesta = Pick<Propuesta, 'objetivo' | 'historia' | 'acciones' | 'reglas' | 'retos' | 'ayudas'> & { recursos: string[] | null }

function objeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor)
}
function texto(valor: unknown, limite: number): valor is string {
  return typeof valor === 'string' && !!valor.trim() && valor.length <= limite
}
function identificador(valor: unknown): valor is string { return typeof valor === 'string' && uuid.test(valor) }
function lista(valor: unknown): valor is string[] {
  return Array.isArray(valor) && valor.length > 0 && valor.length <= 20 && valor.every((item) => texto(item, 2000))
}
function propuestaValida(valor: unknown): valor is Propuesta {
  return objeto(valor) && identificador(valor.id) && texto(valor.objetivo, 4000)
    && (valor.origen_objetivo === 'docente' || valor.origen_objetivo === 'ia')
    && (valor.regla_juego === undefined || valor.regla_juego === null || valor.regla_juego === 'orden' || valor.regla_juego === 'solo_clase')
    && texto(valor.historia, 10000) && lista(valor.acciones) && lista(valor.reglas) && lista(valor.retos) && lista(valor.ayudas)
}

export function prepararSolicitud(entrada: EntradaPropuesta, id: string): DatosSolicitud {
  if (!identificador(id) || !identificador(entrada.curso_id)
    || (entrada.seccion_id !== null && !identificador(entrada.seccion_id))) {
    throw new ErrorApi('Selecciona un curso autorizado antes de enviar la solicitud.', 400)
  }
  if (!texto(entrada.tema, 2000)) throw new ErrorApi('Indica un tema de hasta 2000 caracteres.', 400)
  if (typeof entrada.objetivo !== 'string' || entrada.objetivo.length > 4000) {
    throw new ErrorApi('El objetivo debe tener como máximo 4000 caracteres.', 400)
  }
  if (entrada.proposito !== 'preparacion' && entrada.proposito !== 'refuerzo') throw new ErrorApi('Elige preparación o refuerzo.', 400)
  if (typeof entrada.instrucciones !== 'string' || entrada.instrucciones.length > 4000) {
    throw new ErrorApi('Las instrucciones deben tener como máximo 4000 caracteres.', 400)
  }
  // HU19: como el objetivo, las instrucciones se conservan exactas o quedan ausentes.
  return {
    id_solicitud: id, curso_id: entrada.curso_id, seccion_id: entrada.seccion_id,
    tema: entrada.tema.trim(), objetivo: entrada.objetivo.trim() ? entrada.objetivo : null,
    proposito: entrada.proposito, instrucciones: entrada.instrucciones.trim() ? entrada.instrucciones : null,
  }
}

export async function obtenerContextosPropuestas(signal?: AbortSignal): Promise<ContextosPropuestas> {
  const datos = await solicitar<unknown>(raiz + 'contexto/propuestas/', { signal })
  if (!objeto(datos) || typeof datos.ia_configurada !== 'boolean' || !Array.isArray(datos.contextos)
    || !datos.contextos.every((contexto: unknown) => objeto(contexto)
      && identificador(contexto.curso_id) && texto(contexto.curso_nombre, 150) && contexto.grado === 1
      && (contexto.seccion_id === null
        ? contexto.seccion_nombre === null && contexto.anio_escolar === null
        : identificador(contexto.seccion_id) && texto(contexto.seccion_nombre, 80)
          && Number.isInteger(contexto.anio_escolar) && Number(contexto.anio_escolar) >= 1000 && Number(contexto.anio_escolar) <= 9999))) {
    throw new ErrorApi('No se pudieron comprobar tus cursos autorizados. Intenta cargarlos de nuevo.', 502)
  }
  return datos as ContextosPropuestas
}

function leerSolicitud(datos: unknown, entrada: DatosSolicitud): SolicitudPropuesta {
  const solicitud = objeto(datos) ? datos.solicitud : null
  if (!objeto(solicitud) || solicitud.id_solicitud !== entrada.id_solicitud
    || solicitud.curso_id !== entrada.curso_id || solicitud.seccion_id !== entrada.seccion_id
    || solicitud.tema !== entrada.tema || solicitud.objetivo_docente !== entrada.objetivo
    || solicitud.proposito !== entrada.proposito || solicitud.instrucciones !== entrada.instrucciones
    || typeof solicitud.estado !== 'string' || !['pendiente', 'generando', 'generada', 'fallida'].includes(solicitud.estado)) {
    throw new ErrorApi('No se pudo confirmar la solicitud. Consulta su estado antes de reintentar.', 502)
  }
  if (solicitud.estado === 'generada') {
    if (!propuestaValida(solicitud.propuesta)
      || (entrada.objetivo === null
        ? solicitud.propuesta.origen_objetivo !== 'ia'
        : solicitud.propuesta.origen_objetivo !== 'docente' || solicitud.propuesta.objetivo !== entrada.objetivo)) {
      throw new ErrorApi('El resultado recibido está incompleto. Consulta la solicitud antes de reintentar.', 502)
    }
  } else if (solicitud.propuesta !== null) {
    throw new ErrorApi('No se pudo comprobar el estado del resultado. Consulta la solicitud de nuevo.', 502)
  }
  return solicitud as SolicitudPropuesta
}

async function enviarEducacion(ruta: string, datos: unknown): Promise<unknown> {
  // Spring emite su propio token CSRF; no se reutiliza el token de Django.
  const contexto = await solicitar<unknown>(raiz + 'acceso/csrf/')
  if (!objeto(contexto) || !texto(contexto.csrf_token, 512)) {
    throw new ErrorApi('No se pudo comprobar la seguridad de la solicitud. Intenta de nuevo.', 403)
  }
  return solicitar<unknown>(ruta, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-XSRF-TOKEN': contexto.csrf_token },
    body: JSON.stringify(datos),
  })
}

export class GestorSolicitud {
  private entrada: DatosSolicitud | null = null
  private enviado = false
  private ocupado = false

  async enviar(entrada: EntradaPropuesta): Promise<SolicitudPropuesta> {
    if (this.ocupado) throw new ErrorApi('Espera a que termine la solicitud en curso.', 409)
    const datos = prepararSolicitud(entrada, this.entrada?.id_solicitud ?? crypto.randomUUID())
    if (!this.entrada || JSON.stringify({ ...datos, id_solicitud: '' }) !== JSON.stringify({ ...this.entrada, id_solicitud: '' })) {
      this.entrada = { ...datos, id_solicitud: crypto.randomUUID() }
      this.enviado = false
    }
    const actual = this.entrada
    const ruta = raiz + 'propuestas/solicitudes/'
    this.ocupado = true
    try {
      if (this.enviado) {
        // Una respuesta perdida puede haber guardado o generado: consultar primero.
        let existente: SolicitudPropuesta | null
        try { existente = leerSolicitud(await solicitar<unknown>(ruta + actual.id_solicitud + '/'), actual) }
        catch (error) {
          if (error instanceof ErrorApi && error.estado === 404) existente = null
          else throw error
        }
        if (existente) {
          if (existente.estado === 'generada' || existente.estado === 'generando') return existente
          return leerSolicitud(await enviarEducacion(ruta + actual.id_solicitud + '/reintentar/', {}), actual)
        }
      }
      this.enviado = true
      return leerSolicitud(await enviarEducacion(ruta, actual), actual)
    } finally { this.ocupado = false }
  }
}

// HU20-HU25: consulta y revisión de propuestas propias. El servidor valida
// propiedad, asignación vigente y versión exacta en cada operación.
function solicitudRecibida(datos: unknown): SolicitudPropuesta {
  const solicitud = objeto(datos) ? datos.solicitud : null
  if (!objeto(solicitud) || !identificador(solicitud.id_solicitud) || typeof solicitud.estado !== 'string'
    || (solicitud.propuesta !== null && !propuestaValida(solicitud.propuesta))) {
    throw new ErrorApi('No se pudo comprobar la propuesta. Vuelve a cargarla.', 502)
  }
  return solicitud as SolicitudPropuesta
}
const rutaSolicitud = (id: string) => {
  if (!identificador(id)) throw new ErrorApi('Solicitud no válida.', 400)
  return raiz + 'propuestas/solicitudes/' + id + '/'
}
const rutaVersion = (id: string, version: number) => {
  if (!Number.isInteger(version) || version < 1) throw new ErrorApi('Versión no válida.', 400)
  return rutaSolicitud(id) + 'versiones/' + version + '/'
}

export async function listarSolicitudes(): Promise<SolicitudPropuesta[]> {
  const datos = await solicitar<unknown>(raiz + 'propuestas/solicitudes/')
  if (!objeto(datos) || !Array.isArray(datos.solicitudes)) throw new ErrorApi('No se pudieron cargar tus propuestas.', 502)
  return datos.solicitudes.map((solicitud: unknown) => solicitudRecibida({ solicitud }))
}
export const consultarSolicitud = async (id: string) => solicitudRecibida(await solicitar<unknown>(rutaSolicitud(id)))
export async function listarVersiones(id: string): Promise<Propuesta[]> {
  const datos = await solicitar<unknown>(rutaSolicitud(id) + 'versiones/')
  if (!objeto(datos) || !Array.isArray(datos.versiones) || !datos.versiones.every(propuestaValida)) {
    throw new ErrorApi('No se pudo cargar el historial de versiones.', 502)
  }
  return datos.versiones as Propuesta[]
}
export const aprobarVersion = async (id: string, version: number) => solicitudRecibida(await enviarEducacion(rutaVersion(id, version) + 'aprobar/', {}))
export const rechazarVersion = async (id: string, version: number) => solicitudRecibida(await enviarEducacion(rutaVersion(id, version) + 'rechazar/', {}))
export const pedirAlternativa = async (id: string) => solicitudRecibida(await enviarEducacion(rutaSolicitud(id) + 'alternativa/', {}))
export async function enviarObservaciones(id: string, version: number, observaciones: string) {
  if (!texto(observaciones, 4000)) throw new ErrorApi('Escribe tus observaciones (hasta 4000 caracteres).', 400)
  return solicitudRecibida(await enviarEducacion(rutaVersion(id, version) + 'observaciones/', { observaciones }))
}
export async function modificarVersion(id: string, version: number, edicion: EdicionPropuesta) {
  if (!texto(edicion.objetivo, 4000) || !texto(edicion.historia, 10000) || !lista(edicion.acciones) || !lista(edicion.reglas)
    || !lista(edicion.retos) || !lista(edicion.ayudas) || (edicion.recursos !== null && !lista(edicion.recursos))) {
    throw new ErrorApi('Completa objetivo, historia, acciones, reglas, retos y ayudas (de 1 a 20 elementos cada lista).', 400)
  }
  return solicitudRecibida(await enviarEducacion(rutaVersion(id, version) + 'modificar/', edicion))
}
