import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { ListaBuscable } from '../componentes/ListaBuscable'
import { crearAsignacion, listarAsignaciones, listarSecciones } from '../servicios/educacion'
import type { AsignacionDocente, SeccionEducativa } from '../servicios/educacion'
import { listarCursos } from '../servicios/cursos'
import type { Curso } from '../servicios/cursos'
import type { UsuarioAdministrado } from '../servicios/usuarios'
import { compararSecciones, listarUsuariosEducativos, nombreSeccion, opcionesCuentas } from '../servicios/opcionesEducativas'
import { SelectorRelacion } from './SelectorRelacion'

export function AsignarDocentes({ docenteInicial = '', cuentaActiva = true, alCambiarBloqueo, bloqueadoExterno = false }: {
  docenteInicial?: string
  cuentaActiva?: boolean
  alCambiarBloqueo?: (bloqueado: boolean) => void
  bloqueadoExterno?: boolean
}) {
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
    const cuentasDisponibles = docenteInicial ? Promise.resolve([]) : listarUsuariosEducativos()
    return Promise.all([cuentasDisponibles, listarCursos(), listarSecciones(), listarAsignaciones()]).then(([cuentas, catalogo, grupos, relaciones]) => {
      if (actual !== revision.current) return
      setUsuarios(cuentas); setCursos(catalogo.cursos); setSecciones(grupos.secciones); setAsignaciones(relaciones.asignaciones)
    }).catch((fallo: unknown) => {
      if (actual === revision.current) setErrorCarga(fallo instanceof Error ? fallo.message : 'No se pudieron cargar las listas.')
    }).finally(() => { if (actual === revision.current) setCargando(false) })
  }, [docenteInicial])
  useEffect(() => { void cargar(); return () => { revision.current += 1 } }, [cargar])
  function recargar() { setCargando(true); setErrorCarga(''); setError(''); void cargar() }

  const docentes = opcionesCuentas(usuarios, 'docente')
  const visibles = asignaciones.filter((asignacion) => !docenteInicial || asignacion.docente_id === docenteInicial)
    .sort((primera, segunda) => compararSecciones(primera.seccion, segunda.seccion))
  const elegida = secciones.find((grupo) => grupo.id === seccion)
  const docenteValido = docenteInicial ? cuentaActiva : docentes.some((usuario) => usuario.id === docente)
  const seleccionValida = docenteValido && cursos.some((materia) => materia.id === curso) && !!elegida
  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (bloqueo.current || bloqueadoExterno || cargando || errorCarga) return
    setError(''); setMensaje('')
    if (!seleccionValida || !elegida) { setError('Selecciona un docente, un curso y una sección de las listas.'); return }
    bloqueo.current = true; setOcupado(true)
    try {
      const { asignacion } = await crearAsignacion({ docente_id: docente, curso_id: curso, seccion_id: seccion, anio_escolar: elegida.anio_escolar })
      setAsignaciones((anteriores) => [...anteriores.filter((item) => item.id !== asignacion.id), asignacion])
      setMensaje('Docente asignado correctamente.')
      setDocente(docenteInicial)
      setCurso('')
      setSeccion('')
    } catch (fallo) { setError(fallo instanceof Error ? fallo.message : 'No se pudo guardar la asignación.') }
    finally { bloqueo.current = false; setOcupado(false) }
  }
  return <section className="admin-relacion">
    {docenteInicial ? <h2>Secciones asignadas</h2> : <h1>Asignar docentes a cursos</h1>}
    {cargando && <p role="status">Cargando cursos y secciones…</p>}
    {(errorCarga || error) && <div role="alert" className="error-resumen">
      <p>{errorCarga || error}</p>
      <button type="button" className="secundario" onClick={recargar} disabled={ocupado || bloqueadoExterno}>Volver a cargar listas</button>
    </div>}
    {mensaje && <p role="status">{mensaje}</p>}
    {!cargando && !errorCarga && <>
      {!docenteInicial && <h2>Asignaciones existentes</h2>}
      {visibles.length === 0 ? <p>{docenteInicial ? 'Aún no tiene secciones asignadas.' : 'Aún no hay docentes asignados.'}</p> :
        <ol className="lista-gestion">
          {visibles.map((asignacion) => {
            const grupo = asignacion.seccion
            const materia = cursos.find((curso) => curso.id === asignacion.curso_id)?.nombre ?? 'Curso no disponible'
            return <li key={asignacion.id}>
              <div>
                <strong>{docenteInicial ? grupo.nombre : usuarios.find((usuario) => usuario.id === asignacion.docente_id)?.nombre ?? 'Docente no disponible'}</strong>
                <span>{materia + ' · ' + (docenteInicial ? grupo.grado + '° de primaria · ' + grupo.anio_escolar : nombreSeccion(grupo))}</span>
              </div>
            </li>
          })}
        </ol>}
      {cuentaActiva ? <form onSubmit={guardar}>
        <fieldset disabled={ocupado || bloqueadoExterno}>
          <legend>{docenteInicial ? 'Asignar un curso y una sección' : 'Datos de la asignación'}</legend>
          {!docenteInicial && <ListaBuscable id="asig-docente" etiqueta="Docente" opciones={docentes} valor={docente} alCambiar={setDocente} vacio="No hay docentes activos. Registra una cuenta docente para continuar." />}
          <SelectorRelacion id="asig-curso" etiqueta="Curso" opciones={cursos} valor={curso} alCambiar={setCurso} vacio="No hay cursos disponibles" />
          <SelectorRelacion id="asig-seccion" etiqueta="Sección" opciones={secciones.map((grupo) => ({ id: grupo.id, nombre: nombreSeccion(grupo) }))} valor={seccion} alCambiar={setSeccion} vacio="No hay secciones disponibles" />
          <button type="submit" disabled={!seleccionValida}>{docenteInicial ? 'Asignar curso y sección' : 'Asignar docente'}</button>
        </fieldset>
      </form> : <p>Activa la cuenta para asignarle un curso y una sección.</p>}
    </>}
  </section>
}
