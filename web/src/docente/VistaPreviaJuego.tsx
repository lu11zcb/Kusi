import { useLayoutEffect, useRef, useState } from 'react'
import { MensajeDocente } from './ElementosDocente'
import { IconoDocente } from './IconoDocente'
import { atenderMensajeJuego, direccionVistaPrevia } from './utilidadesGeneracion'
import { avisoDelIframe, RegistroAvisos } from '../servicios/partidas'
import type { AvisoPartida, ResumenPartida } from '../servicios/partidas'
import type { AvisoVistaPrevia } from './utilidadesGeneracion'

export function VistaPreviaJuego({ paquete }: { paquete: string }) {
  const [registro] = useState(() => new RegistroAvisos())
  const [resumen, establecerResumen] = useState<ResumenPartida | null>(null)
  const [errorRegistro, establecerErrorRegistro] = useState('')
  const vigente = useRef(false)
  const partidaActual = useRef<string | null>(null)
  function registrar(aviso: AvisoPartida) {
    void registro.registrar(aviso).then((datos) => {
      if (vigente.current) {
        if (partidaActual.current === datos.partida) establecerResumen((anterior) => anterior?.partida === datos.partida
          ? { ...datos, ayudas_usadas: Math.max(anterior.ayudas_usadas, datos.ayudas_usadas), niveles_completados: Math.max(anterior.niveles_completados, datos.niveles_completados), termino: anterior.termino || datos.termino }
          : datos)
        if (registro.pendientes.size === 0) establecerErrorRegistro('')
      }
    }).catch((error: unknown) => {
      if (vigente.current) establecerErrorRegistro(error instanceof Error ? error.message : 'No se pudo guardar el avance de esta prueba.')
    })
  }
  const registrarActual = useRef(registrar)
  useLayoutEffect(() => { registrarActual.current = registrar })
  const marco = useRef<HTMLIFrameElement>(null)
  const [direccion] = useState(() => {
    try { return direccionVistaPrevia(import.meta.env?.VITE_URL_JUEGO) }
    catch { return null }
  })
  const [aviso, establecerAviso] = useState<AvisoVistaPrevia | null>(null)
  // Se escucha en el commit del iframe, antes de que pueda terminar de cargar.
  // El juego anuncia «listo» una sola vez; esperar a otro evento perdería el guion.
  useLayoutEffect(() => {
    if (!direccion) return
    vigente.current = true
    const recibir = (evento: MessageEvent) => {
      const avisoPartida = avisoDelIframe(evento, marco.current?.contentWindow ?? null, direccion.origen)
      if (avisoPartida) {
        if (partidaActual.current !== avisoPartida.partida) { partidaActual.current = avisoPartida.partida; establecerResumen(null) }
        registrarActual.current(avisoPartida)
        return
      }
      const resultado = atenderMensajeJuego(evento, marco.current?.contentWindow ?? null, direccion.origen, paquete)
      if (resultado) establecerAviso(resultado)
    }
    window.addEventListener('message', recibir)
    return () => { vigente.current = false; window.removeEventListener('message', recibir) }
  }, [direccion, paquete])

  if (!direccion) return <MensajeDocente titulo="No se pudo abrir la vista previa" error><p>La dirección configurada para el juego debe ser una dirección HTTP o HTTPS válida.</p></MensajeDocente>
  function reiniciar() {
    if (!direccion || aviso?.estado !== 'lista') return
    marco.current?.contentWindow?.postMessage({ tipo: 'reiniciar' }, direccion.origen)
    establecerAviso({ estado: 'cargando' })
  }
  return <section className="doc-vista-previa" aria-label="Vista previa del juego">
    <div className="doc-generacion-cabecera"><h3>Prueba el laberinto</h3><button type="button" className="secundario" disabled={aviso?.estado !== 'lista'} onClick={reiniciar}><IconoDocente nombre="atras" />Volver a empezar</button></div>
    <p role="status">{!aviso ? 'Abriendo el juego…' : aviso.estado === 'cargando' ? 'Cargando el juego generado…' : aviso.estado === 'lista' ? 'Listo para jugar: ' + aviso.niveles + ' niveles' : 'El juego necesita atención.'}</p>
    {aviso?.estado === 'error' && <MensajeDocente titulo="El juego no pudo cargar el guion" error><p className="texto-conservado">{aviso.motivo}</p></MensajeDocente>}
    <iframe ref={marco} src={direccion.url} title="Vista previa del laberinto generado" allow="autoplay" />
    <section aria-label="Lo que Kusi registró en esta prueba" aria-live="polite">
      <h4>Lo que Kusi registró en esta prueba</h4>
      {resumen ? <p>{'Ayudas usadas: ' + resumen.ayudas_usadas + ' · Niveles completados: ' + resumen.niveles_completados + (resumen.termino ? ' · Prueba terminada' : '')}</p>
        : <p>El registro aparecerá cuando empieces a jugar.</p>}
      {errorRegistro && <MensajeDocente titulo="Quedan avisos por guardar" error><p>{errorRegistro}</p><button type="button" className="secundario" onClick={() => { for (const aviso of registro.pendientes.values()) registrar(aviso) }}>Volver a enviar avisos</button></MensajeDocente>}
    </section>
    <p className="doc-ayuda">Toca las frutas o usa las flechas dentro del juego. Esta vista previa no asigna el juego a tus estudiantes.</p>
  </section>
}
