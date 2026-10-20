import { useState } from 'react'
import { Tablero } from '../componentes/Tablero'
import type { OpcionMenu } from '../componentes/Tablero'
import type { Rol, UsuarioSesion } from '../servicios/django'
import { IconoDocente as IconoGestion } from '../docente/IconoDocente'
import { AsignarDocentes } from './AsignarDocentes'
import { CatalogoCursos } from './CatalogoCursos'
import { CrearSeccion } from './CrearSeccion'
import { GestionarUsuarios } from './GestionarUsuarios'
import { GestionarVinculos } from './GestionarVinculos'
import { InicioAdministracion } from './InicioAdministracion'
import { RegistrarUsuario } from './RegistrarUsuario'
import './administracion.css'

const opciones: readonly OpcionMenu[] = [
  { id: 'inicio', etiqueta: 'Inicio', icono: 'inicio', iconoVisual: <IconoGestion nombre="inicio" /> },
  { id: 'estudiantes', etiqueta: 'Estudiantes', icono: 'estudiantes', iconoVisual: <IconoGestion nombre="estudiante" /> },
  { id: 'docentes', etiqueta: 'Docentes', icono: 'pizarra', iconoVisual: <IconoGestion nombre="docente" /> },
  { id: 'secciones', etiqueta: 'Secciones', icono: 'aula', iconoVisual: <IconoGestion nombre="secciones" /> },
  { id: 'cursos', etiqueta: 'Cursos', icono: 'libro', iconoVisual: <IconoGestion nombre="cursos" /> },
  { id: 'administradores', etiqueta: 'Administradores', icono: 'usuarios', iconoVisual: <IconoGestion nombre="personas" /> },
]
const roles: Record<string, Rol> = { estudiantes: 'estudiante', docentes: 'docente', administradores: 'administrador' }

export function PanelAdministracion({ usuario, salir, cambiarRol, actualizarAcceso }: { usuario: UsuarioSesion; salir: () => void; cambiarRol?: () => void; actualizarAcceso: () => Promise<void> }) {
  const [seccion, establecerSeccion] = useState('inicio')
  const [rolRegistro, establecerRolRegistro] = useState<Rol | undefined>()
  const [bloqueado, establecerBloqueado] = useState(false)
  function ir(destino: string) { establecerSeccion(destino === 'usuarios' ? 'estudiantes' : destino) }
  function registrar(rol?: Rol) { establecerRolRegistro(rol); establecerSeccion('registro') }
  const actual = seccion === 'vinculos' ? 'estudiantes' : seccion === 'asignaciones' ? 'docentes' : seccion === 'registro' ? Object.keys(roles).find((clave) => roles[clave] === rolRegistro) ?? '' : seccion
  return <div className="panel-administracion"><Tablero rol="Administrador" nombre={usuario.nombre} opciones={opciones} actual={actual} alElegir={ir}
    bloqueado={bloqueado} fichas={<span className="ficha"><IconoGestion nombre="secciones" />Administración</span>}
    promo={<div className="tarjeta-promo"><strong>El acceso, bajo tu cuidado</strong><p>Las contraseñas temporales se muestran una sola vez. Entrégalas de forma privada.</p></div>}
    salir={salir} cambiarRol={cambiarRol} menuPlegable etiquetaMenu="Menú de administración">
    {seccion === 'inicio' && <InicioAdministracion nombre={usuario.nombre} ir={(id) => id === 'registro' ? registrar() : ir(id)} />}
    {seccion === 'registro' && <section className="admin-superficie">
      <button type="button" className="secundario admin-volver" disabled={bloqueado} onClick={() => ir(rolRegistro ? Object.keys(roles).find((clave) => roles[clave] === rolRegistro)! : 'estudiantes')}><IconoGestion nombre="atras" />Volver a las cuentas</button>
      <header className="admin-encabezado"><div><span className="admin-antetitulo">UNA NUEVA PERSONA EN KUSI</span><h1>Crear una cuenta</h1><p>Primero elige a quién registrar. Después completa sus datos.</p></div><span className="admin-ilustracion-icono"><IconoGestion nombre="personas" /></span></header>
      <RegistrarUsuario key={rolRegistro ?? 'elegir'} rolInicial={rolRegistro} alCambiarBloqueo={establecerBloqueado} />
    </section>}
    {roles[seccion] && <GestionarUsuarios key={seccion} rolInicial={roles[seccion]} usuarioActualId={usuario.id} actualizarAcceso={actualizarAcceso} alCambiarBloqueo={establecerBloqueado} alRegistrar={() => registrar(roles[seccion])} />}
    {seccion === 'cursos' && <section className="admin-superficie"><CatalogoCursos /></section>}
    {seccion === 'secciones' && <section className="admin-superficie"><CrearSeccion alCambiarBloqueo={establecerBloqueado} /></section>}
    {seccion === 'vinculos' && <section className="admin-superficie"><GestionarVinculos alCambiarBloqueo={establecerBloqueado} /></section>}
    {seccion === 'asignaciones' && <section className="admin-superficie"><AsignarDocentes alCambiarBloqueo={establecerBloqueado} /></section>}
    <footer className="admin-pie">Kusi · Tu escuela, en orden <span>lui11zcb</span></footer>
  </Tablero></div>
}
