// La interfaz común de un juego del taller. Todos los juegos se ven y se manejan igual de bien porque
// usan esta misma, en vez de inventar la suya:
//
//   arriba a la izquierda   Kusi, con su globo cuando habla (el globo se esconde solo; tocar a Kusi lo repite)
//   arriba a la derecha     tres botones redondos: sonido, Escuchar y Ayuda
//   debajo de los botones   indicadores con un dibujo y un número (nivel, cosas reunidas…)
//   abajo                   los controles (./controles.js): el joystick
//
//   const hud = crearHud(this, { alEscuchar: () => hud.decir(consigna), alAyuda: () => … })
//   hud.decir('Busca las luciérnagas')
//   const reunidas = hud.indicador({ icono: 'luciernaga', texto: '0 / 10' })
//   reunidas.poner('3 / 10')
//
// Todo está en la pantalla (scrollFactor 0) y por encima del mundo. Kusi habla con voz y en su globo;
// con el sonido apagado, el globo igual se lee (regla 6).

import { COLOR, NUMERO, estiloTexto } from '../medidas.js'
import { dibujarGlobo } from './piezas.js'
import { decir } from '../logica/voz.js'
import { crearHablaKusi, iniciarHablaKusi, avanzarHablaKusi } from '../logica/hablaKusi.js'
import { vidaActiva } from '../efectos/vida.js'

const PROFUNDIDAD = 4000
const LADO_BOTON = 76

export function crearHud(escena, { alEscuchar = null, alAyuda = null, alSilenciar = null, silenciado = false } = {}) {
  const piezas = []
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
  let turno = 0
  let ultimoTexto = ''

  const mostrarGlobo = (frase, { fijo = false } = {}) => {
    ultimoTexto = frase
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
    if (!fijo) {
      ocultar = escena.time.delayedCall(Math.min(9000, 3500 + frase.length * 55), () => {
        escena.tweens.add({ targets: [globo, texto], alpha: 0, duration: 400 })
      })
    }
  }

  const hablar = (frase, opciones = {}) => {
    if (!frase) return
    mostrarGlobo(frase, opciones)
    iniciarHablaKusi(habla, frase)
    const este = turno += 1
    decir(frase, {
      alEmpezar: () => {
        if (turno !== este) return
        iniciarHablaKusi(habla, frase)
        habla.vozActiva = typeof window.KusiPuente?.decir !== 'function'
      },
      alTerminar: () => { if (turno === este) { habla.vozActiva = false; habla.restante = 0 } },
    })
  }
  kusi.on('pointerup', () => { if (ultimoTexto) hablar(ultimoTexto) })

  // Tres botones redondos con su dibujo y su nombre, arriba a la derecha.
  const boton = (clave, indice, nombre, accion) => {
    const x = ancho - 52 - indice * (LADO_BOTON + 22)
    const imagen = agregar(escena.add.image(x, 52, clave).setDisplaySize(LADO_BOTON, LADO_BOTON).setScrollFactor(0).setDepth(PROFUNDIDAD).setInteractive({ useHandCursor: true }))
    const etiqueta = agregar(escena.add.text(x, 52 + LADO_BOTON / 2 + 12, nombre, estiloTexto(20, COLOR.tinta)).setOrigin(0.5).setScrollFactor(0).setDepth(PROFUNDIDAD))
    imagen.on('pointerdown', (puntero, x1, y1, evento) => { evento?.stopPropagation?.(); accion?.() })
    return { imagen, etiqueta }
  }
  const sonido = boton(silenciado ? 'boton-silencio' : 'boton-sonido', 0, 'Sonido', () => alSilenciar?.())
  boton('boton-voz', 1, 'Escuchar', () => alEscuchar?.())
  boton('boton-ayuda', 2, 'Ayuda', () => alAyuda?.())

  // Indicadores: una pastilla con un dibujo y un número, debajo de los botones.
  const indicadores = []
  const indicador = ({ icono = null, texto: inicial = '' } = {}) => {
    const y = 168 + indicadores.length * 70
    const fondo = agregar(escena.add.rectangle(ancho - 20, y, 40, 56, NUMERO.crema, 0.96).setOrigin(1, 0.5).setStrokeStyle(4, NUMERO.tinta).setRounded(26).setScrollFactor(0).setDepth(PROFUNDIDAD))
    const cifra = agregar(escena.add.text(ancho - 40, y, inicial, estiloTexto(34, COLOR.tinta)).setOrigin(1, 0.5).setScrollFactor(0).setDepth(PROFUNDIDAD + 1))
    let imagen = null
    if (icono && escena.textures.exists(icono)) {
      imagen = agregar(escena.add.image(0, y, icono).setScrollFactor(0).setDepth(PROFUNDIDAD + 1))
      const escala = Math.min(46 / imagen.width, 46 / imagen.height)
      imagen.setScale(escala)
    }
    const ajustar = () => {
      const largo = cifra.width + (imagen ? 70 : 28)
      fondo.setSize(largo, 56)
      if (imagen) imagen.setPosition(ancho - 20 - largo + 36, y)
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
  let destruido = false
  const destruir = () => {
    if (destruido) return
    destruido = true
    escena.events.off('update', alActualizar)
    ocultar?.remove()
    globalThis.speechSynthesis?.cancel?.()
    for (const pieza of piezas) pieza.destroy()
  }
  escena.events.once('shutdown', destruir)
  escena.events.once('destroy', destruir)

  return {
    // Kusi dice algo con voz y en su globo. «fijo» deja el globo hasta que hable otra vez.
    decir: hablar,
    indicador,
    // Cambia el dibujo del botón de sonido (apagado o encendido).
    sonido: (apagado) => sonido.imagen.setTexture(apagado ? 'boton-silencio' : 'boton-sonido'),
    destruir,
  }
}
