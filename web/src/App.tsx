import { useEffect, useState } from 'react'
import { Ingresar } from './acceso/Ingresar'
import { CambiarContrasena } from './acceso/CambiarContrasena'
import { PanelAdministracion } from './administracion/PanelAdministracion'
import { PanelDocente } from './docente/PanelDocente'
import { obtenerSesion, salir } from './servicios/acceso'
import type { Cuenta } from './servicios/acceso'
import './App.css'

type RolAdulto = 'administrador' | 'docente'
export default function App() {
  const [cuenta, establecerCuenta] = useState<Cuenta | null>(null)
  const [cargando, establecerCargando] = useState(true)
  const [mensaje, establecerMensaje] = useState('')
  const [rol, establecerRol] = useState<RolAdulto | null>(null)
  useEffect(() => {
    const controlador = new AbortController()
    obtenerSesion(controlador.signal).then((sesion) => {
      if (!controlador.signal.aborted) { establecerCuenta(sesion.usuario); establecerCargando(false) }
    }).catch((error: unknown) => {
      if (!controlador.signal.aborted) { establecerMensaje(error instanceof Error ? error.message : 'No se pudo comprobar el acceso.'); establecerCargando(false) }
    })
    return () => controlador.abort()
  }, [])
  function actualizar(usuario: Cuenta) { establecerCuenta(usuario); establecerRol(null); establecerMensaje('') }
  async function actualizarAcceso() {
    try {
      const sesion = await obtenerSesion()
      establecerCuenta(sesion.usuario)
      establecerRol(null)
      establecerMensaje('')
    } catch (error) {
      establecerCuenta(null)
      establecerRol(null)
      establecerMensaje('El cambio de tu cuenta ya se guardó. Vuelve a ingresar para comprobar tu acceso actualizado.')
      throw error
    }
  }
  async function cerrarSesion() {
    try { await salir(); establecerCuenta(null); establecerRol(null); establecerMensaje('') }
    catch (error) { establecerMensaje(error instanceof Error ? error.message : 'No se pudo cerrar la sesión.') }
  }
  if (cargando) return <main className="acceso"><p role="status">Comprobando acceso…</p></main>
  if (!cuenta) return <>{mensaje && <p role="alert" className="error-resumen">{mensaje}</p>}<Ingresar alIngresar={actualizar} /></>
  const roles = cuenta.roles.filter((valor): valor is RolAdulto => valor === 'administrador' || valor === 'docente')
  if (!roles.length) return <main className="acceso"><h1>Acceso web no disponible</h1><p>Los estudiantes ingresan desde la aplicación móvil. Si necesitas otro acceso, consulta con el administrador.</p><button type="button" onClick={cerrarSesion}>Cerrar sesión</button>{mensaje && <p role="alert">{mensaje}</p>}</main>
  if (cuenta.debe_cambiar_contrasena) return <>{mensaje && <p role="alert" className="error-resumen">{mensaje}</p>}<CambiarContrasena alCambiar={actualizar} salir={cerrarSesion} /></>
  const seleccionado = rol && roles.includes(rol) ? rol : roles.length === 1 ? roles[0] : null
  if (!seleccionado) return <main className="acceso"><h1>Elige tu panel</h1><p>Tu cuenta tiene acceso a administración y docencia.</p><div className="acciones"><button onClick={() => establecerRol('administrador')}>Administración</button><button onClick={() => establecerRol('docente')}>Docente</button><button className="secundario" onClick={cerrarSesion}>Cerrar sesión</button></div>{mensaje && <p role="alert">{mensaje}</p>}</main>
  const cambiarRol = roles.length > 1 ? () => establecerRol(null) : undefined
  return <>{mensaje && <p role="alert" className="error-resumen">{mensaje}</p>}{seleccionado === 'administrador'
    ? <PanelAdministracion usuario={cuenta} salir={cerrarSesion} cambiarRol={cambiarRol} actualizarAcceso={actualizarAcceso} />
    : <PanelDocente usuario={cuenta} salir={cerrarSesion} cambiarRol={cambiarRol} />}</>
}
