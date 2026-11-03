import { useEffect, useRef, useState } from 'react'
import { aprobarVersion, consultarSolicitud } from '../servicios/propuestas'
import type { SolicitudPropuesta } from '../servicios/propuestas'
import { generarJuego, generacionTerminada, listarGeneraciones, observarGeneracion, procesarGeneracion } from '../servicios/generaciones'
import type { Generacion } from '../servicios/generaciones'
import { mensajeDocente } from './trabajosDocente'

// Solo se presenta el juego de la idea vigente. Consultar antes de escribir
// recupera respuestas perdidas sin preparar otro juego ni repetir la llamada IA.
export function useJuegoDocente(solicitud: SolicitudPropuesta, activo: boolean, alCambiar: (solicitud: SolicitudPropuesta) => void, alOcupar?: (valor: boolean) => void) {
  const [juego, establecerJuego] = useState<Generacion | null>(null)
  const [cargadoPara, establecerCargadoPara] = useState('')
  const [errorConsulta, establecerErrorConsulta] = useState('')
  const [errorOperacion, establecerErrorOperacion] = useState('')
  const [ocupado, establecerOcupado] = useState(false)
  const [recarga, establecerRecarga] = useState(0)
  const bloqueo = useRef(false)
  const montada = useRef(false)
  const version = solicitud.propuesta?.version ?? 0
  const clave = solicitud.id_solicitud + '/' + version
  const vigente = juego?.version_propuesta === version ? juego : null
  useEffect(() => { montada.current = true; return () => { montada.current = false } }, [])
  useEffect(() => {
    if (!activo || !version) return
    const controlador = new AbortController()
    listarGeneraciones(solicitud.id_solicitud, controlador.signal).then((lista) => {
      if (controlador.signal.aborted) return
      const ultima = lista.find((item) => item.version_propuesta === version)
      establecerJuego(ultima ? { ...ultima, etapas: [] } : null)
      establecerCargadoPara(clave); establecerErrorConsulta('')
    }).catch(() => {
      if (!controlador.signal.aborted) establecerErrorConsulta('No pudimos abrir tu juego. Intenta otra vez.')
    })
    return () => controlador.abort()
  }, [solicitud.id_solicitud, version, clave, activo, recarga])
  const idEnCurso = vigente && !generacionTerminada(vigente.estado) ? vigente.id : null
  useEffect(() => {
    if (!activo || !idEnCurso) return
    const controlador = new AbortController()
    observarGeneracion(idEnCurso, controlador.signal, (datos) => {
      establecerJuego((anterior) => anterior?.id === datos.id && generacionTerminada(anterior.estado) ? anterior : datos)
      establecerErrorConsulta('')
    }, () => establecerErrorConsulta('Seguimos buscando tu juego. Si no aparece, comprueba tu conexión.'))
    return () => controlador.abort()
  }, [idEnCurso, activo])

  async function preparar() {
    if (bloqueo.current || !version || solicitud.propuesta?.se_puede_generar === false) return
    bloqueo.current = true; establecerOcupado(true); alOcupar?.(true); establecerErrorOperacion('')
    let navegacionLiberada = false
    try {
      if (solicitud.propuesta?.estado_revision !== 'aprobada') alCambiar(await aprobarVersion(solicitud.id_solicitud, version))
      const lista = await listarGeneraciones(solicitud.id_solicitud)
      const existente = lista.find((item) => item.version_propuesta === version)
      let actual: Generacion = existente && existente.estado !== 'fallida'
        ? { ...existente, etapas: [] } : await generarJuego(solicitud.id_solicitud, version)
      if (montada.current) { establecerJuego(actual); establecerCargadoPara(clave) }
      // La aprobación y la creación ya se confirmaron. Esperar el juego no
      // bloquea la navegación: al volver se recupera el resultado guardado.
      alOcupar?.(false); navegacionLiberada = true
      if (actual.estado === 'pendiente') actual = await procesarGeneracion(actual.id)
      if (montada.current) establecerJuego(actual)
    } catch (fallo) {
      if (montada.current) {
        establecerErrorOperacion(mensajeDocente(fallo, 'No pudimos terminar tu juego. Tu idea está guardada. Intenta otra vez.'))
        await consultarSolicitud(solicitud.id_solicitud).then((datos) => { if (montada.current) alCambiar(datos) }).catch(() => undefined)
        establecerRecarga((valor) => valor + 1)
      }
    } finally {
      if (!navegacionLiberada) alOcupar?.(false)
      bloqueo.current = false
      if (montada.current) establecerOcupado(false)
    }
  }
  return { juego: vigente, cargando: !!version && cargadoPara !== clave, error: errorConsulta || (vigente?.estado === 'lista' ? '' : errorOperacion), ocupado, preparando: !!idEnCurso,
    preparar, recargar: () => { establecerErrorOperacion(''); establecerRecarga((valor) => valor + 1) }, actualizar: establecerJuego }
}
