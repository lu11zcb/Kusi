import { useEffect, useState } from 'react'
import imagenAdministrador from '../assets/kusi/hero-administrador.webp'
import { Icono } from '../componentes/Icono'
import type { NombreIcono } from '../componentes/Icono'
import { iniciales, primerNombre, saludo } from '../componentes/apariencia'
import { listarSecciones } from '../servicios/educacion'
import { consultarResumenAdministracion } from '../servicios/usuarios'
import type { ResumenAdministracion } from '../servicios/usuarios'
import type { Rol } from '../servicios/django'
import { ResumenJuegos } from './ResumenJuegos'

const accesos: readonly { id: string; titulo: string; detalle: string; icono: NombreIcono; color: string }[] = [
  { id: 'registro', titulo: 'Registrar usuario', detalle: 'Crear una cuenta de acceso', icono: 'registrar', color: 'c-dorado' },
  { id: 'secciones', titulo: 'Crear sección', detalle: 'Añadir un grupo para el año escolar', icono: 'aula', color: 'c-verde' },
  { id: 'vinculos', titulo: 'Vincular estudiantes', detalle: 'Elegir la sección de cada estudiante', icono: 'enlace', color: 'c-rojo' },
  { id: 'asignaciones', titulo: 'Asignar docentes', detalle: 'Elegir un curso y una sección', icono: 'pizarra', color: 'c-morado' },
]
const nombresRol: Record<Rol, string> = { administrador: 'Administrador', docente: 'Docente', estudiante: 'Estudiante' }
const fechaCorta = new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium' })

export function InicioAdministracion({ nombre, ir }: { nombre: string; ir: (seccion: string) => void }) {
  const [resumen, establecerResumen] = useState<ResumenAdministracion | null>(null)
  const [secciones, establecerSecciones] = useState<number | null>(null)
  const [errorResumen, establecerErrorResumen] = useState(false)
  const [errorSecciones, establecerErrorSecciones] = useState(false)
  useEffect(() => {
    let vigente = true
    // Las cuentas y los cursos se muestran aunque el servicio de secciones esté caído.
    consultarResumenAdministracion()
      .then((datos) => { if (vigente) establecerResumen(datos) })
      .catch(() => { if (vigente) establecerErrorResumen(true) })
    listarSecciones()
      .then((datos) => { if (vigente) establecerSecciones(datos.secciones.length) })
      .catch(() => { if (vigente) establecerErrorSecciones(true) })
    return () => { vigente = false }
  }, [])

  const conteos: { id: string; titulo: string; icono: NombreIcono; color: string; valor: number | null | undefined; error: boolean }[] = [
    { id: 'estudiantes', titulo: 'Estudiantes', icono: 'estudiantes', color: 'c-rojo', valor: resumen?.estudiantes, error: errorResumen },
    { id: 'docentes', titulo: 'Docentes', icono: 'pizarra', color: 'c-morado', valor: resumen?.docentes, error: errorResumen },
    { id: 'secciones', titulo: 'Secciones', icono: 'aula', color: 'c-verde', valor: secciones, error: errorSecciones },
    { id: 'cursos', titulo: 'Cursos', icono: 'libro', color: 'c-cielo', valor: resumen?.cursos, error: errorResumen },
  ]

  return <>
    <section className="hero paisaje" aria-labelledby="saludo-admin">
      <div className="hero-texto">
        <h1 id="saludo-admin">¡{saludo()},<br /><span>{primerNombre(nombre)}!</span></h1>
        <p>Administra las cuentas, secciones y cursos de tu escuela.</p>
        <button type="button" onClick={() => ir('registro')}>Registrar usuario <Icono nombre="flecha" /></button>
      </div>
      <div className="hero-imagen hero-administrador" style={{ backgroundImage: 'url(' + imagenAdministrador + ')' }} role="img" aria-label="Kusi organiza las cuentas y secciones de la escuela con una lista y carpetas" />
    </section>

    <section className="estadisticas admin-estadisticas" aria-label="Resumen de la escuela">
      {conteos.map(({ id, titulo, icono, color, valor, error }) => <button key={id} type="button" className="estadistica" onClick={() => ir(id)}>
        <span className={'icono-grande ' + color}><Icono nombre={icono} /></span>
        <span>
          <strong>{valor ?? <span aria-label={error ? 'Sin datos' : 'Cargando'}>{error ? '—' : '…'}</span>}</strong>
          <small>{titulo}</small>
        </span>
      </button>)}
    </section>
    <ResumenJuegos abrir={() => ir('juegos')} />

    <div className="contenido-con-lateral admin-inicio-contenido">
      <section aria-labelledby="admin-acciones-rapidas">
        <div className="encabezado-seccion"><h2 id="admin-acciones-rapidas">Acciones rápidas</h2></div>
        <div className="mosaicos">
          {accesos.map((acceso) => <button key={acceso.id} type="button" className="mosaico" onClick={() => ir(acceso.id)}>
            <span className={'icono-grande ' + acceso.color}><Icono nombre={acceso.icono} /></span>
            <span><strong>{acceso.titulo}</strong><small>{acceso.detalle}</small></span>
          </button>)}
        </div>
      </section>
      <section className="tarjeta admin-recientes" aria-labelledby="admin-usuarios-recientes">
        <h2 id="admin-usuarios-recientes">Últimos usuarios registrados</h2>
        {errorResumen && <p role="status">No se pudo cargar el registro de usuarios recientes.</p>}
        {!resumen && !errorResumen && <p role="status">Cargando usuarios recientes…</p>}
        {resumen && (resumen.usuarios_recientes.length === 0 ? <p>Aún no hay cuentas registradas.</p> :
          <ul className="admin-personas">
            {resumen.usuarios_recientes.map((usuario) => <li key={usuario.id}>
              <span className={'admin-avatar ' + (usuario.roles.includes('docente') ? 'docente' : '')} aria-hidden="true">{iniciales(usuario.nombre)}</span>
              <div className="admin-persona-nombre">
                <strong>{usuario.nombre}</strong>
                <span>{usuario.roles.map((rol) => nombresRol[rol]).join(' · ')} · <time dateTime={usuario.fecha_creacion}>{fechaCorta.format(new Date(usuario.fecha_creacion))}</time></span>
              </div>
            </li>)}
          </ul>)}
      </section>
    </div>
  </>
}
