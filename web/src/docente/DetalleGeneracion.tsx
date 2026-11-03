import { useRef, useState } from 'react'
import { publicarGeneracion } from '../servicios/generaciones'
import type { Generacion } from '../servicios/generaciones'
import { IconoDocente } from './IconoDocente'
import { MensajeDocente } from './ElementosDocente'
import { VistaPreviaJuego } from './VistaPreviaJuego'
import { mensajeDocente } from './trabajosDocente'

export function DetalleGeneracion({ generacion, seccion, alEnviar }: { generacion: Generacion; seccion?: string; alEnviar?: (juego: Generacion) => void }) {
  const [enviada, establecerEnviada] = useState(generacion.publicada === true)
  const [enviando, establecerEnviando] = useState(false)
  const [lista, establecerLista] = useState(false)
  const [error, establecerError] = useState('')
  const bloqueo = useRef(false)
  async function enviar() {
    if (bloqueo.current || !lista) return
    bloqueo.current = true; establecerEnviando(true); establecerError('')
    try {
      const juego = await publicarGeneracion(generacion.id)
      establecerEnviada(true); alEnviar?.(juego)
    } catch (fallo) { establecerError(mensajeDocente(fallo, 'No pudimos confirmar el envío. Puedes intentarlo otra vez.')) }
    finally { bloqueo.current = false; establecerEnviando(false) }
  }
  if (generacion.estado === 'fallida') return <MensajeDocente titulo="Tu juego quedó por terminar"><p>Tu idea está guardada. Puedes intentarlo otra vez.</p></MensajeDocente>
  if (generacion.estado !== 'lista') return <div className="doc-espera" role="status"><span className="doc-espera-puntos" aria-hidden="true"><i /><i /><i /></span><h2>Estamos preparando tu juego</h2><p>Puedes visitar otras secciones. Tu juego estará aquí cuando vuelvas.</p></div>
  return <section className="doc-juego-listo" aria-label="Tu juego">
    <div className="doc-juego-titulo"><div><span className="doc-sobre-titulo">{enviada ? 'En tu clase' : 'Tu juego está listo'}</span><h2>{enviada ? 'Así juegan tus estudiantes' : 'Pruébalo antes de enviarlo'}</h2></div><span className="doc-estado doc-estado-aprobada"><IconoDocente nombre="check" />{enviada ? 'Enviado' : 'Para probar'}</span></div>
    {generacion.paquete && <VistaPreviaJuego paquete={generacion.paquete} alCargar={establecerLista} />}
    <div className="doc-envio">
      <div><strong>{enviada ? 'Tu juego ya está en la app' : '¿Listo para tu clase?'}</strong><p>{enviada ? 'Tus estudiantes' + (seccion ? ' de ' + seccion : '') + ' ya pueden abrirlo.' : 'Al enviarlo, aparecerá en la app de tus estudiantes' + (seccion ? ' de ' + seccion : '') + '.'}</p></div>
      {!enviada && <button type="button" disabled={enviando || !lista} onClick={() => void enviar()}><IconoDocente nombre="check" />{enviando ? 'Enviando…' : 'Enviar a mi clase'}</button>}
    </div>
    {error && <MensajeDocente titulo="El envío necesita otro intento" error><p>{error}</p><button type="button" className="secundario" disabled={enviando || !lista} onClick={() => void enviar()}>Volver a intentar</button></MensajeDocente>}
  </section>
}
