// El buzón de Spring, visto desde el trabajador: pedir el siguiente trabajo y
// entregar su resultado, devolverlo a la cola o informar su fallo.
import { INTERVALO_SONDEO_MS } from './pausa.js'

export function crearBuzon({ url, clave, pedirHttp = globalThis.fetch, ahora = Date.now }) {
  const raiz = url.replace(/\/+$/, '') + '/interno/taller/trabajos/'
  let espera = null

  async function pedir(ruta, cuerpo) {
    const respuesta = await pedirHttp(raiz + ruta, {
      method: 'POST',
      headers: { 'X-Taller-Clave': clave, 'Content-Type': 'application/json' },
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    })
    const texto = await respuesta.text()
    let datos = null
    try {
      datos = texto ? JSON.parse(texto) : null
    } catch {
      datos = { mensaje: texto }
    }
    return { estado: respuesta.status, datos }
  }

  return {
    // El trabajo pendiente más antiguo, o null si no hay.
    async siguiente() {
      if (espera) {
        if (ahora() < espera.pausa.hasta) return null
        const { pausa, probar, guardar } = espera
        if (pausa.sondear && probar) {
          let limite
          try {
            limite = await probar(ahora())
          } catch {
            limite = { ...pausa, hasta: ahora() + INTERVALO_SONDEO_MS }
          }
          if (limite) {
            espera.pausa = limite
            await guardar(limite)
            return null
          }
        }
        espera = null
      }
      const { estado, datos } = await pedir('siguiente')
      if (estado === 204) return null
      if (estado === 200 && datos?.trabajo?.id) return datos.trabajo
      throw new Error('El buzón respondió ' + estado + ': ' + (datos?.mensaje ?? 'sin mensaje'))
    },
    // Los juegos del taller enviados a una clase, con sus piezas aprobadas (decisión 3).
    async biblioteca() {
      const respuesta = await pedirHttp(raiz + 'biblioteca', { headers: { 'X-Taller-Clave': clave } })
      if (respuesta.status !== 200) throw new Error('El buzón respondió ' + respuesta.status + ' a la biblioteca.')
      const datos = JSON.parse(await respuesta.text())
      return Array.isArray(datos?.juegos) ? datos.juegos : []
    },
    // { estado, datos }: 200 listo, 422 con motivos para corregir, 409 si ya no está en proceso.
    resultado: (id, cuerpo) => pedir(id + '/resultado', cuerpo),
    // La propuesta de un trabajo «proponer»: { propuesta, fuentes, evidencia }. Mismos estados que «resultado».
    propuesta: (id, cuerpo) => pedir(id + '/propuesta', cuerpo),
    // Se suspende la toma de trabajos incluso si Spring está temporalmente desconectado.
    async pausar(trabajo, { pausa, motivo, probar, guardar }) {
      espera = { pausa, probar, guardar }
      return pedir(trabajo.id + '/pausa', {
        motivo, hasta: new Date(pausa.hasta).toISOString(), tomado_en: trabajo.tomado_en,
      })
    },
    // Si el trabajo era una propuesta, Spring usa su respaldo; el trabajador no lo sabe ni lo necesita.
    fallo: (id, motivo) => pedir(id + '/fallo', { motivo }),
  }
}
