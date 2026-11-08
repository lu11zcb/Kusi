import { useEffect, useState } from 'react'
import imagenDocente from '../assets/kusi/hero-docente.webp'
import { primerNombre, saludo } from '../componentes/apariencia'
import { Icono } from '../componentes/Icono'
import { PrimerosPasos } from '../componentes/PrimerosPasos'
import { misEstudiantesDocente } from '../servicios/educacion'
import type { VinculoEstudiante } from '../servicios/educacion'
import type { ContextosPropuestas } from '../servicios/propuestas'
import { cargarTrabajos, estadoTrabajo } from './trabajosDocente'
import type { TrabajoDocente } from './trabajosDocente'
import { IconoDocente } from './IconoDocente'
import { CargandoDocente, IconoCurso, MensajeDocente } from './ElementosDocente'

type Propiedades = { nombre: string; contextos: ContextosPropuestas | null; ir: (seccion: string, curso?: string, juego?: string) => void; errorCursos?: string; recargarCursos?: () => void }
export function InicioDocente({ nombre, contextos, ir, errorCursos = '', recargarCursos }: Propiedades) {
  const [estudiantes, establecerEstudiantes] = useState<VinculoEstudiante[] | null>(null)
  const [trabajos, establecerTrabajos] = useState<TrabajoDocente[] | null>(null)
  const [errorEstudiantes, establecerErrorEstudiantes] = useState('')
  const [errorJuegos, establecerErrorJuegos] = useState('')
  const error = errorEstudiantes || errorJuegos || errorCursos
  const [recarga, establecerRecarga] = useState(0)
  useEffect(() => {
    let vigente = true
    misEstudiantesDocente().then((r) => { if (vigente) { establecerEstudiantes(r.estudiantes); establecerErrorEstudiantes('') } }).catch(() => { if (vigente) establecerErrorEstudiantes('No pudimos actualizar todos tus datos. Intenta otra vez.') })
    cargarTrabajos().then((r) => { if (vigente) { establecerTrabajos(r); establecerErrorJuegos('') } }).catch(() => { if (vigente) establecerErrorJuegos('No pudimos actualizar tus juegos. Intenta otra vez.') })
    return () => { vigente = false }
  }, [recarga])
  const cursos = contextos?.contextos ?? []
  const nombreCurso = (id: string) => cursos.find((c) => c.curso_id === id)?.curso_nombre ?? 'Tu clase'
  const ultima = trabajos?.[0]
  const cantidades = (clave: string) => trabajos ? trabajos.filter((item) => estadoTrabajo(item).clave === clave).length : '…'
  const secciones = [...new Map(cursos.flatMap((curso) => curso.seccion_id ? [[curso.seccion_id, curso.seccion_nombre] as const] : [])).entries()]
  const cantidadSeccion = (id: string) => {
    if (!estudiantes) return '…'
    const cantidad = new Set(estudiantes.filter((estudiante) => estudiante.seccion.id === id).map((estudiante) => estudiante.estudiante_id)).size
    return cantidad + (cantidad === 1 ? ' estudiante' : ' estudiantes')
  }
  const pasos = [
    { texto: 'Crear tu primera idea', hecho: !!trabajos?.length, destino: 'solicitar' },
    { texto: 'Preparar un juego', hecho: !!trabajos?.some((trabajo) => trabajo.preparadoAlgunaVez), destino: 'propuestas' },
    { texto: 'Enviar a tu clase', hecho: !!trabajos?.some((trabajo) => trabajo.enviadoAlgunaVez), destino: 'propuestas' },
  ]
  return <section className="doc-pagina doc-inicio" aria-label="Inicio del docente">
    <section className="hero paisaje" aria-labelledby="saludo-docente"><div className="hero-texto"><h1 id="saludo-docente">¡{saludo()},<br /><span>profe {primerNombre(nombre)}!</span></h1><p>Prepara un juego para lo que tu clase necesita aprender.</p><button type="button" onClick={() => ir('solicitar')}>Crear propuesta<Icono nombre="flecha" /></button></div><div className="hero-imagen hero-docente" style={{ backgroundImage: 'url(' + imagenDocente + ')' }} role="img" aria-label="Kusi prepara una actividad de patrones con tarjetas de frutas en el aula" /></section>
    {error && <MensajeDocente titulo="Vamos a actualizar tu inicio"><p>{error}</p><button type="button" className="secundario" onClick={() => { establecerRecarga((n) => n + 1); recargarCursos?.() }}>Volver a cargar</button></MensajeDocente>}
    <div className="estadisticas">
      <button className="estadistica" type="button" onClick={() => ir('cursos')}><span className="icono-grande c-cielo"><Icono nombre="libro" /></span><span><strong>{contextos ? new Set(cursos.map((c) => c.curso_id)).size : '…'}</strong><small>Mis cursos</small></span></button>
      <button className="estadistica" type="button" onClick={() => ir('estudiantes')}><span className="icono-grande c-rojo"><Icono nombre="usuarios" /></span><span><strong>{estudiantes ? new Set(estudiantes.map((e) => e.estudiante_id)).size : '…'}</strong><small>Estudiantes</small></span></button>
      <button className="estadistica" type="button" onClick={() => ir('propuestas')}><span className="icono-grande c-morado"><Icono nombre="varita" /></span><span><strong>{cantidades('probar')}</strong><small>Juegos para probar</small></span></button>
      <button className="estadistica" type="button" onClick={() => ir('propuestas')}><span className="icono-grande c-verde"><Icono nombre="pizarra" /></span><span><strong>{cantidades('enviado')}</strong><small>Enviados a mi clase</small></span></button>
    </div>
    <div className="contenido-con-lateral"><div>
      <div className="encabezado-seccion"><h2>Continúa con tu juego</h2><button type="button" className="secundario" onClick={() => ir('propuestas')}>Mis juegos<Icono nombre="flecha" /></button></div>
      {trabajos === null ? <CargandoDocente texto="Buscando dónde te quedaste…" /> : ultima ? <article className="tarjeta continuar"><IconoCurso nombre={nombreCurso(ultima.solicitud.curso_id)} /><div className="datos"><strong>{ultima.solicitud.tema}</strong><small>{nombreCurso(ultima.solicitud.curso_id)} · {estadoTrabajo(ultima).etiqueta}</small></div><button type="button" onClick={() => ir('propuestas', '', ultima.solicitud.id_solicitud)}>{estadoTrabajo(ultima).accion}<Icono nombre="flecha" /></button></article>
        : <MensajeDocente titulo="Tu primer juego empieza aquí"><p>Cuéntale a Kusi qué quieres trabajar con tu clase.</p><button type="button" onClick={() => ir('solicitar')}>Preparar mi primera idea</button></MensajeDocente>}
      <div className="encabezado-seccion"><h2>Acciones rápidas</h2></div><div className="mosaicos">
        <button className="mosaico" type="button" onClick={() => ir('solicitar')}><span className="icono-grande c-dorado"><Icono nombre="varita" /></span><span><strong>Crear propuesta</strong><small>Una idea para tu clase</small></span></button>
        <button className="mosaico" type="button" onClick={() => ir('propuestas')}><span className="icono-grande c-morado"><Icono nombre="carpeta" /></span><span><strong>Mis juegos</strong><small>Revisa, prueba y comparte</small></span></button>
        <button className="mosaico" type="button" onClick={() => ir('estudiantes')}><span className="icono-grande c-rojo"><Icono nombre="usuarios" /></span><span><strong>Mis estudiantes</strong><small>Encuentra a tu grupo</small></span></button>
      </div>
      <div className="encabezado-seccion"><h2>Mis cursos</h2><button type="button" className="secundario" onClick={() => ir('cursos')}>Ver todos<Icono nombre="flecha" /></button></div>
      {!contextos ? <CargandoDocente texto="Buscando tus cursos…" /> : !cursos.length ? <MensajeDocente titulo="Tus cursos aparecerán aquí"><p>El administrador te ayudará a vincular tu cuenta con tu clase.</p></MensajeDocente> : <div className="mosaicos">{cursos.map((c) => <button className="mosaico" key={c.curso_id + '/' + (c.seccion_id ?? '')} type="button" onClick={() => ir('solicitar', c.curso_id + '/' + (c.seccion_id ?? ''))}><IconoCurso nombre={c.curso_nombre} /><span><strong>{c.curso_nombre}</strong><small>{c.seccion_nombre ? 'Sección ' + c.seccion_nombre : 'Primero de primaria'}</small></span></button>)}</div>}
    </div><aside className="lateral-derecho" aria-label="Tu clase y primeros pasos">
      <PrimerosPasos pasos={pasos} alElegir={(destino) => ir(destino)} descripcion="Tres pasos para compartir tu primer juego." cargando={trabajos === null || trabajos.some((trabajo) => trabajo.sinConfirmar)} />
      <section className="tarjeta"><h2>Mis secciones</h2>{!secciones.length ? <p>Tus secciones aparecerán aquí.</p> : <ul className="lista-mini">{secciones.map(([id, nombreSeccion]) => <li key={id}><span className="puesto c-verde"><IconoDocente nombre="secciones" /></span><span className="texto">{nombreSeccion}<small>{cantidadSeccion(id)}</small></span></li>)}</ul>}</section>
    </aside></div>
  </section>
}
