import { enviar, solicitar } from './http'

export type Curso = { id: string; nombre: string }
export const listarCursos = () => solicitar<{ cursos: Curso[] }>('/api/cuentas/cursos/')
export const actualizarCurso = (id: string, nombre: string) => enviar<{ curso: Curso }>(
  '/api/cuentas/cursos/' + encodeURIComponent(id) + '/', { nombre }, 'PATCH',
)
