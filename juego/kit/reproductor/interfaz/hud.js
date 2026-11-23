// La interfaz común de un juego del taller. Todos los juegos se ven y se manejan igual de bien porque
// usan esta misma, en vez de inventar la suya:
//
//   arriba a la izquierda   Kusi, con su globo cuando habla (el globo se esconde solo; tocar a Kusi lo repite)
//   arriba a la derecha     tres botones redondos: sonido, Escuchar y Ayuda
//   debajo de los botones   indicadores con un dibujo y un número (nivel, cosas reunidas…)
//   abajo                   los controles (./controles.js): el joystick
//   abajo a la derecha      el botón Soltar, si el juego lo pide
//
//   const hud = crearHud(this, { alAyuda: () => … })
//   hud.decir('Busca las luciérnagas')
//   hud.decir('Ana también está buscando', { tipo: 'comentario' })
//   const reunidas = hud.indicador({ icono: 'luciernaga', texto: '0 / 10' })
//   reunidas.poner('3 / 10')
//
// Todo está en la pantalla (scrollFactor 0) y por encima del mundo. Kusi habla con voz y en su globo.
// El botón Sonido controla la música y los efectos del juego.

import { COLOR, NUMERO, estiloTexto } from '../medidas.js'
import { ajustarATamano } from '../dibujos/dibujos.js'
import { dibujarGlobo } from './piezas.js'
import { decir, repetirVoz } from '../logica/voz.js'
import { animarVozKusi, crearHablaKusi, avanzarHablaKusi } from '../logica/hablaKusi.js'
import { vidaActiva } from '../efectos/vida.js'

const PROFUNDIDAD = 4000
const LADO_BOTON = 76
const DESFASE_ETIQUETA = LADO_BOTON / 2 + 12
const ALTO_INDICADOR = 42
const LADO_ICONO = 32
const MARGEN_INDICADOR = 12
const SEPARACION_ICONO = 8

