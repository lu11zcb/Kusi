// El buzón de Spring, visto desde el trabajador: pedir el siguiente trabajo y
// entregar su resultado o su fallo (edu-api/README.md, «El buzón del taller»).

export function crearBuzon({ url, clave, pedirHttp = globalThis.fetch }) {
  const raiz = url.replace(/\/+$/, '') + '/interno/taller/trabajos/'

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
      const { estado, datos } = await pedir('siguiente')
      if (estado === 204) return null
      if (estado === 200 && datos?.trabajo?.id) return datos.trabajo
      throw new Error('El buzón respondió ' + estado + ': ' + (datos?.mensaje ?? 'sin mensaje'))
    },
    // { estado, datos }: 200 listo, 422 con motivos para corregir, 409 si ya no está en proceso.
    resultado: (id, cuerpo) => pedir(id + '/resultado', cuerpo),
    fallo: (id, motivo) => pedir(id + '/fallo', { motivo }),
  }
}
