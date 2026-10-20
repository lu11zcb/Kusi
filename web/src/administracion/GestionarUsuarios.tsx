import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { flushSync } from 'react-dom'
import { ErrorApi } from '../servicios/django'
import type { ErroresRegistro, Rol } from '../servicios/django'
import { CampoFormulario } from '../componentes/CampoFormulario'
import { asignarRoles, cambiarEstadoUsuario, consultarUsuario, editarUsuario, generarContrasenaTemporal, listarUsuarios, refrescarUsuarioGuardado } from '../servicios/usuarios'
import type { DetalleUsuario, UsuarioAdministrado } from '../servicios/usuarios'
import { listarUsuariosEducativos } from '../servicios/opcionesEducativas'
import { iniciales } from '../componentes/apariencia'
import { IconoDocente as IconoGestion } from '../docente/IconoDocente'
import { normalizarBusqueda } from '../docente/utilidadesDocente'
import { GestionarVinculos } from './GestionarVinculos'
import { AsignarDocentes } from './AsignarDocentes'

const etiquetas: Record<Rol, string> = { administrador: 'Administrador', docente: 'Docente', estudiante: 'Estudiante' }

export function GestionarUsuarios({ usuarioActualId, actualizarAcceso, rolInicial, alRegistrar, alCambiarBloqueo }: { usuarioActualId: string; actualizarAcceso: () => Promise<void>; rolInicial?: Rol; alRegistrar?: () => void; alCambiarBloqueo?: (bloqueado: boolean) => void }) {
  const [lista, establecerLista] = useState<Awaited<ReturnType<typeof listarUsuarios>> | null>(null)
  const [buscar, establecerBuscar] = useState('')
  const [filtro, establecerFiltro] = useState('')
  const [pagina, establecerPagina] = useState(1)
  const [estadoFiltro, establecerEstadoFiltro] = useState('todos')
  const [relacionOcupada, establecerRelacionOcupada] = useState(false)
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
    listarUsuariosEducativos().then((usuarios) => { if (vigente) establecerLista({ usuarios, pagina: 1, paginas: 1, total: usuarios.length }) })
      .catch((fallo: Error) => { if (vigente) establecerError(fallo.message) })
    return () => { vigente = false }
  }, [revision])
  useEffect(() => { alCambiarBloqueo?.(ocupado || relacionOcupada || !!contrasenaNueva); return () => alCambiarBloqueo?.(false) }, [ocupado, relacionOcupada, contrasenaNueva, alCambiarBloqueo])
  useEffect(() => { const ocultar = () => flushSync(() => establecerContrasenaNueva('')); window.addEventListener('pagehide', ocultar); return () => window.removeEventListener('pagehide', ocultar) }, [])
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

  const filtrados = (lista?.usuarios ?? []).filter((usuario) => (!rolInicial || usuario.roles.includes(rolInicial)) && (estadoFiltro === 'todos' || (estadoFiltro === 'activos') === usuario.activo) && normalizarBusqueda([usuario.nombre, usuario.correo, usuario.dni].filter(Boolean).join(' ')).includes(normalizarBusqueda(filtro)))
  const paginas = Math.max(1, Math.ceil(filtrados.length / 10))
  const visibles = filtrados.slice((pagina - 1) * 10, pagina * 10)
  const plural = rolInicial === 'estudiante' ? 'Estudiantes' : rolInicial === 'docente' ? 'Docentes' : rolInicial === 'administrador' ? 'Administradores' : 'Personas'
  return <section className="admin-superficie">
    {!detalle ? <>
      <header className="admin-encabezado"><div><span className="admin-antetitulo">PERSONAS QUE HACEN KUSI</span><h1>{plural}</h1><p>{rolInicial === 'estudiante' ? 'Cada estudiante, su cuenta y su sección en un mismo lugar.' : rolInicial === 'docente' ? 'Consulta sus cuentas y organiza qué enseña cada docente.' : 'Mantén los datos, permisos y accesos de administración al día.'}</p></div>{alRegistrar && <button type="button" onClick={alRegistrar} disabled={ocupado}><IconoGestion nombre="mas" />Registrar {rolInicial ?? 'persona'}</button>}</header>
      <form className="admin-filtros" role="search" onSubmit={(evento) => { evento.preventDefault(); establecerFiltro(buscar); establecerPagina(1) }}>
        <div className="campo admin-buscar"><label htmlFor="buscar-usuarios">Buscar {plural.toLocaleLowerCase('es')}</label><div><IconoGestion nombre="buscar" /><input id="buscar-usuarios" placeholder="Nombre, correo o DNI…" value={buscar} onChange={(evento) => { establecerBuscar(evento.target.value); establecerFiltro(evento.target.value); establecerPagina(1) }} maxLength={150} disabled={ocupado} /></div></div>
        <div className="campo"><label htmlFor="estado-usuarios">Estado de la cuenta</label><select id="estado-usuarios" disabled={ocupado} value={estadoFiltro} onChange={(e) => { establecerEstadoFiltro(e.target.value); establecerPagina(1) }}><option value="todos">Todos los estados</option><option value="activos">Activas</option><option value="inactivos">Desactivadas</option></select></div>
        {(buscar || estadoFiltro !== 'todos') && <button type="button" className="secundario" disabled={ocupado} onClick={() => { establecerBuscar(''); establecerFiltro(''); establecerEstadoFiltro('todos'); establecerPagina(1) }}>Limpiar filtros</button>}
      </form>
      {error && <p role="alert" className="error-resumen">{error} <button type="button" className="secundario" disabled={ocupado} onClick={() => { establecerError(''); establecerRevision((v) => v + 1) }}>Intentar otra vez</button></p>}
      {!lista && !error && <p role="status">Cargando cuentas…</p>}
      {lista && <section aria-label="Resultados de usuarios"><div className="admin-recuento"><strong>{filtrados.length} {plural.toLocaleLowerCase('es')}</strong><span>Busca una persona y abre su ficha</span></div>
        {filtrados.length === 0 ? <div className="admin-vacio"><IconoGestion nombre="personas" /><h2>No encontramos cuentas aquí</h2><p>{buscar || estadoFiltro !== 'todos' ? 'Prueba con otro nombre o limpia los filtros.' : 'Registra la primera cuenta para empezar.'}</p></div> : <ul className="admin-personas">{visibles.map((usuario) => <li key={usuario.id}>
          <span className={'admin-avatar ' + (rolInicial === 'docente' ? 'docente' : '')} aria-hidden="true">{iniciales(usuario.nombre)}</span>
          <div className="admin-persona-nombre"><strong>{usuario.nombre}</strong><span>{usuario.dni ? 'DNI ' + usuario.dni : usuario.correo ?? 'Sin correo'}</span></div>
          <span className={'admin-estado ' + (usuario.activo ? 'activo' : '')}>{usuario.activo ? 'Activa' : 'Desactivada'}</span>
          <button type="button" className="secundario" disabled={ocupado} onClick={() => elegir(usuario.id)}>Ver ficha<IconoGestion nombre="flecha" /></button>
        </li>)}</ul>}
        {paginas > 1 && <div className="acciones"><button type="button" className="secundario" disabled={pagina <= 1 || ocupado} onClick={() => establecerPagina(pagina - 1)}>Anterior</button><span>Página {pagina} de {paginas}</span><button type="button" className="secundario" disabled={pagina >= paginas || ocupado} onClick={() => establecerPagina(pagina + 1)}>Siguiente</button></div>}
      </section>}
    </> : <>
      <button type="button" className="secundario admin-volver" disabled={ocupado || !!contrasenaNueva} onClick={() => { establecerDetalle(null); establecerError(''); establecerMensaje('') }}><IconoGestion nombre="atras" />Volver a {plural.toLocaleLowerCase('es')}</button>
      <header className="admin-ficha-cabecera"><span className="admin-avatar grande" aria-hidden="true">{iniciales(detalle.usuario.nombre)}</span><div><span className="admin-antetitulo">FICHA DE LA CUENTA</span><h1 id="usuario-elegido" ref={titulo} tabIndex={-1}>{detalle.usuario.nombre}</h1><p>{detalle.usuario.dni ? 'DNI ' + detalle.usuario.dni : detalle.usuario.correo ?? 'Sin correo'}</p><div className="acciones">{detalle.usuario.roles.map((rol) => <span className="admin-etiqueta" key={rol}>{etiquetas[rol]}</span>)}<span className={'admin-estado ' + (detalle.usuario.activo ? 'activo' : '')}>{detalle.usuario.activo ? 'Activa' : 'Desactivada'}</span></div></div></header>
      {error && <p role="alert" className="error-resumen">{error}</p>}{mensaje && <p role="status" className="admin-exito"><IconoGestion nombre="check" />{mensaje}</p>}
      {contrasenaNueva ? <div className="confirmacion" role="status"><h2>Entrega esta contraseña de forma privada</h2><dl><dt>Contraseña temporal</dt><dd><code className="contrasena">{contrasenaNueva}</code></dd></dl><p>Solo se muestra ahora. La persona deberá cambiarla al ingresar.</p><button type="button" onClick={() => establecerContrasenaNueva('')}>Ya la entregué</button></div> : <>
        <div className="admin-ficha-columnas"><div className="admin-relaciones">
          {detalle.usuario.roles.includes('estudiante') && <GestionarVinculos key={'v-' + detalle.usuario.id} estudianteInicial={detalle.usuario.id} bloqueadoExterno={ocupado} alCambiarBloqueo={establecerRelacionOcupada} />}
          {detalle.usuario.roles.includes('docente') && <AsignarDocentes key={'a-' + detalle.usuario.id} docenteInicial={detalle.usuario.id} bloqueadoExterno={ocupado} alCambiarBloqueo={establecerRelacionOcupada} />}
          {!detalle.usuario.roles.includes('estudiante') && !detalle.usuario.roles.includes('docente') && <div className="admin-vacio"><IconoGestion nombre="personas" /><h2>Acceso de administración</h2><p>Desde esta cuenta se organizan usuarios, secciones y cursos de Kusi.</p></div>}
        </div><aside className="admin-datos"><h2>Datos y acceso</h2>
          <details open><summary>Editar datos personales</summary><form onSubmit={guardarDatos}><fieldset disabled={ocupado || relacionOcupada}>
            {(['nombre', 'correo', ...((detalle.usuario.roles.includes('estudiante') || roles.includes('estudiante')) ? ['dni'] : [])] as ('nombre'|'correo'|'dni')[]).map((campo) => <CampoFormulario key={campo} id={'editar-' + campo} etiqueta={campo === 'nombre' ? 'Nombre completo' : campo === 'correo' ? 'Correo de la cuenta' : 'DNI del estudiante'} errores={erroresCampos[campo]}><input id={'editar-' + campo} type={campo === 'correo' ? 'email' : 'text'} value={datos[campo]} required={campo === 'nombre'} maxLength={campo === 'nombre' ? 150 : campo === 'dni' ? 8 : 254} inputMode={campo === 'dni' ? 'numeric' : undefined} aria-invalid={!!erroresCampos[campo]?.length} aria-describedby={erroresCampos[campo]?.length ? 'editar-' + campo + '-error' : undefined} onChange={(evento) => establecerDatos({ ...datos, [campo]: campo === 'dni' ? evento.target.value.replace(/\D/g,'') : evento.target.value })} /></CampoFormulario>)}
          </fieldset><button type="submit" disabled={ocupado || relacionOcupada}>{ocupado ? 'Guardando…' : 'Guardar datos'}</button></form></details>
          <details><summary>Roles y permisos</summary><form onSubmit={guardar}><fieldset disabled={ocupado || relacionOcupada}><legend className="solo-lectores">Roles escolares</legend><p id="ayuda-roles">Administrador y docente pueden combinarse. Estudiante se asigna solo.</p>{(Object.keys(etiquetas) as Rol[]).map((rol) => <label className="opcion" key={rol}><input type="checkbox" checked={roles.includes(rol)} aria-describedby="ayuda-roles" onChange={(evento) => establecerRoles(evento.target.checked ? (rol === 'estudiante' ? [rol] : [...roles.filter((actual) => actual !== 'estudiante'), rol]) : roles.filter((actual) => actual !== rol))} />{etiquetas[rol]}</label>)}</fieldset><button type="submit" disabled={ocupado || relacionOcupada || roles.length === 0}>Guardar roles</button></form></details>
          <details><summary>Contraseña y estado</summary><p>La contraseña nueva cierra las sesiones anteriores. Desactivar conserva los datos y el historial.</p><div className="acciones">{detalle.usuario.id !== usuarioActualId && detalle.usuario.activo && <button type="button" className="secundario" disabled={ocupado || relacionOcupada} onClick={generarContrasena}>Generar contraseña temporal</button>}<button type="button" className="secundario" disabled={ocupado || relacionOcupada} onClick={cambiarEstado}>{detalle.usuario.activo ? 'Desactivar cuenta' : 'Activar cuenta'}</button></div></details>
        </aside></div>
        <details className="admin-historial"><summary>Historial de cambios</summary>{detalle.historial.length === 0 ? <p>Esta cuenta todavía no tiene cambios registrados.</p> : <ol className="historial">{detalle.historial.map((cambio) => <li key={cambio.id}><strong>{cambio.tipo === 'roles' ? 'Cambio de roles' : cambio.tipo === 'estado' ? 'Cambio de estado' : cambio.tipo === 'contrasena_temporal' ? 'Contraseña temporal generada' : 'Cambio de datos'}</strong><p>{new Date(cambio.fecha).toLocaleString('es-PE')} · {cambio.administrador}</p><p>Antes: {Object.entries(cambio.anterior).map(([campo, valor]) => campo + ': ' + String(valor)).join(' · ')}</p><p>Después: {Object.entries(cambio.actual).map(([campo, valor]) => campo + ': ' + String(valor)).join(' · ')}</p></li>)}</ol>}</details>
      </>}
    </>}
  </section>
}