export function crearHud(escena, { alEscuchar = null, alAyuda = null, alSilenciar = null, silenciado = false } = {}) {
  const piezas = []
  const recolocarBotones = []
  const agregar = (pieza) => { piezas.push(pieza); return pieza }
  const { width: ancho } = escena.scale

  // Kusi, en un círculo claro, arriba a la izquierda.
  const aro = agregar(escena.add.circle(80, 80, 66, NUMERO.crema).setStrokeStyle(5, NUMERO.tinta).setScrollFactor(0).setDepth(PROFUNDIDAD))
  const kusi = agregar(escena.add.image(80, 94, 'kusi-animado', 9).setDisplaySize(124, 124).setScrollFactor(0).setDepth(PROFUNDIDAD + 1))
  kusi.setInteractive({ useHandCursor: true })
  const habla = crearHablaKusi(vidaActiva())

  // El globo: junto a Kusi, con su colita hacia él.
  const globo = agregar(escena.add.graphics().setScrollFactor(0).setDepth(PROFUNDIDAD))
  const texto = agregar(escena.add.text(0, 0, '', estiloTexto(30, COLOR.tinta, { align: 'left', wordWrap: { width: 520 } })).setOrigin(0, 0.5).setScrollFactor(0).setDepth(PROFUNDIDAD + 1))
  globo.setAlpha(0)
  texto.setAlpha(0)
  let ocultar = null
  let ultimaMostrada = null
  let ultimaEscuchada = null
  let destruido = false

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
    globo.clear()
    globo.setPosition(160 + anchoGlobo / 2, centroY)
    dibujarGlobo(globo, anchoGlobo, altoGlobo, { cola: 'izquierda', colaY: 80 - centroY })
    texto.setPosition(160 + 28, centroY)
    escena.tweens.killTweensOf([globo, texto])
    globo.setAlpha(1)
    texto.setAlpha(1)
    ocultar?.remove()
  }

  const programarOcultado = (mensaje) => {
    if (mensaje.fijo) return
    ocultar = escena.time.delayedCall(Math.min(9000, 3500 + mensaje.frase.length * 55), () => {
      escena.tweens.add({ targets: [globo, texto], alpha: 0, duration: 400 })
    })
  }

  const hablar = (frase, { tipo, esperar, fijo = false } = {}, reproducir = decir) => {
    if (typeof frase !== 'string' || !frase.trim()) return
    const mensaje = { frase, tipo, esperar, fijo }
    const animacion = animarVozKusi(habla, frase)
    reproducir(frase, {
      tipo, esperar,
      alEmpezar() {
        if (destruido) return
        ultimaEscuchada = mensaje
        mostrarGlobo(mensaje)
        animacion.alEmpezar()
      },
      alSinVoz() {
        if (destruido) return
        mostrarGlobo(mensaje)
        programarOcultado(mensaje)
      },
      alTerminar() {
        if (destruido) return
        animacion.alTerminar()
        programarOcultado(mensaje)
      },
    })
  }
  const repetirUltimo = () => {
    const ultimo = ultimaEscuchada ?? ultimaMostrada
    if (ultimo) hablar(ultimo.frase, ultimo, repetirVoz)
    else alEscuchar?.()
  }
  kusi.on('pointerup', repetirUltimo)

  const dibujarBoton = (clave, x, y, nombre) => {
    const imagen = agregar(escena.add.image(x, y, clave).setDisplaySize(LADO_BOTON, LADO_BOTON)
      .setScrollFactor(0).setDepth(PROFUNDIDAD))
    const etiqueta = agregar(escena.add.text(x, y + DESFASE_ETIQUETA, nombre, estiloTexto(20, COLOR.tinta))
      .setOrigin(0.5).setScrollFactor(0).setDepth(PROFUNDIDAD))
    return { imagen, etiqueta }
  }
  const recibirToque = (pieza, accion) => {
    pieza.setInteractive({ useHandCursor: true })
    pieza.on('pointerdown', (_puntero, _x, _y, evento) => {
      evento.stopPropagation()
      accion?.()
    })
  }
  const botonSuperior = (clave, indice, nombre, accion) => {
    const boton = dibujarBoton(clave, ancho - 52 - indice * (LADO_BOTON + 22), 52, nombre)
    recibirToque(boton.imagen, accion)
    return boton
  }
  const sonido = botonSuperior(silenciado ? 'boton-silencio' : 'boton-sonido', 0, 'Sonido', alSilenciar)
  botonSuperior('boton-escuchar', 1, 'Escuchar', repetirUltimo)
  botonSuperior('boton-ayuda', 2, 'Ayuda', alAyuda)

  const botonSoltar = ({ alTocar } = {}) => {
    const { imagen, etiqueta } = dibujarBoton('boton-soltar', 0, 0, 'Soltar')
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
  const indicador = ({ icono = null, texto: inicial = '' } = {}) => {
    const x = ancho - 20
    const y = 146 + indicadores.length * 50
    const fondo = agregar(escena.add.rectangle(x, y, 40, ALTO_INDICADOR, NUMERO.crema, 0.96)
      .setOrigin(1, 0.5).setStrokeStyle(3, NUMERO.tinta).setRounded(21).setScrollFactor(0).setDepth(PROFUNDIDAD))
    const cifra = agregar(escena.add.text(x - MARGEN_INDICADOR, y, inicial, estiloTexto(24, COLOR.tinta))
      .setOrigin(1, 0.5).setScrollFactor(0).setDepth(PROFUNDIDAD + 1))
    let imagen = null
    if (icono && escena.textures.exists(icono)) {
      imagen = agregar(escena.add.image(0, y, icono).setScrollFactor(0).setDepth(PROFUNDIDAD + 1))
      const escala = Math.min(LADO_ICONO / imagen.width, LADO_ICONO / imagen.height)
      imagen.setScale(escala)
    }
    const ajustar = () => {
      const largo = cifra.width + MARGEN_INDICADOR * 2 + (imagen ? LADO_ICONO + SEPARACION_ICONO : 0)
      fondo.setSize(largo, ALTO_INDICADOR)
      if (imagen) imagen.setPosition(x - largo + MARGEN_INDICADOR + LADO_ICONO / 2, y)
    }
    ajustar()
    const pastilla = {
      poner(valor) { cifra.setText(String(valor)); ajustar() },
      // Un saltito suave para avisar que cambió (nada fuerte ni rápido).
      resaltar() { if (vidaActiva()) escena.tweens.add({ targets: [fondo, cifra], scale: 1.12, yoyo: true, duration: 140 }) },
    }
    indicadores.push(pastilla)
    return pastilla
  }

  const alActualizar = (_tiempo, delta) => kusi.setFrame(avanzarHablaKusi(habla, delta / 1000).cuadro)
  escena.events.on('update', alActualizar)
  const destruir = () => {
    if (destruido) return
    destruido = true
    escena.events.off('update', alActualizar)
    ocultar?.remove()
    for (const colocar of recolocarBotones) escena.scale.off('resize', colocar)
    for (const pieza of piezas) pieza.destroy()
  }
  escena.events.once('shutdown', destruir)
  escena.events.once('destroy', destruir)

  return {
    // «tipo» elige el turno de voz. «fijo» conserva el globo al terminar.
    decir: hablar,
    indicador,
    botonSoltar,
    // Cambia el dibujo del botón de sonido (apagado o encendido).
    sonido: (apagado) => sonido.imagen.setTexture(apagado ? 'boton-silencio' : 'boton-sonido'),
    destruir,
  }
}
