// La interfaz común de un juego del taller. Todos los juegos se ven y se manejan igual de bien porque
// usan esta misma, en vez de inventar la suya:
//
//   arriba a la izquierda   Kusi, con su globo cuando habla (el globo se esconde solo; tocar a Kusi lo repite)
//   arriba a la derecha     cuatro botones redondos: Pausa, Ayuda, Escuchar y Sonido
//   debajo de los botones   indicadores con un dibujo y un número (nivel, cosas reunidas…)
//   abajo                   los controles (./controles.js): el joystick
//   abajo a la derecha      el botón Soltar, si el juego lo pide
//
//   const hud = crearHud(this, { alAyuda: () => … })
//   hud.decir('Busca las luciérnagas.', {
//     alTerminar: ({ interrumpida }) => { if (!interrumpida) mostrarLuz() },
//   })
//   hud.decir('Ana también está buscando', { tipo: 'comentario' })
//   hud.celebrar()
//   hud.decirSeguidas(['¡Lo lograste!', 'Vamos al siguiente reto.'], {
//     alTerminar: ({ interrumpida }) => { if (!interrumpida) empezarReto() },
//   })
//   const reunidas = hud.indicador({ icono: 'luciernaga', texto: '0 / 10' })
//   reunidas.poner('3 / 10')
//
// `decir` acepta el mismo `alTerminar` para una sola frase. Se llama una vez
// al acabar la voz o el tiempo de lectura. Una nueva respuesta puede cortar
// el turno y, con `decirSeguidas`, cancela también las frases que faltaban.
// `celebrar` anima a Kusi 2,5 s y se prolonga si sigue hablando.
// Todo está en la pantalla (scrollFactor 0) y por encima del mundo. Kusi habla con voz y en su globo.
// El botón Sonido controla la música y los efectos del juego.

import { COLOR, NUMERO, estiloTexto } from '../medidas.js'
import { ajustarATamano } from '../dibujos/dibujos.js'
import { dibujarGlobo } from './piezas.js'
import { callarVoz, decir, repetirVoz, vozOcupada } from '../logica/voz.js'
import { animarVozKusi, crearHablaKusi, avanzarHablaKusi, iniciarCelebracionKusi, FILAS_KUSI } from '../logica/hablaKusi.js'
import { normalizarFrase } from '../logica/textoVoz.js'
import { vidaActiva } from '../efectos/vida.js'
import { aplicarAvisoPuntos, crearPuntos, MAXIMO_PUNTOS } from '../logica/puntos.js'
import { pedirPausa } from '../mensajes/pausaJuego.js'

const PROFUNDIDAD = 4000
const ALTURA_KUSI = 94
const SALTO_KUSI = 9
const LADO_BOTON = 76
const DESFASE_ETIQUETA = LADO_BOTON / 2 + 12
const ALTO_INDICADOR = 42
const LADO_ICONO = 32
const MARGEN_INDICADOR = 12
const SEPARACION_ICONO = 8

