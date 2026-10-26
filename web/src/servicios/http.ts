import { ErrorApi } from './django'

export async function solicitar<T>(ruta: string, opciones: RequestInit = {}): Promise<T> {
  let respuesta: Response
  try {
    respuesta = await fetch(ruta, {
      ...opciones, credentials: 'same-origin', mode: 'same-origin', cache: 'no-store',
      headers: { Accept: 'application/json', ...opciones.headers },
    })
  } catch {
    throw new ErrorApi(opciones.method && opciones.method !== 'GET'
      ? 'No se pudo confirmar la operación. Comprueba lo guardado antes de volver a enviarla.'
      : 'No se pudo conectar. Comprueba la conexión e intenta de nuevo.', 0)
  }
  const datos = await respuesta.json().catch(() => null)
  if (!respuesta.ok || !datos) {
    const errores: Record<string, string[]> = {}
    for (const [campo, detalles] of Object.entries(datos?.errores ?? {})) {
      if (Array.isArray(detalles)) errores[campo] = detalles.flatMap((detalle) =>
        typeof detalle?.message === 'string' ? [detalle.message] : [],
      )
    }
    throw new ErrorApi(typeof datos?.mensaje === 'string' ? datos.mensaje : 'No se pudo completar la operación.', respuesta.status, errores)
  }
  return datos as T
}

export async function enviar<T>(ruta: string, datos: unknown, metodo = 'POST'): Promise<T> {
  // Django y Spring verifican tokens distintos aunque compartan la sesión.
  // Las rutas educativas renuevan el CSRF de Spring; el resto conserva Django.
  const educativo = ruta.startsWith('/api/edu/')
  const contexto = await solicitar<{ csrf_token: unknown }>(educativo ? '/api/edu/acceso/csrf/' : '/api/acceso/sesion/')
  if (typeof contexto.csrf_token !== 'string' || !contexto.csrf_token.trim() || contexto.csrf_token.length > 512) {
    throw new ErrorApi('Recarga la página para comprobar la seguridad.', educativo ? 403 : 0)
  }
  return solicitar<T>(ruta, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', [educativo ? 'X-XSRF-TOKEN' : 'X-CSRFToken']: contexto.csrf_token },
    body: JSON.stringify(datos),
  })
}
