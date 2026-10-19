// Reglas de la compra: la cartera, el vuelto y la lista de Kusi.
// No dibuja nada; la escena le pregunta y después anima lo que pasó.

import { avisar } from './avisos.js'
import { nombreVisible } from './nombres.js'

// Billetes y monedas que se usan para dar el vuelto, del más grande al más chico.
export const DENOMINACIONES = [10, 5, 2, 1]

// Ordena la plata del billete más grande a la moneda más chica.
export function ordenarDinero(valores) {
  return [...valores].sort((a, b) => b - a)
}

export function sumar(valores) {
  return valores.reduce((total, valor) => total + valor, 0)
}

// Arma el vuelto empezando por los billetes y monedas más grandes: 12 → [10, 2].
export function calcularVuelto(monto) {
  const vuelto = []
  let falta = monto
  for (const valor of DENOMINACIONES) {
    while (falta >= valor) {
      vuelto.push(valor)
      falta -= valor
    }
  }
  return vuelto
}

// Estado del niño al empezar: la plata del paquete, nada comprado y 0 choclitos.
export function crearEstado(paquete) {
  return {
    lista: paquete.lista,
    cartera: ordenarDinero(paquete.cartera),
    compras: {}, // clave del producto → unidades compradas
    choclitos: 0,
    listaCompleta: false,
  }
}

// Cuánto lleva de cada cosa de la lista. Si hay varias opciones (fresa o plátano), se suman.
// No pasa de lo que pide la lista: comprar de más no hace que diga 3/2.
export function progresoLista(lista, compras) {
  return lista.map(({ opciones, cantidad }) => {
    const compradas = sumar(opciones.map((clave) => compras[clave] ?? 0))
    return {
      nombre: opciones.map(nombreVisible).join(' o '),
      tiene: Math.min(compradas, cantidad),
      cantidad,
    }
  })
}

// "harina 0/1 · huevo 0/2 · fresa o plátano 0/2"
export function textoCartel(progreso) {
  return progreso.map(({ nombre, tiene, cantidad }) => `${nombre} ${tiene}/${cantidad}`).join(' · ')
}

export function estaEnLista(lista, claveProducto) {
  return lista.some(({ opciones }) => opciones.includes(claveProducto))
}

// El niño paga un producto con los billetes y monedas que marcó (sus posiciones en la cartera).
// Si alcanza, compra 1 unidad y recibe el vuelto justo; si no, no cambia nada.
// Por ahora todos los vendedores dan el vuelto justo ("a_veces_menos" llega otro día).
export function pagar(estado, puesto, producto, posicionesMarcadas) {
  const marcadas = new Set(posicionesMarcadas)
  const pago = ordenarDinero([...marcadas].map((posicion) => estado.cartera[posicion]))
  const totalPagado = sumar(pago)

  if (totalPagado < producto.precio) {
    avisar('pago_insuficiente', {
      puesto: puesto.id,
      producto: producto.recurso,
      precio: producto.precio,
      pago,
      total_pagado: totalPagado,
    })
    return { alcanza: false, pago, totalPagado }
  }

  // El vendedor se queda con lo que pagó y le devuelve el vuelto.
  const vuelto = calcularVuelto(totalPagado - producto.precio)
  const loQueQueda = estado.cartera.filter((_, posicion) => !marcadas.has(posicion))
  estado.cartera = ordenarDinero([...loQueQueda, ...vuelto])
  estado.compras[producto.recurso] = (estado.compras[producto.recurso] ?? 0) + 1

  avisar('compra', {
    puesto: puesto.id,
    vendedor: puesto.vendedor.recurso,
    producto: producto.recurso,
    precio: producto.precio,
    pago,
    vuelto,
    plata: sumar(estado.cartera),
    en_lista: estaEnLista(estado.lista, producto.recurso),
  })

  // La lista se completa una sola vez.
  let listaRecienCompleta = false
  const progreso = progresoLista(estado.lista, estado.compras)
  if (!estado.listaCompleta && progreso.every(({ tiene, cantidad }) => tiene >= cantidad)) {
    estado.listaCompleta = true
    listaRecienCompleta = true
    avisar('lista_completa', { compras: { ...estado.compras }, plata: sumar(estado.cartera) })
  }

  return { alcanza: true, pago, totalPagado, vuelto, listaRecienCompleta }
}
