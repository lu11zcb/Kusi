import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { ErrorApi } from '../servicios/django'
import type { ErroresRegistro, Rol } from '../servicios/django'
import { CampoFormulario } from '../componentes/CampoFormulario'
import { asignarRoles, consultarUsuario, editarUsuario, listarUsuarios } from '../servicios/usuarios'
import type { DetalleUsuario } from '../servicios/usuarios'

const etiquetas: Record<Rol, string> = { administrador: 'Administrador', docente: 'Docente', estudiante: 'Estudiante' }

export function GestionarUsuarios() {
  const [lista, establecerLista] = useState<Awaited<ReturnType<typeof listarUsuarios>> | null>(null)
  const [buscar, establecerBuscar] = useState('')
  const [filtro, establecerFiltro] = useState('')
  const [pagina, establecerPagina] = useState(1)
  const [detalle, establecerDetalle] = useState<DetalleUsuario | null>(null)
  const [roles, establecerRoles] = useState<Rol[]>([])
  const [datos, establecerDatos] = useState({ nombre: '', correo: '' })
  const [erroresCampos, establecerErroresCampos] = useState<ErroresRegistro>({})
  const [error, establecerError] = useState('')
  const [mensaje, establecerMensaje] = useState('')
  const [ocupado, establecerOcupado] = useState(false)
  const [revision, establecerRevision] = useState(0)
  const bloqueo = useRef(false)
  const titulo = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    let vigente = true
    listarUsuarios(filtro, pagina).then((datos) => { if (vigente) establecerLista(datos) })
      .catch((fallo: Error) => { if (vigente) establecerError(fallo.message) })
    return () => { vigente = false }
  }, [filtro, pagina, revision])
  useEffect(() => { if (detalle) titulo.current?.focus() }, [detalle])

  async function elegir(id: string) {
    if (bloqueo.current) return
    bloqueo.current = true
    establecerOcupado(true)
    establecerError(''); establecerMensaje(''); establecerDetalle(null)
    try {
      const datos = await consultarUsuario(id)
      establecerDetalle(datos); establecerRoles(datos.usuario.roles)
      establecerDatos({ nombre: datos.usuario.nombre, correo: datos.usuario.correo }); establecerErroresCampos({})
    } catch (fallo) { establecerError((fallo as Error).message) }
    finally { bloqueo.current = false; establecerOcupado(false) }
  }

  async function guardar(evento: FormEvent) {
    evento.preventDefault()
    if (!detalle || bloqueo.current) return
    bloqueo.current = true; establecerOcupado(true); establecerError(''); establecerMensaje('')
    try {
      await asignarRoles(detalle.usuario.id, roles)
      establecerDetalle(await consultarUsuario(detalle.usuario.id))
      establecerLista(null)
      establecerRevision((valor) => valor + 1)
      establecerMensaje('Roles guardados. Se aplican al próximo acceso a una función protegida.')
    } catch (fallo) { establecerError((fallo as Error).message) }
    finally { bloqueo.current = false; establecerOcupado(false) }
  }

  async function guardarDatos(evento: FormEvent) {
    evento.preventDefault()
    if (!detalle || bloqueo.current) return
    bloqueo.current = true; establecerOcupado(true); establecerError(''); establecerMensaje(''); establecerErroresCampos({})
    try {
      await editarUsuario(detalle.usuario.id, datos)
      const actualizado = await consultarUsuario(detalle.usuario.id)
      establecerDetalle(actualizado); establecerDatos({ nombre: actualizado.usuario.nombre, correo: actualizado.usuario.correo })
      establecerLista(null); establecerRevision((valor) => valor + 1)
      establecerMensaje('Datos actualizados. El identificador y el historial se conservan.')
    } catch (fallo) {
      establecerError((fallo as Error).message)
      if (fallo instanceof ErrorApi) establecerErroresCampos(fallo.errores)
    } finally { bloqueo.current = false; establecerOcupado(false) }
  }

  return <>
    <h1>Usuarios y roles</h1>
    <form role="search" onSubmit={(evento) => { evento.preventDefault(); establecerLista(null); establecerError(''); establecerFiltro(buscar); establecerPagina(1); establecerRevision((valor) => valor + 1) }}>
      <div className="campo"><label htmlFor="buscar-usuarios">Buscar por nombre o correo</label><input id="buscar-usuarios" value={buscar} onChange={(evento) => establecerBuscar(evento.target.value)} maxLength={150} /></div>
      <button type="submit" disabled={ocupado}>Buscar usuarios</button>
    </form>
    {error && <p role="alert" className="error-resumen">{error} <a href="/">Volver al acceso</a></p>}
    {mensaje && <p role="status">{mensaje}</p>}
    {!lista && !error && <p role="status">Cargando usuarios…</p>}
    {lista && <section aria-label="Resultados de usuarios">
      <p>{lista.total} usuarios encontrados.</p>
      <ul className="lista-gestion">{lista.usuarios.map((usuario) => <li key={usuario.id}>
        <div><strong>{usuario.nombre}</strong><span>{usuario.correo}</span><span>{usuario.roles.map((rol) => etiquetas[rol]).join(', ') || 'Sin rol escolar'}</span></div>
        <button type="button" className="secundario" disabled={ocupado} onClick={() => elegir(usuario.id)}>Gestionar {usuario.nombre}</button>
      </li>)}</ul>
      <div className="acciones"><button type="button" className="secundario" disabled={pagina <= 1 || ocupado} onClick={() => { establecerLista(null); establecerPagina(pagina - 1) }}>Anterior</button>
        <span>Página {lista.pagina} de {lista.paginas}</span>
        <button type="button" className="secundario" disabled={pagina >= lista.paginas || ocupado} onClick={() => { establecerLista(null); establecerPagina(pagina + 1) }}>Siguiente</button></div>
    </section>}
    {detalle && <section aria-labelledby="usuario-elegido">
      <h2 id="usuario-elegido" ref={titulo} tabIndex={-1}>{detalle.usuario.nombre}</h2>
      <p>{detalle.usuario.correo}</p>
      <form onSubmit={guardarDatos}><h2>Datos de la cuenta</h2><fieldset disabled={ocupado}>
        {(['nombre', 'correo'] as const).map((campo) => <CampoFormulario key={campo} id={'editar-' + campo} etiqueta={campo === 'nombre' ? 'Nombre completo' : 'Correo de la cuenta'} errores={erroresCampos[campo]}>
          <input id={'editar-' + campo} type={campo === 'correo' ? 'email' : 'text'} value={datos[campo]} required maxLength={campo === 'nombre' ? 150 : 254}
            aria-invalid={!!erroresCampos[campo]?.length} aria-describedby={erroresCampos[campo]?.length ? 'editar-' + campo + '-error' : undefined}
            onChange={(evento) => establecerDatos({ ...datos, [campo]: evento.target.value })} />
        </CampoFormulario>)}
      </fieldset><button type="submit" disabled={ocupado}>{ocupado ? 'Guardando…' : 'Guardar datos'}</button></form>
      <form onSubmit={guardar}>
        <fieldset disabled={ocupado}><legend>Roles escolares</legend>
          <p id="ayuda-roles">Administrador y docente pueden combinarse. Estudiante se asigna solo.</p>
          {(Object.keys(etiquetas) as Rol[]).map((rol) => <label className="opcion" key={rol}>
            <input type="checkbox" checked={roles.includes(rol)} aria-describedby="ayuda-roles" onChange={(evento) => establecerRoles(evento.target.checked
              ? (rol === 'estudiante' ? [rol] : [...roles.filter((actual) => actual !== 'estudiante'), rol])
              : roles.filter((actual) => actual !== rol))} />{etiquetas[rol]}
          </label>)}
        </fieldset><button type="submit" disabled={ocupado || roles.length === 0}>{ocupado ? 'Guardando…' : 'Guardar roles'}</button>
      </form>
      <h2>Historial reciente</h2>
      {detalle.historial.length === 0 ? <p>Esta cuenta todavía no tiene cambios registrados.</p> : <ol className="historial">{detalle.historial.map((cambio) => <li key={cambio.id}>
        <strong>{cambio.tipo === 'roles' ? 'Cambio de roles' : 'Cambio de datos'}</strong> · {new Date(cambio.fecha).toLocaleString('es-PE')} · {cambio.administrador}
        <p>Antes: {Object.entries(cambio.anterior).map(([campo, valor]) => campo + ': ' + String(valor)).join(' · ')}</p>
        <p>Después: {Object.entries(cambio.actual).map(([campo, valor]) => campo + ': ' + String(valor)).join(' · ')}</p>
      </li>)}</ol>}
    </section>}
  </>
}
