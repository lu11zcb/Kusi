import { useState } from 'react'
import type { FormEvent } from 'react'
import { ingresar } from '../servicios/acceso'
import type { Cuenta } from '../servicios/acceso'

export function Ingresar({ alIngresar }: { alIngresar: (cuenta: Cuenta) => void }) {
  const [correo, establecerCorreo] = useState('')
  const [contrasena, establecerContrasena] = useState('')
  const [mensaje, establecerMensaje] = useState('')
  const [enviando, establecerEnviando] = useState(false)
  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (enviando) return
    establecerEnviando(true)
    establecerMensaje('')
    try {
      const resultado = await ingresar(correo, contrasena)
      establecerContrasena('')
      if (resultado.usuario) alIngresar(resultado.usuario)
    } catch (error) {
      establecerContrasena('')
      establecerMensaje(error instanceof Error ? error.message : 'No se pudo iniciar sesión. Verifica el correo y la contraseña e inténtalo de nuevo.')
    } finally { establecerEnviando(false) }
  }
  return <main className="acceso">
    <h1>Ingresar a Kusi</h1>
    <p>Acceso para administradores y docentes. Los estudiantes ingresan desde la aplicación móvil.</p>
    <form onSubmit={enviar}>
      {mensaje && <p role="alert" className="error-resumen">{mensaje}</p>}
      <fieldset disabled={enviando}>
        <legend className="solo-lectores">Datos de acceso</legend>
        <div className="campo"><label htmlFor="correo-acceso">Correo</label><input id="correo-acceso" type="email" required autoComplete="username" autoCapitalize="none" value={correo} onChange={(evento) => establecerCorreo(evento.target.value)} /></div>
        <div className="campo"><label htmlFor="contrasena-acceso">Contraseña</label><input id="contrasena-acceso" type="password" required autoComplete="current-password" value={contrasena} onChange={(evento) => establecerContrasena(evento.target.value)} /></div>
      </fieldset>
      <button disabled={enviando}>{enviando ? 'Ingresando…' : 'Ingresar'}</button>
    </form>
  </main>
}
