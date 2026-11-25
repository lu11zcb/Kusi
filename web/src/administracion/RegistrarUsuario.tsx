import { useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import type { FormEvent } from 'react'
import { IconoDocente as IconoGestion } from '../docente/IconoDocente'
import { CampoFormulario } from '../componentes/CampoFormulario'
import { ErrorApi, registrarUsuario } from '../servicios/django'
import type { DatosRegistro, ErroresRegistro, RegistroCreado, Rol } from '../servicios/django'

const datosVacios: DatosRegistro = { nombres: '', apellidos: '', correo: '', dni: '', rol: '' }
// Juntos («nombres apellidos») deben caber en los 150 caracteres del nombre completo; Django lo vuelve a revisar.
const LARGO_PARTE_NOMBRE = 74

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
  const rol = rolInicial ?? datos.rol

  useEffect(() => {
    if (resultado) confirmacion.current?.focus()
    else nombre.current?.focus()
  }, [resultado, rol])

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
    if (!rol) { establecerMensaje('Elige primero estudiante, docente o administrador.'); return }
    // Se piden por separado para que nadie olvide los apellidos.
    const faltantes: ErroresRegistro = {}
    if (!datos.nombres.trim()) faltantes.nombres = ['Escribe sus nombres.']
    if (!datos.apellidos.trim()) faltantes.apellidos = ['Escribe sus apellidos.']
    if (faltantes.nombres || faltantes.apellidos) {
      establecerEstadoError(null)
      establecerErrores(faltantes)
      establecerMensaje('Revisa los datos del registro.')
      return
    }
    bloqueoEnvio.current = true
    alCambiarBloqueo?.(true)
    let creado = false
    establecerEnviando(true)
    establecerMensaje('')
    establecerEstadoError(null)
    establecerErrores({})
    try {
      establecerResultado(await registrarUsuario({ ...datos, rol }))
      creado = true
      establecerDatos({ ...datosVacios, rol })
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
          <dt>Nombre completo</dt><dd>{resultado.usuario.nombre}</dd>
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
      {!rolInicial && <div className="admin-roles" role="group" aria-label="Tipo de cuenta">
        {(['estudiante', 'docente', 'administrador'] as const).map((opcion) => <button key={opcion} type="button" data-rol={opcion} className={'admin-rol secundario ' + (rol === opcion ? 'elegido' : '')} aria-pressed={rol === opcion} disabled={enviando} onClick={() => {
          establecerDatos({ ...datos, rol: opcion, dni: opcion === 'estudiante' ? datos.dni : '', correo: opcion === 'estudiante' ? '' : datos.correo })
          establecerErrores({})
          establecerMensaje('')
        }}><IconoGestion nombre={opcion === 'estudiante' ? 'estudiante' : opcion === 'docente' ? 'docente' : 'personas'} /><strong>{nombresRol[opcion]}</strong><small>{opcion === 'estudiante' ? 'Aprende y juega en la app' : opcion === 'docente' ? 'Prepara experiencias educativas' : 'Organiza personas y aulas'}</small></button>)}
      </div>}
      {mensaje && <p className="error-resumen" role="alert" tabIndex={-1} ref={resumenError}>{mensaje}</p>}
      {estadoError === 401 && <p><a href="/">Volver a iniciar sesión</a></p>}
      {rol && <fieldset disabled={enviando}>
        <legend className="solo-lectores">Datos de la cuenta</legend>
        <CampoFormulario id="nombre" etiqueta="Nombres" errores={errores.nombres}>
          <input ref={nombre} id="nombre" name="nombres" autoComplete="off" required maxLength={LARGO_PARTE_NOMBRE}
            value={datos.nombres} onChange={(evento) => establecerDatos({ ...datos, nombres: evento.target.value })}
            aria-invalid={Boolean(errores.nombres?.length)} aria-describedby={errores.nombres?.length ? 'nombre-error' : undefined} />
        </CampoFormulario>
        <CampoFormulario id="apellidos" etiqueta="Apellidos" errores={errores.apellidos}>
          <input id="apellidos" name="apellidos" autoComplete="off" required maxLength={LARGO_PARTE_NOMBRE}
            value={datos.apellidos} onChange={(evento) => establecerDatos({ ...datos, apellidos: evento.target.value })}
            aria-invalid={Boolean(errores.apellidos?.length)} aria-describedby={errores.apellidos?.length ? 'apellidos-error' : undefined} />
        </CampoFormulario>
        {rol === 'estudiante' ? <CampoFormulario id="dni" etiqueta="DNI del estudiante" errores={errores.dni}>
          <input id="dni" name="dni" inputMode="numeric" autoComplete="off" maxLength={8} pattern="[0-9]{8}" required
            value={datos.dni} onChange={(evento) => establecerDatos({ ...datos, dni: evento.target.value.replace(/\D/g, '') })}
            aria-invalid={Boolean(errores.dni?.length)} aria-describedby={errores.dni?.length ? 'dni-error' : undefined} />
        </CampoFormulario> : <CampoFormulario id="correo" etiqueta="Correo" errores={errores.correo}>
          <input id="correo" name="correo" type="email" inputMode="email" autoComplete="off" autoCapitalize="none" spellCheck={false} required maxLength={254}
            value={datos.correo} onChange={(evento) => establecerDatos({ ...datos, correo: evento.target.value })}
            aria-invalid={Boolean(errores.correo?.length)} aria-describedby={errores.correo?.length ? 'correo-error' : undefined} />
        </CampoFormulario>}
      </fieldset>}
      <button type="submit" disabled={enviando || !rol}><IconoGestion nombre="mas" />{enviando ? 'Registrando…' : rolInicial ? 'Registrar ' + rolInicial : 'Registrar usuario'}</button>
    </form>
  )
}
