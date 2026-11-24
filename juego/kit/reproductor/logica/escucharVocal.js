export const SEGUNDOS_POR_CUADRO = 0.04
const FRECUENCIA_ANALISIS = 11000
const MINIMO_DE_VOZ = 0.16
const MINIMO_RMS = 0.002
const SIN_VOZ = Object.freeze({ voz: false, tono: null, f1: null, f2: null })

// Referencias aproximadas de F1 y F2 para vocales sostenidas en español.
// La posición de la lengua y la abertura de la boca cambian estas dos
// resonancias. F3 se usa aparte para estimar la escala de la voz.
const RESONANCIAS = [
  ['a', 820, 1700], ['e', 450, 2250], ['i', 335, 2570],
  ['o', 440, 1130], ['u', 310, 990],
]
const ESCALA_MINIMA = 0.85
const ESCALA_MAXIMA = 1.45
const TONO_DE_REFERENCIA = 185
const F3_DE_REFERENCIA = 3100
const PESO_F1 = 1.15

function remuestrear(muestras, origen, destino) {
  const paso = origen / destino
  const corte = Math.min(1, 1 / paso) * 0.94
  const radio = 4 / corte
  const cuadro = new Float64Array(Math.floor(muestras.length / paso))
  for (let indice = 0; indice < cuadro.length; indice++) {
    const centro = indice * paso
    const inicio = Math.max(0, Math.ceil(centro - radio))
    const fin = Math.min(muestras.length - 1, Math.floor(centro + radio))
    let suma = 0
    let pesos = 0
    // La ventana de coseno suaviza el corte y evita que las frecuencias
    // altas reaparezcan como picos falsos al reducir la tasa de muestreo.
    for (let muestra = inicio; muestra <= fin; muestra++) {
      const distancia = centro - muestra
      const angulo = Math.PI * corte * distancia
      const peso = (angulo === 0 ? 1 : Math.sin(angulo) / angulo) *
        (0.5 + 0.5 * Math.cos(Math.PI * distancia / radio))
      suma += peso * muestras[muestra]
      pesos += peso
    }
    cuadro[indice] = suma / pesos
  }
  return cuadro
}

function estimarTono(muestras, frecuencia) {
  // Atenuar armónicos altos facilita encontrar el período aunque la forma
  // de cada pulso cambie un poco o la vocal tenga resonancias intensas.
  const filtradas = new Float64Array(muestras.length)
  const peso = 1 - Math.exp(-2 * Math.PI * 650 / frecuencia)
  let filtrada = 0
  for (let indice = 0; indice < muestras.length; indice++) {
    filtrada += peso * (muestras[indice] - filtrada)
    filtradas[indice] = filtrada
  }
  const minimo = Math.round(frecuencia / 600)
  const maximo = Math.round(frecuencia / 80)
  const correlaciones = new Float64Array(maximo + 2)
  for (let retraso = minimo - 1; retraso <= maximo + 1; retraso++) {
    let suma = 0
    let energia = 0
    let energiaRetrasada = 0
    for (let indice = retraso; indice < filtradas.length; indice++) {
      const actual = filtradas[indice]
      const previa = filtradas[indice - retraso]
      suma += actual * previa
      energia += actual * actual
      energiaRetrasada += previa * previa
    }
    correlaciones[retraso] = suma / (Math.sqrt(energia * energiaRetrasada) || 1)
  }
  // El primer pico que se acerca al máximo evita quedarse con un múltiplo
  // del período. La interpolación reduce el error por redondeo a muestras.
  const umbral = Math.max(0.45, 0.88 * Math.max(...correlaciones))
  for (let retraso = minimo; retraso <= maximo; retraso++) {
    const izquierda = correlaciones[retraso - 1]
    const centro = correlaciones[retraso]
    const derecha = correlaciones[retraso + 1]
    if (centro < umbral || centro <= izquierda || centro < derecha) continue
    const ajuste = 0.5 * (izquierda - derecha) / (izquierda - 2 * centro + derecha)
    const tono = frecuencia / (retraso + ajuste)
    if (tono >= 80 && tono <= 600) return tono
  }
  return null
}

function coeficientesLpc(muestras, orden) {
  const adelante = muestras.map((valor, indice) =>
    (valor - 0.95 * (muestras[indice - 1] ?? valor)) *
    (0.54 - 0.46 * Math.cos(2 * Math.PI * indice / (muestras.length - 1))))
  const atras = adelante.slice()
  let coeficientes = [1]
  // Burg minimiza el error de predicción en ambos sentidos, algo útil con
  // cuadros cortos. El límite conserva polos estables aun con una señal pura.
  for (let paso = 1; paso <= orden; paso++) {
    let producto = 0
    let energia = 0
    for (let indice = paso; indice < muestras.length; indice++) {
      const actual = adelante[indice]
      const previo = atras[indice - 1]
      producto += actual * previo
      energia += actual ** 2 + previo ** 2
    }
    const reflejo = Math.max(-0.999, Math.min(0.999, -2 * producto / (energia || 1)))
    const siguientes = [1]
    for (let indice = 1; indice < paso; indice++) {
      siguientes[indice] = coeficientes[indice] + reflejo * coeficientes[paso - indice]
    }
    siguientes.push(reflejo)
    coeficientes = siguientes
    for (let indice = muestras.length - 1; indice >= paso; indice--) {
      const actual = adelante[indice]
      const previo = atras[indice - 1]
      adelante[indice] = actual + reflejo * previo
      atras[indice] = previo + reflejo * actual
    }
  }
  return coeficientes
}

