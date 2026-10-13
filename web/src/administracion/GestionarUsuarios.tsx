import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { ErrorApi } from '../servicios/django'
import type { ErroresRegistro, Rol } from '../servicios/django'
import { CampoFormulario } from '../componentes/CampoFormulario'
import { asignarRoles, cambiarEstadoUsuario, consultarUsuario, editarUsuario, generarContrasenaTemporal, listarUsuarios, refrescarUsuarioGuardado } from '../servicios/usuarios'
import type { DetalleUsuario, UsuarioAdministrado } from '../servicios/usuarios'

const etiquetas: Record<Rol, string> = { administrador: 'Administrador', docente: 'Docente', estudiante: 'Estudiante' }

export function GestionarUsuarios({ usuarioActualId, actualizarAcceso }: { usuarioActualId: string; actualizarAcceso: () => Promise<void> }) {
  const [lista, establecerLista] = useState<Awaited<ReturnType<typeof listarUsuarios>> | null>(null)
  const [buscar, establecerBuscar] = useState('')
  const [filtro, establecerFiltro] = useState('')
  const [pagina, establecerPagina] = useState(1)
  const [detalle, establecerDetalle] = useState<DetalleUsuario | null>(null)
  const [roles, establecerRoles] = useState<Rol[]>([])
  const [datos, establecerDatos] = useState({ nombre: '', correo: '', dni: '' })
  const [erroresCampos, establecerErroresCampos] = useState<ErroresRegistro>({})
  const [error, establecerError] = useState('')
  const [mensaje, establecerMensaje] = useState('')
  const [ocupado, establecerOcupado] = useState(false)
  // HU12: la contraseña generada se muestra una sola vez.
  const [contrasenaNueva, establecerContrasenaNueva] = useState('')
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
    establecerError(''); establecerMensaje(''); establecerDetalle(null); establecerContrasenaNueva('')
    try {
      const datos = await consultarUsuario(id)
      establecerDetalle(datos); establecerRoles(datos.usuario.roles)
      establecerDatos({ nombre: datos.usuario.nombre, correo: datos.usuario.correo ?? '', dni: datos.usuario.dni ?? '' }); establecerErroresCampos({})
    } catch (fallo) { establecerError((fallo as Error).message) }
    finally { bloqueo.current = false; establecerOcupado(false) }
  }

  async function guardar(evento: FormEvent) {
    evento.preventDefault()
    if (!detalle || bloqueo.current) return
    bloqueo.current = true; establecerOcupado(true); establecerError(''); establecerMensaje('')
    try {
      const resultado = await asignarRoles(detalle.usuario.id, roles)
      establecerMensaje('Roles guardados. Se aplican al próximo acceso a una función protegida.')
      await actualizarGuardado(resultado.usuario)
    } catch (fallo) { establecerError((fallo as Error).message) }
    finally { bloqueo.current = false; establecerOcupado(false) }
  }

  async function actualizarGuardado(usuario: UsuarioAdministrado) {
    establecerDetalle((anterior) => anterior ? { ...anterior, usuario } : null)
    establecerLista((anterior) => anterior ? { ...anterior, usuarios: anterior.usuarios.map((item) => item.id === usuario.id ? usuario : item) } : null)
    const resultado = await refrescarUsuarioGuardado(usuario, usuarioActualId, actualizarAcceso)
    if (resultado.detalle) establecerDetalle(resultado.detalle)
    if (resultado.aviso) establecerError(resultado.aviso)
    if (usuario.id !== usuarioActualId || (usuario.activo && usuario.roles.includes('administrador'))) establecerRevision((valor) => valor + 1)
  }

  async function cambiarEstado() {
    if (!detalle || bloqueo.current) return
    const nuevoEstado = !detalle.usuario.activo
    const confirmar = window.confirm(nuevoEstado
      ? '¿Deseas activar esta cuenta?'
      : '¿Deseas desactivar esta cuenta? La persona no podrá ingresar ni usar funciones protegidas.')
    if (!confirmar) return
    bloqueo.current = true; establecerOcupado(true); establecerError(''); establecerMensaje('')
    try {
      const resultado = await cambiarEstadoUsuario(detalle.usuario.id, nuevoEstado)
      establecerMensaje(resultado.mensaje + ' Se conservan los datos y el historial.')
      await actualizarGuardado(resultado.usuario)
    } catch (fallo) {
      establecerError((fallo as Error).message)
    } finally { bloqueo.current = false; establecerOcupado(false) }
  }

  async function generarContrasena() {
    if (!detalle || bloqueo.current) return
    if (!window.confirm('¿Generar una contraseña temporal nueva para ' + detalle.usuario.nombre + '? La anterior dejará de servir y se cerrarán sus sesiones.')) return
    bloqueo.current = true; establecerOcupado(true); establecerError(''); establecerMensaje(''); establecerContrasenaNueva('')
    try {
      const resultado = await generarContrasenaTemporal(detalle.usuario.id)
      establecerContrasenaNueva(resultado.contrasena_temporal)
      await actualizarGuardado(resultado.usuario)
    } catch (fallo) {
      establecerError((fallo as Error).message)
    } finally { bloqueo.current = false; establecerOcupado(false) }
  }

  async function guardarDatos(evento: FormEvent) {
    evento.preventDefault()
    if (!detalle || bloqueo.current) return
    bloqueo.current = true; establecerOcupado(true); establecerError(''); establecerMensaje(''); establecerErroresCampos({})
    try {
      const resultado = await editarUsuario(detalle.usuario.id, datos)
      establecerDatos({ nombre: resultado.usuario.nombre, correo: resultado.usuario.correo ?? '', dni: resultado.usuario.dni ?? '' })
      establecerMensaje('Datos actualizados. El identificador y el historial se conservan.')
      await actualizarGuardado(resultado.usuario)
    } catch (fallo) {
      establecerError((fallo as Error).message)
      if (fallo instanceof ErrorApi) establecerErroresCampos(fallo.errores)
    } finally { bloqueo.current = false; establecerOcupado(false) }
  }

  return <>
    <h1>Usuarios y roles</h1>
    <form role="search" onSubmit={(evento) => { evento.preventDefault(); establecerLista(null); establecerError(''); establecerFiltro(buscar); establecerPagina(1); establecerRevision((valor) => valor + 1) }}>
      <div className="campo"><label htmlFor="buscar-usuarios">Buscar por nombre, correo o DNI</label><input id="buscar-usuarios" value={buscar} onChange={(evento) => establecerBuscar(evento.target.value)} maxLength={150} /></div>
      <button type="submit" disabled={ocupado}>Buscar usuarios</button>
    </form>
    {error && <p role="alert" className="error-resumen">{error} <a href="/">Volver al acceso</a></p>}
    {mensaje && <p role="status">{mensaje}</p>}
    {!lista && !error && <p role="status">Cargando usuarios…</p>}
    {lista && <section aria-label="Resultados de usuarios">
      <p>{lista.total} usuarios encontrados.</p>
      <ul className="lista-gestion">{lista.usuarios.map((usuario) => <li key={usuario.id}>
        <div><strong>{usuario.nombre}</strong><span>{usuario.correo ?? 'Sin correo'}</span>{usuario.dni && <span>DNI {usuario.dni}</span>}<span>{usuario.roles.map((rol) => etiquetas[rol]).join(', ') || 'Sin rol escolar'}</span><span>Estado: {usuario.activo ? 'Activa' : 'Desactivada'}</span><span>Identificador: <code>{usuario.id}</code></span></div>
        <button type="button" className="secundario" disabled={ocupado} onClick={() => elegir(usuario.id)}>Gestionar {usuario.nombre}</button>
      </li>)}</ul>
      <div className="acciones"><button type="button" className="secundario" disabled={pagina <= 1 || ocupado} onClick={() => { establecerLista(null); establecerPagina(pagina - 1) }}>Anterior</button>
        <span>Página {lista.pagina} de {lista.paginas}</span>
        <button type="button" className="secundario" disabled={pagina >= lista.paginas || ocupado} onClick={() => { establecerLista(null); establecerPagina(pagina + 1) }}>Siguiente</button></div>
    </section>}
    {detalle && <section aria-labelledby="usuario-elegido">
      <h2 id="usuario-elegido" ref={titulo} tabIndex={-1}>{detalle.usuario.nombre}</h2>
      <p>{detalle.usuario.correo ?? 'Sin correo'}{detalle.usuario.dni ? ' · DNI ' + detalle.usuario.dni : ''}</p>
      <p>Estado de la cuenta: <strong>{detalle.usuario.activo ? 'Activa' : 'Desactivada'}</strong></p>
      <button type="button" className="secundario" disabled={ocupado} onClick={cambiarEstado}>{detalle.usuario.activo ? 'Desactivar cuenta' : 'Activar cuenta'}</button>
      {detalle.usuario.id !== usuarioActualId && detalle.usuario.activo && <button type="button" className="secundario" disabled={ocupado} onClick={generarContrasena}>Generar contraseña temporal</button>}
      {contrasenaNueva && <div className="confirmacion" role="status">
        <dl><dt>Contraseña temporal</dt><dd><code className="contrasena">{contrasenaNueva}</code></dd></dl>
        <p>Entrégala ahora: no podrás volver a verla. {detalle.usuario.dni ? 'El estudiante ingresa a la app con su DNI y esta contraseña; ' : 'La persona '}deberá cambiarla al ingresar.</p>
        <button type="button" onClick={() => establecerContrasenaNueva('')}>Ya la entregué</button>
      </div>}
      <form onSubmit={guardarDatos}><h2>Datos de la cuenta</h2><fieldset disabled={ocupado}>
        {(['nombre', 'correo', 'dni'] as const).map((campo) => <CampoFormulario key={campo} id={'editar-' + campo} etiqueta={campo === 'nombre' ? 'Nombre completo' : campo === 'correo' ? 'Correo de la cuenta' : 'DNI (estudiantes)'} errores={erroresCampos[campo]}>
          <input id={'editar-' + campo} type={campo === 'correo' ? 'email' : 'text'} value={datos[campo]} required={campo === 'nombre'} maxLength={campo === 'nombre' ? 150 : campo === 'dni' ? 8 : 254}
            inputMode={campo === 'dni' ? 'numeric' : undefined}
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
        <strong>{cambio.tipo === 'roles' ? 'Cambio de roles' : cambio.tipo === 'estado' ? 'Cambio de estado' : cambio.tipo === 'contrasena_temporal' ? 'Contraseña temporal generada' : 'Cambio de datos'}</strong> · {new Date(cambio.fecha).toLocaleString('es-PE')} · {cambio.administrador}
        <p>Antes: {Object.entries(cambio.anterior).map(([campo, valor]) => campo + ': ' + String(valor)).join(' · ')}</p>
        <p>Después: {Object.entries(cambio.actual).map(([campo, valor]) => campo + ': ' + String(valor)).join(' · ')}</p>
      </li>)}</ol>}
    </section>}
  </>
}