export function crearHud(escena, { alEscuchar = null, alAyuda = null, alSilenciar = null, silenciado = false } = {}) {
  const piezas = []
  const recolocarBotones = []
  const agregar = (pieza, nombre) => {
    // El revisor necesita distinguir los dibujos de la interfaz del decorado.
    pieza.setData('hud', true)
    if (nombre) pieza.setData('idPantalla', nombre)
    piezas.push(pieza)
    return pieza
  }
  const { width: ancho } = escena.scale

  // Kusi, en un círculo claro, arriba a la izquierda.
  const aro = agregar(escena.add.circle(80, 80, 66, NUMERO.crema).setStrokeStyle(5, NUMERO.tinta).setScrollFactor(0).setDepth(PROFUNDIDAD))
  const kusi = agregar(escena.add.image(80, ALTURA_KUSI, 'kusi-animado', FILAS_KUSI.respirar)
    .setDisplaySize(124, 124).setScrollFactor(0).setDepth(PROFUNDIDAD + 1))
  kusi.setInteractive({ useHandCursor: true })
  const habla = crearHablaKusi(vidaActiva())

  // El globo: junto a Kusi, con su colita hacia él.
  const globo = agregar(escena.add.graphics().setScrollFactor(0).setDepth(PROFUNDIDAD), 'Globo de Kusi')
  const texto = agregar(escena.add.text(0, 0, '', estiloTexto(30, COLOR.tinta, { align: 'left', wordWrap: { width: 520 } })).setOrigin(0, 0.5).setScrollFactor(0).setDepth(PROFUNDIDAD + 1))
  globo.setAlpha(0)
  texto.setAlpha(0)
  let ocultar = null
  let ultimaMostrada = null
  let ultimaEscuchada = null
  let destruido = false
  let conversacion = null

  const mostrarGlobo = (mensaje) => {
    ultimaMostrada = mensaje
    const { frase } = mensaje
    const maximo = Math.max(320, Math.min(560, ancho - 520))
    // El texto cabe siempre: si es largo, la letra se achica (hasta 20 px) y el globo nunca se sale de la pantalla.
    let tamano = 30
    texto.setWordWrapWidth(maximo - 56, true).setText(frase).setFontSize(tamano)
    while (texto.height > 130 && tamano > 20) { tamano -= 2; texto.setFontSize(tamano) }
    const anchoGlobo = Math.min(maximo, texto.width + 56)
    const altoGlobo = Math.max(84, texto.height + 40)
    const centroY = Math.max(80, 14 + altoGlobo / 2)
    const colaY = 80 - centroY
    globo.clear()
    globo.setPosition(160 + anchoGlobo / 2, centroY)
    dibujarGlobo(globo, anchoGlobo, altoGlobo, { cola: 'izquierda', colaY })
    // Graphics no tiene tamaño propio. La caja incluye la cola y el trazo de 4 px.
    const arriba = Math.min(-altoGlobo / 2, colaY - 16) - 2
    globo.setData('cajaPantalla', { x: -anchoGlobo / 2 - 32, y: arriba,
      ancho: anchoGlobo + 34, alto: Math.max(altoGlobo / 2, colaY + 34) + 2 - arriba })
    texto.setPosition(160 + 28, centroY)
    escena.tweens.killTweensOf([globo, texto])
    globo.setAlpha(1)
    texto.setAlpha(1)
    ocultar?.remove()
  }

  const programarOcultado = (mensaje, alLeer) => {
    if (mensaje.fijo && !alLeer) return
    ocultar = escena.time.delayedCall(Math.min(9000, 3500 + mensaje.frase.length * 55), () => {
      if (!mensaje.fijo) escena.tweens.add({ targets: [globo, texto], alpha: 0, duration: 400 })
      alLeer?.()
    })
    return ocultar
  }

  const hablar = (frase, { tipo, esperar, fijo = false } = {}, reproducir = decir, paso = null) => {
    if (typeof frase !== 'string' || !frase.trim()) return
    const mensaje = { frase, tipo, esperar, fijo }
    const animacion = animarVozKusi(habla, frase)
    const vigente = () => !destruido && (!paso || conversacion?.paso === paso)
    reproducir(frase, {
      tipo, esperar,
      alEmpezar() {
        if (!vigente()) return
        ultimaEscuchada = mensaje
        mostrarGlobo(mensaje)
        if (paso) paso.lectura = null
        animacion.alEmpezar()
      },
      alSinVoz() {
        if (!vigente()) return
        mostrarGlobo(mensaje)
        if (paso) {
          // Si la voz arranca tarde, alEmpezar sustituye este reloj por el fin del audio.
          paso.lectura = programarOcultado(mensaje, () => terminarPaso(paso, false, true))
        } else programarOcultado(mensaje)
      },
      alTerminar({ interrumpida }) {
        if (destruido) return
        animacion.alTerminar()
        programarOcultado(mensaje)
        if (paso) terminarPaso(paso, interrumpida)
      },
    })
  }

  function cerrarConversacion(interrumpida) {
    if (!conversacion) return
    const { paso, alTerminar, secundaria } = conversacion
    conversacion = null
    paso?.lectura?.remove()
    // La voz avisa dentro de un cambio de turno. El juego ya puede pedir otra
    // frase cuando ese cambio terminó, incluso si su respuesta es inmediata.
    queueMicrotask(() => {
      alTerminar?.({ interrumpida })
      if (!interrumpida && !conversacion && !destruido) secundaria?.()
    })
  }

  function decirPaso() {
    const { frases, indice, opciones } = conversacion
    const paso = conversacion.paso = { lectura: null }
    // El turno con seguimiento entra de inmediato. La cola de voz puede
    // descartar frases que esperan, sin avisarles si nunca llegaron a sonar.
    hablar(frases[indice], opciones, repetirVoz, paso)
  }

  function terminarPaso(paso, interrumpida, soloTexto = false) {
    if (conversacion?.paso !== paso) return
    if (interrumpida) return cerrarConversacion(true)
    conversacion.paso = null
    conversacion.indice += 1
    if (conversacion.indice < conversacion.frases.length) {
      decirPaso()
    } else {
      // Tras leer la última frase, se retira la voz que aún pudiera estar
      // esperando el primer toque para que ese toque no reproduzca el texto viejo.
      if (soloTexto && vozOcupada()) callarVoz()
      cerrarConversacion(false)
    }
  }

  const decirSeguidas = (frases, { alTerminar, ...opciones } = {}) => {
    if (destruido) return
    const validas = Array.isArray(frases) ? frases.filter((frase) => normalizarFrase(frase)) : []
    if (validas.length === 0) {
      if (alTerminar) queueMicrotask(() => alTerminar({ interrumpida: false }))
      return
    }
    cerrarConversacion(true)
    conversacion = { frases: validas, indice: 0, opciones, alTerminar, paso: null, secundaria: null }
    decirPaso()
  }

  const decirDesdeHud = (frase, opciones = {}) => {
    if (destruido || !normalizarFrase(frase)) return
    const { alTerminar, tipo = opciones.esperar ? 'comentario' : 'respuesta' } = opciones
    if (alTerminar) return decirSeguidas([frase], opciones)
    if (!conversacion) return hablar(frase, opciones)
    if (tipo !== 'respuesta') {
      // Las frases de fondo esperan porque un globo nuevo taparía el texto que se está leyendo.
      conversacion.secundaria = () => hablar(frase, opciones)
      return
    }
    cerrarConversacion(true)
    hablar(frase, opciones, repetirVoz)
  }

  const repetirUltimo = () => {
    const ultimo = ultimaEscuchada ?? ultimaMostrada
    if (ultimo) {
      cerrarConversacion(true)
      hablar(ultimo.frase, ultimo, repetirVoz)
    }
    else alEscuchar?.()
  }
  kusi.on('pointerup', repetirUltimo)

  const xSuperior = (indice) => ancho - 52 - indice * (LADO_BOTON + 22)
  const botonSuperior = (clave, indice, nombre, accion) => {
    const boton = dibujarBotonHud(escena, clave, xSuperior(indice), 52, nombre)
    agregar(boton.imagen)
    agregar(boton.etiqueta)
    recibirToque(boton.imagen, accion)
    return boton
  }
  const sonido = botonSuperior(silenciado ? 'boton-silencio' : 'boton-sonido', 0, 'Sonido', alSilenciar)
  botonSuperior('boton-escuchar', 1, 'Escuchar', repetirUltimo)
  botonSuperior('boton-ayuda', 2, 'Ayuda', alAyuda)
  const pausa = crearBotonPausa(escena, xSuperior(3), 52)
  piezas.push(pausa.imagen, pausa.etiqueta)

  const botonSoltar = ({ alTocar } = {}) => {
    const { imagen, etiqueta } = dibujarBotonHud(escena, 'boton-soltar', 0, 0, 'Soltar')
    agregar(imagen)
    agregar(etiqueta)
    const dibujo = agregar(escena.add.image(0, 0).setScrollFactor(0).setDepth(PROFUNDIDAD + 1))
    // La zona queda fija a la pantalla y por encima del dibujo de la carga y la etiqueta.
    const zona = agregar(escena.add.zone(0, 0, LADO_BOTON, LADO_BOTON)
      .setScrollFactor(0).setDepth(PROFUNDIDAD + 2))
    recibirToque(zona, alTocar)
    const colocar = () => {
      const x = escena.scale.width - 80
      const y = escena.scale.height - 95
      imagen.setPosition(x, y)
      etiqueta.setPosition(x, y + DESFASE_ETIQUETA)
      dibujo.setPosition(x - 28, y + 24)
      zona.setPosition(x, y)
    }
    colocar()
    escena.scale.on('resize', colocar)
    recolocarBotones.push(colocar)

    const ocultar = () => {
      imagen.setVisible(false)
      etiqueta.setVisible(false)
      dibujo.setVisible(false)
      zona.setVisible(false)
    }
    ocultar()
    return {
      // El juego llama a mostrar con la textura de lo que lleva el protagonista.
      mostrar(clave) {
        const cargada = escena.textures.exists(clave)
        if (cargada) ajustarATamano(dibujo.setTexture(clave), LADO_ICONO, LADO_ICONO)
        dibujo.setVisible(cargada)
        imagen.setVisible(true)
        etiqueta.setVisible(true)
        zona.setVisible(true)
      },
      ocultar,
    }
  }

  // Indicadores: una pastilla con un dibujo y un número, debajo de los botones.
  const indicadores = []
  // La capa común ocupa la primera fila en los juegos que abrió el reproductor.
  const filaInicial = escena.scene?.get('puntos')?.escenaJuego === escena ? 1 : 0
  const indicador = ({ icono = null, texto: inicial = '' } = {}) => {
    const nombre = inicial ? 'Indicador ' + inicial : 'Indicador ' + (indicadores.length + 1)
    const pastilla = crearIndicador(escena, {
      x: ancho - 20, y: 146 + (filaInicial + indicadores.length) * 50,
      inicial, nombre, agregar, icono,
    })
    indicadores.push(pastilla)
    return pastilla
  }

  const alActualizar = (_tiempo, delta) => {
    const { cuadro, rebote } = avanzarHablaKusi(habla, delta / 1000)
    kusi.setFrame(cuadro)
    kusi.y = ALTURA_KUSI - rebote * SALTO_KUSI
  }
  escena.events.on('update', alActualizar)
  const destruir = () => {
    if (destruido) return
    destruido = true
    cerrarConversacion(true)
    escena.events.off('update', alActualizar)
    ocultar?.remove()
    for (const colocar of recolocarBotones) escena.scale.off('resize', colocar)
    for (const pieza of piezas) pieza.destroy()
  }
  escena.events.once('shutdown', destruir)
  escena.events.once('destroy', destruir)

  return {
    // «tipo» elige el turno de voz. «fijo» conserva el globo al terminar.
    decir: decirDesdeHud,
    decirSeguidas,
    celebrar: () => iniciarCelebracionKusi(habla),
    indicador,
    botonSoltar,
    // Cambia el dibujo del botón de sonido (apagado o encendido).
    sonido: (apagado) => sonido.imagen.setTexture(apagado ? 'boton-silencio' : 'boton-sonido'),
    destruir,
  }
}

