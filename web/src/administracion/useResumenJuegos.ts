import { useEffect, useState } from 'react'
import { consultarResumenJuegos } from '../servicios/juegosAdministracion'
import type { ResumenJuegosAdministracion } from '../servicios/juegosAdministracion'

export function useResumenJuegos() {
  const [resumen, establecerResumen] = useState<ResumenJuegosAdministracion | null>(null)
  const [error, establecerError] = useState(false)
  const [consulta, establecerConsulta] = useState(0)

  useEffect(() => {
    const controlador = new AbortController()
    consultarResumenJuegos(controlador.signal)
      .then((datos) => { if (!controlador.signal.aborted) establecerResumen(datos) })
      .catch(() => { if (!controlador.signal.aborted) establecerError(true) })
    return () => controlador.abort()
  }, [consulta])

  function reintentar() {
    establecerError(false)
    establecerConsulta((anterior) => anterior + 1)
  }

  return { resumen, error, reintentar }
}
