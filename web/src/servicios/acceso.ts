import type { Rol, UsuarioSesion } from './django'
import { ErrorApi } from './django'
import { enviar, solicitar } from './http'
import { olvidarSesionDeEstaPestana, recordarSesionDeEstaPestana } from './sesionPestana'

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

// Entrar y cambiar la contraseña renuevan la sesión de esta pestaña; salir la olvida (sesionPestana.ts).
export async function ingresar(correo: string, contrasena: string) {
  const datos = await enviar<Sesion>('/api/acceso/ingreso/', { correo, contrasena })
  recordarSesionDeEstaPestana(datos)
  return datos
}
export async function salir() {
  try { return await enviar<Sesion>('/api/acceso/salida/', {}) }
  finally { olvidarSesionDeEstaPestana() }
}
export async function cambiarContrasena(datos: { contrasena_actual: string; nueva_contrasena: string; confirmacion: string }) {
  const respuesta = await enviar<Sesion>('/api/acceso/contrasena/', datos)
  recordarSesionDeEstaPestana(respuesta)
  return respuesta
}
