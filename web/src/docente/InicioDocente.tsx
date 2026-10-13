import { useEffect, useState } from 'react'
import heroDocente from '../assets/kusi/hero-docente.webp'
import { Icono } from '../componentes/Icono'
import { aparienciaCurso, colorPara, primerNombre, saludo } from '../componentes/apariencia'
import { misEstudiantesDocente } from '../servicios/educacion'
import type { VinculoEstudiante } from '../servicios/educacion'
import { listarSolicitudes } from '../servicios/propuestas'
import type { ContextosPropuestas, SolicitudPropuesta } from '../servicios/propuestas'

type Propiedades = {
  nombre: string
  contextos: ContextosPropuestas | null
  ir: (seccion: string, curso?: string) => void
}

// Avance de una propuesta para la barra de progreso de "Continúa donde te quedaste".
function avance(solicitud: SolicitudPropuesta) {
  const revision = solicitud.propuesta?.estado_revision
  if (revision === 'aprobada') return { porcentaje: 100, texto: 'Aprobada: lista para el juego' }
  if (revision === 'rechazada') return { porcentaje: 60, texto: 'Rechazada: pide otra alternativa' }
  if (solicitud.estado === 'generada') return { porcentaje: 75, texto: 'Lista para que la revises' }
  if (solicitud.estado === 'generando') return { porcentaje: 50, texto: 'La IA la está preparando' }
  if (solicitud.estado === 'fallida') return { porcentaje: 35, texto: 'No se pudo generar: reinténtala' }
  return { porcentaje: 25, texto: 'Guardada: esperando a la IA' }
}

