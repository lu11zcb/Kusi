import { useEffect, useState } from 'react'
import { AccesoRegistro } from './acceso/AccesoRegistro'
import { PanelAdministracion } from './administracion/PanelAdministracion'
import { ErrorApi, obtenerContextoRegistro } from './servicios/django'
import type { ContextoRegistro } from './servicios/django'
import './App.css'

type Estado =
  | { tipo: 'cargando' }
  | { tipo: 'listo'; contexto: ContextoRegistro }
  | { tipo: 'error'; error: ErrorApi }

export default function App() {
  const [estado, establecerEstado] = useState<Estado>({ tipo: 'cargando' })
  const [intento, establecerIntento] = useState(0)

  useEffect(() => {
    const controlador = new AbortController()
    obtenerContextoRegistro(controlador.signal).then(
      (contexto) => {
        if (!controlador.signal.aborted) establecerEstado({ tipo: 'listo', contexto })
      },
      (error: unknown) => {
        if (!controlador.signal.aborted) {
          establecerEstado({
            tipo: 'error',
            error: error instanceof ErrorApi
              ? error
              : new ErrorApi('No se pudo conectar. Comprueba la conexión e intenta de nuevo.', 0),
          })
        }
      },
    )
    return () => controlador.abort()
  }, [intento])

  function reintentar() {
    establecerEstado({ tipo: 'cargando' })
    establecerIntento((anterior) => anterior + 1)
  }

  if (estado.tipo === 'cargando') {
    return <main className="acceso"><p role="status">Comprobando acceso…</p></main>
  }
  if (estado.tipo === 'error') {
    return <AccesoRegistro error={estado.error} reintentar={reintentar} />
  }
  return <PanelAdministracion usuario={estado.contexto.usuario} />
}
