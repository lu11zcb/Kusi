import { ErrorApi } from './django'
import { solicitar } from './http'

const raiz = '/api/edu/'
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export type ContextoPropuesta = {
  curso_id: string; curso_nombre: string; grado: 1
  seccion_id: string | null; seccion_nombre: string | null; anio_escolar: number | null
}
export type ContextosPropuestas = { contextos: ContextoPropuesta[]; ia_configurada: boolean }
export type EntradaPropuesta = { curso_id: string; seccion_id: string | null; tema: string; objetivo: string }
export type DatosSolicitud = Omit<EntradaPropuesta, 'objetivo'> & { id_solicitud: string; objetivo: string | null }
export type Propuesta = {
  id: string; objetivo: string; origen_objetivo: 'docente' | 'ia'; historia: string
  acciones: string[]; reglas: string[]; retos: string[]; ayudas: string[]
}
export type SolicitudPropuesta = {
  id_solicitud: string; curso_id: string; seccion_id: string | null; tema: string
  objetivo_docente: string | null; estado: 'pendiente' | 'generando' | 'generada' | 'fallida'
  propuesta: Propuesta | null
}

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
  return {
    id_solicitud: id, curso_id: entrada.curso_id, seccion_id: entrada.seccion_id,
    tema: entrada.tema.trim(), objetivo: entrada.objetivo.trim() ? entrada.objetivo : null,
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
