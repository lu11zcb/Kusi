import { useState } from 'react'
import { Tablero } from '../componentes/Tablero'
import type { OpcionMenu } from '../componentes/Tablero'
import type { UsuarioSesion } from '../servicios/django'
import { AsignarDocentes } from './AsignarDocentes'
import { CatalogoCursos } from './CatalogoCursos'
import { CrearSeccion } from './CrearSeccion'
import { GestionarUsuarios } from './GestionarUsuarios'
import { GestionarVinculos } from './GestionarVinculos'
import { InicioAdministracion } from './InicioAdministracion'
import { RegistrarUsuario } from './RegistrarUsuario'

const opciones: readonly OpcionMenu[] = [
  { id: 'inicio', etiqueta: 'Inicio', icono: 'inicio' },
  { id: 'registro', etiqueta: 'Registrar usuario', icono: 'registrar' },
  { id: 'usuarios', etiqueta: 'Usuarios y roles', icono: 'usuarios' },
  { id: 'cursos', etiqueta: 'Catálogo de cursos', icono: 'libro' },
  { id: 'secciones', etiqueta: 'Crear sección', icono: 'aula' },
  { id: 'vinculos', etiqueta: 'Vincular estudiantes', icono: 'enlace' },
  { id: 'asignaciones', etiqueta: 'Asignar docentes', icono: 'pizarra' },
]

export function PanelAdministracion({ usuario, salir, cambiarRol, actualizarAcceso }: { usuario: UsuarioSesion; salir: () => void; cambiarRol?: () => void; actualizarAcceso: () => Promise<void> }) {
  const [seccion, establecerSeccion] = useState('inicio')
  // Mientras se muestra una contraseña recién creada no se puede salir de la pantalla.
  const [registroBloqueado, establecerRegistroBloqueado] = useState(false)
  const fichas = <span className="ficha">🏫 Administración</span>
  const promo = <div className="tarjeta-promo"><strong>🔑 Contraseñas</strong><p>Solo tú las generas. El docente se las comunica a sus estudiantes.</p></div>
  return <Tablero rol="Administrador" nombre={usuario.nombre} opciones={opciones} actual={seccion} alElegir={establecerSeccion}
    bloqueado={registroBloqueado} fichas={fichas} promo={promo} salir={salir} cambiarRol={cambiarRol}>
    {seccion === 'inicio' && <InicioAdministracion nombre={usuario.nombre} ir={establecerSeccion} />}
    {seccion === 'registro' && <div className="tarjeta">
      <h1>Registrar usuario</h1>
      <p>Crea una cuenta y entrega su contraseña temporal a la persona registrada.</p>
      <RegistrarUsuario alCambiarBloqueo={establecerRegistroBloqueado} />
    </div>}
    {seccion === 'usuarios' && <div className="tarjeta"><GestionarUsuarios usuarioActualId={usuario.id} actualizarAcceso={actualizarAcceso} /></div>}
    {seccion === 'cursos' && <div className="tarjeta"><CatalogoCursos /></div>}
    {seccion === 'secciones' && <div className="tarjeta"><CrearSeccion /></div>}
    {seccion === 'vinculos' && <div className="tarjeta"><GestionarVinculos /></div>}
    {seccion === 'asignaciones' && <div className="tarjeta"><AsignarDocentes /></div>}
  </Tablero>
}
