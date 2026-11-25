import { SelectorDesplegable } from '../componentes/SelectorDesplegable'
import type { OpcionLista } from '../servicios/opcionesEducativas'

type Propiedades = {
  id: string
  etiqueta: string
  opciones: OpcionLista[]
  valor: string
  alCambiar: (id: string) => void
  vacio: string
  deshabilitado?: boolean
}

export function SelectorRelacion({ id, etiqueta, opciones, valor, alCambiar, vacio, deshabilitado }: Propiedades) {
  const textoInicial = 'Elige de la lista'
  return <div className="campo">
    <label id={id + '-etiqueta'} htmlFor={id}>{etiqueta}</label>
    <SelectorDesplegable id={id} valor={valor} alCambiar={alCambiar} required disabled={deshabilitado || !opciones.length}
      textoVacio={vacio} opciones={opciones.length ? [{ id: '', nombre: textoInicial }, ...opciones] : []} />
  </div>
}
