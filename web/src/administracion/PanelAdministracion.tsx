import { useState } from 'react'
import type { UsuarioSesion } from '../servicios/django'
import { RegistrarUsuario } from './RegistrarUsuario'
import { GestionarUsuarios } from './GestionarUsuarios'
import { CatalogoCursos } from './CatalogoCursos'
import { CrearSeccion } from './CrearSeccion'
import { GestionarVinculos } from './GestionarVinculos'
import { AsignarDocentes } from './AsignarDocentes'

export function PanelAdministracion({ usuario, salir, cambiarRol }: { usuario: UsuarioSesion; salir: () => void; cambiarRol?: () => void }) {
  const [seccion, establecerSeccion] = useState('registro')
  const [registroBloqueado, establecerRegistroBloqueado] = useState(false)
  return (
    <>
      <a className="saltar-contenido" href="#contenido">Ir al contenido</a>
      <header className="cabecera">
        <strong>Kusi · Administración</strong>
        <span>{usuario.nombre} · {usuario.correo}</span>
        <div className="acciones">
          {cambiarRol && <button type="button" className="secundario" disabled={registroBloqueado} onClick={cambiarRol}>Cambiar de panel</button>}
          <button type="button" className="secundario" disabled={registroBloqueado} onClick={salir}>Cerrar sesión</button>
        </div>
      </header>
      <div className="panel-administracion">
        <nav aria-label="Administración">
          {([
            ['registro', 'Registrar usuario'], ['usuarios', 'Usuarios y roles'],
            ['cursos', 'Catálogo de cursos'], ['secciones', 'Crear sección'],
            ['vinculos', 'Vincular estudiantes'], ['asignaciones', 'Asignar docentes'],
          ] as const).map(([id, etiqueta]) => <button key={id} type="button" className="enlace-navegacion" disabled={registroBloqueado}
            aria-current={seccion === id ? 'page' : undefined} onClick={() => establecerSeccion(id)}>{etiqueta}</button>)}
        </nav>
        <main id="contenido" tabIndex={-1}>
          {seccion === 'vinculos' ? <GestionarVinculos /> : seccion === 'asignaciones' ? <AsignarDocentes /> : seccion === 'registro' ? <>
            <h1>Registrar usuario</h1>
            <p>Crea una cuenta y entrega su contraseña temporal a la persona registrada.</p>
            <RegistrarUsuario alCambiarBloqueo={establecerRegistroBloqueado} />
          </> : seccion === 'usuarios' ? <GestionarUsuarios /> : seccion === 'cursos' ? <CatalogoCursos /> : <CrearSeccion />}
        </main>
      </div>
    </>
  )
}
