import { useId } from 'react'
import { Icono } from './Icono'

export type PasoInicial = { texto: string; hecho: boolean; destino: string }

// Esta barra cuenta acciones concretas terminadas, no estima cuánto tardará
// Kusi en preparar contenido. Ambos paneles usan la misma tarjeta y sus datos
// reales; la actividad interna del generador sigue fuera de esta presentación.
export function PrimerosPasos({ pasos, alElegir, descripcion, cargando = false }: { pasos: PasoInicial[]; alElegir: (destino: string) => void; descripcion?: string; cargando?: boolean }) {
  const id = useId()
  const hechos = pasos.filter((paso) => paso.hecho).length
  return <section className="tarjeta primeros-pasos" aria-labelledby={id}>
    <h2 id={id}>Primeros pasos</h2>
    {descripcion && <p className="primeros-pasos-descripcion">{descripcion}</p>}
    {cargando ? <p role="status">Buscando tus avances…</p> : <>
      <div className="barra-progreso" role="progressbar" aria-valuenow={hechos} aria-valuemin={0} aria-valuemax={pasos.length} aria-label="Primeros pasos completados" aria-valuetext={hechos + ' de ' + pasos.length + ' pasos completados'}><span style={{ width: (pasos.length ? hechos / pasos.length * 100 : 0) + '%' }} /></div>
      <p><strong>{hechos} de {pasos.length}</strong> pasos completados</p>
      <ol className="lista-mini">{pasos.map((paso, indice) => <li key={paso.texto} className={paso.hecho ? 'hecho' : undefined}>
        <span className={'puesto ' + (paso.hecho ? 'c-verde' : 'c-dorado')} aria-hidden="true">{paso.hecho ? <Icono nombre="check" /> : indice + 1}</span>
        <span className="texto">{paso.texto}</span>
        {!paso.hecho && <button type="button" className="boton-icono" onClick={() => alElegir(paso.destino)} aria-label={'Ir a ' + paso.texto}><Icono nombre="flecha" /></button>}
      </li>)}</ol>
    </>}
  </section>
}
