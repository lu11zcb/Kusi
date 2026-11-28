// El límite de un rol suspende el trabajo antes de contar el intento o comprobar la entrega.
import path from 'node:path'
import { escribirJson, leerJson } from './carpeta.js'
import { armarComando, consumoDe } from './roles.js'

export const INTERVALO_SONDEO_MS = 15 * 60 * 1000
// Hasta cuánto antes de ahora una hora de vuelta sin fecha todavía se entiende como la de hoy.
const HORA_RECIEN_PASADA_MS = 5 * 60 * 1000
const LIMITE = /\b(?:session|usage) limit\b|\bl[ií]mite (?:de uso|de sesi[oó]n)\b/i
const REINICIO = /\b(?:try again at|resets?(?: at)?|vuelve a las)\s+([\d][^\r\n]*)/i
const ROL_NOMBRADO = /^(?:PAUSA\s+)?(supervisor|programador|dibujante|revisor|proponedor)\s*:/im

export function resultadoDePausa(pausa) {
  const aviso = 'PAUSA ' + pausa.rol + ': límite de uso' +
    (pausa.sondear ? '' : '; vuelve a las ' + new Date(pausa.hasta).toISOString())
  return { pasa: false, siguiente: 'pausa', pausa, aviso }
}

function pausaInformada(datos) {
  if (typeof datos === 'string') {
    try { datos = JSON.parse(datos) } catch { return null }
  }
  // Un lote sigue devolviendo una lista. Basta con que una pieza haya informado la pausa.
  const resultados = Array.isArray(datos) ? datos : [datos]
  for (const resultado of resultados) {
    const pausa = resultado?.pausa
    if (resultado?.siguiente === 'pausa' && pausa && ['programador', 'dibujante'].includes(pausa.rol) &&
      typeof pausa.sondear === 'boolean' && Number.isSafeInteger(pausa.hasta) && Number.isFinite(new Date(pausa.hasta).getTime())) {
      return pausa
    }
  }
  return null
}

function horaDeReinicio(texto, ahora) {
  const fecha = /^\d{4}-\d{2}-\d{2}T[\d:.]+(?:Z|[+-]\d{2}:?\d{2})?/i.exec(texto)
  if (fecha) {
    const instante = Date.parse(fecha[0])
    return instante > ahora ? instante : null
  }
  const hora = /^(\d{1,2})(?::(\d{2}))?\s*([ap]\.?m\.?)?\b/i.exec(texto)
  if (!hora || (!hora[2] && !hora[3])) return null
  let horas = Number(hora[1])
  const minutos = Number(hora[2] ?? 0)
  if (minutos > 59 || horas > 23 || (hora[3] && (horas < 1 || horas > 12))) return null
  if (hora[3]) horas = horas % 12 + (/^p/i.test(hora[3]) ? 12 : 0)
  const vuelta = new Date(ahora)
  vuelta.setHours(horas, minutos, 0, 0)
  if (vuelta.getTime() <= ahora) {
    // El aviso da la hora sin segundos: «8:58 PM» puede ser las 20:58:49 aunque ya sean las 20:58:02.
    // Una hora que pasó hace poco es la de hoy y el rol se prueba en un minuto; solo una que pasó hace
    // rato es la de mañana (pasó el 27 de noviembre: el juego se pausó 24 horas por 47 segundos).
    if (ahora - vuelta.getTime() < HORA_RECIEN_PASADA_MS) return ahora + 60 * 1000
    vuelta.setDate(vuelta.getDate() + 1)
  }
  return vuelta.getTime()
}

