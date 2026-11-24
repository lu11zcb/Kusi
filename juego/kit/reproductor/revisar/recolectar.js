function visibleEn(objeto, camara) {
  return objeto.visible !== false && objeto.alpha !== 0 && objeto.willRender?.(camara) !== false
}

function rectangulo(x, y, ancho, alto) {
  return { x, y, ancho, alto }
}

function interseccion(a, b) {
  const x = Math.max(a.x, b.x)
  const y = Math.max(a.y, b.y)
  const ancho = Math.min(a.x + a.ancho, b.x + b.ancho) - x
  const alto = Math.min(a.y + a.alto, b.y + b.alto) - y
  return ancho > 0 && alto > 0 ? rectangulo(x, y, ancho, alto) : null
}

function limitesLocales(objeto) {
  // Un dibujo que importa aunque no se toque puede llevar objetoDeJuego.
  // Graphics y los contenedores sin tamaño propio pueden dar su caja local.
  const explicita = objeto.getData?.('cajaPantalla')
  if (explicita) return explicita
  const origenX = objeto.displayOriginX ?? 0
  const origenY = objeto.displayOriginY ?? 0
  const trazo = objeto.isStroked ? objeto.lineWidth / 2 : 0
  if (objeto.width > 0 && objeto.height > 0) {
    return rectangulo(-origenX - trazo, -origenY - trazo, objeto.width + trazo * 2, objeto.height + trazo * 2)
  }
  const area = objeto.input?.hitArea
  return area && rectangulo(area.left - origenX, area.top - origenY, area.right - area.left, area.bottom - area.top)
}

function medir(objeto, camara) {
  const local = limitesLocales(objeto)
  const mundo = objeto.getWorldTransformMatrix?.()
  if (!mundo || !(local?.ancho > 0 && local.alto > 0)) return null

  // Phaser incluye el scroll en la matriz de cámara. Se repone la parte que
  // el objeto ignora (toda para el HUD fijo), antes de pasar a pantalla.
  const matriz = camara.matrixCombined
  let factorX = 1
  let factorY = 1
  for (let padre = objeto; padre; padre = padre.parentContainer) {
    factorX *= padre.scrollFactorX ?? 1
    factorY *= padre.scrollFactorY ?? 1
  }
  const scrollX = camara.scrollX * (1 - factorX)
  const scrollY = camara.scrollY * (1 - factorY)
  const proyectar = (x, y) => {
    const punto = mundo.transformPoint(x, y)
    return matriz.transformPoint(punto.x + scrollX, punto.y + scrollY)
  }
  const { x, y, ancho, alto } = local
  const esquinas = [proyectar(x, y), proyectar(x + ancho, y), proyectar(x, y + alto), proyectar(x + ancho, y + alto)]
  const xs = esquinas.map((punto) => punto.x)
  const ys = esquinas.map((punto) => punto.y)
  const izquierda = Math.min(...xs)
  const arriba = Math.min(...ys)
  const caja = rectangulo(izquierda, arriba, Math.max(...xs) - izquierda, Math.max(...ys) - arriba)
  const vertical = proyectar(0, 1)
  const origen = proyectar(0, 0)
  return { caja, fijo: factorX === 0 && factorY === 0, vertical: { x: vertical.x - origen.x, y: vertical.y - origen.y } }
}

function puntoDeToque(escena, camara, objeto, vista, alLienzo) {
  const gestor = escena.input?.manager
  if (!gestor) return { x: vista.x + vista.ancho / 2, y: vista.y + vista.alto / 2 }
  const entrada = objeto.input
  const { localX, localY } = entrada
  // El centro es el primer candidato. Otros puntos sirven cuando el dibujo
  // tiene un hueco o su área de toque no es rectangular.
  try {
    for (const [fraccionX, fraccionY] of [[0.5, 0.5], [0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]]) {
      const x = vista.x + vista.ancho * fraccionX
      const y = vista.y + vista.alto * fraccionY
      if (gestor.hitTest(alLienzo(x, y), [objeto], camara, []).includes(objeto)) return { x, y }
    }
    return null
  } finally {
    // Phaser guarda la posición local del hit test. Se restaura porque la
    // consulta del revisor no debe reemplazar la posición del dedo del niño.
    entrada.localX = localX
    entrada.localY = localY
  }
}

