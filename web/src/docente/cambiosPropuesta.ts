import { consultarSolicitud, enviarObservaciones, listarVersiones } from '../servicios/propuestas'
import { ErrorApi } from '../servicios/django'

// Una respuesta perdida no autoriza a repetir un cambio. Las observaciones y
// su versión base ya están guardadas en Spring y permiten reconocer el resultado
// antes de enviar otra petición. El borrador permanece en la pantalla al fallar.
export class CambiosPropuesta {
  private incierto: { id: string; version: number; texto: string } | null = null
  private api: { consultar: typeof consultarSolicitud; versiones: typeof listarVersiones; enviar: typeof enviarObservaciones }
  constructor(api = { consultar: consultarSolicitud, versiones: listarVersiones, enviar: enviarObservaciones }) { this.api = api }
  async enviar(id: string, version: number, texto: string) {
    if (this.incierto) {
      const anterior = this.incierto
      const versiones = await this.api.versiones(anterior.id)
      const actual = await this.api.consultar(anterior.id)
      const aplicado = versiones.some((item) => item.version_base === anterior.version && item.observaciones === anterior.texto)
      if (actual.estado === 'generando') throw new ErrorApi('Espera a que termine el cambio que ya enviaste.', 409)
      if (aplicado) {
        this.incierto = null
        if (anterior.id === id && anterior.texto === texto) return actual
        if (anterior.id === id && actual.propuesta?.version) version = actual.propuesta.version
      } else if (anterior.id === id && actual.propuesta?.version !== anterior.version) {
        throw new ErrorApi('La idea cambió. Revísala antes de volver a enviar tus indicaciones.', 409)
      }
    }
    this.incierto = { id, version, texto }
    const resultado = await this.api.enviar(id, version, texto)
    this.incierto = null
    return resultado
  }
}
