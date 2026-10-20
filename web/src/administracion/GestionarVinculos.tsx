import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { ListaBuscable } from '../componentes/ListaBuscable'
import { crearVinculo, listarSecciones, listarVinculos } from '../servicios/educacion'
import type { SeccionEducativa, VinculoEstudiante } from '../servicios/educacion'
import type { UsuarioAdministrado } from '../servicios/usuarios'
import { listarUsuariosEducativos, nombreSeccion, opcionesCuentas } from '../servicios/opcionesEducativas'

export function GestionarVinculos({ estudianteInicial = '', alCambiarBloqueo, bloqueadoExterno = false }: { estudianteInicial?: string; alCambiarBloqueo?: (bloqueado: boolean) => void; bloqueadoExterno?: boolean }) {
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
    return Promise.all([listarUsuariosEducativos(), listarSecciones(), listarVinculos()]).then(([cuentas, grupos, relaciones]) => {
      if (actual !== revision.current) return
      setUsuarios(cuentas); setSecciones(grupos.secciones); setVinculos(relaciones.vinculos)
    }).catch((fallo: unknown) => {
      if (actual === revision.current) setErrorCarga(fallo instanceof Error ? fallo.message : 'No se pudieron cargar las listas.')
    }).finally(() => { if (actual === revision.current) setCargando(false) })
  }, [])
  useEffect(() => { void cargar(); return () => { revision.current += 1 } }, [cargar])
  function recargar() { setCargando(true); setErrorCarga(''); void cargar() }

  const estudiantes = opcionesCuentas(usuarios, 'estudiante').filter((cuenta) => !estudianteInicial || cuenta.id === estudianteInicial)
  const elegida = secciones.find((grupo) => grupo.id === seccion)
  const seleccionValida = estudiantes.some((usuario) => usuario.id === estudiante) && !!elegida
  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (bloqueo.current || bloqueadoExterno || cargando || errorCarga) return
    setError(''); setMensaje('')
    if (!seleccionValida || !elegida) { setError('Selecciona un estudiante y una sección de las listas.'); return }
    bloqueo.current = true; setOcupado(true)
    try {
      const { vinculo } = await crearVinculo({ estudiante_id: estudiante, seccion_id: seccion, anio_escolar: elegida.anio_escolar })
      setVinculos((anteriores) => [...anteriores.filter((item) => item.id !== vinculo.id), vinculo])
      setMensaje('Estudiante vinculado correctamente.'); setEstudiante(estudianteInicial)
    } catch (fallo) { setError(fallo instanceof Error ? fallo.message : 'No se pudo guardar el vínculo.') }
    finally { bloqueo.current = false; setOcupado(false) }
  }
  return <section className="admin-relacion"><h1>{estudianteInicial ? 'Su sección' : 'Vincular estudiantes a secciones'}</h1><p>{estudianteInicial ? 'Elige la sección que le corresponde a este estudiante.' : 'Busca al estudiante y elige su sección.'}</p>
    {cargando && <p role="status">Cargando estudiantes y secciones…</p>}
    {errorCarga && <p role="alert" className="error-resumen">{errorCarga}</p>}
    <button type="button" className="secundario" onClick={recargar} disabled={ocupado || bloqueadoExterno || cargando}>Volver a cargar listas</button>
    <form onSubmit={guardar}><fieldset disabled={ocupado || bloqueadoExterno || cargando || !!errorCarga}>
      <legend>Datos del vínculo</legend>
      {!estudianteInicial && <ListaBuscable id="vinculo-estudiante" etiqueta="Estudiante" opciones={estudiantes} valor={estudiante} alCambiar={setEstudiante} vacio="No hay estudiantes activos. Registra una cuenta estudiante para continuar." />}
      <ListaBuscable id="vinculo-seccion" etiqueta="Sección" opciones={secciones.map((grupo) => ({ id: grupo.id, nombre: nombreSeccion(grupo) }))} valor={seccion} alCambiar={setSeccion} vacio="No hay secciones. Crea una sección para continuar." />
      {elegida && <p>Año escolar: <strong>{elegida.anio_escolar}</strong></p>}
      <button type="submit" disabled={!seleccionValida}>{ocupado ? 'Guardando…' : 'Vincular estudiante'}</button>
    </fieldset></form>
    {error && <p role="alert" className="error-resumen">{error}</p>}{mensaje && <p role="status">{mensaje}</p>}
    <h2>Vínculos existentes</h2>
    {!cargando && !errorCarga && !vinculos.length && <p>Aún no hay estudiantes vinculados.</p>}
    <ul className="lista-gestion">{vinculos.map((vinculo) => <li key={vinculo.id}>
      <div><strong>{usuarios.find((usuario) => usuario.id === vinculo.estudiante_id)?.nombre ?? vinculo.estudiante_nombre ?? 'Estudiante no disponible'}</strong>
        <span>{nombreSeccion(vinculo.seccion)}</span></div>
    </li>)}</ul>
  </section>
}
