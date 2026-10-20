import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { ListaBuscable } from '../componentes/ListaBuscable'
import { crearAsignacion, listarAsignaciones, listarSecciones } from '../servicios/educacion'
import type { AsignacionDocente, SeccionEducativa } from '../servicios/educacion'
import { listarCursos } from '../servicios/cursos'
import type { Curso } from '../servicios/cursos'
import type { UsuarioAdministrado } from '../servicios/usuarios'
import { listarUsuariosEducativos, nombreSeccion, opcionesCuentas } from '../servicios/opcionesEducativas'

export function AsignarDocentes({ docenteInicial = '', alCambiarBloqueo, bloqueadoExterno = false }: { docenteInicial?: string; alCambiarBloqueo?: (bloqueado: boolean) => void; bloqueadoExterno?: boolean }) {
  const [docente, setDocente] = useState(docenteInicial)
  const [curso, setCurso] = useState('')
  const [seccion, setSeccion] = useState('')
  const [usuarios, setUsuarios] = useState<UsuarioAdministrado[]>([])
  const [cursos, setCursos] = useState<Curso[]>([])
  const [secciones, setSecciones] = useState<SeccionEducativa[]>([])
  const [asignaciones, setAsignaciones] = useState<AsignacionDocente[]>([])
  const [error, setError] = useState('')
  const [errorCarga, setErrorCarga] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [cargando, setCargando] = useState(true)
  useEffect(() => { alCambiarBloqueo?.(ocupado); return () => alCambiarBloqueo?.(false) }, [ocupado, alCambiarBloqueo])
  const revision = useRef(0)
  const bloqueo = useRef(false)
  const cargar = useCallback(() => {
    const actual = ++revision.current
    return Promise.all([listarUsuariosEducativos(), listarCursos(), listarSecciones(), listarAsignaciones()]).then(([cuentas, catalogo, grupos, relaciones]) => {
      if (actual !== revision.current) return
      setUsuarios(cuentas); setCursos(catalogo.cursos); setSecciones(grupos.secciones); setAsignaciones(relaciones.asignaciones)
    }).catch((fallo: unknown) => {
      if (actual === revision.current) setErrorCarga(fallo instanceof Error ? fallo.message : 'No se pudieron cargar las listas.')
    }).finally(() => { if (actual === revision.current) setCargando(false) })
  }, [])
  useEffect(() => { void cargar(); return () => { revision.current += 1 } }, [cargar])
  function recargar() { setCargando(true); setErrorCarga(''); void cargar() }

  const docentes = opcionesCuentas(usuarios, 'docente').filter((cuenta) => !docenteInicial || cuenta.id === docenteInicial)
  const elegida = secciones.find((grupo) => grupo.id === seccion)
  const seleccionValida = docentes.some((usuario) => usuario.id === docente) && cursos.some((materia) => materia.id === curso) && !!elegida
  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (bloqueo.current || bloqueadoExterno || cargando || errorCarga) return
    setError(''); setMensaje('')
    if (!seleccionValida || !elegida) { setError('Selecciona un docente, un curso y una sección de las listas.'); return }
    bloqueo.current = true; setOcupado(true)
    try {
      const { asignacion } = await crearAsignacion({ docente_id: docente, curso_id: curso, seccion_id: seccion, anio_escolar: elegida.anio_escolar })
      setAsignaciones((anteriores) => [...anteriores.filter((item) => item.id !== asignacion.id), asignacion])
      setMensaje('Docente asignado correctamente.'); setDocente(docenteInicial)
    } catch (fallo) { setError(fallo instanceof Error ? fallo.message : 'No se pudo guardar la asignación.') }
    finally { bloqueo.current = false; setOcupado(false) }
  }
  return <section className="admin-relacion"><h1>{docenteInicial ? 'Cursos y secciones' : 'Asignar docentes a cursos'}</h1><p>{docenteInicial ? 'Elige qué curso enseñará y en qué sección.' : 'Elige al docente, su curso y su sección.'}</p>
    {cargando && <p role="status">Cargando docentes, cursos y secciones…</p>}
    {errorCarga && <p role="alert" className="error-resumen">{errorCarga}</p>}
    <button type="button" className="secundario" onClick={recargar} disabled={ocupado || bloqueadoExterno || cargando}>Volver a cargar listas</button>
    <form onSubmit={guardar}><fieldset disabled={ocupado || bloqueadoExterno || cargando || !!errorCarga}>
      <legend>Datos de la asignación</legend>
      {!docenteInicial && <ListaBuscable id="asig-docente" etiqueta="Docente" opciones={docentes} valor={docente} alCambiar={setDocente} vacio="No hay docentes activos. Registra una cuenta docente para continuar." />}
      <ListaBuscable id="asig-curso" etiqueta="Curso" opciones={cursos} valor={curso} alCambiar={setCurso} vacio="No hay cursos disponibles. Revisa el catálogo de cursos." />
      <ListaBuscable id="asig-seccion" etiqueta="Sección" opciones={secciones.map((grupo) => ({ id: grupo.id, nombre: nombreSeccion(grupo) }))} valor={seccion} alCambiar={setSeccion} vacio="No hay secciones. Crea una sección para continuar." />
      {elegida && <p>Año escolar: <strong>{elegida.anio_escolar}</strong></p>}
      <button type="submit" disabled={!seleccionValida}>{ocupado ? 'Guardando…' : 'Asignar docente'}</button>
    </fieldset></form>
    {error && <p role="alert" className="error-resumen">{error}</p>}{mensaje && <p role="status">{mensaje}</p>}
    <h2>Asignaciones existentes</h2>
    {!cargando && !errorCarga && !asignaciones.length && <p>Aún no hay docentes asignados.</p>}
    <ul className="lista-gestion">{asignaciones.map((asignacion) => <li key={asignacion.id}>
      <div><strong>{usuarios.find((usuario) => usuario.id === asignacion.docente_id)?.nombre ?? 'Docente no disponible'}</strong>
        <span>{cursos.find((materia) => materia.id === asignacion.curso_id)?.nombre ?? 'Curso no disponible'} · {nombreSeccion(asignacion.seccion)}</span></div>
    </li>)}</ul>
  </section>
}
