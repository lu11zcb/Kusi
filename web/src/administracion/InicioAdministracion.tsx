import { useEffect, useState } from 'react'
import imagenAdministrador from '../assets/kusi/hero-administrador-v1.webp'
import { Icono } from '../componentes/Icono'
import type { NombreIcono } from '../componentes/Icono'
import { primerNombre, saludo } from '../componentes/apariencia'
import { listarCursos } from '../servicios/cursos'
import { listarAsignaciones, listarVinculos } from '../servicios/educacion'
import { listarUsuarios } from '../servicios/usuarios'
import { PrimerosPasos } from '../componentes/PrimerosPasos'

type Conteos = { usuarios: number | null; cursos: number | null; vinculos: number | null; asignaciones: number | null }

const accesos: readonly { id: string; titulo: string; detalle: string; icono: NombreIcono; color: string }[] = [
  { id: 'registro', titulo: 'Registrar usuario', detalle: 'Docentes y estudiantes', icono: 'registrar', color: 'c-dorado' },
  { id: 'estudiantes', titulo: 'Estudiantes', detalle: 'Cuentas y secciones', icono: 'usuarios', color: 'c-rojo' },
  { id: 'cursos', titulo: 'Catálogo de cursos', detalle: 'Nombres de los cursos', icono: 'libro', color: 'c-cielo' },
  { id: 'secciones', titulo: 'Crear sección', detalle: 'Primero de primaria', icono: 'aula', color: 'c-verde' },
  { id: 'docentes', titulo: 'Docentes', detalle: 'Cuentas y cursos asignados', icono: 'enlace', color: 'c-morado' },
  { id: 'administradores', titulo: 'Administradores', detalle: 'Datos, roles y acceso', icono: 'pizarra', color: 'c-rosa' },
]

export function InicioAdministracion({ nombre, ir }: { nombre: string; ir: (seccion: string) => void }) {
  const [conteos, establecerConteos] = useState<Conteos>({ usuarios: null, cursos: null, vinculos: null, asignaciones: null })
  useEffect(() => {
    let vigente = true
    const poner = (campo: keyof Conteos, valor: number) => { if (vigente) establecerConteos((anterior) => ({ ...anterior, [campo]: valor })) }
    // Cada número aparece al llegar; si Spring no responde, se muestra "—" y lo demás sigue.
    listarUsuarios('', 1).then((r) => poner('usuarios', r.total)).catch(() => poner('usuarios', -1))
    listarCursos().then((r) => poner('cursos', r.cursos.length)).catch(() => poner('cursos', -1))
    listarVinculos().then((r) => poner('vinculos', r.vinculos.length)).catch(() => poner('vinculos', -1))
    listarAsignaciones().then((r) => poner('asignaciones', r.asignaciones.length)).catch(() => poner('asignaciones', -1))
    return () => { vigente = false }
  }, [])

  const mostrar = (valor: number | null) => valor === null ? '…' : valor < 0 ? '—' : String(valor)
  const pasos = [
    { texto: 'Registrar docentes y estudiantes', hecho: (conteos.usuarios ?? 0) > 1, destino: 'registro' },
    { texto: 'Revisar el catálogo de cursos', hecho: (conteos.cursos ?? 0) > 0, destino: 'cursos' },
    { texto: 'Crear las secciones', hecho: (conteos.vinculos ?? 0) > 0 || (conteos.asignaciones ?? 0) > 0, destino: 'secciones' },
    { texto: 'Vincular estudiantes', hecho: (conteos.vinculos ?? 0) > 0, destino: 'vinculos' },
    { texto: 'Asignar docentes', hecho: (conteos.asignaciones ?? 0) > 0, destino: 'asignaciones' },
  ]
  const hechos = pasos.filter((paso) => paso.hecho).length

  return <>
    <section className="hero paisaje" aria-labelledby="saludo-admin">
      <div className="hero-texto">
        <h1 id="saludo-admin">¡{saludo()},<br /><span>{primerNombre(nombre)}!</span></h1>
        <p>Organiza tu escuela para que los docentes creen juegos con Kusi.</p>
        <button type="button" onClick={() => ir('registro')}>Registrar usuario <Icono nombre="flecha" /></button>
      </div>
      <div className="hero-imagen hero-administrador" style={{ backgroundImage: 'url(' + imagenAdministrador + ')' }} role="img" aria-label="Kusi organiza las cuentas y secciones de la escuela con una lista y carpetas" />
    </section>

    <div className="estadisticas">
      <button type="button" className="estadistica" onClick={() => ir('usuarios')}>
        <span className="icono-grande c-rojo"><Icono nombre="usuarios" /></span>
        <span><strong>{mostrar(conteos.usuarios)}</strong><small>Usuarios</small></span>
      </button>
      <button type="button" className="estadistica" onClick={() => ir('cursos')}>
        <span className="icono-grande c-cielo"><Icono nombre="libro" /></span>
        <span><strong>{mostrar(conteos.cursos)}</strong><small>Cursos</small></span>
      </button>
      <button type="button" className="estadistica" onClick={() => ir('vinculos')}>
        <span className="icono-grande c-morado"><Icono nombre="enlace" /></span>
        <span><strong>{mostrar(conteos.vinculos)}</strong><small>Estudiantes vinculados</small></span>
      </button>
      <button type="button" className="estadistica" onClick={() => ir('asignaciones')}>
        <span className="icono-grande c-verde"><Icono nombre="pizarra" /></span>
        <span><strong>{mostrar(conteos.asignaciones)}</strong><small>Asignaciones</small></span>
      </button>
    </div>

    <div className="contenido-con-lateral">
      <div>
        <div className="encabezado-seccion"><h2>Acciones rápidas</h2></div>
        <div className="mosaicos">
          {accesos.map((acceso) => <button key={acceso.id} type="button" className="mosaico" onClick={() => ir(acceso.id)}>
            <span className={'icono-grande ' + acceso.color}><Icono nombre={acceso.icono} /></span>
            <span><strong>{acceso.titulo}</strong><small>{acceso.detalle}</small></span>
          </button>)}
        </div>
      </div>
      <aside className="lateral-derecho" aria-label="Primeros pasos">
        <PrimerosPasos pasos={pasos} alElegir={ir} cargando={Object.values(conteos).some((valor) => valor === null)} />
        <div className="tarjeta tarjeta-premio">
          <span className="icono-grande c-morado" aria-hidden="true"><Icono nombre={hechos === pasos.length ? 'check' : 'aula'} /></span>
          <strong>{hechos === pasos.length ? '¡Tu escuela está lista!' : 'Prepara el aula de Kusi'}</strong>
          <p>{hechos === pasos.length ? 'Los docentes ya pueden crear propuestas de juego.' : 'Completa los pasos para que los docentes empiecen a crear juegos.'}</p>
        </div>
      </aside>
    </div>
  </>
}
