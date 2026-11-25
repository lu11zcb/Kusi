import { solicitar } from './http'

// ultimo_juego_en: cuándo llegó a su cantidad (con los mismos juegos, va primero quien llegó antes).
export type DocenteConJuegos = { id: string; nombre: string; juegos_creados: number; ultimo_juego_en?: string | null }
export type ResumenJuegosAdministracion = {
  totales: { creados: number; publicados: number; en_preparacion: number }
  docentes: DocenteConJuegos[]
}
export type EstadoJuegoAdministrado = 'generando' | 'listo_para_probar' | 'publicado' | 'retirado' | 'fallido'
export type JuegoAdministrado = {
  id: string
  titulo: string
  curso: string
  seccion: string | null
  anio_escolar: number | null
  estado: EstadoJuegoAdministrado
  creado_en: string
  fallo_generacion: boolean
}

const ruta = '/api/edu/administracion/juegos/'
export const consultarResumenJuegos = (signal?: AbortSignal) => solicitar<ResumenJuegosAdministracion>(ruta, { signal })
export const consultarJuegosDocente = (docente: string, signal?: AbortSignal) =>
  solicitar<{ juegos: JuegoAdministrado[] }>(ruta + encodeURIComponent(docente) + '/', { signal })

// Todo lo que pasó con un juego (solo el administrador): lo que escribió el docente, las
// versiones de la propuesta con sus correcciones y cada guion con sus comprobaciones.
export type PedidoJuego = { tema: string; objetivo_docente: string | null; instrucciones: string | null; proposito: string; creado_en: string }
export type VersionPropuestaJuego = {
  version: number; titulo: string | null; origen: 'ia' | 'docente'; autor: string | null; version_base: number | null
  observaciones: string | null; estado_revision: 'pendiente' | 'aprobada' | 'rechazada'; revisada_en: string | null; creado_en: string
  contenido: { objetivo?: string; historia?: string; acciones?: string[]; reglas?: string[]; retos?: string[]; ayudas?: string[]; recursos?: string[] | null }
  fuentes: { documento?: string; referencia?: string; tema?: string }[] | null
}
export type EtapaJuego = { etapa: string; estado: string; mensaje: string | null; creado_en: string }
export type GeneracionJuego = {
  id: string; version_propuesta: number; estado: string; taller: boolean; publicada: boolean; publicada_en: string | null
  creado_en: string; ultimo_error: string | null; etapas: EtapaJuego[]; guion: unknown
}
export type DetalleJuegoAdministrado = {
  juego: JuegoAdministrado; docente_id: string; pedido: PedidoJuego
  versiones: VersionPropuestaJuego[]; generaciones: GeneracionJuego[]
}
export const consultarDetalleJuego = (juego: string, signal?: AbortSignal) =>
  solicitar<DetalleJuegoAdministrado>(ruta + 'detalle/' + encodeURIComponent(juego) + '/', { signal })
