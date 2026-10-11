import type { UsuarioSesion } from '../servicios/django'
import { RegistrarUsuario } from './RegistrarUsuario'

export function PanelAdministracion({ usuario, salir, cambiarRol }: { usuario: UsuarioSesion; salir: () => void; cambiarRol?: () => void }) {
  return (
    <>
      <a className="saltar-contenido" href="#contenido">Ir al contenido</a>
      <header className="cabecera">
        <strong>Kusi · Administración</strong>
        <span>{usuario.nombre} · {usuario.correo}</span>
        <div className="acciones">
          {cambiarRol && <button type="button" className="secundario" onClick={cambiarRol}>Cambiar de panel</button>}
          <button type="button" className="secundario" onClick={salir}>Cerrar sesión</button>
        </div>
      </header>
      <div className="panel-administracion">
        <nav aria-label="Administración">
          <a href="#contenido" aria-current="page">Registrar usuario</a>
        </nav>
        <main id="contenido" tabIndex={-1}>
          <h1>Registrar usuario</h1>
          <p>Crea una cuenta y entrega su contraseña temporal a la persona registrada.</p>
          <RegistrarUsuario />
        </main>
      </div>
    </>
  )
}
