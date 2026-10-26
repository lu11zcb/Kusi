import type { EtapaGeneracion, EstadoEtapa, NombreEtapa, ProcedenciaJuego } from '../servicios/generaciones'

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

// La lista se obtiene del paquete guardado, no del ejemplo ni de todo el catálogo:
// así la procedencia solo enumera recursos que realmente usa esta generación.
export function recursosDelPaquete(paquete: string | null): string[] {
  try {
    const datos = JSON.parse(paquete || '{}')
    const tipos = new Set<string>()
    if (Array.isArray(datos.retos)) for (const nivel of datos.retos) {
      for (const campo of ['objetos', 'enemigos']) if (Array.isArray(nivel?.[campo])) {
        for (const elemento of nivel[campo]) if (typeof elemento?.tipo === 'string') tipos.add(elemento.tipo)
      }
    }
    return [...tipos]
  } catch { return [] }
}

const enumerarNiveles = (niveles: number[]) => niveles.length === 1 ? String(niveles[0])
  : niveles.slice(0, -1).join(', ') + ' y ' + niveles[niveles.length - 1]
const enNiveles = (niveles: number[]) => (niveles.length === 1 ? 'en el nivel ' : 'en los niveles ') + enumerarNiveles(niveles)

// La atribución depende exclusivamente del paquete y de los datos estructurados
// del servidor. Los mensajes de las etapas son texto para el docente y pueden
// cambiar de redacción; nunca se usan como un contrato de procedencia.
export function aportesDelJuego(procedencia: ProcedenciaJuego | null, paquete: string | null) {
  const aportes: string[] = []
  const reparaciones: string[] = []
  let niveles: number[] = []
  let historia = false
  try {
    const datos = JSON.parse(paquete || '{}')
    historia = typeof datos.historia === 'string' && !!datos.historia.trim()
    if (Array.isArray(datos.retos)) niveles = datos.retos.map((_: unknown, indice: number) => indice + 1)
  } catch { /* Los juegos antiguos pueden no conservar el paquete completo. */ }
  if (!procedencia) return { aportes, reparaciones, nota: 'El servicio no registró qué partes se conservaron de la respuesta.' }
  if (historia) aportes.push('La historia.')
  if (!procedencia.mapa_base) {
    aportes.push('Las reglas, los mapas, las consignas y las ayudas.')
    return { aportes, reparaciones, nota: null }
  }
  if (!procedencia.reparaciones) {
    return { aportes, reparaciones, nota: 'Este juego anterior no registra qué reglas, consignas o ayudas se conservaron de la respuesta.' }
  }
  const conservadas = niveles.filter((nivel) => !procedencia.reparaciones?.regla.includes(nivel))
  const textosConservados = niveles.filter((nivel) => !procedencia.reparaciones?.textos.includes(nivel))
  if (conservadas.length) aportes.push('La regla ' + enNiveles(conservadas) + '.')
  if (textosConservados.length) aportes.push('Las consignas y las ayudas ' + enNiveles(textosConservados) + '.')
  if (procedencia.reparaciones.regla.length) reparaciones.push('Kusi rehízo la regla ' + enNiveles(procedencia.reparaciones.regla) + '.')
  if (procedencia.reparaciones.textos.length) reparaciones.push('Kusi rehízo los textos ' + enNiveles(procedencia.reparaciones.textos) + '.')
  return { aportes, reparaciones, nota: null }
}