function dibujarBotonHud(escena, clave, x, y, nombre, { lado = LADO_BOTON, letra = 20, factorDesplazamiento = 0 } = {}) {
  const imagen = escena.add.image(x, y, clave).setDisplaySize(lado, lado)
    .setScrollFactor(factorDesplazamiento).setDepth(PROFUNDIDAD)
  const etiqueta = escena.add.text(x, y + lado / 2 + letra * 0.6, nombre, estiloTexto(letra))
    .setOrigin(0.5).setScrollFactor(factorDesplazamiento).setDepth(PROFUNDIDAD)
  return { imagen, etiqueta }
}

function recibirToque(pieza, accion) {
  pieza.setInteractive({ useHandCursor: true })
  pieza.on('pointerdown', (_puntero, _x, _y, evento) => {
    evento.stopPropagation()
    accion?.()
  })
}

export function crearBotonPausa(escena, x, y, medidas) {
  const boton = dibujarBotonHud(escena, 'boton-pausa', x, y, 'Pausa', medidas)
  boton.imagen.setData('hud', true).setData('idPantalla', 'Pausa')
  boton.etiqueta.setData('hud', true)
  recibirToque(boton.imagen, () => pedirPausa(escena.game))
  return boton
}

function crearIndicador(escena, { x, y, inicial, nombre, agregar, icono }) {
  const fondo = agregar(escena.add.rectangle(0, 0, 40, ALTO_INDICADOR, NUMERO.crema, 0.96)
    .setOrigin(1, 0.5).setStrokeStyle(3, NUMERO.tinta).setRounded(21).setScrollFactor(0).setDepth(PROFUNDIDAD), nombre)
  const cifra = agregar(escena.add.text(0, 0, inicial, estiloTexto(24, COLOR.tinta))
    .setOrigin(1, 0.5).setScrollFactor(0).setDepth(PROFUNDIDAD + 1))
  let imagen = null
  if (typeof icono === 'function') imagen = icono(escena)
  else if (icono && escena.textures.exists(icono)) {
    imagen = escena.add.image(0, 0, icono)
    ajustarATamano(imagen, LADO_ICONO, LADO_ICONO)
  }
  if (imagen) agregar(imagen.setScrollFactor(0).setDepth(PROFUNDIDAD + 1))

  const ajustar = () => {
    const largo = cifra.width + MARGEN_INDICADOR * 2 + (imagen ? LADO_ICONO + SEPARACION_ICONO : 0)
    fondo.setSize(largo, ALTO_INDICADOR).setPosition(x, y)
    cifra.setPosition(x - MARGEN_INDICADOR, y)
    if (imagen) imagen.setPosition(x - largo + MARGEN_INDICADOR + LADO_ICONO / 2, y)
  }
  ajustar()
  return {
    poner(valor) { cifra.setText(String(valor)); ajustar() },
    colocar(aX, aY) { x = aX; y = aY; ajustar() },
    centro: () => ({ x: x - fondo.width / 2, y }),
    mostrar(visible) { for (const pieza of [fondo, cifra, imagen]) pieza?.setVisible(visible) },
    // Un saltito suave para avisar que cambió (nada fuerte ni rápido).
    resaltar() { if (vidaActiva()) escena.tweens.add({ targets: [fondo, cifra], scale: 1.12, yoyo: true, duration: 140 }) },
  }
}

