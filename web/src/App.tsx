import { Suspense, lazy, useEffect, useState } from 'react'
import { CambiarContrasena } from './acceso/CambiarContrasena'
import { PanelAdministracion } from './administracion/PanelAdministracion'
import { PanelDocente } from './docente/PanelDocente'
import { Icono } from './componentes/Icono'
import { PantallaCuarto } from './componentes/PantallaCuarto'
import { obtenerSesion, salir } from './servicios/acceso'
import type { Cuenta } from './servicios/acceso'
import './App.css'

// El login con Rive se descarga solo cuando hace falta; los paneles no lo cargan.
const LoginCuy = lazy(() => import('./acceso/LoginCuy').then((modulo) => ({ default: modulo.LoginCuy })))

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
  if (cargando) return <PantallaCuarto><h1>Kusi</h1><p role="status">Comprobando acceso…</p></PantallaCuarto>
  if (!cuenta) return <>{mensaje && <p role="alert" className="error-resumen">{mensaje}</p>}<Suspense fallback={<PantallaCuarto><h1>Kusi</h1><p role="status">Preparando el cuarto de Kusi…</p></PantallaCuarto>}><LoginCuy alIngresar={actualizar} /></Suspense></>
  const roles = cuenta.roles.filter((valor): valor is RolAdulto => valor === 'administrador' || valor === 'docente')
  if (!roles.length) return <PantallaCuarto><h1>¡Hola, {cuenta.nombre}!</h1><p>Los estudiantes juegan desde la aplicación móvil de Kusi. Si necesitas otro acceso, consulta con el administrador.</p><div className="acciones"><button type="button" onClick={cerrarSesion}>Cerrar sesión</button></div>{mensaje && <p role="alert" className="error-resumen">{mensaje}</p>}</PantallaCuarto>
  if (cuenta.debe_cambiar_contrasena) return <>{mensaje && <p role="alert" className="error-resumen">{mensaje}</p>}<CambiarContrasena alCambiar={actualizar} salir={cerrarSesion} /></>
  const seleccionado = rol && roles.includes(rol) ? rol : roles.length === 1 ? roles[0] : null
  if (!seleccionado) return <PantallaCuarto><h1>¿A dónde vamos hoy?</h1><p>Tu cuenta tiene acceso a administración y docencia.</p>
    <div className="elegir-panel">
      <button type="button" onClick={() => establecerRol('administrador')}><Icono nombre="aula" />Administración</button>
      <button type="button" onClick={() => establecerRol('docente')}><Icono nombre="varita" />Docente</button>
    </div>
    <div className="acciones"><button type="button" className="secundario" onClick={cerrarSesion}>Cerrar sesión</button></div>{mensaje && <p role="alert" className="error-resumen">{mensaje}</p>}</PantallaCuarto>
  const cambiarRol = roles.length > 1 ? () => establecerRol(null) : undefined
  return <>{mensaje && <p role="alert" className="error-resumen">{mensaje}</p>}{seleccionado === 'administrador'
    ? <PanelAdministracion usuario={cuenta} salir={cerrarSesion} cambiarRol={cambiarRol} actualizarAcceso={actualizarAcceso} />
    : <PanelDocente usuario={cuenta} salir={cerrarSesion} cambiarRol={cambiarRol} />}</>
}
