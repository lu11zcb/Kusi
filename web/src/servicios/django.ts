export type Rol = 'administrador' | 'docente' | 'estudiante'
export type DatosRegistro = { nombre: string; correo: string; dni: string; rol: Rol | '' }
export type CampoRegistro = keyof DatosRegistro
export type ErroresRegistro = Partial<Record<CampoRegistro, string[]>>
// HU12: un estudiante puede no tener correo; se identifica con su DNI.
export type UsuarioSesion = { id: string; nombre: string; correo: string | null; dni?: string | null }
export type ContextoRegistro = { usuario: UsuarioSesion; csrf_token: string }
export type RegistroCreado = {
  usuario: UsuarioSesion & { rol: Rol }
  contrasena_temporal: string
}

export class ErrorApi extends Error {
  estado: number
  errores: ErroresRegistro

  constructor(mensaje: string, estado: number, errores: ErroresRegistro = {}) {
    super(mensaje)
    this.name = 'ErrorApi'
    this.estado = estado
    this.errores = errores
  }
}

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor)
}

function esUsuario(valor: unknown): valor is UsuarioSesion {
  return esObjeto(valor) && typeof valor.id === 'string'
    && typeof valor.nombre === 'string' && (typeof valor.correo === 'string' || valor.correo === null)
    && (valor.dni === undefined || valor.dni === null || typeof valor.dni === 'string')
}

function esRol(valor: unknown): valor is Rol {
  return valor === 'administrador' || valor === 'docente' || valor === 'estudiante'
}

function leerErrores(valor: unknown): ErroresRegistro {
  if (!esObjeto(valor)) return {}
  const errores: ErroresRegistro = {}
  for (const campo of ['nombre', 'correo', 'dni', 'rol'] as const) {
    const detalles = valor[campo]
    if (Array.isArray(detalles)) {
      errores[campo] = detalles.flatMap((detalle: unknown) =>
        esObjeto(detalle) && typeof detalle.message === 'string' ? [detalle.message] : [],
      )
    }
  }
  return errores
}

async function leerRespuesta(respuesta: Response, mensajeAlternativo: string): Promise<unknown> {
  const datos: unknown = await respuesta.json().catch(() => null)
  if (!respuesta.ok) {
    throw new ErrorApi(
      esObjeto(datos) && typeof datos.mensaje === 'string' ? datos.mensaje : mensajeAlternativo,
      respuesta.status,
      esObjeto(datos) ? leerErrores(datos.errores) : {},
    )
  }
  return datos
}

export async function obtenerContextoRegistro(signal?: AbortSignal): Promise<ContextoRegistro> {
  const respuesta = await fetch('/api/cuentas/registro/contexto/', {
    credentials: 'same-origin',
    mode: 'same-origin',
    cache: 'no-store',
    signal,
    headers: { Accept: 'application/json' },
  })
  const datos = await leerRespuesta(respuesta, 'No se pudo comprobar el acceso. Intenta de nuevo.')
  if (!esObjeto(datos) || !esUsuario(datos.usuario) || typeof datos.csrf_token !== 'string' || !datos.csrf_token) {
    throw new ErrorApi('No se pudo comprobar el acceso. Recarga la página.', respuesta.status)
  }
  return { usuario: datos.usuario, csrf_token: datos.csrf_token }
}

export async function registrarUsuario(datos: DatosRegistro): Promise<RegistroCreado> {
  // Renueva CSRF por si la sesión cambió en otra pestaña. Nunca reintenta el POST.
  const contexto = await obtenerContextoRegistro()
  const mensajeIncierto = 'No se pudo confirmar el registro. Comprueba la conexión y verifica el correo antes de volver a enviarlo.'
  let respuesta: Response
  try {
    respuesta = await fetch('/api/cuentas/usuarios/', {
      method: 'POST',
      credentials: 'same-origin',
      mode: 'same-origin',
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-CSRFToken': contexto.csrf_token,
      },
      body: JSON.stringify(datos),
    })
  } catch {
    throw new ErrorApi(mensajeIncierto, 0)
  }
  const creado = await leerRespuesta(respuesta, mensajeIncierto)
  if (!esObjeto(creado) || !esUsuario(creado.usuario)
    || !('rol' in creado.usuario)
    || !esRol(creado.usuario.rol)
    || typeof creado.contrasena_temporal !== 'string' || creado.contrasena_temporal.length !== 10) {
    throw new ErrorApi(mensajeIncierto, respuesta.status)
  }
  return {
    usuario: {
      id: creado.usuario.id,
      nombre: creado.usuario.nombre,
      correo: creado.usuario.correo,
      dni: creado.usuario.dni ?? null,
      rol: creado.usuario.rol,
    },
    contrasena_temporal: creado.contrasena_temporal,
  }
}
