import { createContext, useContext, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { preguntarASabio, respuestaDeSabio, proporciones, TITULOS_GRAFICO, MAX_PREGUNTA } from '../servicios/sabio'
import type { ApoyoSabio, EstudiantesSabio, GraficoSabio, RespuestaSabio, TurnoSabio } from '../servicios/sabio'
import { mensajeDocente } from './trabajosDocente'

// «Kusi Sabio»: un botón abajo a la derecha que abre un chat al costado, como un ayudante en un editor de textos. El
// docente solo pregunta: Kusi Sabio elige de cuál de sus actividades habla (o responde sobre el panel) y lo dice arriba de
// los gráficos. Responde el taller en unos segundos; mientras tanto el panel consulta cada poco. Los nombres de la lista
// de apoyo vienen de Spring: a quien responde nunca le llegan.

type Mensaje = { pregunta: string; respuesta?: Extract<RespuestaSabio, { estado: 'lista' }>; error?: string }

const ESPERA_ENTRE_CONSULTAS_MS = 1500
// Spring pasa a la reserva a los 150 s; si a los 4 minutos no hay respuesta, algo falló de verdad.
const CONSULTAS_MAXIMAS = Math.round(4 * 60 * 1000 / ESPERA_ENTRE_CONSULTAS_MS)
const SUGERENCIAS = ['¿Qué reforzar en la próxima clase?', '¿Quién necesita ayuda?', '¿Cuántos estudiantes tengo?',
  '¿Cómo envío un juego a mi clase?']
const LogoSabio = createContext<string | null>(null)

type BloqueTexto = { tipo: 'parrafo' | 'ul' | 'ol'; lineas: string[]; inicio?: number }

function conNegritas(texto: string) {
  return texto.split(/(\*\*[^*\n]+\*\*)/).map((parte, i) =>
    i % 2 === 1 ? <strong key={i}>{parte.slice(2, -2)}</strong> : parte)
}

/** La respuesta solo aporta texto. Las etiquetas de párrafo, lista y negrita las crea el componente. */
function TextoSabio({ texto }: { texto: string }) {
  const bloques: BloqueTexto[] = []
  let actual: BloqueTexto | undefined
  for (const fila of texto.split(/\r?\n/)) {
    const linea = fila.trim()
    if (!linea) {
      actual = undefined
      continue
    }
    const numerada = linea.match(/^(\d{1,9})[.)]\s+(.+)$/)
    const vineta = linea.match(/^[-*+]\s+(.+)$/)
    const tipo = numerada ? 'ol' : vineta ? 'ul' : 'parrafo'
    if (actual?.tipo !== tipo) {
      actual = { tipo, lineas: [], inicio: numerada ? Number(numerada[1]) : undefined }
      bloques.push(actual)
    }
    actual.lineas.push(numerada?.[2] ?? vineta?.[1] ?? linea)
  }
  return <div className="sabio-texto">
    {bloques.map(({ tipo, lineas, inicio }, i) => {
      if (tipo === 'parrafo') return <p key={i}>{conNegritas(lineas.join('\n'))}</p>
      const Lista = tipo
      return <Lista key={i} start={inicio}>{lineas.map((linea, j) => <li key={j}>{conNegritas(linea)}</li>)}</Lista>
    })}
  </div>
}

/** Los rótulos se ajustan al ancho de la tarjeta para mostrar completos los nombres y valores. */
export function GraficoBarras({ grafico }: { grafico: GraficoSabio }) {
  const partes = proporciones(grafico.barras)
  const titulo = grafico.titulo ?? (grafico.tipo === 'propio' ? 'Gráfico' : TITULOS_GRAFICO[grafico.tipo])
  return <figure className="sabio-tarjeta">
    <figcaption className="sabio-titulo-tarjeta">{titulo}</figcaption>
    {grafico.barras.length === 0 ? <p className="sabio-nota">Todavía no hay datos para este gráfico.</p> :
      <div className="sabio-grafico" role="img"
        aria-label={titulo + ': ' + grafico.barras.map((b) => b.etiqueta + ' ' + b.valor + (b.total ? ' de ' + b.total : '')).join(', ')}>
        {grafico.barras.map((b, i) => <div key={b.etiqueta + i} className="sabio-fila-grafico">
          <span>{b.etiqueta}</span>
          <strong>{b.total ? b.valor + '/' + b.total : String(b.valor)}</strong>
          <div className="sabio-fondo-barra"><div className="sabio-barra" style={{ width: partes[i] * 100 + '%' }} /></div>
        </div>)}
      </div>}
  </figure>
}

