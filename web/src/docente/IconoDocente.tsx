import { Icono } from '../componentes/Icono'
import type { NombreIcono } from '../componentes/Icono'

// Administración y docencia comparten los trazos del Inicio de administración.
// Se conservan los nombres utilizados por las pantallas para no cambiar sus
// acciones ni sus contratos; solo se unifica la representación visual.
const equivalencias = {
  inicio: 'inicio', personas: 'usuarios', estudiante: 'estudiantes', docente: 'pizarra',
  buscar: 'buscar', flecha: 'flecha', atras: 'atras', mas: 'mas', editar: 'editar',
  check: 'check', info: 'info', matematica: 'matematica', comunicacion: 'comunicacion',
  ciencia: 'ciencia', personal: 'usuarios', arte: 'arte', religion: 'religion', ingles: 'ingles',
  reloj: 'reloj', menu: 'menu', abajo: 'abajo', cerrar: 'cerrar', cursos: 'libros', secciones: 'edificio', juegos: 'carpeta',
} as const satisfies Record<string, NombreIcono>

export type IconoDocenteNombre = keyof typeof equivalencias
export function IconoDocente({ nombre, className = 'doc-icono' }: { nombre: IconoDocenteNombre; className?: string }) {
  return <Icono nombre={equivalencias[nombre]} className={className} />
}
