import { useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import type { FormEvent } from 'react'
import { IconoDocente as IconoGestion } from '../docente/IconoDocente'
import { CampoFormulario } from '../componentes/CampoFormulario'
import { ErrorApi, registrarUsuario } from '../servicios/django'
import type { DatosRegistro, ErroresRegistro, RegistroCreado, Rol } from '../servicios/django'

const datosVacios: DatosRegistro = { nombre: '', correo: '', dni: '', rol: '' }
const nombresRol: Record<Rol, string> = {
  administrador: 'Administrador', docente: 'Docente', estudiante: 'Estudiante',
}

export function RegistrarUsuario({ alCambiarBloqueo, rolInicial }: { alCambiarBloqueo?: (bloqueado: boolean) => void; rolInicial?: Rol }) {
  const [datos, establecerDatos] = useState<DatosRegistro>({ ...datosVacios, rol: rolInicial ?? '' })
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
  }, [resultado, datos.rol])

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
    if (!datos.rol) { establecerMensaje('Elige primero estudiante, docente o administrador.'); return }
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
      establecerDatos({ ...datosVacios, rol: datos.rol })
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
          {resultado.usuario.correo && <><dt>Correo</dt><dd>{resultado.usuario.correo}</dd></>}
          {resultado.usuario.dni && <><dt>DNI</dt><dd>{resultado.usuario.dni}</dd></>}
          <dt>Rol</dt><dd>{nombresRol[resultado.usuario.rol]}</dd>
          <dt>Contraseña temporal</dt><dd><code className="contrasena">{resultado.contrasena_temporal}</code></dd>
        </dl>
        <p>Entrégala ahora. Al cerrar esta confirmación, no podrás volver a consultarla. La cuenta deberá cambiarla al ingresar.</p>
        {resultado.usuario.rol === 'estudiante' && <p>El estudiante ingresa a la app con su DNI y esta contraseña; entrégasela a su docente para que se la comunique. Si la olvida, genera otra desde su ficha en «Estudiantes».</p>}
        <button type="button" onClick={() => { establecerResultado(null); alCambiarBloqueo?.(false) }}>Cerrar y registrar otra cuenta</button>
      </section>
    )
  }

  return (
    <form onSubmit={enviar} noValidate aria-busy={enviando}>
      <div className="admin-roles" role="group" aria-label="Tipo de cuenta">{(['estudiante', 'docente', 'administrador'] as Rol[]).map((rol) => <button key={rol} type="button" className={'admin-rol secundario ' + (datos.rol === rol ? 'elegido' : '')} aria-pressed={datos.rol === rol} disabled={enviando} onClick={() => { establecerDatos({ ...datos, rol, dni: rol === 'estudiante' ? datos.dni : '' }); establecerErrores({}); establecerMensaje('') }}><IconoGestion nombre={rol === 'estudiante' ? 'estudiante' : rol === 'docente' ? 'docente' : 'personas'} /><strong>{nombresRol[rol]}</strong><small>{rol === 'estudiante' ? 'Aprende y juega en la app' : rol === 'docente' ? 'Prepara experiencias educativas' : 'Organiza personas y aulas'}</small></button>)}</div>
      {!datos.rol && <p className="admin-indicacion">Elige un tipo de cuenta para ver los datos que necesita.</p>}
      {mensaje && <p className="error-resumen" role="alert" tabIndex={-1} ref={resumenError}>{mensaje}</p>}
      {estadoError === 401 && <p><a href="/">Volver a iniciar sesión</a></p>}
      {datos.rol && <fieldset disabled={enviando}>
        <legend className="solo-lectores">Datos de la cuenta</legend>
        <CampoFormulario id="nombre" etiqueta="Nombre" errores={errores.nombre}>
          <input ref={nombre} id="nombre" name="nombre" autoComplete="off" required maxLength={150}
            value={datos.nombre} onChange={(evento) => establecerDatos({ ...datos, nombre: evento.target.value })}
            aria-invalid={Boolean(errores.nombre?.length)} aria-describedby={errores.nombre?.length ? 'nombre-error' : undefined} />
        </CampoFormulario>
        {datos.rol === 'estudiante' && <CampoFormulario id="dni" etiqueta="DNI del estudiante" errores={errores.dni}>
          <input id="dni" name="dni" inputMode="numeric" autoComplete="off" maxLength={8} pattern="[0-9]{8}" required={datos.rol === 'estudiante'}
            value={datos.dni} onChange={(evento) => establecerDatos({ ...datos, dni: evento.target.value.replace(/\D/g, '') })}
            aria-invalid={Boolean(errores.dni?.length)} aria-describedby={errores.dni?.length ? 'dni-error' : undefined} />
        </CampoFormulario>}
        <CampoFormulario id="correo" etiqueta={datos.rol === 'estudiante' ? 'Correo (opcional para estudiantes)' : 'Correo'} errores={errores.correo}>
          <input id="correo" name="correo" type="email" inputMode="email" autoComplete="off" autoCapitalize="none" spellCheck={false} required={datos.rol !== 'estudiante'} maxLength={254}
            value={datos.correo} onChange={(evento) => establecerDatos({ ...datos, correo: evento.target.value })}
            aria-invalid={Boolean(errores.correo?.length)} aria-describedby={errores.correo?.length ? 'correo-error' : undefined} />
        </CampoFormulario>
      </fieldset>}
      <button type="submit" disabled={enviando || !datos.rol}><IconoGestion nombre="mas" />{enviando ? 'Registrando…' : 'Registrar usuario'}</button>
    </form>
  )
}
