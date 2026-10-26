import { useEffect, useState } from 'react'
import { etiquetasEstados, etiquetasEtapas, generacionTerminada } from '../servicios/generaciones'
import type { Generacion } from '../servicios/generaciones'
import { IconoDocente } from './IconoDocente'
import { MensajeDocente } from './ElementosDocente'
import { pasosDeGeneracion, problemasDeComprobacion, segundosTranscurridos } from './utilidadesGeneracion'
import { VistaPreviaJuego } from './VistaPreviaJuego'

function RelojGeneracion({ inicio, fin }: { inicio: string; fin: string | null }) {
  const [ahora, establecerAhora] = useState(() => Date.now())
  useEffect(() => {
    if (fin) return
    const temporizador = window.setInterval(() => establecerAhora(Date.now()), 1000)
    return () => window.clearInterval(temporizador)
  }, [fin])
  // Los segundos cambian visualmente sin interrumpir cada segundo la lectura
  // de las etapas que sí anuncia la región aria-live del recorrido.
  return <span className="doc-generacion-reloj" aria-live="off"><IconoDocente nombre="reloj" />{segundosTranscurridos(inicio, fin, ahora) + ' s'}</span>
}
export function DetalleGeneracion({ generacion }: { generacion: Generacion }) {
  const terminada = generacionTerminada(generacion.estado)
  const problemas = generacion.etapas.filter((etapa) => problemasDeComprobacion(etapa).length)
  return <>
    <section className="doc-generacion-avance" aria-label="Etapas de generación" aria-live="polite" aria-relevant="additions text">
      <div className="doc-generacion-cabecera"><h3>{etiquetasEstados[generacion.estado]}</h3><RelojGeneracion key={generacion.id} inicio={generacion.creado_en} fin={terminada ? generacion.actualizado_en : null} /></div>
      {!terminada && <p>Puede tardar más de dos minutos. Puedes seguir revisando la propuesta o salir y volver a consultar el avance.</p>}
      <ol className="doc-generacion-pasos">{pasosDeGeneracion(generacion.etapas).map((paso) => <li key={paso.id} className={'doc-generacion-paso doc-generacion-' + paso.estado} aria-current={paso.estado === 'en_progreso' && !terminada ? 'step' : undefined}>
        <span className="doc-generacion-marca"><IconoDocente nombre={paso.estado === 'completada' ? 'check' : paso.estado === 'fallida' ? 'cerrar' : 'reloj'} /></span>
        <div><strong>{etiquetasEtapas[paso.etapa]}</strong><small>{paso.estado === 'completada' ? 'Completada' : paso.estado === 'fallida' ? 'Con problemas' : terminada ? 'Interrumpida' : 'En progreso'}</small>{paso.mensaje && <p className="texto-conservado">{paso.mensaje}</p>}</div>
        <RelojGeneracion inicio={paso.inicio} fin={paso.fin ?? (terminada ? generacion.actualizado_en : null)} />
      </li>)}</ol>
    </section>
    {!!problemas.length && <MensajeDocente titulo="Lo que Kusi encontró y se corrigió">
      <p>{generacion.estado === 'lista' ? 'Estos problemas quedaron registrados antes de que el juego pasara la revisión final.' : 'Estos son los problemas detectados. La corrección solo se confirma cuando el juego queda listo.'}</p>
      {problemas.map((etapa, indice) => <div key={etapa.id}><h4>{'Comprobación con problemas ' + (indice + 1)}</h4><ul>{problemasDeComprobacion(etapa).map((problema, posicion) => <li key={posicion}>{problema}</li>)}</ul></div>)}
    </MensajeDocente>}
    {generacion.estado === 'fallida' && <MensajeDocente titulo="No se pudo terminar este juego" error><p className="texto-conservado">{generacion.ultimo_error || 'No se recibió un motivo del servicio. Puedes intentar una generación nueva.'}</p></MensajeDocente>}
    {generacion.estado === 'lista' && <>
      <MensajeDocente titulo="Cómo se hizo este juego">{generacion.procedencia ? <dl className="doc-generacion-procedencia">
        <div><dt>Proveedor</dt><dd>{generacion.procedencia.proveedor}</dd></div>
        <div><dt>Modelo</dt><dd>{generacion.procedencia.modelo}</dd></div>
        <div><dt>Intentos</dt><dd>{generacion.procedencia.intentos}</dd></div>
        <div><dt>Mapas de respaldo</dt><dd>{generacion.procedencia.mapa_base ? 'Sí, se usaron los caminos de respaldo' : 'No, se usaron los caminos de la IA'}</dd></div>
      </dl> : <p>El servicio no registró la procedencia de este juego.</p>}</MensajeDocente>
      {generacion.paquete && <VistaPreviaJuego key={generacion.id} paquete={generacion.paquete} />}
    </>}
  </>
}
