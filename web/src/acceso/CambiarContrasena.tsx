import { useState } from 'react'
import type { FormEvent } from 'react'
import { cambiarContrasena } from '../servicios/acceso'
import type { Cuenta } from '../servicios/acceso'

export function CambiarContrasena({ alCambiar, salir }: { alCambiar: (cuenta: Cuenta) => void; salir: () => void }) {
  const [datos, establecerDatos] = useState({ contrasena_actual: '', nueva_contrasena: '', confirmacion: '' })
  const [mensaje, establecerMensaje] = useState('')
  const [enviando, establecerEnviando] = useState(false)
  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (enviando) return
    establecerEnviando(true)
    establecerMensaje('')
    try {
      const resultado = await cambiarContrasena(datos)
      establecerDatos({ contrasena_actual: '', nueva_contrasena: '', confirmacion: '' })
      if (resultado.usuario) alCambiar(resultado.usuario)
    } catch (error) { establecerMensaje(error instanceof Error ? error.message : 'No se pudo cambiar la contraseña.') }
    finally { establecerEnviando(false) }
  }
  return <main className="acceso">
    <h1>Cambia tu contraseña temporal</h1>
    <p>Elige una contraseña personal de al menos ocho caracteres antes de continuar. Evita datos personales y contraseñas habituales.</p>
    <form onSubmit={enviar}>
      {mensaje && <p role="alert" className="error-resumen">{mensaje}</p>}
      <fieldset disabled={enviando}>
        <legend className="solo-lectores">Cambio de contraseña</legend>
        {([
          ['contrasena_actual', 'Contraseña actual', 'current-password'],
          ['nueva_contrasena', 'Nueva contraseña', 'new-password'],
          ['confirmacion', 'Confirmar nueva contraseña', 'new-password'],
        ] as const).map(([campo, etiqueta, autocompletar]) => <div className="campo" key={campo}>
          <label htmlFor={campo}>{etiqueta}</label><input id={campo} type="password" required autoComplete={autocompletar} value={datos[campo]} onChange={(evento) => establecerDatos({ ...datos, [campo]: evento.target.value })} />
        </div>)}
      </fieldset>
      <button disabled={enviando}>{enviando ? 'Guardando…' : 'Guardar contraseña'}</button>
    </form>
    <button className="secundario" type="button" onClick={salir} disabled={enviando}>Cerrar sesión</button>
  </main>
}
