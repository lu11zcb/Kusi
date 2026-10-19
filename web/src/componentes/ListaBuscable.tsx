import { useState } from 'react'
import { filtrarOpciones } from '../servicios/opcionesEducativas'
import type { OpcionLista } from '../servicios/opcionesEducativas'
import './ListaBuscable.css'

type Propiedades = {
  id: string; etiqueta: string; opciones: OpcionLista[]; valor: string
  alCambiar: (id: string) => void; vacio: string
}

export function ListaBuscable({ id, etiqueta, opciones, valor, alCambiar, vacio }: Propiedades) {
  const [busqueda, establecerBusqueda] = useState('')
  const filtradas = filtrarOpciones(opciones, busqueda)
  return <div className="campo lista-buscable">
    <label htmlFor={id}>{etiqueta}</label>
    <input type="search" aria-label={'Buscar ' + etiqueta.toLocaleLowerCase('es')} placeholder="Escribe parte del nombre"
      value={busqueda} onChange={(evento) => { establecerBusqueda(evento.target.value); alCambiar('') }} />
    <select id={id} value={valor} onChange={(evento) => alCambiar(evento.target.value)} required disabled={!filtradas.length} aria-describedby={id + '-ayuda'}>
      <option value="">Selecciona una opción</option>
      {filtradas.map((opcion) => <option key={opcion.id} value={opcion.id}>{opcion.nombre}</option>)}
    </select>
    <p id={id + '-ayuda'} role="status">{!opciones.length ? vacio : !filtradas.length ? 'No hay coincidencias. Prueba con otro nombre.' : `${filtradas.length} ${filtradas.length === 1 ? 'opción disponible' : 'opciones disponibles'}.`}</p>
  </div>
}
