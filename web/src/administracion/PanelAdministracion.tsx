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
import { JuegosPorDocente } from './JuegosPorDocente'
import { RegistrarUsuario } from './RegistrarUsuario'
import { nombreJuegosDocentes } from './ResumenJuegos'
import './administracion.css'

const gruposMenu: readonly { etiqueta?: string; opciones: readonly OpcionMenu[] }[] = [
  { opciones: [{ id: 'inicio', etiqueta: 'Inicio', icono: 'inicio', iconoVisual: <IconoGestion nombre="inicio" /> }] },
  { etiqueta: 'Comunidad escolar', opciones: [
    { id: 'estudiantes', etiqueta: 'Estudiantes', icono: 'estudiantes', iconoVisual: <IconoGestion nombre="estudiante" /> },
    { id: 'docentes', etiqueta: 'Docentes', icono: 'pizarra', iconoVisual: <IconoGestion nombre="docente" /> },
  ] },
  { etiqueta: 'Organización académica', opciones: [
    { id: 'secciones', etiqueta: 'Secciones', icono: 'aula', iconoVisual: <IconoGestion nombre="secciones" /> },
    { id: 'cursos', etiqueta: 'Cursos', icono: 'libro', iconoVisual: <IconoGestion nombre="cursos" /> },
    { id: 'juegos', etiqueta: nombreJuegosDocentes, icono: 'carpeta', iconoVisual: <IconoGestion nombre="juegos" /> },
  ] },
  { etiqueta: 'Acceso', opciones: [
    { id: 'administradores', etiqueta: 'Administradores', icono: 'usuarios', iconoVisual: <IconoGestion nombre="personas" /> },
  ] },
]
const opciones = gruposMenu.flatMap((grupo) => grupo.opciones)
const roles: Record<string, Rol> = { estudiantes: 'estudiante', docentes: 'docente', administradores: 'administrador' }

export function PanelAdministracion({ usuario, salir, cambiarRol, actualizarAcceso }: { usuario: UsuarioSesion; salir: () => void; cambiarRol?: () => void; actualizarAcceso: () => Promise<void> }) {
  const [seccion, establecerSeccion] = useState('inicio')
  const [rolRegistro, establecerRolRegistro] = useState<Rol | undefined>()
  const [origenRegistro, establecerOrigenRegistro] = useState('inicio')
  const [bloqueado, establecerBloqueado] = useState(false)
  function ir(destino: string) { establecerSeccion(destino) }
  function registrar(rol?: Rol) {
    establecerOrigenRegistro(seccion)
    establecerRolRegistro(rol)
    establecerSeccion('registro')
  }
  const actual = seccion === 'vinculos' ? 'estudiantes' : seccion === 'asignaciones' ? 'docentes' : seccion === 'registro' ? origenRegistro : seccion
  const etiquetaOrigen = opciones.find((opcion) => opcion.id === origenRegistro)?.etiqueta ?? 'Inicio'
  return <div className="panel-administracion"><Tablero rol="Administrador" nombre={usuario.nombre} opciones={opciones} gruposMenu={gruposMenu} actual={actual} alElegir={ir}
    bloqueado={bloqueado} fichas={<span className="ficha"><IconoGestion nombre="secciones" />Administración</span>}
    promo={<div className="tarjeta-promo"><strong>El acceso, bajo tu cuidado</strong><p>Las contraseñas temporales se muestran una sola vez. Entrégalas de forma privada.</p></div>}
    salir={salir} cambiarRol={cambiarRol} menuPlegable etiquetaMenu="Menú de administración">
    {seccion === 'inicio' && <InicioAdministracion nombre={usuario.nombre} ir={(id) => id === 'registro' ? registrar() : ir(id)} />}
    {seccion === 'registro' && <section className="admin-superficie">
      <button type="button" className="secundario admin-volver" disabled={bloqueado} onClick={() => ir(origenRegistro)}><IconoGestion nombre="atras" />Volver a {etiquetaOrigen}</button>
      <header className="admin-encabezado">
        <div><h1>{rolRegistro ? 'Crear cuenta de ' + rolRegistro : 'Crear una cuenta'}</h1>
          <p>{rolRegistro ? 'Completa sus datos para generar una contraseña temporal.' : 'Elige el tipo de cuenta y completa sus datos.'}</p></div>
        <span className="admin-ilustracion-icono"><IconoGestion nombre="personas" /></span>
      </header>
      <RegistrarUsuario key={rolRegistro ?? 'elegir'} rolInicial={rolRegistro} alCambiarBloqueo={establecerBloqueado} />
    </section>}
    {roles[seccion] && <GestionarUsuarios key={seccion} rolInicial={roles[seccion]} usuarioActualId={usuario.id} actualizarAcceso={actualizarAcceso} alCambiarBloqueo={establecerBloqueado} alRegistrar={() => registrar(roles[seccion])} />}
    {seccion === 'cursos' && <section className="admin-superficie"><CatalogoCursos /></section>}
    {seccion === 'juegos' && <JuegosPorDocente />}
    {seccion === 'secciones' && <section className="admin-superficie"><CrearSeccion alCambiarBloqueo={establecerBloqueado} /></section>}
    {seccion === 'vinculos' && <section className="admin-superficie"><GestionarVinculos alCambiarBloqueo={establecerBloqueado} /></section>}
    {seccion === 'asignaciones' && <section className="admin-superficie"><AsignarDocentes alCambiarBloqueo={establecerBloqueado} /></section>}
    <footer className="admin-pie">Kusi · Tu escuela, en orden</footer>
  </Tablero></div>
}
