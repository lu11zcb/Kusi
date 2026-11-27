// El buzón de Spring, visto desde el trabajador: pedir el siguiente trabajo y
// entregar su resultado, devolverlo a la cola o informar su fallo.
import { INTERVALO_SONDEO_MS } from './pausa.js'

export function crearBuzon({ url, clave, pedirHttp = globalThis.fetch, ahora = Date.now }) {
  const raiz = url.replace(/\/+$/, '') + '/interno/taller/trabajos/'
  // Las preguntas a Kusi Sabio tienen su propia cola: no esperan detrás de un juego.
  const raizConsultas = url.replace(/\/+$/, '') + '/interno/taller/consultas/'
  let espera = null

  async function pedir(ruta, cuerpo, base = raiz) {
    const respuesta = await pedirHttp(base + ruta, {
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
    // Reabre un juego fallido que el equipo corrigió a mano (taller/reentregar.mjs): 200 en proceso,
    // 404 si no existe, 409 si no está fallido o si el docente ya pidió otro juego de esa solicitud.
    reabrir: (id) => pedir(id + '/reabrir'),
    // La pregunta a Kusi Sabio más antigua ({ id, con_actividad, contexto }), o null si no hay.
    async siguienteConsulta() {
      const { estado, datos } = await pedir('siguiente', undefined, raizConsultas)
      if (estado === 204) return null
      if (estado === 200 && datos?.consulta?.id) return datos.consulta
      throw new Error('Las consultas respondieron ' + estado + ': ' + (datos?.mensaje ?? 'sin mensaje'))
    },
    // { texto, graficos, mostrar_quienes_necesitan_ayuda }: 200 lista, 422 con motivos, 409 si ya respondió la reserva.
    respuestaConsulta: (id, cuerpo) => pedir(id + '/respuesta', cuerpo, raizConsultas),
    // Spring responde con la reserva.
    falloConsulta: (id, motivo) => pedir(id + '/fallo', { motivo }, raizConsultas),
  }
}
