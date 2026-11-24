import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { ListaBuscable } from '../componentes/ListaBuscable'
import { crearVinculo, listarSecciones, listarVinculos, retirarEstudiante } from '../servicios/educacion'
import type { SeccionEducativa, VinculoEstudiante } from '../servicios/educacion'
import type { UsuarioAdministrado } from '../servicios/usuarios'
import { compararSecciones, listarUsuariosEducativos, nombreSeccion, opcionesCuentas } from '../servicios/opcionesEducativas'
import { SelectorRelacion } from './SelectorRelacion'

export function GestionarVinculos({ estudianteInicial = '', cuentaActiva = true, alCambiarResumen, alCambiarBloqueo, bloqueadoExterno = false }: {
  estudianteInicial?: string
  cuentaActiva?: boolean
  alCambiarResumen?: (resumen: string) => void
  alCambiarBloqueo?: (bloqueado: boolean) => void
  bloqueadoExterno?: boolean
}) {
  const [estudiante, setEstudiante] = useState(estudianteInicial)
  const [seccion, setSeccion] = useState('')
  const [usuarios, setUsuarios] = useState<UsuarioAdministrado[]>([])
  const [secciones, setSecciones] = useState<SeccionEducativa[]>([])
  const [vinculos, setVinculos] = useState<VinculoEstudiante[]>([])
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
    const cuentasDisponibles = estudianteInicial ? Promise.resolve([]) : listarUsuariosEducativos()
    return Promise.all([cuentasDisponibles, listarSecciones(), listarVinculos()]).then(([cuentas, grupos, relaciones]) => {
      if (actual !== revision.current) return
      setUsuarios(cuentas); setSecciones(grupos.secciones); setVinculos(relaciones.vinculos)
    }).catch((fallo: unknown) => {
      if (actual === revision.current) setErrorCarga(fallo instanceof Error ? fallo.message : 'No se pudieron cargar las listas.')
    }).finally(() => { if (actual === revision.current) setCargando(false) })
  }, [estudianteInicial])
  useEffect(() => { void cargar(); return () => { revision.current += 1 } }, [cargar])
  function recargar() { setCargando(true); setErrorCarga(''); setError(''); void cargar() }

  const estudiantes = opcionesCuentas(usuarios, 'estudiante')
  const visibles = vinculos
    .filter((vinculo) => !estudianteInicial || (vinculo.estudiante_id === estudianteInicial && !vinculo.retirado))
    .sort((primero, segundo) => compararSecciones(primero.seccion, segundo.seccion))
  // La cabecera usa la misma lista que cambia al vincular o retirar un estudiante.
  const resumen = !estudianteInicial ? '' : errorCarga ? 'No se pudo consultar' : cargando ? 'Cargando…'
    : visibles.map((vinculo) => nombreSeccion(vinculo.seccion)).join(' / ') || 'Sin sección asignada'
  useEffect(() => { alCambiarResumen?.(resumen) }, [alCambiarResumen, resumen])
  const elegida = secciones.find((grupo) => grupo.id === seccion)
  const estudianteValido = estudianteInicial ? cuentaActiva : estudiantes.some((usuario) => usuario.id === estudiante)
  const seleccionValida = estudianteValido && !!elegida
  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (bloqueo.current || bloqueadoExterno || cargando || errorCarga) return
    setError(''); setMensaje('')
    if (!seleccionValida || !elegida) { setError('Selecciona un estudiante y una sección de las listas.'); return }
    bloqueo.current = true; setOcupado(true)
    try {
      const { vinculo } = await crearVinculo({ estudiante_id: estudiante, seccion_id: seccion, anio_escolar: elegida.anio_escolar })
      setVinculos((anteriores) => [...anteriores.filter((item) => item.id !== vinculo.id), vinculo])
      setMensaje('Estudiante vinculado correctamente.')
      setEstudiante(estudianteInicial)
      setSeccion('')
    } catch (fallo) { setError(fallo instanceof Error ? fallo.message : 'No se pudo guardar el vínculo.') }
    finally { bloqueo.current = false; setOcupado(false) }
  }
  async function retirar(vinculo: VinculoEstudiante) {
    if (bloqueo.current || bloqueadoExterno) return
    bloqueo.current = true; setOcupado(true); setError(''); setMensaje('')
    try {
      const datos = await retirarEstudiante(vinculo.id)
      setVinculos(anteriores => anteriores.map(v => v.id === vinculo.id ? datos.vinculo : v))
      setMensaje('Estudiante retirado de la sección.')
    } catch (fallo) { setError(fallo instanceof Error ? fallo.message : 'No se pudo retirar al estudiante.') }
    finally { bloqueo.current = false; setOcupado(false) }
  }
  return <section className="admin-relacion">
    {estudianteInicial ? <h2>Secciones asignadas</h2> : <h1>Vincular estudiantes a secciones</h1>}
    {cargando && <p role="status">Cargando secciones…</p>}
    {(errorCarga || error) && <div role="alert" className="error-resumen">
      <p>{errorCarga || error}</p>
      <button type="button" className="secundario" onClick={recargar} disabled={ocupado || bloqueadoExterno}>Volver a cargar listas</button>
    </div>}
    {mensaje && <p role="status">{mensaje}</p>}
    {!cargando && !errorCarga && <>
      {!estudianteInicial && <h2>Vínculos existentes</h2>}
      {visibles.length === 0 ? <p>{estudianteInicial ? 'Aún no tiene secciones asignadas.' : 'Aún no hay estudiantes vinculados.'}</p> :
        <ol className="lista-gestion">
          {visibles.map((vinculo) => <li key={vinculo.id}>
            <div>
              <strong>{estudianteInicial ? vinculo.seccion.nombre : usuarios.find((usuario) => usuario.id === vinculo.estudiante_id)?.nombre ?? vinculo.estudiante_nombre ?? 'Estudiante no disponible'}</strong>
              <span>{estudianteInicial ? vinculo.seccion.grado + '° de primaria · ' + vinculo.seccion.anio_escolar : nombreSeccion(vinculo.seccion)}{vinculo.retirado ? ' · Retirado' : ''}</span>
            </div>
            {!vinculo.retirado && <button type="button" className="secundario" disabled={ocupado || bloqueadoExterno}
              aria-label={'Quitar de la sección ' + nombreSeccion(vinculo.seccion)}
              onClick={() => {
                if (window.confirm('¿Quitar al estudiante de la sección ' + nombreSeccion(vinculo.seccion) + '? Dejará de recibir sus actividades.')) void retirar(vinculo)
              }}>Quitar de la sección</button>}
          </li>)}
        </ol>}
      {cuentaActiva ? <form onSubmit={guardar}>
        <fieldset disabled={ocupado || bloqueadoExterno}>
          <legend>{estudianteInicial ? 'Asignar una sección' : 'Vincular un estudiante'}</legend>
          {!estudianteInicial && <ListaBuscable id="vinculo-estudiante" etiqueta="Estudiante" opciones={estudiantes} valor={estudiante} alCambiar={setEstudiante} vacio="No hay estudiantes activos. Registra una cuenta estudiante para continuar." />}
          <SelectorRelacion id="vinculo-seccion" etiqueta="Sección" opciones={secciones.map((grupo) => ({ id: grupo.id, nombre: nombreSeccion(grupo) }))} valor={seccion} alCambiar={setSeccion} vacio="No hay secciones disponibles" />
          <button type="submit" disabled={!seleccionValida}>{estudianteInicial ? 'Asignar sección' : 'Vincular estudiante'}</button>
        </fieldset>
      </form> : <p>Activa la cuenta para asignarle una sección.</p>}
    </>}
  </section>
}