// Se mira la respuesta y los errores por separado. Los campos de comandos y pedidos
// de un evento JSON pueden repetir ejemplos y no son respuestas del rol.
export function limiteDe(ejecucion, rol, ahora) {
  const mensajes = []
  for (const salida of [ejecucion.salida, ejecucion.errores]) {
    for (const linea of (salida ?? '').split('\n')) {
      let evento
      try { evento = JSON.parse(linea) } catch { mensajes.push({ texto: linea }); continue }
      const detalle = evento?.item
      // Solo se lee el resultado del comando. El texto del pedido puede contener el mismo ejemplo de pausa.
      const reportada = pausaInformada(evento) ?? pausaInformada(evento?.result) ??
        pausaInformada(detalle?.type === 'command_execution' ? detalle.aggregated_output : detalle?.type === 'agent_message' ? detalle.text : null)
      if (reportada) return reportada
      mensajes.push({ rol: evento?.rol ?? evento?.item?.rol, texto: evento?.result ?? evento?.error?.message ??
        evento?.message ?? (evento?.item?.type === 'agent_message' ? evento.item.text : null) })
    }
  }
  let pausa = null
  for (const mensaje of mensajes) {
    if (typeof mensaje.texto !== 'string') continue
    const texto = mensaje.texto.replace(/\x1b\[[0-9;]*m/g, '')
    const reinicio = REINICIO.exec(texto)
    if (!LIMITE.test(texto) && !reinicio) continue
    const nombrado = ROL_NOMBRADO.exec(texto)
    const rolDelLimite = mensaje.rol ?? nombrado?.[1]?.toLowerCase() ?? rol
    const hasta = reinicio ? horaDeReinicio(reinicio[1], ahora) : null
    if (hasta !== null) return { rol: rolDelLimite, hasta, sondear: false }
    pausa ??= { rol: rolDelLimite, hasta: ahora + INTERVALO_SONDEO_MS, sondear: true }
  }
  return pausa
}

export function horaLocal(instante) {
  return new Date(instante).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
}

export async function leerPausa(carpeta) {
  try {
    return await leerJson(path.join(carpeta, 'pausa.json'))
  } catch (error) {
    if (error.code === 'ENOENT') return null
    throw error
  }
}

// La prueba de disponibilidad usa el mismo rol con un pedido breve y una carpeta
// temporal. Si el revisor vive dentro del supervisor, solo le pide esa comprobación.
function pruebaDelRol({ pausa, roles, lanzar, valores }) {
  const rol = pausa.rol === 'revisor' && !roles.revisor ? 'supervisor' : pausa.rol
  const pedido = pausa.rol === 'revisor' && rol === 'supervisor'
    ? 'Pide al revisor que responda OK. Devuelve solo su respuesta o el aviso de límite, precedido por «revisor:».'
    : 'Responde solo OK. No leas ni escribas archivos.'
  return async (ahora) => {
    const comando = armarComando(roles[rol], {
      ...valores, pedido, carpeta: valores.temporal, instrucciones: '', agentes: rol === 'supervisor' ? valores.agentes ?? '{}' : '{}',
    })
    const ejecucion = await lanzar(comando, { limiteMs: 30_000 })
    const limite = limiteDe(ejecucion, pausa.rol, ahora)
    if (limite) return limite
    const consumo = consumoDe(ejecucion.salida ?? '')
    if (ejecucion.codigo === 0 && !ejecucion.agotado && !consumo.con_error && /^\s*OK[.!]?\s*$/i.test(consumo.respuesta ?? '')) return null
    return { ...pausa, hasta: ahora + INTERVALO_SONDEO_MS }
  }
}

export async function pausarTrabajo({ trabajo, carpeta, estado, pausa, buzon, evidencia, roles, lanzar, valores, registrar }) {
  const guardar = async (limite) => {
    const hora = horaLocal(limite.hasta)
    const motivo = 'En pausa por límite de uso hasta las ' + hora + ' (' + limite.rol +
      (limite.sondear ? ', próxima comprobación).' : ').')
    registrar('Pausado: ' + limite.rol + ' llegó a su límite de uso; ' +
      (limite.sondear ? 'próxima comprobación a las ' : 'vuelve a las ') + hora)
    try {
      // El supervisor también escribe evidencia.json. El estado del trabajador queda
      // aparte para conservar sus intentos y los motivos exactos de una corrección.
      await escribirJson(path.join(carpeta, 'pausa.json'), { ...estado, pausa: limite })
      await escribirJson(path.join(carpeta, 'evidencia.json'), await evidencia('en pausa', motivo, limite))
    } catch (error) {
      registrar('No pude guardar la pausa del trabajo ' + trabajo.id + ': ' + error.message)
    }
    return motivo
  }
  const motivo = await guardar(pausa)
  try {
    const probar = pausa.sondear ? pruebaDelRol({ pausa, roles, lanzar, valores }) : null
    const respuesta = await buzon.pausar(trabajo, { pausa, motivo, probar, guardar })
    if (respuesta.estado !== 200 && respuesta.estado !== 204) {
      registrar('Spring no confirmó que el trabajo ' + trabajo.id + ' volvió a pendiente (' + respuesta.estado + ').')
    }
  } catch (error) {
    // Una pérdida de conexión o una ruta sin desplegar nunca convierten la pausa en fallo.
    registrar('No pude confirmar la pausa de ' + trabajo.id + ' en Spring: ' + error.message)
  }
  return { resultado: 'en pausa', motivo, pausa }
}
