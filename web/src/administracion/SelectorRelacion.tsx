import type { OpcionLista } from '../servicios/opcionesEducativas'

export function SelectorRelacion({ id, etiqueta, opciones, valor, alCambiar, vacio }: {
  id: string
  etiqueta: string
  opciones: OpcionLista[]
  valor: string
  alCambiar: (id: string) => void
  vacio: string
}) {
  return <div className="campo">
    <label htmlFor={id}>{etiqueta}</label>
    <select id={id} required value={valor} onChange={(evento) => alCambiar(evento.target.value)}>
      <option value="">{opciones.length ? 'Elige de la lista' : vacio}</option>
      {opciones.map((opcion) => <option key={opcion.id} value={opcion.id}>{opcion.nombre}</option>)}
    </select>
  </div>
}
