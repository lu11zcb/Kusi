import type { ErrorApi } from '../servicios/django'

export function AccesoRegistro({ error, reintentar }: { error: ErrorApi; reintentar: () => void }) {
  return (
    <main className="acceso">
      <h1>Registro de usuarios</h1>
      <p role="alert">{error.message}</p>
      {error.estado === 401 && (
        <>
          <p>Ingresa con la cuenta administradora de prueba para continuar.</p>
          <a className="boton" href="/admin/login/?next=/">Iniciar sesión</a>
        </>
      )}
      <button className="secundario" type="button" onClick={reintentar}>Comprobar acceso de nuevo</button>
    </main>
  )
}