function polosLpc(coeficientes) {
  const orden = coeficientes.length - 1
  const polos = Array.from({ length: orden }, (_, indice) => {
    const angulo = 2 * Math.PI * (indice + 0.37) / orden
    return { real: 0.9 * Math.cos(angulo), imaginaria: 0.9 * Math.sin(angulo) }
  })
  // Durand–Kerner encuentra todos los polos del modelo LPC. Evaluar con
  // Horner evita elevar números complejos a potencias en cada iteración.
  for (let intento = 0; intento < 65; intento++) {
    let mayorCambio = 0
    for (const polo of polos) {
      const { real, imaginaria } = polo
      let valorReal = 1
      let valorImaginario = 0
      for (let indice = 1; indice <= orden; indice++) {
        const siguiente = valorReal * real - valorImaginario * imaginaria + coeficientes[indice]
        valorImaginario = valorReal * imaginaria + valorImaginario * real
        valorReal = siguiente
      }
      let productoReal = 1
      let productoImaginario = 0
      for (const otro of polos) {
        if (otro === polo) continue
        const diferenciaReal = real - otro.real
        const diferenciaImaginaria = imaginaria - otro.imaginaria
        const siguiente = productoReal * diferenciaReal - productoImaginario * diferenciaImaginaria
        productoImaginario = productoReal * diferenciaImaginaria + productoImaginario * diferenciaReal
        productoReal = siguiente
      }
      const modulo = productoReal ** 2 + productoImaginario ** 2
      if (modulo < 1e-25) continue
      const cambioReal = (valorReal * productoReal + valorImaginario * productoImaginario) / modulo
      const cambioImaginario = (valorImaginario * productoReal - valorReal * productoImaginario) / modulo
      polo.real -= cambioReal
      polo.imaginaria -= cambioImaginario
      mayorCambio = Math.max(mayorCambio, Math.abs(cambioReal), Math.abs(cambioImaginario))
    }
    if (mayorCambio < 1e-7) break
  }
  return polos
}

function formantesLpc(muestras, frecuencia, orden) {
  return polosLpc(coeficientesLpc(muestras, orden)).filter(({ imaginaria }) => imaginaria > 0)
    .map(({ real, imaginaria }) => ({
      hz: Math.atan2(imaginaria, real) * frecuencia / (2 * Math.PI),
      ancho: -Math.log(Math.hypot(real, imaginaria)) * frecuencia / Math.PI,
    }))
    .filter(({ hz, ancho }) => hz >= 175 && hz <= 4700 && ancho > 0 && ancho < 850)
    .sort((a, b) => a.hz - b.hz)
}

function estimarResonancias(muestras, frecuencia) {
  const orden = Math.round(frecuencia / 1100)
  let alternativa = null
  for (const cantidad of [orden, orden + 2, orden - 2]) {
    const polos = formantesLpc(muestras, frecuencia, cantidad)
    const primera = polos.find(({ hz, ancho }) => hz <= 1350 && ancho < 450)
    if (!primera) continue
    // Los polos anchos del ajuste suelen rellenar un hueco del espectro.
    // F3 admite un pico menos definido porque solo orienta la escala.
    const segunda = polos.find(({ hz, ancho }) => hz > primera.hz + 120 && hz <= 4200 && ancho < 425)
    if (!segunda) continue
    const tercera = polos.find(({ hz }) => hz >= 2350 && hz > segunda.hz + 260)
    const medidas = [primera.hz, segunda.hz, tercera?.hz ?? null, segunda.ancho]
    alternativa ??= medidas
    // Un F2 débil, especialmente en /a/ o /u/, puede desaparecer al cambiar
    // el orden del ajuste. Buscamos el polo omitido antes de usar el siguiente.
    const posibleSalto = (segunda.hz > 2950 && !tercera) || (primera.hz > 630 && segunda.hz > 2300)
    if (!posibleSalto && segunda.hz <= alternativa[1]) return medidas
  }
  return alternativa ?? [null, null, null, null]
}

export function analizarCuadro(muestras, frecuenciaMuestreo) {
  if (!muestras?.length || !Number.isFinite(frecuenciaMuestreo) || frecuenciaMuestreo < 8000 ||
      muestras.length < frecuenciaMuestreo * 0.03) return SIN_VOZ
  const frecuencia = Math.min(frecuenciaMuestreo, FRECUENCIA_ANALISIS)
  const cuadro = remuestrear(muestras, frecuenciaMuestreo, frecuencia)
  const media = cuadro.reduce((suma, valor) => suma + valor, 0) / cuadro.length
  let energia = 0
  for (let indice = 0; indice < cuadro.length; indice++) {
    cuadro[indice] -= media
    energia += cuadro[indice] ** 2
  }
  const rms = Math.sqrt(energia / cuadro.length)
  if (!(rms >= MINIMO_RMS)) return SIN_VOZ
  const tono = estimarTono(cuadro, frecuencia)
  if (tono === null) return { ...SIN_VOZ, rms }
  const [f1, f2, f3, anchoF2] = estimarResonancias(cuadro, frecuencia)
  return { voz: true, tono, f1, f2, f3, anchoF2, rms }
}