export function ListaApoyo({ lista }: { lista: ApoyoSabio[] }) {
  if (lista.length === 0) return <p className="sabio-tarjeta sabio-nota">Por ahora nadie del grupo muestra señales de necesitar apoyo.</p>
  return <section className="sabio-tarjeta" aria-label="Quiénes necesitan ayuda">
    <strong className="sabio-titulo-tarjeta">Quiénes necesitan ayuda en clase</strong>
    <ul className="sabio-apoyo" role="list">
      {lista.map((fila, i) => <li key={fila.nombre + i}><strong>{fila.nombre}</strong><small>{fila.motivos.join(' · ')}</small></li>)}
    </ul>
  </section>
}

/** Los estudiantes del docente por sección, con sus nombres: los arma Spring, Kusi Sabio solo pide mostrarlos. */
export function ListaEstudiantes({ secciones }: { secciones: EstudiantesSabio[] }) {
  if (secciones.length === 0) return <p className="sabio-tarjeta sabio-nota">Todavía no tienes estudiantes vinculados a tus secciones.</p>
  return <section className="sabio-tarjeta sabio-estudiantes" aria-label="Tus estudiantes">
    {secciones.map((seccion) => <div key={seccion.seccion}>
      <strong className="sabio-titulo-tarjeta">{seccion.seccion + ' · ' + seccion.nombres.length
        + (seccion.nombres.length === 1 ? ' estudiante' : ' estudiantes')}</strong>
      {seccion.nombres.length > 0 && <ol>{seccion.nombres.map((nombre, i) => <li key={nombre + i}>{nombre}</li>)}</ol>}
    </div>)}
  </section>
}

export function MensajeSabio({ mensaje }: { mensaje: Mensaje }) {
  const logo = useContext(LogoSabio)
  return <li className="sabio-turno">
    <div className="sabio-pregunta">
      <strong>Tú</strong>
      <p>{mensaje.pregunta}</p>
    </div>
    {mensaje.error && <p className="sabio-tarjeta sabio-error" role="alert">{mensaje.error}</p>}
    {!mensaje.error && <div className="sabio-respuesta">
      <div className="sabio-autor">
        {logo && <img className="sabio-logo" src={logo} alt="" />}
        {mensaje.respuesta ? <strong>Kusi Sabio</strong> : <span className="sabio-pensando">
          Kusi Sabio está pensando…
          <span className="sabio-puntos" aria-hidden="true"><i /><i /><i /></span>
        </span>}
      </div>
      {mensaje.respuesta && <>
        <TextoSabio texto={mensaje.respuesta.texto} />
        {mensaje.respuesta.actividad && <p className="sabio-tarjeta sabio-sobre-actividad">{'Sobre: ' + mensaje.respuesta.actividad.titulo
          + (mensaje.respuesta.actividad.seccion ? ' · ' + mensaje.respuesta.actividad.seccion : '')}</p>}
        {mensaje.respuesta.graficos.map((grafico) => <GraficoBarras key={grafico.tipo} grafico={grafico} />)}
        {mensaje.respuesta.quienes_necesitan_ayuda && <ListaApoyo lista={mensaje.respuesta.quienes_necesitan_ayuda} />}
        {mensaje.respuesta.estudiantes && <ListaEstudiantes secciones={mensaje.respuesta.estudiantes} />}
      </>}
    </div>}
  </li>
}