// Solo devuelve datos. Ni consultar los objetos ni probar su área de toque
// dispara eventos de juego. Las cajas usan píxeles CSS, igual que los toques.
export function recolectarPantalla(juego, { ancho, alto }) {
  const cajas = []
  const toques = []
  const pantalla = rectangulo(0, 0, ancho, alto)
  const lienzo = juego.canvas?.getBoundingClientRect()
  const base = juego.scale?.baseSize
  const escenas = juego.scene.getScenes(true).filter((escena) => escena.sys.settings.visible !== false)
  const datosNivel = escenas.find((escena) => escena.sys.settings.data?.paquete)?.sys.settings.data
  const portada = escenas.some((escena) => escena.sys.settings.key === 'historia')
  if (!lienzo?.width || !lienzo.height || !base?.width || !base.height) return { ancho, alto, cajas, toques, portada }
  const escalaX = lienzo.width / base.width
  const escalaY = lienzo.height / base.height
  const aPantalla = (caja) => rectangulo(lienzo.left + caja.x * escalaX, lienzo.top + caja.y * escalaY,
    caja.ancho * escalaX, caja.alto * escalaY)
  const alLienzo = (x, y) => ({ x: (x - lienzo.left) / escalaX, y: (y - lienzo.top) / escalaY })

  for (const escena of escenas) {
    for (const [indice, camara] of escena.cameras.cameras.entries()) {
      if (camara.visible === false || camara.alpha === 0) continue
      const vista = interseccion(pantalla, aPantalla(rectangulo(camara.x, camara.y, camara.width, camara.height)))
      if (!vista) continue

      const recorrer = (lista, ruta, hudPadre = false) => {
        for (const [posicion, objeto] of lista.entries()) {
          if (!visibleEn(objeto, camara)) continue
          const id = ruta + '.' + posicion
          const hud = hudPadre || objeto.getData?.('hud') === true
          if (Array.isArray(objeto.list)) recorrer(objeto.list, id, hud)
          const texto = objeto.type === 'Text' ? objeto.text?.trim() : null
          const tocable = escena.input?.enabled !== false && camara.inputEnabled !== false && objeto.input?.enabled === true
          const objetoDeJuego = objeto.getData?.('objetoDeJuego') === true
          if (!hud && !texto && !tocable && !objetoDeJuego) continue

          const medida = medir(objeto, camara)
          if (!medida) continue
          const caja = aPantalla(medida.caja)
          const parteVisible = interseccion(caja, vista)
          const etiqueta = objeto.getData?.('idPantalla') || objeto.name || objeto.texture?.key || objeto.type
          if (tocable && parteVisible) {
            const punto = puntoDeToque(escena, camara, objeto, parteVisible, alLienzo)
            if (punto) toques.push({ id, ...punto, hud })
          }
          // Una zona invisible puede recibir toques. En un mundo que se desplaza,
          // también hay objetos fuera de la vista que aparecerán al avanzar.
          if (objeto.type === 'Zone' || (!parteVisible && !hud && !medida.fijo && (camara.useBounds || camara._follow))) continue
          const tipo = texto ? 'texto' : hud ? 'hud' : 'objeto'
          const letra = Number.parseFloat(objeto.style?.fontSize) *
            Math.hypot(medida.vertical.x * escalaX, medida.vertical.y * escalaY)
          cajas.push({ id: etiqueta ? etiqueta + ' (' + id + ')' : id, tipo, ...caja, hud, tocable, objetoDeJuego,
            ...(texto ? { texto, letra, letraDelKit: portada } : {}) })
        }
      }
      recorrer(escena.children.list, escena.sys.settings.key + ':' + indice)
    }
  }
  return { ancho, alto, cajas, toques, portada, niveles: datosNivel?.paquete.retos?.length ?? 0 }
}
