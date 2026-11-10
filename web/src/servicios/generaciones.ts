import { ErrorApi } from './django'
import { enviar, solicitar } from './http'

const raiz = '/api/edu/'
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const estados = ['pendiente', 'generando', 'comprobando', 'correccion', 'lista', 'fallida'] as const
export type EstadoGeneracion = typeof estados[number]
export type NombreEtapa = 'solicitud' | 'generacion' | 'comprobacion' | 'correccion' | 'mapa_base' | 'taller'
export type EstadoEtapa = 'en_progreso' | 'completada' | 'fallida'
export type EtapaGeneracion = { id: string; etapa: NombreEtapa; estado: EstadoEtapa; mensaje: string | null; creado_en: string }
export type ReparacionesJuego = { regla: number[]; textos: number[] }
export type ProcedenciaJuego = {
  proveedor: string; modelo: string; intentos: number; mapa_base: boolean
  catalogo?: { nombre: string; version: number }; reparaciones?: ReparacionesJuego
}
// Un juego nuevo lo crea el taller: su procedencia dice de qué trabajo salió, cuántos
// intentos necesitó y cuánto tardó, sin nombres de programas.
export type ProcedenciaTaller = { origen: 'taller'; trabajo: string; intentos: number; segundos: number }
export type ResumenGeneracion = {
  id: string; solicitud_id: string; propuesta_id: string; version_propuesta: number
  estado: EstadoGeneracion; paquete: string | null; procedencia: ProcedenciaJuego | ProcedenciaTaller | null
  ultimo_error: string | null; creado_en: string; actualizado_en: string
  // true: la prepara el taller. El panel no la procesa: solo espera a que esté lista.
  taller?: boolean
  // El docente le dio el OK: el juego aparece en la app de sus estudiantes.
  publicada?: boolean
}
export type Generacion = ResumenGeneracion & { etapas: EtapaGeneracion[] }

