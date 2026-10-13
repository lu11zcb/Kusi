import type { Cuenta } from '../servicios/acceso'
import { SolicitarPropuesta } from './SolicitarPropuesta'
import { RecursosAsignados } from './RecursosAsignados'
import { EstudiantesSecciones } from './EstudiantesSecciones'
import { MisPropuestas } from './MisPropuestas'

export function PanelDocente({ usuario, salir, cambiarRol }: { usuario: Cuenta; salir: () => void; cambiarRol?: () => void }) {
  return <main className="panel-docente">
    <header><h1>Mi espacio docente</h1><p>{usuario.nombre}</p></header>
    <nav aria-label="Docente"><a href="#solicitar-propuesta">Solicitar propuesta</a> · <a href="#mis-propuestas">Mis propuestas</a></nav>
    <RecursosAsignados />
    <EstudiantesSecciones />
    <SolicitarPropuesta />
    <MisPropuestas />
    <div className="acciones">
      {cambiarRol && <button type="button" className="secundario" onClick={cambiarRol}>Cambiar de panel</button>}
      <button type="button" className="secundario" onClick={salir}>Cerrar sesión</button>
    </div>
  </main>
}
