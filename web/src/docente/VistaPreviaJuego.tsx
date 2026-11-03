import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { MensajeDocente } from './ElementosDocente'
import { IconoDocente } from './IconoDocente'
import { atenderMensajeJuego, direccionVistaPrevia } from './utilidadesGeneracion'
import { avisoDelIframe, RegistroAvisos } from '../servicios/partidas'
import type { AvisoVistaPrevia } from './utilidadesGeneracion'

export function VistaPreviaJuego({ paquete, alCargar }: { paquete: string; alCargar?: (lista: boolean) => void }) {
  const [registro] = useState(() => new RegistroAvisos())
  const marco = useRef<HTMLIFrameElement>(null)
  const contenedor = useRef<HTMLDivElement>(null)
  const callback = useRef(alCargar)
  useLayoutEffect(() => { callback.current = alCargar })
  const [recarga, establecerRecarga] = useState(0)
  const [direccion] = useState(() => {
    try { return direccionVistaPrevia(import.meta.env?.VITE_URL_JUEGO) }
    catch { return null }
  })
  const [aviso, establecerAviso] = useState<AvisoVistaPrevia | null>(null)
  const [demora, establecerDemora] = useState(false)
  const [ampliado, establecerAmpliado] = useState(false)
  useEffect(() => {
    const cambiar = () => establecerAmpliado(document.fullscreenElement === contenedor.current)
    document.addEventListener('fullscreenchange', cambiar)
    return () => document.removeEventListener('fullscreenchange', cambiar)
  }, [])
  useEffect(() => {
    if (aviso?.estado === 'lista' || aviso?.estado === 'error') return
    const espera = window.setTimeout(() => establecerDemora(true), 30000)
    return () => window.clearTimeout(espera)
  }, [aviso?.estado, recarga])
  useLayoutEffect(() => {
    if (!direccion) return
    callback.current?.(false)
    const recibir = (evento: MessageEvent) => {
      const partida = avisoDelIframe(evento, marco.current?.contentWindow ?? null, direccion.origen)
      if (partida) {
        // El registro sigue funcionando aunque ya no se muestre en la prueba.
        // La cola conserva los avisos originales y Spring evita los duplicados.
        void registro.registrar(partida).catch(() => undefined)
        return
      }
      const resultado = atenderMensajeJuego(evento, marco.current?.contentWindow ?? null, direccion.origen, paquete)
      if (resultado) { establecerAviso(resultado); establecerDemora(false); callback.current?.(resultado.estado === 'lista') }
    }
    window.addEventListener('message', recibir)
    const reintento = window.setInterval(() => {
      for (const pendiente of registro.pendientes.values()) void registro.registrar(pendiente).catch(() => undefined)
    }, 8000)
    return () => { window.removeEventListener('message', recibir); window.clearInterval(reintento) }
  }, [direccion, paquete, registro, recarga])
  if (!direccion) return <MensajeDocente titulo="No pudimos abrir el juego"><p>Pide ayuda para volver a abrirlo. Tu idea sigue guardada.</p></MensajeDocente>
  function reiniciar() {
    if (aviso?.estado !== 'lista' || !direccion) return
    marco.current?.contentWindow?.postMessage({ tipo: 'reiniciar' }, direccion.origen)
    establecerAviso({ estado: 'cargando' }); establecerDemora(false); callback.current?.(false)
  }
  function abrirOtraVez() { establecerAviso(null); establecerDemora(false); establecerRecarga((valor) => valor + 1) }
  return <div className="doc-vista-previa" ref={contenedor}>
    <div className="doc-prueba-controles"><p role="status">{aviso?.estado === 'lista' ? 'Mueve a Kusi con el joystick o con las flechas.' : aviso?.estado === 'error' ? 'Vamos a abrir el juego otra vez.' : 'Abriendo tu juego…'}</p><div className="acciones">
      <button type="button" className="secundario" disabled={aviso?.estado !== 'lista'} onClick={reiniciar}><IconoDocente nombre="atras" />Volver a empezar</button>
      <button type="button" className="secundario" onClick={() => { if (ampliado) void document.exitFullscreen().catch(() => undefined); else void contenedor.current?.requestFullscreen?.().catch(() => undefined) }}>{ampliado ? 'Volver al panel' : 'Ampliar juego'}</button>
    </div></div>
    {(aviso?.estado === 'error' || (demora && aviso?.estado !== 'lista')) && <MensajeDocente titulo="El juego está tardando en abrir"><p>Comprueba tu conexión y vuelve a intentarlo.</p><button className="secundario" type="button" onClick={abrirOtraVez}>Volver a abrir</button></MensajeDocente>}
    <iframe key={recarga} ref={marco} src={direccion.url} title="Tu juego para probar" allow="autoplay; fullscreen" allowFullScreen />
  </div>
}
