import { useState } from 'react'
import { filtrarOpciones } from '../servicios/opcionesEducativas'
import type { OpcionLista } from '../servicios/opcionesEducativas'
import { SelectorDesplegable } from './SelectorDesplegable'
import './ListaBuscable.css'

type Propiedades = {
  id: string; etiqueta: string; opciones: OpcionLista[]; valor: string
  alCambiar: (id: string) => void; vacio: string; deshabilitado?: boolean
}

export function ListaBuscable({ id, etiqueta, opciones, valor, alCambiar, vacio, deshabilitado }: Propiedades) {
  const [busqueda, establecerBusqueda] = useState('')
  const filtradas = filtrarOpciones(opciones, busqueda)
  return <div className="campo lista-buscable">
    <label id={id + '-etiqueta'} htmlFor={id}>{etiqueta}</label>
    <input type="search" aria-label={'Buscar ' + etiqueta.toLocaleLowerCase('es')} placeholder="Escribe parte del nombre"
      value={busqueda} onChange={(evento) => { establecerBusqueda(evento.target.value); alCambiar('') }} />
    <SelectorDesplegable id={id} valor={valor} alCambiar={alCambiar} required disabled={deshabilitado || !filtradas.length}
      descritoPor={id + '-ayuda'} opciones={[{ id: '', nombre: 'Selecciona una opción' }, ...filtradas]} />
    <p id={id + '-ayuda'} role="status">{!opciones.length ? vacio : !filtradas.length ? 'No hay coincidencias. Prueba con otro nombre.' : `${filtradas.length} ${filtradas.length === 1 ? 'opción disponible' : 'opciones disponibles'}.`}</p>
  </div>
}
