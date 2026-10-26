import { enviar } from './http'
import { ErrorApi } from './django'

export type AvisoPartida = { tipo: string; partida: string; orden: number; momento: string; nivel?: number; ayuda?: number; [campo: string]: unknown }
export type ResumenPartida = { partida: string; prueba_docente: boolean; ayudas_usadas: number; niveles_completados: number; termino: boolean }
const objeto = (dato: unknown): dato is Record<string, unknown> => !!dato && typeof dato === 'object' && !Array.isArray(dato)
export function avisoValido(dato: unknown): dato is AvisoPartida {
  if (!objeto(dato) || typeof dato.partida !== 'string' || !/^[A-Za-z0-9-]{1,120}$/.test(dato.partida)
    || !Number.isSafeInteger(dato.orden) || Number(dato.orden) < 1 || Number(dato.orden) > 100000
    || typeof dato.tipo !== 'string' || !['listo', 'inicio', 'accion', 'ayuda', 'reto_completado', 'fin', 'fallo'].includes(dato.tipo)
    || typeof dato.momento !== 'string' || !Number.isFinite(Date.parse(dato.momento)) || JSON.stringify(dato).length > 8192) return false
  if ((dato.nivel !== undefined || ['ayuda', 'reto_completado'].includes(dato.tipo))
    && (!Number.isSafeInteger(dato.nivel) || Number(dato.nivel) < 1 || Number(dato.nivel) > 5)) return false
  return !('ayuda' in dato || dato.tipo === 'ayuda') || (Number.isSafeInteger(dato.ayuda) && Number(dato.ayuda) >= 1 && Number(dato.ayuda) <= 2)
}
export function avisoDelIframe(evento: Pick<MessageEvent, 'source' | 'origin' | 'data'>, ventana: Window | null, origen: string): AvisoPartida | null {
  if (!ventana || evento.source !== ventana || evento.origin !== origen || !objeto(evento.data) || evento.data.tipo !== 'aviso') return null
  return avisoValido(evento.data.aviso) ? evento.data.aviso : null
}
export async function guardarAviso(aviso: AvisoPartida): Promise<ResumenPartida> {
  if (!avisoValido(aviso)) throw new ErrorApi('El aviso de esta prueba no es válido.', 400)
  const datos = await enviar<unknown>('/api/edu/partidas/avisos/', { aviso })
  const resumen = objeto(datos) ? datos.resumen : null
  if (!objeto(datos) || datos.guardado !== true || !objeto(resumen) || resumen.partida !== aviso.partida
    || typeof resumen.prueba_docente !== 'boolean' || typeof resumen.termino !== 'boolean'
    || !Number.isSafeInteger(resumen.ayudas_usadas) || Number(resumen.ayudas_usadas) < 0
    || !Number.isSafeInteger(resumen.niveles_completados) || Number(resumen.niveles_completados) < 0 || Number(resumen.niveles_completados) > 5) {
    throw new ErrorApi('No se pudo confirmar el registro de esta prueba.', 502)
  }
  return resumen as ResumenPartida
}

// Una cola por iframe conserva el orden y comparte la promesa de un mismo aviso.
// Si se pierde la respuesta se permite reenviar exactamente el original: Spring
// tiene la última palabra sobre la unicidad (partida, orden).
export class RegistroAvisos {
  private cola: Promise<unknown> = Promise.resolve()
  private operaciones = new Map<string, Promise<ResumenPartida>>()
  readonly pendientes = new Map<string, AvisoPartida>()
  private enviarAviso: typeof guardarAviso
  constructor(enviarAviso = guardarAviso) { this.enviarAviso = enviarAviso }
  registrar(aviso: AvisoPartida): Promise<ResumenPartida> {
    const clave = aviso.partida + ':' + aviso.orden
    const anterior = this.operaciones.get(clave)
    if (anterior) return anterior
    this.pendientes.set(clave, aviso)
    const operacion = this.cola.catch(() => undefined).then(() => this.enviarAviso(aviso))
      .then((resumen) => { this.pendientes.delete(clave); return resumen })
      .catch((error: unknown) => { this.operaciones.delete(clave); throw error })
    this.operaciones.set(clave, operacion)
    this.cola = operacion
    return operacion
  }
}
