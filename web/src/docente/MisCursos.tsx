import { Icono } from '../componentes/Icono'
import { aparienciaCurso } from '../componentes/apariencia'
import type { ContextosPropuestas } from '../servicios/propuestas'

// HU08/HU17: cursos y secciones asignados al docente, con el nombre del curso
// (sale del catálogo) y un acceso directo para crear una propuesta.
export function MisCursos({ contextos, error, crear }: { contextos: ContextosPropuestas | null; error: string; crear: (curso: string) => void }) {
  return <section aria-labelledby="titulo-mis-cursos">
    <h2 id="titulo-mis-cursos">Mis cursos y secciones</h2>
    {error && <p role="alert" className="error-resumen">{error}</p>}
    {!error && !contextos && <p role="status">Cargando tus cursos…</p>}
    {contextos && contextos.contextos.length === 0 && <p>Aún no tienes cursos asignados. El administrador te los asignará.</p>}
    {contextos && contextos.contextos.length > 0 && <div className="mosaicos">
      {contextos.contextos.map((c) => {
        const apariencia = aparienciaCurso(c.curso_nombre)
        const clave = c.curso_id + '/' + (c.seccion_id ?? '')
        return <button key={clave} type="button" className="mosaico" onClick={() => crear(clave)}>
          <span className={'icono-grande ' + apariencia.color} aria-hidden="true">{apariencia.emoji}</span>
          <span>
            <strong>{c.curso_nombre}</strong>
            <small>{c.seccion_nombre ? 'Sección ' + c.seccion_nombre + ' · ' + c.anio_escolar : 'Primero de primaria'}</small>
            <small><Icono nombre="varita" className="icono" /> Crear propuesta</small>
          </span>
        </button>
      })}
    </div>}
  </section>
}
