import type { EtapaGeneracion, EstadoEtapa, NombreEtapa } from '../servicios/generaciones'

export const etiquetaReglaJuego = (regla: 'orden' | 'solo_clase' | null | undefined) => regla === 'orden'
  ? 'Seguir el orden (patrones)' : regla === 'solo_clase' ? 'Solo una clase (clasificar)' : 'Pendiente de elegir'
export type PasoGeneracion = { id: string; etapa: NombreEtapa; estado: EstadoEtapa; mensaje: string | null; inicio: string; fin: string | null }
export function pasosDeGeneracion(etapas: EtapaGeneracion[]): PasoGeneracion[] {
  const pasos: PasoGeneracion[] = []
  for (const evento of etapas) {
    // Las etapas son eventos, no filas que Spring actualice. Emparejamos cada
    // cierre con su inicio sin mezclar los distintos intentos de corrección.
    const pendiente = evento.estado === 'en_progreso' ? -1 : pasos.findLastIndex((paso) => paso.etapa === evento.etapa && paso.estado === 'en_progreso')
    if (pendiente >= 0) pasos[pendiente] = { ...pasos[pendiente], estado: evento.estado, mensaje: evento.mensaje, fin: evento.creado_en }
    else pasos.push({ id: evento.id, etapa: evento.etapa, estado: evento.estado, mensaje: evento.mensaje, inicio: evento.creado_en, fin: evento.estado === 'en_progreso' ? null : evento.creado_en })
  }
  return pasos
}
export function problemasDeComprobacion(etapa: EtapaGeneracion): string[] {
  if (etapa.etapa !== 'comprobacion' || etapa.estado !== 'fallida' || !etapa.mensaje?.trim()) return []
  const lineas = etapa.mensaje.split('\n').map((linea) => linea.trim()).filter(Boolean)
  // Spring antepone «Intento N: X problemas». Se conserva el aviso de problemas
  // adicionales truncados; ningún diagnóstico devuelto por HU31 se inventa aquí.
  return lineas.length > 1 && /: \d+ problemas?$/.test(lineas[0]) ? lineas.slice(1) : lineas
}
export function segundosTranscurridos(inicio: string, fin: string | null, ahora: number): number {
  return Math.max(0, Math.floor(((fin ? Date.parse(fin) : ahora) - Date.parse(inicio)) / 1000))
}

export function direccionVistaPrevia(configurada?: string) {
  const direccion = new URL(configurada?.trim() || 'http://127.0.0.1:5174/')
  if (!['http:', 'https:'].includes(direccion.protocol) || direccion.username || direccion.password) throw new Error('La dirección del juego no es válida.')
  direccion.searchParams.set('paquete', 'mensaje')
  return { url: direccion.href, origen: direccion.origin }
}
export type AvisoVistaPrevia = { estado: 'cargando' } | { estado: 'lista'; niveles: number } | { estado: 'error'; motivo: string }
export function atenderMensajeJuego(evento: Pick<MessageEvent, 'source' | 'origin' | 'data'>, ventana: Window | null, origen: string, paquete: string): AvisoVistaPrevia | null {
  // El origen solo no basta: otra ventana del mismo servidor tampoco puede
  // hacerse pasar por la vista previa que está viendo este docente.
  if (!ventana || evento.source !== ventana || evento.origin !== origen) return null
  const datos: unknown = evento.data
  if (!datos || typeof datos !== 'object' || Array.isArray(datos)) return null
  if ('tipo' in datos && datos.tipo === 'listo') {
    ventana.postMessage({ tipo: 'paquete', paquete }, origen)
    return { estado: 'cargando' }
  }
  if ('tipo' in datos && datos.tipo === 'cargado' && 'niveles' in datos && typeof datos.niveles === 'number' && Number.isSafeInteger(datos.niveles) && datos.niveles > 0) {
    return { estado: 'lista', niveles: datos.niveles }
  }
  if ('tipo' in datos && datos.tipo === 'error' && 'motivo' in datos && typeof datos.motivo === 'string' && datos.motivo.trim()) {
    return { estado: 'error', motivo: datos.motivo }
  }
  return null
}
