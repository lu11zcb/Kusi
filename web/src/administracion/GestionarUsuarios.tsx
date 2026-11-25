import { useEffect, useRef, useState } from 'react'
import { SelectorDesplegable } from '../componentes/SelectorDesplegable'
import type { FormEvent } from 'react'
import { flushSync } from 'react-dom'
import { ErrorApi } from '../servicios/django'
import type { ErroresRegistro, Rol } from '../servicios/django'
import { CampoFormulario } from '../componentes/CampoFormulario'
import { FormularioContrasena } from '../acceso/CambiarContrasena'
import { asignarRoles, cambiarEstadoUsuario, consultarUsuario, editarUsuario, generarContrasenaTemporal, listarUsuarios, refrescarUsuarioGuardado } from '../servicios/usuarios'
import type { DetalleUsuario, UsuarioAdministrado } from '../servicios/usuarios'
import { listarUsuariosEducativos } from '../servicios/opcionesEducativas'
import { iniciales } from '../componentes/apariencia'
import { IconoDocente as IconoGestion } from '../docente/IconoDocente'
import { normalizarBusqueda } from '../docente/utilidadesDocente'
import { GestionarVinculos } from './GestionarVinculos'
import { AsignarDocentes } from './AsignarDocentes'

const etiquetas: Record<Rol, string> = { administrador: 'Administrador', docente: 'Docente', estudiante: 'Estudiante' }
// Juntos («nombres apellidos») deben caber en los 150 caracteres del nombre completo; Django lo vuelve a revisar.
const LARGO_PARTE_NOMBRE = 74
type CampoDatos = 'nombres' | 'apellidos' | 'correo' | 'dni'
const etiquetasDatos: Record<CampoDatos, string> = { nombres: 'Nombres', apellidos: 'Apellidos', correo: 'Correo de la cuenta', dni: 'DNI del estudiante' }

// Una cuenta creada antes de separar el nombre no tiene las partes: se muestra el nombre
// completo en «Nombres» para que el administrador lo divida y escriba los apellidos.
function datosEditables(usuario: UsuarioAdministrado): Record<CampoDatos, string> {
  const sinPartes = !usuario.nombres && !usuario.apellidos
  return {
    nombres: sinPartes ? usuario.nombre : usuario.nombres ?? '',
    apellidos: sinPartes ? '' : usuario.apellidos ?? '',
    correo: usuario.correo ?? '',
    dni: usuario.dni ?? '',
  }
}

