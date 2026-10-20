// Valida la estructura básica del paquete que utilizará el juego.

export function validarPaquete(paquete) {
  const errores = []

  if (!paquete || typeof paquete !== 'object' || Array.isArray(paquete)) {
    return { valido: false, errores: ['El paquete debe ser un objeto JSON'] }
  }

  if (paquete.formato !== 'kusi-paquete/0') {
    errores.push('El formato del paquete no es compatible')
  }

  if (typeof paquete.titulo !== 'string' || !paquete.titulo.trim()) {
    errores.push('Falta el título del juego')
  }

  if (typeof paquete.historia !== 'string' || !paquete.historia.trim()) {
    errores.push('Falta la historia del juego')
  }

  if (!Array.isArray(paquete.cartera) || paquete.cartera.some(
    (valor) => !Number.isFinite(valor) || valor <= 0
  )) {
    errores.push('La cartera debe contener cantidades positivas')
  }

  if (!Array.isArray(paquete.lista) || paquete.lista.length === 0) {
    errores.push('La lista de compras debe contener al menos un elemento')
  } else {
    paquete.lista.forEach((item, indice) => {
      if (
        !item ||
        !Array.isArray(item.opciones) ||
        item.opciones.length === 0 ||
        !Number.isInteger(item.cantidad) ||
        item.cantidad <= 0
      ) {
        errores.push(`El elemento ${indice + 1} de la lista no es válido`)
      }
    })
  }

  if (!Array.isArray(paquete.puestos) || paquete.puestos.length === 0) {
    errores.push('El paquete debe tener al menos un puesto')
  } else {
    paquete.puestos.forEach((puesto, indice) => {
      if (!puesto || typeof puesto.id !== 'string' ||
          typeof puesto.recurso !== 'string') {
        errores.push(`El puesto ${indice + 1} no tiene identificador o recurso`)
      }

      if (!puesto?.vendedor || typeof puesto.vendedor.recurso !== 'string') {
        errores.push(`Falta el vendedor del puesto ${indice + 1}`)
      }

      if (!Array.isArray(puesto?.productos) || puesto.productos.length === 0) {
        errores.push(`El puesto ${indice + 1} no tiene productos`)
      } else {
        puesto.productos.forEach((producto, indiceProducto) => {
          if (
            typeof producto?.recurso !== 'string' ||
            !Number.isFinite(producto.precio) ||
            producto.precio < 0
          ) {
            errores.push(
              `El producto ${indiceProducto + 1} del puesto ${indice + 1} no es válido`
            )
          }
        })
      }
    })
  }

  return {
    valido: errores.length === 0,
    errores,
  }
}