export const etiquetasEtapas: Record<NombreEtapa, string> = {
  // Spring guarda también la aceptación inicial: se muestra sin confundirla
  // con una llamada a la IA que todavía no ha comenzado.
  solicitud: 'Solicitud registrada',
  generacion: 'La IA escribe el juego',
  comprobacion: 'Kusi revisa que se pueda jugar',
  correccion: 'La IA corrige lo que faltaba',
  mapa_base: 'Se usan los caminos de respaldo',
  taller: 'Kusi crea el juego',
}
export const etiquetasEstados: Record<EstadoGeneracion, string> = {
  pendiente: 'Pendiente', generando: 'Escribiendo el juego', comprobando: 'Revisando el juego',
  correccion: 'Corrigiendo el juego', lista: 'Lista para jugar', fallida: 'No se pudo generar',
}
export const generacionTerminada = (estado: EstadoGeneracion) => estado === 'lista' || estado === 'fallida'
const objeto = (valor: unknown): valor is Record<string, unknown> => typeof valor === 'object' && valor !== null && !Array.isArray(valor)
const texto = (valor: unknown): valor is string => typeof valor === 'string' && !!valor.trim()
const identificador = (valor: unknown): valor is string => typeof valor === 'string' && uuid.test(valor)
const fecha = (valor: unknown): valor is string => typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(valor) && Number.isFinite(Date.parse(valor))
const enteroPositivo = (valor: unknown): valor is number => Number.isSafeInteger(valor) && Number(valor) > 0
// La misma regla que Spring y el reproductor: minúsculas sin tildes, números o guion bajo.
const patronFamilia = /^[a-z][a-z0-9_]{2,40}$/
function procedenciaTallerValida(valor: unknown): valor is ProcedenciaTaller {
  return objeto(valor) && valor.origen === 'taller' && identificador(valor.trabajo) && enteroPositivo(valor.intentos)
    && Number.isSafeInteger(valor.segundos) && Number(valor.segundos) >= 0
}
function nivelesReparadosValidos(valor: unknown): valor is number[] {
  return Array.isArray(valor) && valor.every((nivel) => enteroPositivo(nivel) && nivel <= 5) && new Set(valor).size === valor.length
}
function procedenciaValida(valor: unknown): valor is ProcedenciaJuego {
  return objeto(valor) && texto(valor.proveedor) && texto(valor.modelo) && enteroPositivo(valor.intentos) && typeof valor.mapa_base === 'boolean'
    && (valor.catalogo === undefined || (objeto(valor.catalogo) && texto(valor.catalogo.nombre) && enteroPositivo(valor.catalogo.version)))
    && (valor.reparaciones === undefined || (valor.mapa_base && objeto(valor.reparaciones)
      && nivelesReparadosValidos(valor.reparaciones.regla) && nivelesReparadosValidos(valor.reparaciones.textos)))
}
function etapaValida(valor: unknown): valor is EtapaGeneracion {
  return objeto(valor) && identificador(valor.id) && typeof valor.etapa === 'string' && Object.hasOwn(etiquetasEtapas, valor.etapa)
    && typeof valor.estado === 'string' && ['en_progreso', 'completada', 'fallida'].includes(valor.estado)
    && (valor.mensaje === null || typeof valor.mensaje === 'string') && fecha(valor.creado_en)
}
function resumenValido(valor: unknown): valor is ResumenGeneracion {
  if (!objeto(valor) || !identificador(valor.id) || !identificador(valor.solicitud_id) || !identificador(valor.propuesta_id)
    || !enteroPositivo(valor.version_propuesta) || typeof valor.estado !== 'string' || !estados.includes(valor.estado as EstadoGeneracion)
    || !(valor.paquete === null || texto(valor.paquete))
    || !(valor.procedencia === null || procedenciaValida(valor.procedencia) || procedenciaTallerValida(valor.procedencia))
    || !(valor.ultimo_error === null || typeof valor.ultimo_error === 'string') || !fecha(valor.creado_en) || !fecha(valor.actualizado_en)
    || !(valor.publicada === undefined || typeof valor.publicada === 'boolean')
    || !(valor.taller === undefined || typeof valor.taller === 'boolean')) return false
  // Solo se comprueba el sobre que necesita el iframe. Los caminos y las reglas
  // ya los validó HU31 en Spring; no duplicamos su validación pedagógica aquí.
  if (valor.estado === 'lista') {
    if (!texto(valor.paquete)) return false
    try {
      const paquete: unknown = JSON.parse(valor.paquete)
      if (!objeto(paquete) || paquete.formato !== 'kusi-paquete/0' || !Array.isArray(paquete.retos) || !paquete.retos.length) return false
      // El laberinto es de la biblioteca y no trae «trabajo». Un juego del taller trae su
      // familia y el id de su trabajo, que el reproductor usa para abrir su código.
      const deLaBiblioteca = paquete.familia === 'laberinto' && paquete.trabajo === undefined
      const delTaller = typeof paquete.familia === 'string' && patronFamilia.test(paquete.familia)
        && paquete.familia !== 'laberinto' && identificador(paquete.trabajo)
      if (!deLaBiblioteca && !delTaller) return false
    } catch { return false }
  }
  return true
}
function leerGeneracion(datos: unknown, comprobar: (generacion: Generacion) => boolean): Generacion {
  const valor = objeto(datos) ? datos.generacion : null
  if (!resumenValido(valor) || !('etapas' in valor) || !Array.isArray(valor.etapas) || !valor.etapas.every(etapaValida)
    || !comprobar(valor as Generacion)) throw new ErrorApi('No se pudo comprobar la generación. Consulta su estado de nuevo.', 502)
  return valor as Generacion
}
function comprobarId(id: string) {
  if (!identificador(id)) throw new ErrorApi('Identificador de generación o solicitud no válido.', 400)
  return id
}
export async function generarJuego(solicitud: string, version: number): Promise<Generacion> {
  comprobarId(solicitud)
  if (!enteroPositivo(version)) throw new ErrorApi('Versión no válida para generar el juego.', 400)
  return leerGeneracion(await enviar<unknown>(raiz + 'propuestas/solicitudes/' + solicitud + '/versiones/' + version + '/generar/', {}),
    (generacion) => generacion.solicitud_id === solicitud && generacion.version_propuesta === version)
}
// El docente le da el OK al juego y lo envía a la app de sus estudiantes.
export async function publicarGeneracion(id: string): Promise<Generacion> {
  return leerGeneracion(await enviar<unknown>(raiz + 'generaciones/' + comprobarId(id) + '/publicar/', {}),
    (generacion) => generacion.id === id && generacion.publicada === true)
}
export async function procesarGeneracion(id: string): Promise<Generacion> {
  // No hay un timeout corto ni reintentos automáticos del POST: Spring puede
  // tardar varios minutos y consultar su avance no debe iniciar otro proceso.
  return leerGeneracion(await enviar<unknown>(raiz + 'generaciones/' + comprobarId(id) + '/procesar/', {}), (generacion) => generacion.id === id)
}
export async function consultarGeneracion(id: string, signal?: AbortSignal): Promise<Generacion> {
  return leerGeneracion(await solicitar<unknown>(raiz + 'generaciones/' + comprobarId(id) + '/', { signal }), (generacion) => generacion.id === id)
}
export async function listarGeneraciones(solicitud: string, signal?: AbortSignal): Promise<ResumenGeneracion[]> {
  const datos = await solicitar<unknown>(raiz + 'propuestas/solicitudes/' + comprobarId(solicitud) + '/generaciones/', { signal })
  if (!objeto(datos) || !Array.isArray(datos.generaciones)
    || !datos.generaciones.every((valor: unknown) => resumenValido(valor) && valor.solicitud_id === solicitud)) {
    throw new ErrorApi('No se pudo comprobar el historial de juegos. Vuelve a cargarlo.', 502)
  }
  // Se ordena una copia para que la última sea inequívoca, incluso si un proxy
  // o una respuesta de pruebas cambia el orden que devuelve Spring.
  return (datos.generaciones as ResumenGeneracion[]).slice().sort((a, b) => Date.parse(b.creado_en) - Date.parse(a.creado_en))
}

// Un laberinto tarda segundos: se consulta cada 2. Un juego del taller tarda minutos:
// cada 5, como pidió el equipo, para no cargar a Spring.
export const INTERVALO_LABERINTO_MS = 2000
export const INTERVALO_TALLER_MS = 5000
export function observarGeneracion(id: string, signal: AbortSignal, alCambiar: (generacion: Generacion) => void, alFallar: (error: unknown) => void,
  intervaloMs = INTERVALO_LABERINTO_MS) {
  let temporizador: ReturnType<typeof setTimeout> | undefined
  const cancelar = () => clearTimeout(temporizador)
  signal.addEventListener('abort', cancelar, { once: true })
  async function consultar() {
    if (signal.aborted) return
    try {
      const generacion = await consultarGeneracion(id, signal)
      if (signal.aborted) return
      alCambiar(generacion)
      if (generacionTerminada(generacion.estado)) {
        signal.removeEventListener('abort', cancelar)
        return
      }
    } catch (error) {
      if (signal.aborted) return
      alFallar(error)
    }
    // Una consulta debe terminar antes de programar la siguiente: una conexión
    // lenta no acumula GET ni permite que una respuesta antigua pise la nueva.
    if (!signal.aborted) temporizador = setTimeout(() => void consultar(), intervaloMs)
  }
  void consultar()
}
