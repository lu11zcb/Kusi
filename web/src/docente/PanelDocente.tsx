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
import { ResultadosDocente } from './ResultadosDocente'
import { SolicitarPropuesta } from './SolicitarPropuesta'
import { IconoDocente } from './IconoDocente'
import { KusiSabio } from './KusiSabio'
import logoSabio from '../assets/kusi/kusi-sabio.webp'
import type { BorradorPropuesta } from './SolicitarPropuesta'
import { mensajeDocente } from './trabajosDocente'
import './docente.css'
import './resultados.css'
import './sabio.css'

// El menú se agrupa como en el panel del administrador: quién es mi clase, qué juegos
// preparo y cómo les va. Inicio queda arriba, sin rótulo.
const gruposMenu: readonly { etiqueta?: string; opciones: readonly OpcionMenu[] }[] = [
  { opciones: [{ id: 'inicio', etiqueta: 'Inicio', icono: 'inicio', iconoVisual: <IconoDocente nombre="inicio" /> }] },
  { etiqueta: 'Mi clase', opciones: [
    { id: 'cursos', etiqueta: 'Mis cursos', icono: 'libro', iconoVisual: <IconoDocente nombre="cursos" /> },
    { id: 'estudiantes', etiqueta: 'Mis estudiantes', icono: 'estudiantes', iconoVisual: <IconoDocente nombre="personas" /> },
  ] },
  { etiqueta: 'Juegos', opciones: [
    { id: 'solicitar', etiqueta: 'Crear propuesta', icono: 'varita', iconoVisual: <IconoDocente nombre="editar" /> },
    { id: 'propuestas', etiqueta: 'Mis juegos', icono: 'carpeta', iconoVisual: <IconoDocente nombre="juegos" /> },
  ] },
  { etiqueta: 'Seguimiento', opciones: [
    { id: 'resultados', etiqueta: 'Resultados', icono: 'check', iconoVisual: <IconoDocente nombre="check" /> },
  ] },
]
const opciones = gruposMenu.flatMap((grupo) => grupo.opciones)

export function PanelDocente({ usuario, salir, cambiarRol }: { usuario: Cuenta; salir: () => void; cambiarRol?: () => void }) {
  const [seccion, establecerSeccion] = useState('inicio')
  const [visitadas, establecerVisitadas] = useState<string[]>(['inicio'])
  const [ocupado, establecerOcupado] = useState(false)
  const [recarga, establecerRecarga] = useState(0)
  const [abrirJuego, establecerAbrirJuego] = useState<string | null>(null)
  const [borrador, establecerBorrador] = useState<BorradorPropuesta>({ seleccion: '', tema: '', objetivo: '', instrucciones: '' })
  // Los cursos autorizados y el estado de la IA se usan en varias secciones.
  const [contextos, establecerContextos] = useState<ContextosPropuestas | null>(null)
  const [errorContextos, establecerErrorContextos] = useState('')
  useEffect(() => {
    const controlador = new AbortController()
    obtenerContextosPropuestas(controlador.signal).then((datos) => { if (!controlador.signal.aborted) { establecerContextos(datos); establecerErrorContextos('') } })
      .catch((fallo: unknown) => { if (!controlador.signal.aborted) establecerErrorContextos(mensajeDocente(fallo, 'No pudimos abrir tus cursos. Comprueba tu conexión e intenta otra vez.')) })
    return () => controlador.abort()
  }, [recarga])

  function ir(destino: string, curso = '', juego = '') {
    if (ocupado) return
    if (curso) establecerBorrador((anterior) => ({ ...anterior, seleccion: curso }))
    establecerAbrirJuego(juego || null)
    establecerVisitadas((anteriores) => anteriores.includes(destino) ? anteriores : [...anteriores, destino])
    establecerSeccion(destino)
  }

  const fichas = <>
    <span className="ficha"><IconoDocente nombre="personas" />Panel docente</span>
  </>
  const promo = <div className="tarjeta-promo"><IconoDocente nombre="editar" /><strong>Una idea para tu clase</strong><p>Cuéntale a Kusi qué quieres enseñar. Revisa, prueba y comparte tu juego.</p></div>

  return <div className="panel-docente"><Tablero rol="Docente" nombre={usuario.nombre} opciones={opciones} gruposMenu={gruposMenu} actual={seccion} alElegir={(id) => ir(id)} bloqueado={ocupado} menuPlegable
    fichas={fichas} promo={promo} salir={salir} cambiarRol={cambiarRol}>
    {seccion === 'inicio' && <InicioDocente nombre={usuario.nombre} contextos={contextos} ir={ir} errorCursos={errorContextos} recargarCursos={() => establecerRecarga((valor) => valor + 1)} />}
    {visitadas.includes('cursos') && <div hidden={seccion !== 'cursos'}><MisCursos contextos={contextos} error={errorContextos} recargar={() => establecerRecarga((valor) => valor + 1)} crear={(curso) => ir('solicitar', curso)} /></div>}
    {visitadas.includes('estudiantes') && <div hidden={seccion !== 'estudiantes'}><EstudiantesSecciones nombreCurso={(id) => contextos?.contextos.find((c) => c.curso_id === id)?.curso_nombre ?? 'Tu clase'} /></div>}
    {visitadas.includes('solicitar') && <div hidden={seccion !== 'solicitar'}><SolicitarPropuesta borrador={borrador} alCambiarBorrador={establecerBorrador} alOcupar={establecerOcupado} activo={seccion === 'solicitar'} alSalir={() => ir('propuestas')} /></div>}
    {visitadas.includes('propuestas') && <div hidden={seccion !== 'propuestas'}><MisPropuestas contextos={contextos} crear={() => ir('solicitar')} alOcupar={establecerOcupado} activo={seccion === 'propuestas'} abrirId={abrirJuego} /></div>}
    {visitadas.includes('resultados') && <div hidden={seccion !== 'resultados'}><ResultadosDocente activo={seccion === 'resultados'} nombreCurso={(id) => contextos?.contextos.find((c) => c.curso_id === id)?.curso_nombre ?? 'Tu clase'} /></div>}
  </Tablero><KusiSabio logo={logoSabio} /></div>
}
