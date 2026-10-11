import { useState } from 'react'
import type { UsuarioSesion } from '../servicios/django'
import { RegistrarUsuario } from './RegistrarUsuario'
import { GestionarUsuarios } from './GestionarUsuarios'
import { CatalogoCursos } from './CatalogoCursos'

export function PanelAdministracion({ usuario, salir, cambiarRol }: { usuario: UsuarioSesion; salir: () => void; cambiarRol?: () => void }) {
  const [seccion, establecerSeccion] = useState('registro')
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
          <a href="#contenido" aria-current={seccion === 'registro' ? 'page' : undefined} onClick={() => establecerSeccion('registro')}>Registrar usuario</a>
          <a href="#contenido" aria-current={seccion === 'usuarios' ? 'page' : undefined} onClick={() => establecerSeccion('usuarios')}>Usuarios y roles</a>
          <a href="#contenido" aria-current={seccion === 'cursos' ? 'page' : undefined} onClick={() => establecerSeccion('cursos')}>Catálogo de cursos</a>
        </nav>
        <main id="contenido" tabIndex={-1}>
          {seccion === 'registro' ? <>
            <h1>Registrar usuario</h1>
            <p>Crea una cuenta y entrega su contraseña temporal a la persona registrada.</p>
            <RegistrarUsuario />
          </> : seccion === 'usuarios' ? <GestionarUsuarios /> : <CatalogoCursos />}
        </main>
      </div>
    </>
  )
}