export function KusiSabio({ logo, abiertoAlInicio = false }: { logo: string; abiertoAlInicio?: boolean }) {
  const [abierto, establecerAbierto] = useState(abiertoAlInicio)
  const [mensajes, establecerMensajes] = useState<Mensaje[]>([])
  const [escrito, establecerEscrito] = useState('')
  const [esperando, establecerEsperando] = useState(false)
  const controlador = useRef<AbortController | null>(null)
  const botonAbrir = useRef<HTMLButtonElement>(null)
  const campoPregunta = useRef<HTMLTextAreaElement>(null)
  const conversacion = useRef<HTMLDivElement>(null)
  const devolverFoco = useRef(false)
  const idPanel = useId()
  const idTitulo = useId()
  const idPregunta = useId()

  useEffect(() => () => controlador.current?.abort(), [])
  useLayoutEffect(() => {
    if (abierto) campoPregunta.current?.focus({ preventScroll: true })
    else if (devolverFoco.current) {
      botonAbrir.current?.focus({ preventScroll: true })
      devolverFoco.current = false
    }
  }, [abierto])
  useEffect(() => {
    // Solo se desplaza la conversación, para conservar la posición del panel docente.
    const area = conversacion.current
    if (abierto && area && mensajes.length > 0) area.scrollTop = area.scrollHeight
  }, [abierto, mensajes])

  function cerrar() {
    devolverFoco.current = true
    establecerAbierto(false)
  }

  async function preguntar(texto: string) {
    const pregunta = texto.trim()
    if (!pregunta || esperando) return
    const historial: TurnoSabio[] = mensajes.flatMap((m) => m.respuesta ? [{ pregunta: m.pregunta, respuesta: m.respuesta.texto }] : [])
    establecerMensajes((anteriores) => [...anteriores, { pregunta }])
    establecerEscrito('')
    establecerEsperando(true)
    const pedido = new AbortController()
    controlador.current = pedido
    const poner = (cambio: Partial<Mensaje>) => establecerMensajes((anteriores) =>
      anteriores.map((m, i) => i === anteriores.length - 1 ? { ...m, ...cambio } : m))
    try {
      const id = await preguntarASabio(pregunta, historial)
      for (let consulta = 1; !pedido.signal.aborted; consulta++) {
        const respuesta = await respuestaDeSabio(id, pedido.signal)
        if (respuesta.estado === 'lista') { poner({ respuesta }); break }
        if (consulta >= CONSULTAS_MAXIMAS) { poner({ error: 'Kusi Sabio no respondió a tiempo. Vuelve a preguntar.' }); break }
        await new Promise((listo) => setTimeout(listo, ESPERA_ENTRE_CONSULTAS_MS))
      }
    } catch (fallo) {
      if (!pedido.signal.aborted) poner({ error: mensajeDocente(fallo, 'No pudimos enviar tu pregunta. Comprueba tu conexión e intenta otra vez.') })
    } finally {
      if (controlador.current === pedido) establecerEsperando(false)
    }
  }

  function enviarFormulario(evento: FormEvent) {
    evento.preventDefault()
    campoPregunta.current?.focus({ preventScroll: true })
    void preguntar(escrito)
  }

  return <>
    <button type="button" ref={botonAbrir} className="sabio-boton" hidden={abierto} aria-expanded={abierto}
      aria-controls={idPanel} onClick={() => establecerAbierto(true)} aria-label="Abrir Kusi Sabio">
      <img className="sabio-logo" src={logo} alt="" />
      <span>Kusi Sabio</span>
    </button>
    {/* El panel sigue montado durante la salida. Inert retira sus controles del teclado y del lector de pantalla. */}
    <aside id={idPanel} className="sabio-panel" data-abierto={abierto} inert={!abierto} aria-labelledby={idTitulo}
      onKeyDown={(evento) => {
        if (evento.key === 'Escape') {
          evento.stopPropagation()
          cerrar()
        }
      }}>
      <header className="sabio-cabecera">
        <img className="sabio-logo" src={logo} alt="" />
        <div>
          <h2 id={idTitulo}>Kusi Sabio</h2>
        </div>
        <button type="button" className="sabio-cerrar" onClick={cerrar} aria-label="Cerrar Kusi Sabio">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
        </button>
      </header>
      <div className="sabio-conversacion" ref={conversacion}>
        {mensajes.length === 0 && <div className="sabio-bienvenida">
          <img className="sabio-logo" src={logo} alt="" />
          <h3>Hola, soy Kusi Sabio</h3>
          <p>¿En qué puedo ayudarte hoy?</p>
          <div className="sabio-sugerencias">
            {SUGERENCIAS.map((sugerencia) => <button type="button" key={sugerencia} disabled={esperando}
              onClick={() => {
                campoPregunta.current?.focus({ preventScroll: true })
                void preguntar(sugerencia)
              }}>
              {sugerencia}
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 18 12-12M7 6h11v11" /></svg>
            </button>)}
          </div>
        </div>}
        <div className="sabio-registro" role="log" aria-label="Conversación con Kusi Sabio" aria-live="polite">
          {mensajes.length > 0 && <LogoSabio value={logo}>
            <ol className="sabio-mensajes" role="list">
              {mensajes.map((mensaje, i) => <MensajeSabio key={i} mensaje={mensaje} />)}
            </ol>
          </LogoSabio>}
        </div>
      </div>
      <form className="sabio-formulario" onSubmit={enviarFormulario}>
        <div className="sabio-compositor">
          <label htmlFor={idPregunta} className="solo-lectores">Tu pregunta</label>
          <div className="sabio-campo">
            {/* La copia oculta da altura al campo al envolver texto. El espacio mide también el último salto de línea. */}
            <span aria-hidden="true">{escrito + ' '}</span>
            <textarea id={idPregunta} ref={campoPregunta} rows={1} maxLength={MAX_PREGUNTA} value={escrito}
              placeholder="Escribe tu pregunta…" onChange={(e) => establecerEscrito(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void preguntar(escrito) } }} />
          </div>
          <button type="submit" className="sabio-enviar" disabled={esperando || !escrito.trim()} aria-label="Enviar pregunta">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5m-6 6 6-6 6 6" /></svg>
          </button>
        </div>
      </form>
    </aside>
  </>
}