function medianaPositiva(valores, referencia) {
  const ordenados = valores.filter(valor => Number.isFinite(valor) && valor > 0).sort((a, b) => a - b)
  if (!ordenados.length) return referencia
  const mitad = Math.floor(ordenados.length / 2)
  return (ordenados[mitad] + ordenados[Math.floor((ordenados.length - 1) / 2)]) / 2
}

function estimarEscala(cuadros) {
  const tono = medianaPositiva(cuadros.map(cuadro => cuadro.tono), TONO_DE_REFERENCIA)
  const f3 = medianaPositiva(cuadros.map(cuadro => cuadro.f3), F3_DE_REFERENCIA)
  // El tono orienta la escala pero también cambia con la entonación. F3
  // aporta una segunda medida y las medianas reducen el efecto de los extremos.
  const escala = (tono / TONO_DE_REFERENCIA) ** 0.65 * (f3 / F3_DE_REFERENCIA) ** 0.35
  return Math.max(ESCALA_MINIMA, Math.min(ESCALA_MAXIMA, escala))
}

function distanciasVocales(f1, f2, escala) {
  if (!Number.isFinite(f1) || !Number.isFinite(f2) || f1 <= 0 || f2 <= f1) return []
  return RESONANCIAS.map(([vocal, primera, segunda]) => {
    // Los logaritmos comparan diferencias relativas, porque F2 se mide
    // en frecuencias más altas que F1. Ambas usan la misma escala de voz.
    const distancia = Math.hypot(
      PESO_F1 * Math.log(f1 / (primera * escala)),
      Math.log(f2 / (segunda * escala)),
    )
    return { vocal, distancia }
  }).sort((a, b) => a.distancia - b.distancia)
}

export function clasificarVocal(f1, f2) {
  return distanciasVocales(f1, f2, 1)[0] ?? { vocal: null, distancia: Infinity }
}

export function decidir(cuadros) {
  // Un cuartil bajo de los cuadros sin periodicidad estima el piso de ruido
  // sin dejar que un aplauso o una sílaba irregular lo suban demasiado.
  const fondo = cuadros.filter(cuadro => !cuadro.voz).map(cuadro => cuadro.rms ?? 0).sort((a, b) => a - b)
  const umbral = Math.max(MINIMO_RMS, 1.4 * (fondo[Math.floor(fondo.length / 4)] ?? 0))
  const sonoros = cuadros.filter(cuadro => cuadro.voz && (cuadro.rms ?? Infinity) >= umbral)
  if (sonoros.length * SEGUNDOS_POR_CUADRO < MINIMO_DE_VOZ) return { oyo: false, vocal: null, seguro: false }

  // El silencio residual y los extremos débiles pueden conservar el tono
  // pero distorsionar los formantes. Para votar usamos el núcleo de la voz.
  const energias = sonoros.map(cuadro => cuadro.rms).filter(Number.isFinite).sort((a, b) => a - b)
  const energiaVocal = 0.45 * (energias[Math.floor(0.75 * energias.length)] ?? 0)
  const nucleo = sonoros.filter(cuadro => (cuadro.rms ?? Infinity) >= energiaVocal)
  const escala = estimarEscala(nucleo)
  const votos = new Map()
  for (const { f1, f2, f3, anchoF2 } of nucleo) {
    const [mejor, segundo] = distanciasVocales(f1, f2, escala)
    if (!mejor || mejor.distancia > 0.55) continue
    const voto = votos.get(mejor.vocal) ?? { cantidad: 0, claros: 0 }
    voto.cantidad++
    // Si F2 es ancho para la separación que tiene con F3, su centro es
    // menos preciso. Ese cuadro puede orientar la respuesta, pero un
    // pico así da poca evidencia para confirmar vocales cercanas.
    const resonanciasDefinidas = !(f3 > f2 && anchoF2 > 0.35 * (f3 - f2))
    const margen = segundo.distancia - mejor.distancia
    if (resonanciasDefinidas && mejor.distancia <= 0.29 && margen >= 0.06) voto.claros++
    votos.set(mejor.vocal, voto)
  }
  const [vocal, voto] = [...votos].sort((a, b) => b[1].cantidad - a[1].cantidad)[0] ?? [null, null]
  // La confirmación necesita una mayoría de cuadros claros y suficientes
  // repeticiones del mismo resultado para ignorar transiciones rápidas.
  const seguro = voto !== null && voto.claros >= 5 && voto.claros >= 0.65 * nucleo.length
  return { oyo: true, vocal, seguro }
}
