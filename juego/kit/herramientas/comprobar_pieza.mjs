// El primer filtro de una pieza nueva: el del código (kit/estilo/comprobacion.md).
// No opina, solo mide: medidas, transparencia, márgenes, tamaño de la silueta, que sea
// una sola figura, el contorno, los blancos de adentro, el peso y el nombre.
//
//   node kit/herramientas/comprobar_pieza.mjs <pieza.png> [--fondo | --figura | --criatura]
//
// Responde un JSON { pasa, respuestas: [{ pregunta, si, motivo }] } y termina con 0 si
// pasa o 1 si no. Lee el PNG con zlib, sin instalar nada.

import { readFileSync, statSync } from 'node:fs'
import { inflateSync } from 'node:zlib'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const LADO_OBJETO = 256
// Una figura entera (un muñeco, una casa, un animal quieto…) se dibuja grande y completa, y el
// juego la corta en partes: por eso mide 768 × 768 en vez de 256 × 256.
export const LADO_FIGURA = 768
export const SILUETA_FIGURA = { minimo: 600, maximo: 720 }
export const MARGEN_FIGURA = 24
export const DESVIO_FIGURA = 48
export const PESO_FIGURA = 600 * 1024
// Una criatura animada (un personaje o enemigo que se mueve) es una tira de 3 cuadros de 256 × 256, lado a lado: 768 × 256.
export const CRIATURA = { ancho: 768, alto: 256, cuadros: 3, pies: 244, margenPies: 6, ladoMayor: { minimo: 150, maximo: 215 }, variacionMaxima: 1.3, peso: 300 * 1024 }
export const FONDO = { ancho: 1672, alto: 941 }
export const MARGEN = 8
export const SILUETA = { minimo: 180, maximo: 215 }
export const DESVIO_CENTRO = 16
export const PESO_OBJETO = 100 * 1024
export const PESO_FONDO = 2.5 * 1024 * 1024
const PATRON_NOMBRE = /^[a-z0-9]+(-[a-z0-9]+)*$/
// Un píxel cuenta como de la pieza con alfa de 128 o más.
const OPACO = 128

// Lee un PNG de 8 bits por canal, RGB o RGBA, sin entrelazar. Devuelve
// { ancho, alto, canales, tipo, pixeles } con los píxeles en RGBA.
export function leerPng(datos) {
  const firma = [137, 80, 78, 71, 13, 10, 26, 10]
  if (!firma.every((byte, i) => datos[i] === byte)) throw new Error('No es un PNG.')
  let posicion = 8
  let cabecera = null
  const partes = []
  while (posicion < datos.length) {
    const largo = datos.readUInt32BE(posicion)
    const tipo = datos.toString('latin1', posicion + 4, posicion + 8)
    const cuerpo = datos.subarray(posicion + 8, posicion + 8 + largo)
    if (tipo === 'IHDR') {
      cabecera = { ancho: cuerpo.readUInt32BE(0), alto: cuerpo.readUInt32BE(4), bits: cuerpo[8], tipo: cuerpo[9], entrelazado: cuerpo[12] }
    } else if (tipo === 'IDAT') partes.push(cuerpo)
    else if (tipo === 'IEND') break
    posicion += 12 + largo
  }
  if (!cabecera) throw new Error('El PNG no tiene cabecera.')
  const canales = { 2: 3, 6: 4 }[cabecera.tipo]
  if (cabecera.bits !== 8 || !canales || cabecera.entrelazado !== 0) {
    return { ...cabecera, canales: null, pixeles: null }
  }
  const crudo = inflateSync(Buffer.concat(partes))
  const fila = cabecera.ancho * canales
  const pixeles = new Uint8Array(cabecera.ancho * cabecera.alto * 4)
  let anterior = new Uint8Array(fila)
  for (let y = 0; y < cabecera.alto; y++) {
    const filtro = crudo[y * (fila + 1)]
    const actual = Uint8Array.from(crudo.subarray(y * (fila + 1) + 1, (y + 1) * (fila + 1)))
    for (let x = 0; x < fila; x++) {
      const izquierda = x >= canales ? actual[x - canales] : 0
      const arriba = anterior[x]
      const diagonal = x >= canales ? anterior[x - canales] : 0
      if (filtro === 1) actual[x] = (actual[x] + izquierda) & 255
      else if (filtro === 2) actual[x] = (actual[x] + arriba) & 255
      else if (filtro === 3) actual[x] = (actual[x] + ((izquierda + arriba) >> 1)) & 255
      else if (filtro === 4) {
        const p = izquierda + arriba - diagonal
        const pa = Math.abs(p - izquierda); const pb = Math.abs(p - arriba); const pc = Math.abs(p - diagonal)
        actual[x] = (actual[x] + (pa <= pb && pa <= pc ? izquierda : pb <= pc ? arriba : diagonal)) & 255
      }
    }
    for (let x = 0; x < cabecera.ancho; x++) {
      const destino = (y * cabecera.ancho + x) * 4
      pixeles[destino] = actual[x * canales]
      pixeles[destino + 1] = actual[x * canales + 1]
      pixeles[destino + 2] = actual[x * canales + 2]
      pixeles[destino + 3] = canales === 4 ? actual[x * canales + 3] : 255
    }
    anterior = actual
  }
  return { ...cabecera, canales, pixeles }
}

