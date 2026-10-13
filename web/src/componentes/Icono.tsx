// Íconos de línea dibujados en SVG para no depender de librerías externas.
const trazos = {
  inicio: 'M4 11 12 4l8 7M6 9.5V20h4.5v-5h3v5H18V9.5',
  registrar: 'M15 19v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 3 17.5V19M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M19 8v6M22 11h-6',
  usuarios: 'M17 19v-1.5a3.5 3.5 0 0 0-3.5-3.5h-6A3.5 3.5 0 0 0 4 17.5V19M10.5 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M21 19v-1.5a3.5 3.5 0 0 0-2.6-3.4M15.5 4.2a3.5 3.5 0 0 1 0 6.6',
  libro: 'M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5zM4 20.5A2.5 2.5 0 0 0 6.5 23H20M8 7h8',
  aula: 'M3 20h18M5 20V9l7-5 7 5v11M9.5 20v-5h5v5M9 11h.01M15 11h.01',
  enlace: 'M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1',
  pizarra: 'M3 4h18v12H3zM8 20l4-4 4 4M7 8h6M7 11h9',
  estudiantes: 'M12 3 2 8l10 5 10-5zM6 10.5V15c2.5 2.5 9.5 2.5 12 0v-4.5M22 8v6',
  varita: 'M4 20 15 9M14 4l1 2.5L17.5 7.5 15 8.5 14 11l-1-2.5-2.5-1 2.5-1zM19 13l.6 1.4L21 15l-1.4.6L19 17l-.6-1.4L17 15l1.4-.6z',
  carpeta: 'M3 6.5A1.5 1.5 0 0 1 4.5 5H9l2 2.5h8.5A1.5 1.5 0 0 1 21 9v9.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5z',
  salir: 'M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16l-4-4 4-4M6 12h10',
  cambiar: 'M4 9h13l-3.5-3.5M20 15H7l3.5 3.5',
  chispa: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z',
  buscar: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14M20 20l-4-4',
  flecha: 'M5 12h14M13 6l6 6-6 6',
} as const

export type NombreIcono = keyof typeof trazos

export function Icono({ nombre, className = 'icono' }: { nombre: NombreIcono; className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={trazos[nombre]} />
  </svg>
}
