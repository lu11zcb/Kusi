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

const opciones: readonly OpcionMenu[] = [
  { id: 'inicio', etiqueta: 'Inicio', icono: 'inicio' },
  { id: 'cursos', etiqueta: 'Mis cursos', icono: 'libro' },
  { id: 'estudiantes', etiqueta: 'Mis estudiantes', icono: 'estudiantes' },
  { id: 'solicitar', etiqueta: 'Crear propuesta', icono: 'varita' },
  { id: 'propuestas', etiqueta: 'Mis propuestas', icono: 'carpeta' },
]

export function PanelDocente({ usuario, salir, cambiarRol }: { usuario: Cuenta; salir: () => void; cambiarRol?: () => void }) {
  const [seccion, establecerSeccion] = useState('inicio')
  const [cursoInicial, establecerCursoInicial] = useState('')
  // Los cursos autorizados y el estado de la IA se usan en varias secciones.
  const [contextos, establecerContextos] = useState<ContextosPropuestas | null>(null)
  const [errorContextos, establecerErrorContextos] = useState('')
  useEffect(() => {
    let vigente = true
    obtenerContextosPropuestas().then((datos) => { if (vigente) establecerContextos(datos) })
      .catch((fallo: unknown) => { if (vigente) establecerErrorContextos(fallo instanceof Error ? fallo.message : 'No se pudieron cargar tus cursos.') })
    return () => { vigente = false }
  }, [])

  function ir(destino: string, curso = '') {
    establecerCursoInicial(curso)
    establecerSeccion(destino)
  }

  const fichas = <>
    {contextos && <span className={'ficha ' + (contextos.ia_configurada ? 'ok' : 'alerta')}>{contextos.ia_configurada ? '🤖 IA lista' : '🤖 IA pendiente'}</span>}
    {contextos && <span className="ficha">📚 {contextos.contextos.length} {contextos.contextos.length === 1 ? 'curso' : 'cursos'}</span>}
  </>
  const promo = <div className="tarjeta-promo"><strong>🎮 Crea un juego</strong><p>Elige un curso y un tema; Kusi prepara la propuesta para que la revises.</p></div>

  return <Tablero rol="Docente" nombre={usuario.nombre} opciones={opciones} actual={seccion} alElegir={(id) => ir(id)}
    fichas={fichas} promo={promo} salir={salir} cambiarRol={cambiarRol}>
    {seccion === 'inicio' && <InicioDocente nombre={usuario.nombre} contextos={contextos} ir={ir} />}
    {seccion === 'cursos' && <div className="tarjeta"><MisCursos contextos={contextos} error={errorContextos} crear={(curso) => ir('solicitar', curso)} /></div>}
    {seccion === 'estudiantes' && <div className="tarjeta"><EstudiantesSecciones /></div>}
    {seccion === 'solicitar' && <div className="tarjeta"><SolicitarPropuesta key={cursoInicial} cursoInicial={cursoInicial} /></div>}
    {seccion === 'propuestas' && <div className="tarjeta"><MisPropuestas /></div>}
  </Tablero>
}