const luminancia = (p, i) => 0.2126 * p[i] + 0.7152 * p[i + 1] + 0.0722 * p[i + 2]

// Las manchas de píxeles opacos (vecinos en 8 direcciones), de la más grande a la más chica.
function manchas(imagen) {
  const { ancho, alto, pixeles } = imagen
  const marca = new Int32Array(ancho * alto).fill(-1)
  const areas = []
  for (let inicio = 0; inicio < ancho * alto; inicio++) {
    if (marca[inicio] !== -1 || pixeles[inicio * 4 + 3] < OPACO) continue
    const pila = [inicio]
    marca[inicio] = areas.length
    let area = 0
    while (pila.length) {
      const punto = pila.pop()
      area += 1
      const px = punto % ancho; const py = (punto - px) / ancho
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = px + dx; const ny = py + dy
          if (nx < 0 || ny < 0 || nx >= ancho || ny >= alto) continue
          const vecino = ny * ancho + nx
          if (marca[vecino] === -1 && pixeles[vecino * 4 + 3] >= OPACO) { marca[vecino] = areas.length; pila.push(vecino) }
        }
      }
    }
    areas.push(area)
  }
  return { marca, areas }
}

// Los huecos: píxeles transparentes que no se tocan con el borde del lienzo. Un blanco de
// adentro que la herramienta borró aparece como un hueco grande.
function areaDeHuecos(imagen) {
  const { ancho, alto, pixeles } = imagen
  const afuera = new Uint8Array(ancho * alto)
  const pila = []
  for (let x = 0; x < ancho; x++) pila.push(x, (alto - 1) * ancho + x)
  for (let y = 0; y < alto; y++) pila.push(y * ancho, y * ancho + ancho - 1)
  while (pila.length) {
    const punto = pila.pop()
    if (afuera[punto] || pixeles[punto * 4 + 3] >= OPACO) continue
    afuera[punto] = 1
    const px = punto % ancho; const py = (punto - px) / ancho
    if (px > 0) pila.push(punto - 1)
    if (px < ancho - 1) pila.push(punto + 1)
    if (py > 0) pila.push(punto - ancho)
    if (py < alto - 1) pila.push(punto + ancho)
  }
  let huecos = 0
  for (let i = 0; i < ancho * alto; i++) if (!afuera[i] && pixeles[i * 4 + 3] < OPACO) huecos++
  return huecos
}

