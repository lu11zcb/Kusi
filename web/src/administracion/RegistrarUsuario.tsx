import { useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import type { FormEvent } from 'react'
import { CampoFormulario } from '../componentes/CampoFormulario'
import { ErrorApi, registrarUsuario } from '../servicios/django'
import type { DatosRegistro, ErroresRegistro, RegistroCreado, Rol } from '../servicios/django'

const datosVacios: DatosRegistro = { nombre: '', correo: '', rol: '' }
const nombresRol: Record<Rol, string> = {
  administrador: 'Administrador', docente: 'Docente', estudiante: 'Estudiante',
}

export function RegistrarUsuario({ alCambiarBloqueo }: { alCambiarBloqueo?: (bloqueado: boolean) => void }) {
  const [datos, establecerDatos] = useState<DatosRegistro>(datosVacios)
  const [errores, establecerErrores] = useState<ErroresRegistro>({})
  const [mensaje, establecerMensaje] = useState('')
  const [estadoError, establecerEstadoError] = useState<number | null>(null)
  const [enviando, establecerEnviando] = useState(false)
  const [resultado, establecerResultado] = useState<RegistroCreado | null>(null)
  const bloqueoEnvio = useRef(false)
  const nombre = useRef<HTMLInputElement>(null)
  const confirmacion = useRef<HTMLElement>(null)
  const resumenError = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    if (resultado) confirmacion.current?.focus()
    else nombre.current?.focus()
  }, [resultado])

  useEffect(() => {
    if (mensaje) resumenError.current?.focus()
  }, [mensaje])

  useEffect(() => {
    // No conservar la contraseña cuando el navegador abandona esta página.
    // Vacía también el DOM antes de que el navegador pueda guardar la página.
    const descartar = () => flushSync(() => { establecerResultado(null); alCambiarBloqueo?.(false) })
    window.addEventListener('pagehide', descartar)
    return () => window.removeEventListener('pagehide', descartar)
  }, [alCambiarBloqueo])

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (bloqueoEnvio.current) return
    bloqueoEnvio.current = true
    alCambiarBloqueo?.(true)
    let creado = false
    establecerEnviando(true)
    establecerMensaje('')
    establecerEstadoError(null)
    establecerErrores({})
    try {
      establecerResultado(await registrarUsuario(datos))
      creado = true
      establecerDatos(datosVacios)
    } catch (error: unknown) {
      if (error instanceof ErrorApi) {
        establecerMensaje(error.message)
        establecerEstadoError(error.estado)
        establecerErrores(error.errores)
      } else {
        establecerMensaje('No se pudo comprobar el acceso. Comprueba la conexión e intenta de nuevo.')
      }
    } finally {
      bloqueoEnvio.current = false
      establecerEnviando(false)
      // La confirmación también retiene el panel hasta cerrarla expresamente.
      if (!creado) alCambiarBloqueo?.(false)
    }
  }

  if (resultado) {
    return (
      <section className="confirmacion" aria-labelledby="titulo-confirmacion" ref={confirmacion} tabIndex={-1}>
        <h2 id="titulo-confirmacion">Usuario registrado</h2>
        <dl>
          <dt>Nombre</dt><dd>{resultado.usuario.nombre}</dd>
          <dt>Correo</dt><dd>{resultado.usuario.correo}</dd>
          <dt>Rol</dt><dd>{nombresRol[resultado.usuario.rol]}</dd>
          <dt>Contraseña temporal</dt><dd><code className="contrasena">{resultado.contrasena_temporal}</code></dd>
        </dl>
        <p>Entrégala ahora. Al cerrar esta confirmación, no podrás volver a consultarla. La cuenta deberá cambiarla al ingresar.</p>
        <button type="button" onClick={() => { establecerResultado(null); alCambiarBloqueo?.(false) }}>Cerrar y registrar otra cuenta</button>
      </section>
    )
  }

  return (
    <form onSubmit={enviar} noValidate aria-busy={enviando}>
      <p>Todos los campos son obligatorios.</p>
      {mensaje && <p className="error-resumen" role="alert" tabIndex={-1} ref={resumenError}>{mensaje}</p>}
      {estadoError === 401 && <p><a href="/">Volver a iniciar sesión</a></p>}
      <fieldset disabled={enviando}>
        <legend className="solo-lectores">Datos de la cuenta</legend>
        <CampoFormulario id="nombre" etiqueta="Nombre" errores={errores.nombre}>
          <input ref={nombre} id="nombre" name="nombre" autoComplete="off" required maxLength={150}
            value={datos.nombre} onChange={(evento) => establecerDatos({ ...datos, nombre: evento.target.value })}
            aria-invalid={Boolean(errores.nombre?.length)} aria-describedby={errores.nombre?.length ? 'nombre-error' : undefined} />
        </CampoFormulario>
        <CampoFormulario id="correo" etiqueta="Correo" errores={errores.correo}>
          <input id="correo" name="correo" type="email" inputMode="email" autoComplete="off" autoCapitalize="none" spellCheck={false} required maxLength={254}
            value={datos.correo} onChange={(evento) => establecerDatos({ ...datos, correo: evento.target.value })}
            aria-invalid={Boolean(errores.correo?.length)} aria-describedby={errores.correo?.length ? 'correo-error' : undefined} />
        </CampoFormulario>
        <CampoFormulario id="rol" etiqueta="Rol" errores={errores.rol}>
          <select id="rol" name="rol" required value={datos.rol}
            onChange={(evento) => establecerDatos({ ...datos, rol: evento.target.value as DatosRegistro['rol'] })}
            aria-invalid={Boolean(errores.rol?.length)} aria-describedby={errores.rol?.length ? 'rol-error' : undefined}>
            <option value="">Selecciona un rol</option>
            <option value="administrador">Administrador</option>
            <option value="docente">Docente</option>
            <option value="estudiante">Estudiante</option>
          </select>
        </CampoFormulario>
      </fieldset>
      <button type="submit" disabled={enviando}>{enviando ? 'Registrando…' : 'Registrar usuario'}</button>
    </form>
  )
}