export function dibujarEstrellaPuntos(escena, radio) {
  return escena.add.star(0, 0, 5, radio * 0.53, radio, NUMERO.naranjaClaro)
    .setStrokeStyle(2.5, NUMERO.tinta)
}

export function textoPuntos(total) {
  return total + ' de ' + MAXIMO_PUNTOS
}

export function crearHudPuntos(escena) {
  const indicador = crearIndicador(escena, {
    x: 0, y: 0, inicial: textoPuntos(0), nombre: 'Puntos',
    icono: () => dibujarEstrellaPuntos(escena, 14),
    agregar(pieza, nombre) {
      pieza.setData('hud', true)
      if (nombre) pieza.setData('idPantalla', nombre)
      return pieza
    },
  })
  let puntaje = crearPuntos(0)
  return {
    mostrar: indicador.mostrar,
    colocar: indicador.colocar,
    centro: indicador.centro,
    empezar(totalRetos) {
      puntaje = crearPuntos(totalRetos)
      indicador.poner(textoPuntos(puntaje.total))
    },
    recibir(aviso) {
      const anterior = puntaje.total
      puntaje = aplicarAvisoPuntos(puntaje, aviso)
      if (puntaje.total !== anterior) indicador.poner(textoPuntos(puntaje.total))
      return puntaje.total - anterior
    },
    puntaje: () => puntaje,
  }
}
