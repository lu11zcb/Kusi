import type { Cuenta } from '../servicios/acceso'
import { SolicitarPropuesta } from './SolicitarPropuesta'

export function PanelDocente({ usuario, salir, cambiarRol }: { usuario: Cuenta; salir: () => void; cambiarRol?: () => void }) {
  return <main className="panel-docente">
    <header><h1>Mi espacio docente</h1><p>{usuario.nombre}</p></header>
    <nav aria-label="Docente"><a href="#solicitar-propuesta">Solicitar propuesta</a></nav>
    <SolicitarPropuesta />
    <div className="acciones">
      {cambiarRol && <button type="button" className="secundario" onClick={cambiarRol}>Cambiar de panel</button>}
      <button type="button" className="secundario" onClick={salir}>Cerrar sesión</button>
    </div>
  </main>
}