export function comprobarPieza(archivo, { fondo = false, figura = false, criatura = false } = {}) {
  const respuestas = []
  const responder = (pregunta, si, motivo = null) => respuestas.push({ pregunta, si, motivo: si ? null : motivo })
  const id = path.basename(archivo, '.png')
  const peso = statSync(archivo).size
  let imagen
  try {
    imagen = leerPng(readFileSync(archivo))
  } catch (error) {
    responder('¿Es un PNG que se puede leer?', false, error.message)
    return { pasa: false, respuestas }
  }

  if (fondo) {
    responder('¿Es un PNG de 1672 × 941 sin transparencia?',
      imagen.ancho === FONDO.ancho && imagen.alto === FONDO.alto && imagen.pixeles !== null && opacoEntero(imagen),
      'Mide ' + imagen.ancho + ' × ' + imagen.alto + (imagen.pixeles && !opacoEntero(imagen) ? ' y tiene transparencia' : '') + '.')
    responder('¿Pesa menos de 2,5 MB?', peso < PESO_FONDO, 'Pesa ' + Math.round(peso / 1024) + ' KB.')
    responder('¿El nombre es fondo-<lugar>.png, en minúsculas, sin tildes y con guiones?',
      id.startsWith('fondo-') && PATRON_NOMBRE.test(id), 'Se llama «' + id + '.png».')
    return { pasa: respuestas.every((respuesta) => respuesta.si), respuestas }
  }

  if (criatura) return comprobarCriatura(imagen, id, peso, responder, respuestas)

  // Un objeto mide 256 × 256; una figura entera, 768 × 768. Lo demás se mide sobre ese lado.
  const L = figura ? LADO_FIGURA : LADO_OBJETO
  const margen = figura ? MARGEN_FIGURA : MARGEN
  const silueta = figura ? SILUETA_FIGURA : SILUETA
  const desvio = figura ? DESVIO_FIGURA : DESVIO_CENTRO
  const pesoMaximo = figura ? PESO_FIGURA : PESO_OBJETO
  const medidas = imagen.ancho === L && imagen.alto === L && imagen.canales === 4
  responder('¿Es un PNG con transparencia (RGBA) de ' + L + ' × ' + L + '?', medidas,
    'Mide ' + imagen.ancho + ' × ' + imagen.alto + (imagen.canales === 4 ? '' : ', sin canal de transparencia de 8 bits') + '.')
  if (!medidas) return { pasa: false, respuestas }
  const { pixeles } = imagen
  const alfa = (x, y) => pixeles[(y * L + x) * 4 + 3]

  const esquinas = [alfa(0, 0), alfa(L - 1, 0), alfa(0, L - 1), alfa(L - 1, L - 1)]
  responder('¿Las cuatro esquinas son totalmente transparentes?', esquinas.every((valor) => valor === 0),
    'Alguna esquina no es transparente (el fondo no se quitó del todo).')

  let minX = L; let minY = L; let maxX = -1; let maxY = -1
  for (let y = 0; y < L; y++) for (let x = 0; x < L; x++) {
    if (alfa(x, y) >= OPACO) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y) }
  }
  if (maxX < 0) {
    responder('¿Hay una figura?', false, 'La pieza está vacía: todo es transparente.')
    return { pasa: false, respuestas }
  }
  responder('¿Quedan al menos ' + margen + ' px transparentes en cada borde?',
    minX >= margen && minY >= margen && maxX <= L - 1 - margen && maxY <= L - 1 - margen,
    'La silueta va de (' + minX + ', ' + minY + ') a (' + maxX + ', ' + maxY + ').')
  const ladoMayor = Math.max(maxX - minX + 1, maxY - minY + 1)
  responder('¿El lado mayor de la silueta mide entre ' + silueta.minimo + ' y ' + silueta.maximo + ' px?', ladoMayor >= silueta.minimo && ladoMayor <= silueta.maximo,
    'Mide ' + ladoMayor + ' px.')
  const centro = (minX + maxX + 1) / 2
  responder('¿El centro de la silueta está a menos de ' + desvio + ' px del centro del lienzo, a lo ancho?',
    Math.abs(centro - L / 2) < desvio, 'Su centro está en x = ' + centro + '.')

  const { marca, areas } = manchas(imagen)
  const principal = areas.indexOf(Math.max(...areas))
  const sueltas = areas.filter((area, i) => i !== principal && area >= 10)
  responder('¿Es una sola figura, sin manchas sueltas alrededor?', sueltas.length === 0,
    'Hay ' + sueltas.length + ' mancha(s) suelta(s) además de la figura.')

  // El borde: píxeles de la figura que tocan un píxel transparente.
  let borde = 0; let claros = 0
  for (let y = 1; y < L - 1; y++) for (let x = 1; x < L - 1; x++) {
    const i = y * L + x
    if (marca[i] !== principal) continue
    if (alfa(x - 1, y) < OPACO || alfa(x + 1, y) < OPACO || alfa(x, y - 1) < OPACO || alfa(x, y + 1) < OPACO) {
      borde++
      if (luminancia(pixeles, i * 4) > 180) claros++
    }
  }
  responder('¿El borde de la silueta es oscuro (contorno), sin un halo blanco del fondo que se quitó?',
    borde > 0 && claros / borde <= 0.05, Math.round(100 * claros / Math.max(1, borde)) + ' % del borde es claro: parece un halo del fondo.')

  const huecos = areaDeHuecos(imagen)
  responder('¿Los blancos de adentro de la pieza siguen opacos (la herramienta que quita el fondo no los borró)?',
    huecos <= 0.05 * areas[principal], 'Hay ' + huecos + ' px transparentes encerrados dentro de la figura.')

  responder('¿Pesa menos de ' + Math.round(pesoMaximo / 1024) + ' KB?', peso < pesoMaximo, 'Pesa ' + Math.round(peso / 1024) + ' KB.')
  responder('¿El nombre del archivo está en minúsculas, sin tildes ni «ñ», con guiones, y es igual a su id?',
    PATRON_NOMBRE.test(id) && (figura ? id.startsWith('figura-') : !id.startsWith('fondo-') && !id.startsWith('figura-')),
    'Se llama «' + id + '.png»' + (figura ? ' (una figura se llama figura-<nombre>).' : '.'))
  return { pasa: respuestas.every((respuesta) => respuesta.si), respuestas, silueta: { minX, minY, maxX, maxY, ladoMayor } }
}

