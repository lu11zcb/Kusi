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
  atras: 'M19 12H5M11 6l-6 6 6 6',
  mas: 'M12 5v14M5 12h14',
  editar: 'm15 4 5 5M4 20l4.5-1L21 6.5 17.5 3 5 15.5z',
  check: 'm5 12 4 4L19 6',
  info: 'M12 8h.01M12 11v6M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',
  reloj: 'M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',
  menu: 'M4 6h16M4 12h16M4 18h16',
  abajo: 'm6 9 6 6 6-6',
  cerrar: 'm6 6 12 12M18 6 6 18',
  libros: 'M3 4h4v16H3zM10 4h4v16h-4zM16 5l4-1 3 15-4 1z',
  edificio: 'M3 21h18M5 21V8l9-5v18M14 8h5v13M8 9v1M11 7v1M8 13v1M11 11v1M8 17v1M11 15v1M17 12v1M17 16v1',
  matematica: 'M6 3h12v18H6zM9 6h6v4H9zM9 14h.01M15 14h.01M9 18h.01M15 18h.01',
  comunicacion: 'M21 11.5a8.5 8.5 0 0 1-12.7 7.4L3 21l1.7-5.1A8.5 8.5 0 1 1 21 11.5M8 10h8M8 14h5',
  ciencia: 'M9 3h6M10 3v6L4.5 18a2 2 0 0 0 1.7 3h11.6a2 2 0 0 0 1.7-3L14 9V3M7.5 13h9M10 17h.01M14 18h.01',
  arte: 'M12 3a9 9 0 1 0 0 18h1a2.5 2.5 0 0 0 2.1-3.8 1.8 1.8 0 0 1 1.5-2.7H18A3 3 0 0 0 21 12a9 9 0 0 0-9-9M8 8h.01M12 6h.01M16 8h.01M6 12h.01',
  religion: 'M10 3h4v5h5v4h-5v9h-4v-9H5V8h5z',
  ingles: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0M3 12h18M12 3c4 4 4 14 0 18-4-4-4-14 0-18',
} as const

export type NombreIcono = keyof typeof trazos

export function Icono({ nombre, className = 'icono' }: { nombre: NombreIcono; className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={trazos[nombre]} />
  </svg>
}
