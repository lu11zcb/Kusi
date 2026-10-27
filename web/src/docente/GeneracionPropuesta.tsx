import { useEffect, useRef, useState } from 'react'
import { generarJuego, generacionTerminada, etiquetasEstados, listarGeneraciones, observarGeneracion, procesarGeneracion } from '../servicios/generaciones'
import type { Generacion, ResumenGeneracion } from '../servicios/generaciones'
import { MensajeDocente } from './ElementosDocente'
import { IconoDocente } from './IconoDocente'
import { DetalleGeneracion } from './DetalleGeneracion'

const mensaje = (error: unknown) => error instanceof Error ? error.message : 'No se pudo consultar el juego. Intenta de nuevo.'
// «disponible»: Kusi sabe construir el juego que diseñó la propuesta. Si es otro juego, la
// propuesta queda guardada y el botón de generar no se activa.
type Propiedades = { solicitud: string; version: number; aprobada: boolean; bloqueada?: boolean; disponible?: boolean }
export function GeneracionPropuesta({ solicitud, version, aprobada, bloqueada = false, disponible = true }: Propiedades) {
  const [historial, establecerHistorial] = useState<ResumenGeneracion[] | null>(null)
  const [seleccion, establecerSeleccion] = useState<string | null>(null)
  const [generacion, establecerGeneracion] = useState<Generacion | null>(null)
  const [errorHistorial, establecerErrorHistorial] = useState('')
  const [errorConsulta, establecerErrorConsulta] = useState('')
  const [errorOperacion, establecerErrorOperacion] = useState<{ id: string | null; mensaje: string } | null>(null)
  const [recargaHistorial, establecerRecargaHistorial] = useState(0)
  const [recargaDetalle, establecerRecargaDetalle] = useState(0)
  const [iniciando, establecerIniciando] = useState(false)
  const [procesando, establecerProcesando] = useState<string | null>(null)
  const [mostrarTodas, establecerMostrarTodas] = useState(false)
  const montada = useRef(false)
  const bloqueo = useRef(false)
  useEffect(() => { montada.current = true; return () => { montada.current = false } }, [])

  useEffect(() => {
    const controlador = new AbortController()
    listarGeneraciones(solicitud, controlador.signal).then((generaciones) => {
      if (controlador.signal.aborted) return
      establecerHistorial(generaciones); establecerErrorHistorial('')
      establecerSeleccion(generaciones[0]?.id ?? null)
    }).catch((error: unknown) => { if (!controlador.signal.aborted) establecerErrorHistorial(mensaje(error)) })
    return () => controlador.abort()
  }, [solicitud, recargaHistorial])

  const actual = generacion?.id === seleccion ? generacion : null
  const terminada = actual ? generacionTerminada(actual.estado) : false
  useEffect(() => {
    if (!seleccion || terminada) return
    const controlador = new AbortController()
    observarGeneracion(seleccion, controlador.signal, (datos) => {
      // El POST largo puede acabar mientras un GET anterior está respondiendo.
      // Una confirmación terminal nunca retrocede a «generando» por esa carrera.
      establecerGeneracion((anterior) => anterior?.id === datos.id && generacionTerminada(anterior.estado) ? anterior : datos)
      establecerHistorial((anteriores) => anteriores?.map((item) => item.id === datos.id && !generacionTerminada(item.estado) ? datos : item) ?? null)
      establecerErrorConsulta('')
    }, (error) => establecerErrorConsulta(mensaje(error)))
    return () => controlador.abort()
  }, [seleccion, terminada, recargaDetalle])

  function guardarResumen(datos: ResumenGeneracion) {
    establecerHistorial((anteriores) => [datos, ...(anteriores ?? []).filter((item) => item.id !== datos.id)]
      .sort((a, b) => Date.parse(b.creado_en) - Date.parse(a.creado_en)))
  }
  async function procesar(id: string) {
    establecerProcesando(id)
    try {
      const resultado = await procesarGeneracion(id)
      if (!montada.current) return
      guardarResumen(resultado); establecerErrorConsulta('')
      establecerGeneracion((anterior) => anterior?.id === id ? resultado : anterior)
    } catch (error) {
      if (!montada.current) return
      // Una respuesta perdida no autoriza repetir el POST. Se sigue consultando
      // el mismo juego; si quedó pendiente se ofrece continuar explícitamente.
      establecerErrorOperacion({ id, mensaje: mensaje(error) })
      establecerRecargaDetalle((valor) => valor + 1)
    } finally {
      if (montada.current) { establecerProcesando(null); bloqueo.current = false }
    }
  }
  async function generar() {
    if (bloqueo.current || !aprobada || bloqueada || !historial || errorHistorial || enCurso) return
    bloqueo.current = true; establecerIniciando(true); establecerErrorOperacion(null)
    try {
      const creada = await generarJuego(solicitud, version)
      if (!montada.current) return
      guardarResumen(creada); establecerGeneracion(creada); establecerSeleccion(creada.id)
      // No se usa alOcupar del formulario: esperar a la IA no bloquea la
      // navegación, la lectura ni el historial. Solo evita otro envío simultáneo.
      establecerIniciando(false)
      await procesar(creada.id)
    } catch (error) {
      if (!montada.current) return
      establecerErrorOperacion({ id: null, mensaje: mensaje(error) }); establecerRecargaHistorial((valor) => valor + 1)
      bloqueo.current = false
    } finally { if (montada.current) establecerIniciando(false) }
  }
  function continuar() {
    if (!actual || actual.estado !== 'pendiente' || bloqueo.current) return
    bloqueo.current = true; establecerErrorOperacion(null)
    void procesar(actual.id)
  }
  function abrir(id: string) {
    establecerSeleccion(id); establecerErrorConsulta('')
    establecerRecargaDetalle((valor) => valor + 1)
  }
  // Una solicitud puede conservar generaciones pendientes de versiones antiguas.
  // Solo la última de la versión vigente evita crear otra del mismo contenido.
  const ultimaDeVersion = historial?.find((item) => item.version_propuesta === version)
  const enCurso = ultimaDeVersion && !generacionTerminada(ultimaDeVersion.estado) ? ultimaDeVersion : null
  const puedeGenerar = aprobada && disponible && !bloqueada && historial !== null && !errorHistorial && !enCurso && !iniciando && !procesando
  const visibles = mostrarTodas ? historial : historial?.slice(0, 5)
  return <section className="doc-generacion" aria-label="Generar y probar el juego">
    <header className="doc-generacion-cabecera"><div><h2>De la propuesta al juego</h2><p>El juego se prepara y se revisa antes de que lo pruebes con tu clase.</p></div>
      {aprobada && <button type="button" className="doc-generar-juego" disabled={!puedeGenerar} onClick={() => void generar()}><IconoDocente nombre={iniciando || procesando ? 'reloj' : 'flecha'} />{iniciando ? 'Registrando el juego…' : actual?.estado === 'fallida' ? 'Intentar de nuevo' : 'Generar juego'}</button>}
    </header>
    {!disponible && <MensajeDocente titulo="Este juego todavía no se puede crear"><p>Por ahora Kusi solo crea juegos de laberinto con frutas y verduras. Esta propuesta queda guardada para cuando Kusi tenga este tipo de juego.</p></MensajeDocente>}
    {disponible && !aprobada && <p className="doc-ayuda">Aprueba la versión vigente para generar un juego nuevo. Puedes consultar y probar los juegos que ya se guardaron.</p>}
    {bloqueada && aprobada && <p className="doc-ayuda">Termina la edición o el cambio de la propuesta antes de generar su juego.</p>}
    {historial === null && !errorHistorial && <p role="status">Buscando los juegos de esta solicitud…</p>}
    {errorHistorial && <MensajeDocente titulo="No se pudo cargar el historial" error><p>{errorHistorial}</p><button type="button" className="secundario" onClick={() => establecerRecargaHistorial((valor) => valor + 1)}>Volver a cargar juegos</button></MensajeDocente>}
    {errorOperacion && !(actual?.id === errorOperacion.id && terminada) && <MensajeDocente titulo="No se pudo confirmar la operación" error><p>{errorOperacion.mensaje}</p><p>Se consultará el juego guardado antes de permitir otro envío.</p></MensajeDocente>}
    {enCurso && enCurso.id !== seleccion && <MensajeDocente titulo="Hay una generación en curso"><p>Puedes consultar su avance mientras revisas este juego anterior.</p><button type="button" className="secundario" onClick={() => abrir(enCurso.id)}>Ver generación en curso</button></MensajeDocente>}
    {!!historial?.length && <nav className="doc-generacion-historial" aria-label="Historial de juegos"><h3>Juegos de esta solicitud</h3><p>El más reciente aparece primero. Abre uno anterior para consultar sus correcciones.</p><ol>{visibles?.map((item, indice) => <li key={item.id}><button type="button" className="secundario" aria-pressed={seleccion === item.id} onClick={() => abrir(item.id)}><IconoDocente nombre={item.estado === 'lista' ? 'check' : item.estado === 'fallida' ? 'info' : 'reloj'} /><span>{'Juego ' + ((historial?.length ?? 0) - indice) + ' · Versión ' + item.version_propuesta + ' · ' + new Date(item.creado_en).toLocaleString('es-PE')}<small>{etiquetasEstados[item.estado]}</small></span></button></li>)}</ol>{historial.length > 5 && <button type="button" className="doc-texto-boton" onClick={() => establecerMostrarTodas((valor) => !valor)}>{mostrarTodas ? 'Mostrar solo los cinco últimos' : 'Ver todos los juegos anteriores'}</button>}</nav>}
    {errorConsulta && <MensajeDocente titulo="No se pudo actualizar el avance" error><p>{errorConsulta}</p><p>Se volverá a consultar en dos segundos.</p></MensajeDocente>}
    {seleccion && !actual && !errorConsulta && <p role="status">Cargando las etapas del juego…</p>}
    {actual && <>
      <p className="doc-ayuda">{'Juego de la versión ' + actual.version_propuesta + (historial?.[0]?.id === actual.id ? ' · Más reciente' : ' · Historial')}</p>
      <DetalleGeneracion key={actual.id} generacion={actual} />
      {actual.estado === 'pendiente' && !procesando && <button type="button" className="secundario" onClick={continuar}><IconoDocente nombre="flecha" />Continuar generación guardada</button>}
      {actual.estado === 'fallida' && !aprobada && <p>Para intentar de nuevo, aprueba primero la versión vigente de la propuesta.</p>}
    </>}
  </section>
}
