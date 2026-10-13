import type { Rol, UsuarioSesion } from './django'
import { enviar, solicitar } from './http'

export type UsuarioAdministrado = UsuarioSesion & { roles: Rol[]; debe_cambiar_contrasena: boolean; activo: boolean }
export type CambioUsuario = {
  id: number; tipo: string; fecha: string; administrador_id: string; administrador: string
  anterior: Record<string, unknown>; actual: Record<string, unknown>
}
export type DetalleUsuario = { usuario: UsuarioAdministrado; historial: CambioUsuario[] }
export const listarUsuarios = (buscar: string, pagina: number) => solicitar<{
  usuarios: UsuarioAdministrado[]; pagina: number; paginas: number; total: number
}>('/api/cuentas/usuarios/listado/?' + new URLSearchParams({ buscar, pagina: String(pagina) }))
export const consultarUsuario = (id: string) => solicitar<DetalleUsuario>('/api/cuentas/usuarios/' + encodeURIComponent(id) + '/')
export const asignarRoles = (id: string, roles: Rol[]) => enviar<{ usuario: UsuarioAdministrado }>(
  '/api/cuentas/usuarios/' + encodeURIComponent(id) + '/roles/', { roles },
)
export const editarUsuario = (id: string, datos: { nombre: string; correo: string }) => enviar<{ usuario: UsuarioAdministrado }>(
  '/api/cuentas/usuarios/' + encodeURIComponent(id) + '/datos/', datos, 'PATCH',
)

export const cambiarEstadoUsuario = (id: string, activo: boolean) => enviar<{ mensaje: string; usuario: UsuarioAdministrado }>(
  '/api/cuentas/usuarios/' + encodeURIComponent(id) + '/estado/', { activo },
)

// Una escritura confirmada sigue guardada aunque falle la consulta posterior.
export async function refrescarUsuarioGuardado(usuario: UsuarioAdministrado, usuarioActualId: string, actualizarAcceso: () => Promise<void>): Promise<{ detalle: DetalleUsuario | null; aviso: string }> {
  if (usuario.id === usuarioActualId) {
    try { await actualizarAcceso() }
    catch { return { detalle: null, aviso: 'El cambio ya se guardó, pero no se pudo actualizar tu acceso. Recarga la página antes de continuar.' } }
    if (!usuario.activo || !usuario.roles.includes('administrador')) return { detalle: null, aviso: '' }
  }
  try { return { detalle: await consultarUsuario(usuario.id), aviso: '' } }
  catch { return { detalle: null, aviso: 'El cambio ya se guardó, pero no se pudo actualizar el historial. Vuelve a consultar la cuenta.' } }
}
