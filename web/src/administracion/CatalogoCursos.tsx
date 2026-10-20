import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { actualizarCurso, listarCursos } from '../servicios/cursos'
import type { Curso } from '../servicios/cursos'
import { IconoDocente as IconoGestion } from '../docente/IconoDocente'
import { identidadCurso } from '../docente/utilidadesDocente'

export function CatalogoCursos() {
  const [cursos, establecerCursos] = useState<Curso[] | null>(null)
  const [elegido, establecerElegido] = useState<Curso | null>(null)
  const [nombre, establecerNombre] = useState('')
  const [error, establecerError] = useState('')
  const [mensaje, establecerMensaje] = useState('')
  const [ocupado, establecerOcupado] = useState(false)
  const bloqueo = useRef(false)
  const entrada = useRef<HTMLInputElement>(null)
  useEffect(() => {
    let vigente = true
    listarCursos().then((datos) => { if (vigente) establecerCursos(datos.cursos) })
      .catch((fallo: Error) => { if (vigente) establecerError(fallo.message) })
    return () => { vigente = false }
  }, [])
  useEffect(() => { if (elegido) entrada.current?.focus() }, [elegido])
  async function guardar(evento: FormEvent) {
    evento.preventDefault()
    if (!elegido || bloqueo.current) return
    bloqueo.current = true; establecerOcupado(true); establecerError(''); establecerMensaje('')
    try {
      const datos = await actualizarCurso(elegido.id, nombre)
      establecerCursos((actuales) => actuales?.map((curso) => curso.id === datos.curso.id ? datos.curso : curso).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')) ?? null)
      establecerElegido(null)
      establecerMensaje('Curso actualizado. Conserva su identificador y sus vínculos.')
    } catch (fallo) { establecerError((fallo as Error).message) }
    finally { bloqueo.current = false; establecerOcupado(false) }
  }
  return <>
    <header className="admin-encabezado"><div><span className="admin-antetitulo">SIETE FORMAS DE DESCUBRIR</span><h1>Cursos</h1><p>Un color y un símbolo para reconocer cada área de aprendizaje.</p></div><span className="admin-ilustracion-icono"><IconoGestion nombre="cursos" /></span></header>
    {error && <p role="alert" className="error-resumen">{error} <a href="/">Volver al acceso</a></p>}
    {mensaje && <p role="status">{mensaje}</p>}
    {!cursos && !error && <p role="status">Cargando cursos…</p>}
    {cursos?.length === 0 && <p>No hay cursos disponibles. Comprueba las migraciones del catálogo.</p>}
    <ul className="admin-cursos">{cursos?.map((curso) => { const identidad = identidadCurso(curso.nombre); return <li className="admin-curso" data-tono={identidad.tono} key={curso.id}><IconoGestion nombre={identidad.icono} /><h2>{curso.nombre}</h2><span>Primero de primaria</span><button type="button" className="secundario" disabled={ocupado} onClick={() => { establecerElegido(curso); establecerNombre(curso.nombre); establecerError(''); establecerMensaje('') }}><IconoGestion nombre="editar" />Editar {curso.nombre}</button></li> })}</ul>
    {elegido && <form className="admin-editor" onSubmit={guardar}><h2>Editar {elegido.nombre}</h2><fieldset disabled={ocupado}>
      <div className="campo"><label htmlFor="nombre-curso">Nombre del curso</label><input id="nombre-curso" ref={entrada} value={nombre} onChange={(evento) => establecerNombre(evento.target.value)} required maxLength={120} /></div>
    </fieldset><div className="acciones"><button type="submit" disabled={ocupado}>{ocupado ? 'Guardando…' : 'Guardar curso'}</button><button type="button" className="secundario" disabled={ocupado} onClick={() => establecerElegido(null)}>Cancelar edición</button></div></form>}
  </>
}
