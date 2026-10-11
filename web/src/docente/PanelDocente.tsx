import type { Cuenta } from '../servicios/acceso'

export function PanelDocente({ usuario, salir, cambiarRol }: { usuario: Cuenta; salir: () => void; cambiarRol?: () => void }) {
  return <main className="panel-docente">
    <header><h1>Mi espacio docente</h1><p>{usuario.nombre}</p></header>
    <nav aria-label="Docente"><a href="#actividades">Actividades</a></nav>
    <section id="actividades"><h2>Actividades educativas</h2><p>Las funciones educativas estarán disponibles al conectar el servicio educativo y tus cursos autorizados.</p></section>
    <div className="acciones">
      {cambiarRol && <button type="button" className="secundario" onClick={cambiarRol}>Cambiar de panel</button>}
      <button type="button" className="secundario" onClick={salir}>Cerrar sesión</button>
    </div>
  </main>
}