export function InicioDocente({ nombre, contextos, ir }: Propiedades) {
  const [estudiantes, establecerEstudiantes] = useState<VinculoEstudiante[] | null>(null)
  const [solicitudes, establecerSolicitudes] = useState<SolicitudPropuesta[] | null>(null)

  useEffect(() => {
    let vigente = true
    // Cada dato se muestra en cuanto llega; un fallo no oculta el resto del inicio.
    misEstudiantesDocente().then((r) => { if (vigente) establecerEstudiantes(r.estudiantes) }).catch(() => { if (vigente) establecerEstudiantes([]) })
    listarSolicitudes().then((r) => { if (vigente) establecerSolicitudes(r) }).catch(() => { if (vigente) establecerSolicitudes([]) })
    return () => { vigente = false }
  }, [])

  const cursos = contextos?.contextos ?? []
  const nombreCurso = (id: string) => cursos.find((c) => c.curso_id === id)?.curso_nombre ?? 'Curso'
  const totalEstudiantes = new Set((estudiantes ?? []).map((e) => e.estudiante_id)).size
  const porRevisar = (solicitudes ?? []).filter((s) => s.propuesta?.estado_revision === 'pendiente').length
  const aprobadas = (solicitudes ?? []).filter((s) => s.propuesta?.estado_revision === 'aprobada').length
  const total = solicitudes?.length ?? 0
  const ultima = solicitudes?.[0]

  // Estudiantes por sección, de la más numerosa a la menos.
  const porSeccion = new Map<string, number>()
  for (const e of estudiantes ?? []) porSeccion.set(e.seccion.nombre, (porSeccion.get(e.seccion.nombre) ?? 0) + 1)
  const secciones = [...porSeccion.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)

  const radio = 46
  const circunferencia = 2 * Math.PI * radio
  const proporcion = total ? aprobadas / total : 0

  return <>
    <section className="hero" aria-labelledby="saludo-docente">
      <div className="hero-texto">
        <h1 id="saludo-docente">¡{saludo()},<br /><span>profe {primerNombre(nombre)}!</span> 👋</h1>
        <p>Un juego más cerca de que tus estudiantes aprendan jugando.</p>
        <button type="button" onClick={() => ir('solicitar')}>Crear propuesta <Icono nombre="flecha" /></button>
      </div>
      <div className="hero-imagen" style={{ backgroundImage: 'url(' + heroDocente + ')' }} role="img" aria-label="Kusi, el cuy, saludando desde su escritorio" />
    </section>

    <div className="estadisticas">
      <button type="button" className="estadistica" onClick={() => ir('cursos')}>
        <span className="icono-grande c-cielo"><Icono nombre="libro" /></span>
        <span><strong>{contextos ? cursos.length : '…'}</strong><small>Cursos asignados</small></span>
      </button>
      <button type="button" className="estadistica" onClick={() => ir('estudiantes')}>
        <span className="icono-grande c-verde"><Icono nombre="estudiantes" /></span>
        <span><strong>{estudiantes ? totalEstudiantes : '…'}</strong><small>Estudiantes</small></span>
      </button>
      <button type="button" className="estadistica" onClick={() => ir('propuestas')}>
        <span className="icono-grande c-dorado"><Icono nombre="chispa" /></span>
        <span><strong>{solicitudes ? porRevisar : '…'}</strong><small>Por revisar</small></span>
      </button>
      <button type="button" className="estadistica" onClick={() => ir('propuestas')}>
        <span className="icono-grande c-rojo"><Icono nombre="carpeta" /></span>
        <span><strong>{solicitudes ? aprobadas : '…'}</strong><small>Aprobadas</small></span>
      </button>
    </div>

    <div className="contenido-con-lateral">
      <div>
        <div className="encabezado-seccion"><h2>Continúa donde te quedaste</h2>
          <button type="button" className="secundario" onClick={() => ir('propuestas')}>Ver todas</button></div>
        <div className="tarjeta">
          {solicitudes === null ? <p role="status">Cargando tus propuestas…</p> : ultima ? (() => {
            const curso = aparienciaCurso(nombreCurso(ultima.curso_id))
            const estado = avance(ultima)
            return <div className="continuar">
              <span className={'portada ' + curso.color} aria-hidden="true">{curso.emoji}</span>
              <div className="datos">
                <strong>{ultima.tema}</strong>
                <small>{nombreCurso(ultima.curso_id)} · {estado.texto}</small>
                <div className="barra-progreso" role="progressbar" aria-valuenow={estado.porcentaje} aria-valuemin={0} aria-valuemax={100} aria-label="Avance de la propuesta"><span style={{ width: estado.porcentaje + '%' }} /></div>
              </div>
              <button type="button" onClick={() => ir('propuestas')}>Revisar <Icono nombre="flecha" /></button>
            </div>
          })() : <div className="continuar">
            <span className="portada c-dorado" aria-hidden="true">✨</span>
            <div className="datos"><strong>Aún no tienes propuestas</strong><small>Elige un curso y un tema: Kusi te ayuda a crear el juego.</small></div>
            <button type="button" onClick={() => ir('solicitar')}>Crear la primera <Icono nombre="flecha" /></button>
          </div>}
        </div>

        <div className="encabezado-seccion"><h2>Mis cursos</h2>
          <button type="button" className="secundario" onClick={() => ir('cursos')}>Ver todos</button></div>
        {contextos === null ? <p role="status">Cargando tus cursos…</p>
          : cursos.length === 0 ? <p className="tarjeta">Aún no tienes cursos asignados. El administrador te los asignará.</p>
          : <div className="mosaicos">{cursos.map((c) => {
            const apariencia = aparienciaCurso(c.curso_nombre)
            return <button key={c.curso_id + '/' + (c.seccion_id ?? '')} type="button" className="mosaico"
              onClick={() => ir('solicitar', c.curso_id + '/' + (c.seccion_id ?? ''))}>
              <span className={'icono-grande ' + apariencia.color} aria-hidden="true">{apariencia.emoji}</span>
              <span><strong>{c.curso_nombre}</strong><small>{c.seccion_nombre ? 'Sección ' + c.seccion_nombre : 'Primero de primaria'}</small></span>
            </button>
          })}</div>}
      </div>

      <aside className="lateral-derecho" aria-label="Resumen">
        <div className="tarjeta">
          <h2>Tu meta de propuestas</h2>
          <div className="anillo">
            <svg viewBox="0 0 120 120" role="img" aria-label={aprobadas + ' de ' + total + ' propuestas aprobadas'}>
              <circle cx="60" cy="60" r={radio} fill="none" stroke="var(--crema-3)" strokeWidth="12" />
              <circle cx="60" cy="60" r={radio} fill="none" stroke="var(--dorado)" strokeWidth="12" strokeLinecap="round"
                strokeDasharray={circunferencia} strokeDashoffset={circunferencia * (1 - proporcion)} transform="rotate(-90 60 60)" />
              <text x="60" y="58" textAnchor="middle" fontFamily="Fredoka" fontSize="24" fill="var(--vino)">{aprobadas}/{total}</text>
              <text x="60" y="78" textAnchor="middle" fontSize="11" fontWeight="800" fill="var(--texto-suave)">aprobadas</text>
            </svg>
            <p>{total === 0 ? 'Crea tu primera propuesta y apruébala para convertirla en juego.' : aprobadas === total ? '¡Excelente! Revisaste todas tus propuestas.' : '¡Vas muy bien! ' + (total - aprobadas === 1 ? 'Te falta 1 por aprobar.' : 'Te faltan ' + (total - aprobadas) + ' por aprobar.')}</p>
          </div>
        </div>

        <div className="tarjeta">
          <h2>Mis secciones</h2>
          {estudiantes === null ? <p role="status">Cargando…</p> : secciones.length === 0 ? <p>Aún no hay estudiantes vinculados a tus secciones.</p>
            : <ol className="lista-mini">{secciones.map(([seccion, cantidad], indice) => <li key={seccion}>
              <span className={'puesto ' + colorPara(seccion)} aria-hidden="true">{indice + 1}</span>
              <span className="texto">Sección {seccion}<small>{cantidad} {cantidad === 1 ? 'estudiante' : 'estudiantes'}</small></span>
            </li>)}</ol>}
        </div>

        <div className="tarjeta tarjeta-premio">
          <span className="emoji" aria-hidden="true">🎁</span>
          <strong>¡Pronto, tus juegos 3D!</strong>
          <p>Cada propuesta aprobada se convertirá en un juego para tus estudiantes.</p>
          <div className="barra-progreso" aria-hidden="true"><span style={{ width: (total ? Math.round(proporcion * 100) : 0) + '%' }} /></div>
        </div>
      </aside>
    </div>
  </>
}
