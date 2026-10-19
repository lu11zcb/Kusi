import { listarUsuarios } from './usuarios'
import type { UsuarioAdministrado } from './usuarios'
import type { SeccionEducativa } from './educacion'

// Incluye todas las páginas y las cuentas inactivas para identificar registros
// anteriores; los formularios solo permiten seleccionar cuentas activas del rol.
export async function listarUsuariosEducativos(): Promise<UsuarioAdministrado[]> {
  const usuarios = new Map<string, UsuarioAdministrado>()
  let pagina = 1
  let paginas: number
  do {
    const datos = await listarUsuarios('', pagina)
    if (!Number.isInteger(datos.paginas) || datos.paginas < 1 || !Array.isArray(datos.usuarios)) {
      throw new Error('No se pudieron cargar los nombres. Vuelve a cargar las listas.')
    }
    datos.usuarios.forEach((usuario) => usuarios.set(usuario.id, usuario))
    paginas = datos.paginas
    pagina += 1
  } while (pagina <= paginas)
  return [...usuarios.values()]
}

export const nombreSeccion = (seccion: SeccionEducativa) => `${seccion.nombre} · ${seccion.grado}° de primaria · ${seccion.anio_escolar}`
export const nombreCuenta = (usuario: UsuarioAdministrado) => `${usuario.nombre}${usuario.correo ? ' · ' + usuario.correo : usuario.dni ? ' · DNI ' + usuario.dni : ''}`

export type OpcionLista = { id: string; nombre: string }
export const opcionesCuentas = (usuarios: UsuarioAdministrado[], rol: 'docente' | 'estudiante'): OpcionLista[] => usuarios
  .filter((usuario) => usuario.activo && usuario.roles.includes(rol))
  .map((usuario) => ({ id: usuario.id, nombre: nombreCuenta(usuario) }))
const normalizar = (texto: string) => texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').trim()
export const filtrarOpciones = (opciones: OpcionLista[], busqueda: string) => opciones.filter((opcion) => normalizar(opcion.nombre).includes(normalizar(busqueda)))
