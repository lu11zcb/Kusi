import { useEffect, useState } from 'react'
import { Tablero } from '../componentes/Tablero'
import type { OpcionMenu } from '../componentes/Tablero'
import type { Cuenta } from '../servicios/acceso'
import { obtenerContextosPropuestas } from '../servicios/propuestas'
import type { ContextosPropuestas } from '../servicios/propuestas'
import { EstudiantesSecciones } from './EstudiantesSecciones'
import { InicioDocente } from './InicioDocente'
import { MisCursos } from './MisCursos'
import { MisPropuestas } from './MisPropuestas'
import { SolicitarPropuesta } from './SolicitarPropuesta'
import { IconoDocente } from './IconoDocente'
import type { BorradorPropuesta } from './SolicitarPropuesta'
import './docente.css'

const opciones: readonly OpcionMenu[] = [
  { id: 'inicio', etiqueta: 'Inicio', icono: 'inicio', iconoVisual: <IconoDocente nombre="inicio" /> },
  { id: 'cursos', etiqueta: 'Mis cursos', icono: 'libro', iconoVisual: <IconoDocente nombre="cursos" /> },
  { id: 'estudiantes', etiqueta: 'Mis estudiantes', icono: 'estudiantes', iconoVisual: <IconoDocente nombre="personas" /> },
  { id: 'solicitar', etiqueta: 'Crear propuesta', icono: 'varita', iconoVisual: <IconoDocente nombre="editar" /> },
  { id: 'propuestas', etiqueta: 'Mis propuestas', icono: 'carpeta', iconoVisual: <IconoDocente nombre="secciones" /> },
]

export function PanelDocente({ usuario, salir, cambiarRol }: { usuario: Cuenta; salir: () => void; cambiarRol?: () => void }) {
  const [seccion, establecerSeccion] = useState('inicio')
  const [visitadas, establecerVisitadas] = useState<string[]>(['inicio'])
  const [ocupado, establecerOcupado] = useState(false)
  const [recarga, establecerRecarga] = useState(0)
  const [borrador, establecerBorrador] = useState<BorradorPropuesta>({ seleccion: '', tema: '', objetivo: '', proposito: 'preparacion', instrucciones: '' })
  // Los cursos autorizados y el estado de la IA se usan en varias secciones.
  const [contextos, establecerContextos] = useState<ContextosPropuestas | null>(null)
  const [errorContextos, establecerErrorContextos] = useState('')
  useEffect(() => {
    const controlador = new AbortController()
    obtenerContextosPropuestas(controlador.signal).then((datos) => { if (!controlador.signal.aborted) { establecerContextos(datos); establecerErrorContextos('') } })
      .catch((fallo: unknown) => { if (!controlador.signal.aborted) establecerErrorContextos(fallo instanceof Error ? fallo.message : 'No se pudieron cargar tus cursos.') })
    return () => controlador.abort()
  }, [recarga])

  function ir(destino: string, curso = '') {
    if (ocupado) return
    if (curso) establecerBorrador((anterior) => ({ ...anterior, seleccion: curso }))
    establecerVisitadas((anteriores) => anteriores.includes(destino) ? anteriores : [...anteriores, destino])
    establecerSeccion(destino)
  }

  const fichas = <>
    <span className="ficha"><IconoDocente nombre="personas" />Panel docente</span>
    {contextos && <span className={'ficha ' + (contextos.ia_configurada ? 'ok' : 'alerta')}><IconoDocente nombre={contextos.ia_configurada ? 'check' : 'info'} />{contextos.ia_configurada ? 'IA configurada' : 'IA por configurar'}</span>}
  </>
  const promo = <div className="tarjeta-promo"><IconoDocente nombre="editar" /><strong>Tu idea, con ayuda de IA</strong><p>Elige qué enseñar. Kusi prepara una propuesta y tú decides cómo mejorarla.</p></div>

  return <div className="panel-docente"><Tablero rol="Docente" nombre={usuario.nombre} opciones={opciones} actual={seccion} alElegir={(id) => ir(id)} bloqueado={ocupado} menuPlegable
    fichas={fichas} promo={promo} salir={salir} cambiarRol={cambiarRol}>
    {seccion === 'inicio' && <InicioDocente nombre={usuario.nombre} contextos={contextos} ir={ir} />}
    {visitadas.includes('cursos') && <div hidden={seccion !== 'cursos'}><MisCursos contextos={contextos} error={errorContextos} recargar={() => establecerRecarga((valor) => valor + 1)} crear={(curso) => ir('solicitar', curso)} /></div>}
    {visitadas.includes('estudiantes') && <div hidden={seccion !== 'estudiantes'}><EstudiantesSecciones /></div>}
    {visitadas.includes('solicitar') && <div hidden={seccion !== 'solicitar'}><SolicitarPropuesta borrador={borrador} alCambiarBorrador={establecerBorrador} alOcupar={establecerOcupado} activo={seccion === 'solicitar'} alSalir={() => ir('inicio')} /></div>}
    {visitadas.includes('propuestas') && <div hidden={seccion !== 'propuestas'}><MisPropuestas contextos={contextos} crear={() => ir('solicitar')} alOcupar={establecerOcupado} activo={seccion === 'propuestas'} /></div>}
  </Tablero></div>
}