// Una criatura animada: 3 cuadros de 256 × 256 con los pies en la misma fila, del mismo tamaño y con movimiento.
function comprobarCriatura(imagen, id, peso, responder, respuestas) {
  const C = CRIATURA
  const medidasOk = imagen.ancho === C.ancho && imagen.alto === C.alto && imagen.pixeles !== null
  responder('¿Es un PNG de ' + C.ancho + ' × ' + C.alto + ' con transparencia (3 cuadros de 256 × 256)?', medidasOk,
    'Mide ' + imagen.ancho + ' × ' + imagen.alto + (imagen.pixeles === null ? ' y no tiene transparencia' : '') + '.')
  responder('¿Pesa menos de 300 KB?', peso < C.peso, 'Pesa ' + Math.round(peso / 1024) + ' KB.')
  responder('¿El nombre es criatura-<nombre>.png, en minúsculas, sin tildes y con guiones?',
    id.startsWith('criatura-') && id.length > 'criatura-'.length && PATRON_NOMBRE.test(id), 'Se llama «' + id + '.png».')
  if (!medidasOk) return { pasa: false, respuestas }

  // Lo opaco de cada cuadro: su caja y su máscara.
  const cuadros = []
  for (let c = 0; c < C.cuadros; c += 1) {
    let minX = 256, minY = 256, maxX = -1, maxY = -1, cuenta = 0
    const mascara = new Uint8Array(256 * 256)
    for (let y = 0; y < 256; y += 1) {
      for (let x = 0; x < 256; x += 1) {
        if (imagen.pixeles[((y * C.ancho) + c * 256 + x) * 4 + 3] < OPACO) continue
        mascara[y * 256 + x] = 1
        cuenta += 1
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
    cuadros.push({ minX, minY, maxX, maxY, cuenta, mascara, ladoMayor: Math.max(maxX - minX + 1, maxY - minY + 1) })
  }
  const vacios = cuadros.map((cuadro, i) => [cuadro, i + 1]).filter(([cuadro]) => cuadro.cuenta < 400).map(([, i]) => i)
  responder('¿Los 3 cuadros tienen una figura?', vacios.length === 0, 'Los cuadros ' + vacios.join(', ') + ' están vacíos o casi.')
  if (vacios.length) return { pasa: false, respuestas }

  const lejos = cuadros.map((cuadro, i) => [cuadro, i + 1]).filter(([cuadro]) => Math.abs(cuadro.maxY - C.pies) > C.margenPies).map(([cuadro, i]) => i + ' (pies en y = ' + cuadro.maxY + ')')
  responder('¿Los pies (el punto más bajo) están en y = ' + C.pies + ', igual en los 3 cuadros?', lejos.length === 0,
    'Los pies no están donde deben en el cuadro ' + lejos.join(', ') + '.')
  const lados = cuadros.map((cuadro) => cuadro.ladoMayor)
  responder('¿La figura mide entre ' + C.ladoMayor.minimo + ' y ' + C.ladoMayor.maximo + ' px (su lado mayor, en el cuadro más grande)?',
    Math.max(...lados) >= C.ladoMayor.minimo && Math.max(...lados) <= C.ladoMayor.maximo, 'El cuadro más grande mide ' + Math.max(...lados) + ' px.')
  const areas = cuadros.map((cuadro) => cuadro.cuenta)
  responder('¿Los 3 cuadros son del mismo tamaño (ninguno más de un 30 % más grande que otro)?', Math.max(...areas) / Math.min(...areas) <= C.variacionMaxima * C.variacionMaxima,
    'Las áreas cambian de ' + Math.min(...areas) + ' a ' + Math.max(...areas) + ' px: parecen dibujos de distinto tamaño.')
  const tocan = cuadros.map((cuadro, i) => [cuadro, i + 1]).filter(([cuadro]) => cuadro.minX < 3 || cuadro.maxX > 252 || cuadro.minY < 3).map(([, i]) => i)
  responder('¿La figura no toca el borde de su cuadro?', tocan.length === 0, 'Toca el borde en el cuadro ' + tocan.join(', ') + '.')
  // Que haya movimiento: la máscara de algún par de cuadros cambia al menos un 3 %.
  let mayorCambio = 0
  for (const [a, b] of [[0, 1], [1, 2], [0, 2]]) {
    let distintos = 0
    for (let i = 0; i < 256 * 256; i += 1) if (cuadros[a].mascara[i] !== cuadros[b].mascara[i]) distintos += 1
    mayorCambio = Math.max(mayorCambio, distintos / Math.max(1, Math.max(cuadros[a].cuenta, cuadros[b].cuenta)))
  }
  responder('¿Los cuadros son distintos entre sí (hay movimiento)?', mayorCambio >= 0.03, 'Los 3 cuadros son casi iguales: no se vería moverse.')
  return { pasa: respuestas.every((respuesta) => respuesta.si), respuestas, cuadros: cuadros.map(({ minX, minY, maxX, maxY, cuenta }) => ({ minX, minY, maxX, maxY, cuenta })) }
}

function opacoEntero(imagen) {
  for (let i = 3; i < imagen.pixeles.length; i += 4) if (imagen.pixeles[i] !== 255) return false
  return true
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const archivo = process.argv[2]
  if (!archivo) {
    console.error('Uso: node kit/herramientas/comprobar_pieza.mjs <pieza.png> [--fondo | --figura | --criatura]')
    process.exit(2)
  }
  const resultado = comprobarPieza(archivo, { fondo: process.argv.includes('--fondo'), figura: process.argv.includes('--figura'), criatura: process.argv.includes('--criatura') })
  console.log(JSON.stringify(resultado, null, 2))
  process.exit(resultado.pasa ? 0 : 1)
}
