import type { Rol, UsuarioSesion } from './django'
import { ErrorApi } from './django'
import { enviar, solicitar } from './http'

export type Cuenta = UsuarioSesion & { roles: Rol[]; debe_cambiar_contrasena: boolean }
export type Sesion = { usuario: Cuenta | null; csrf_token: string }

export async function obtenerSesion(signal?: AbortSignal): Promise<Sesion> {
  const datos = await solicitar<Sesion>('/api/acceso/sesion/', { signal })
  const usuario = datos.usuario
  if (typeof datos.csrf_token !== 'string' || (usuario !== null && (
    !usuario || typeof usuario.id !== 'string' || typeof usuario.correo !== 'string'
    || typeof usuario.nombre !== 'string' || typeof usuario.debe_cambiar_contrasena !== 'boolean'
    || !Array.isArray(usuario.roles) || !usuario.roles.every((rol) => ['administrador', 'docente', 'estudiante'].includes(rol))
  ))) throw new ErrorApi('No se pudo comprobar la sesión. Recarga la página.', 0)
  return datos
}

export const ingresar = (correo: string, contrasena: string) => enviar<Sesion>('/api/acceso/ingreso/', { correo, contrasena })
export const salir = () => enviar<Sesion>('/api/acceso/salida/', {})
export const cambiarContrasena = (datos: { contrasena_actual: string; nueva_contrasena: string; confirmacion: string }) =>
  enviar<Sesion>('/api/acceso/contrasena/', datos)