export function GestionarUsuarios({ usuarioActualId, actualizarAcceso, rolInicial, alRegistrar, alCambiarBloqueo }: { usuarioActualId: string; actualizarAcceso: () => Promise<void>; rolInicial?: Rol; alRegistrar?: () => void; alCambiarBloqueo?: (bloqueado: boolean) => void }) {
  const [lista, establecerLista] = useState<Awaited<ReturnType<typeof listarUsuarios>> | null>(null)
  const [buscar, establecerBuscar] = useState('')
  const [filtro, establecerFiltro] = useState('')
  const [pagina, establecerPagina] = useState(1)
  const [estadoFiltro, establecerEstadoFiltro] = useState('todos')
  const [relacionOcupada, establecerRelacionOcupada] = useState(false)
  const [detalle, establecerDetalle] = useState<DetalleUsuario | null>(null)
  const [resumenSecciones, establecerResumenSecciones] = useState('Cargando…')
  const [roles, establecerRoles] = useState<Rol[]>([])
  const [datos, establecerDatos] = useState<Record<CampoDatos, string>>({ nombres: '', apellidos: '', correo: '', dni: '' })
  const [erroresCampos, establecerErroresCampos] = useState<ErroresRegistro>({})
  const [error, establecerError] = useState('')
  const [mensaje, establecerMensaje] = useState('')
  const [ocupado, establecerOcupado] = useState(false)
  // HU12: la contraseña generada se muestra una sola vez.
  const [contrasenaNueva, establecerContrasenaNueva] = useState('')
  const [revision, establecerRevision] = useState(0)
  // En su propia ficha, el administrador cambia su contraseña (no se genera una temporal para sí mismo).
  const [cambiandoPropia, establecerCambiandoPropia] = useState(false)
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
    establecerError(''); establecerMensaje(''); establecerDetalle(null); establecerContrasenaNueva(''); establecerCambiandoPropia(false)
    establecerResumenSecciones('Cargando…')
    try {
      const datos = await consultarUsuario(id)
      establecerDetalle(datos); establecerRoles(datos.usuario.roles)
      establecerDatos(datosEditables(datos.usuario)); establecerErroresCampos({})
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
    const faltantes: ErroresRegistro = {}
    if (!datos.nombres.trim()) faltantes.nombres = ['Escribe sus nombres.']
    if (!datos.apellidos.trim()) faltantes.apellidos = ['Escribe sus apellidos.']
    if (faltantes.nombres || faltantes.apellidos) {
      establecerErroresCampos(faltantes)
      establecerError('Revisa los datos del usuario.')
      establecerMensaje('')
      return
    }
    bloqueo.current = true; establecerOcupado(true); establecerError(''); establecerMensaje(''); establecerErroresCampos({})
    try {
      const resultado = await editarUsuario(detalle.usuario.id, datos)
      establecerDatos(datosEditables(resultado.usuario))
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
  const usuario = detalle?.usuario
  const esEstudiante = usuario?.roles.includes('estudiante')
  const esDocente = usuario?.roles.includes('docente')
  const fichaDocente = esDocente && rolInicial === 'docente'
  const tieneRelaciones = esEstudiante || esDocente
  return <section className={'admin-superficie' + (usuario ? ' admin-ficha-usuario' : '')}>
    {!detalle || !usuario ? <>
      <header className="admin-encabezado"><div><span className="admin-antetitulo">PERSONAS QUE HACEN KUSI</span><h1>{plural}</h1><p>{rolInicial === 'estudiante' ? 'Cada estudiante, su cuenta y su sección en un mismo lugar.' : rolInicial === 'docente' ? 'Consulta sus cuentas y organiza qué enseña cada docente.' : 'Mantén los datos, permisos y accesos de administración al día.'}</p></div>{alRegistrar && <button type="button" onClick={alRegistrar} disabled={ocupado}><IconoGestion nombre="mas" />Registrar {rolInicial ?? 'persona'}</button>}</header>
      <form className="admin-filtros" role="search" onSubmit={(evento) => { evento.preventDefault(); establecerFiltro(buscar); establecerPagina(1) }}>
        <div className="campo admin-buscar"><label htmlFor="buscar-usuarios">Buscar {plural.toLocaleLowerCase('es')}</label><div><IconoGestion nombre="buscar" /><input id="buscar-usuarios" placeholder="Nombre, correo o DNI…" value={buscar} onChange={(evento) => { establecerBuscar(evento.target.value); establecerFiltro(evento.target.value); establecerPagina(1) }} maxLength={150} disabled={ocupado} /></div></div>
        <div className="campo"><label id="estado-usuarios-etiqueta" htmlFor="estado-usuarios">Estado de la cuenta</label><SelectorDesplegable id="estado-usuarios" disabled={ocupado} valor={estadoFiltro} alCambiar={(valor) => { establecerEstadoFiltro(valor); establecerPagina(1) }}
          opciones={[{ id: 'todos', nombre: 'Todos los estados' }, { id: 'activos', nombre: 'Activas' }, { id: 'inactivos', nombre: 'Desactivadas' }]} /></div>
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
      <button type="button" className="secundario admin-volver" disabled={ocupado || relacionOcupada || !!contrasenaNueva} onClick={() => { establecerDetalle(null); establecerError(''); establecerMensaje('') }}><IconoGestion nombre="atras" />Volver a {plural.toLocaleLowerCase('es')}</button>
      <header className="admin-ficha-cabecera">
        <span className={'admin-avatar grande ' + (esDocente ? 'docente' : !esEstudiante ? 'administrador' : '')} aria-hidden="true">{iniciales(usuario.nombre)}</span>
        <div className="admin-ficha-identidad">
          <h1 id="usuario-elegido" ref={titulo} tabIndex={-1}>{usuario.nombre}</h1>
          <dl className="admin-ficha-resumen">
            {esEstudiante ? <>
              <div><dt>DNI</dt><dd>{usuario.dni ?? 'Sin registrar'}</dd></div>
              <div><dt>Sección</dt><dd>{resumenSecciones}</dd></div>
            </> : <div><dt>Correo</dt><dd>{usuario.correo ?? 'Sin registrar'}</dd></div>}
            <div><dt>Rol</dt><dd>{usuario.roles.map((rol) => etiquetas[rol]).join(' · ') || 'Sin rol escolar'}</dd></div>
            <div><dt>Estado de la cuenta</dt><dd><span className={'admin-estado ' + (usuario.activo ? 'activo' : '')}>{usuario.activo ? 'Activa' : 'Desactivada'}</span></dd></div>
          </dl>
        </div>
      </header>
      {error && <p role="alert" className="error-resumen">{error}</p>}{mensaje && <p role="status" className="admin-exito"><IconoGestion nombre="check" />{mensaje}</p>}
      {contrasenaNueva ? <div className="confirmacion" role="status"><h2>Entrega esta contraseña de forma privada</h2><dl><dt>Contraseña temporal</dt><dd><code className="contrasena">{contrasenaNueva}</code></dd></dl><p>Solo se muestra ahora. La persona deberá cambiarla al ingresar.</p><button type="button" onClick={() => establecerContrasenaNueva('')}>Ya la entregué</button></div> : <>
        <div className={tieneRelaciones ? 'admin-ficha-columnas' : undefined}>{tieneRelaciones && <div className="admin-relaciones">
          {esEstudiante && <GestionarVinculos key={usuario.id} estudianteInicial={usuario.id} cuentaActiva={usuario.activo} alCambiarResumen={establecerResumenSecciones} bloqueadoExterno={ocupado} alCambiarBloqueo={establecerRelacionOcupada} />}
          {esDocente && <AsignarDocentes key={usuario.id} docenteInicial={usuario.id} disenoFicha={fichaDocente} cuentaActiva={usuario.activo} bloqueadoExterno={ocupado} alCambiarBloqueo={establecerRelacionOcupada} />}
        </div>}<aside className="admin-datos">
          <h2><span className="icono-grande c-morado"><IconoCandado /></span>Datos y acceso</h2>
          <section className="admin-acceso" aria-labelledby="admin-titulo-contrasena">
            <h3 id="admin-titulo-contrasena"><IconoCandado />{usuario.id === usuarioActualId ? 'Tu contraseña' : 'Contraseña temporal'}</h3>
            {usuario.id === usuarioActualId ? <>
              <p>Cámbiala cuando quieras. Te pediremos la actual para confirmar que eres tú.</p>
              {cambiandoPropia ? <>
                <FormularioContrasena prefijo="propia-" textoBoton="Guardar mi contraseña" alOcupar={establecerOcupado} alCambiar={() => {
                  establecerCambiandoPropia(false)
                  establecerError('')
                  establecerMensaje('Tu contraseña se cambió. Úsala la próxima vez que ingreses.')
                }} />
                <button type="button" className="secundario" disabled={ocupado} onClick={() => establecerCambiandoPropia(false)}>Cancelar</button>
              </> : <button type="button" className="secundario" disabled={ocupado || relacionOcupada} onClick={() => { establecerMensaje(''); establecerCambiandoPropia(true) }}>Cambiar mi contraseña</button>}
            </> : <p>Se muestra una vez y se cambia al ingresar.</p>}
            {usuario.id !== usuarioActualId && (usuario.activo ?
              <button type="button" className="secundario" disabled={ocupado || relacionOcupada} onClick={generarContrasena}>Generar contraseña temporal</button> :
              <p>Activa la cuenta para generar una contraseña temporal.</p>)}
          </section>
          <details><summary><IconoGestion nombre="editar" />Editar datos personales<IconoGestion nombre="abajo" /></summary><form onSubmit={guardarDatos}><fieldset disabled={ocupado || relacionOcupada}>
            {(['nombres', 'apellidos', 'correo', ...((esEstudiante || roles.includes('estudiante')) ? ['dni'] : [])] as CampoDatos[]).map((campo) => <CampoFormulario key={campo} id={'editar-' + campo} etiqueta={etiquetasDatos[campo]} errores={erroresCampos[campo]}><input id={'editar-' + campo} type={campo === 'correo' ? 'email' : 'text'} value={datos[campo]} required={campo === 'nombres' || campo === 'apellidos'} maxLength={campo === 'nombres' || campo === 'apellidos' ? LARGO_PARTE_NOMBRE : campo === 'dni' ? 8 : 254} inputMode={campo === 'dni' ? 'numeric' : undefined} aria-invalid={!!erroresCampos[campo]?.length} aria-describedby={erroresCampos[campo]?.length ? 'editar-' + campo + '-error' : undefined} onChange={(evento) => establecerDatos({ ...datos, [campo]: campo === 'dni' ? evento.target.value.replace(/\D/g,'') : evento.target.value })} /></CampoFormulario>)}
          </fieldset><button type="submit" disabled={ocupado || relacionOcupada}>{ocupado ? 'Guardando…' : 'Guardar datos'}</button></form></details>
          <details><summary><IconoGestion nombre="personas" />Roles y permisos<IconoGestion nombre="abajo" /></summary><form onSubmit={guardar}><fieldset disabled={ocupado || relacionOcupada}><legend className="solo-lectores">Roles escolares</legend><p id="ayuda-roles">Administrador y docente pueden combinarse. Estudiante se asigna solo.</p>{(Object.keys(etiquetas) as Rol[]).map((rol) => <label className="opcion" key={rol}><input type="checkbox" checked={roles.includes(rol)} aria-describedby="ayuda-roles" onChange={(evento) => establecerRoles(evento.target.checked ? (rol === 'estudiante' ? [rol] : [...roles.filter((actual) => actual !== 'estudiante'), rol]) : roles.filter((actual) => actual !== rol))} />{etiquetas[rol]}</label>)}</fieldset><button type="submit" disabled={ocupado || relacionOcupada || roles.length === 0}>Guardar roles</button></form></details>
          <section className="admin-acceso admin-acceso-estado" aria-labelledby="admin-titulo-estado">
            <h3 id="admin-titulo-estado"><IconoGestion nombre="info" />Estado de la cuenta</h3>
            <p>{usuario.activo ? 'Puede ingresar a Kusi.' : 'El acceso a Kusi está bloqueado.'}</p>
            <button type="button" className="secundario" disabled={ocupado || relacionOcupada} onClick={cambiarEstado}>{usuario.activo ? 'Desactivar cuenta' : 'Activar cuenta'}</button>
          </section>
        </aside></div>
        <details className="admin-historial">
          <summary><IconoGestion nombre="reloj" />Historial de cambios<IconoGestion nombre="abajo" /></summary>
          {detalle.historial.length === 0 ? <p>Esta cuenta todavía no tiene cambios registrados.</p> : <ol className="historial">{detalle.historial.map((cambio) => <li key={cambio.id}><strong>{cambio.tipo === 'roles' ? 'Cambio de roles' : cambio.tipo === 'estado' ? 'Cambio de estado' : cambio.tipo === 'contrasena_temporal' ? 'Contraseña temporal generada' : 'Cambio de datos'}</strong><p>{new Date(cambio.fecha).toLocaleString('es-PE')} · {cambio.administrador}</p><p>Antes: {Object.entries(cambio.anterior).map(([campo, valor]) => campo + ': ' + String(valor)).join(' · ')}</p><p>Después: {Object.entries(cambio.actual).map(([campo, valor]) => campo + ': ' + String(valor)).join(' · ')}</p></li>)}</ol>}
        </details>
      </>}
    </>}
  </section>
}

function IconoCandado() {
  return <svg className="doc-icono" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v3" />
  </svg>
}
