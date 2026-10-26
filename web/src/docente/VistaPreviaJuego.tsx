import { useLayoutEffect, useRef, useState } from 'react'
import { MensajeDocente } from './ElementosDocente'
import { IconoDocente } from './IconoDocente'
import { atenderMensajeJuego, direccionVistaPrevia } from './utilidadesGeneracion'
import type { AvisoVistaPrevia } from './utilidadesGeneracion'

export function VistaPreviaJuego({ paquete }: { paquete: string }) {
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
    const recibir = (evento: MessageEvent) => {
      const resultado = atenderMensajeJuego(evento, marco.current?.contentWindow ?? null, direccion.origen, paquete)
      if (resultado) establecerAviso(resultado)
    }
    window.addEventListener('message', recibir)
    return () => window.removeEventListener('message', recibir)
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
    <p className="doc-ayuda">Toca las frutas o usa las flechas dentro del juego. Esta vista previa no asigna el juego a tus estudiantes.</p>
  </section>
}
