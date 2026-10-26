import { test } from 'node:test'
import assert from 'node:assert/strict'
import { calcularDisposicion, distribuirBarra, distribuirGuia } from '../../src/logica/disposicionLaberinto.js'

// Los tres niveles del paquete de ejemplo: 7 × 11 y dos de 9 × 15 (con el borde de muros).
const MAPAS = [{ filas: 7, columnas: 11 }, { filas: 9, columnas: 15 }, { filas: 3, columnas: 13 }]
const ORDEN = { tipo: 'orden', secuencia: ['fresa', 'platano', 'fresa', 'platano'] }
const CLASE = { tipo: 'solo_clase', clase: 'fruta', meta: 4 }

// Un celular horizontal de «ancho» × «alto» píxeles: el alto base siempre se ve
// completo (720 unidades), así que el lienzo mide 720 × ancho / alto unidades.
const celular = (ancho, alto) => ({ ancho: Math.round(720 * ancho / alto), alto: 720, zoom: alto / 720 })
const dentro = (pieza, caja) => pieza.x >= caja.x && pieza.y >= caja.y &&
  pieza.x + pieza.ancho <= caja.x + caja.ancho && pieza.y + pieza.alto <= caja.y + caja.alto
const caja = (centro) => ({ x: centro.x - centro.ancho / 2, y: centro.y - centro.alto / 2, ancho: centro.ancho, alto: centro.alto })
const seSuperponen = (a, b) => a.x < b.x + b.ancho && a.x + a.ancho > b.x && a.y < b.y + b.alto && a.y + a.alto > b.y

test('con 1280 x 720 se conserva la disposición clásica de siempre', () => {
  const nivel1 = calcularDisposicion({ ancho: 1280, alto: 720, ...MAPAS[0] })
  assert.equal(nivel1.tipo, 'clasica')
  assert.equal(nivel1.casilla, 81)
  assert.deepEqual(nivel1.origen, { x: 292.5, y: 136 + (568 - 7 * 81) / 2 })
  assert.deepEqual(nivel1.diseno, { ancho: 1280, alto: 720 })
  assert.equal(nivel1.panel, null)
  const nivel2 = calcularDisposicion({ ancho: 1280, alto: 720, ...MAPAS[1] })
  assert.equal(nivel2.tipo, 'clasica')
  assert.equal(nivel2.casilla, 63)
})

test('en un celular de 800 x 360 todas las casillas miden al menos 40 px', () => {
  const pantalla = celular(800, 360)
  assert.equal(pantalla.ancho, 1600)
  for (const mapa of MAPAS.slice(0, 2)) {
    const disposicion = calcularDisposicion({ ...pantalla, ...mapa })
    assert.equal(disposicion.tipo, 'lateral')
    assert.ok(disposicion.casilla * pantalla.zoom >= 40, mapa.filas + ' filas: ' + disposicion.casilla * pantalla.zoom + ' px')
  }
  // El nivel de 9 filas llena justo el alto; el de 7 se agranda más.
  assert.equal(calcularDisposicion({ ...pantalla, ...MAPAS[1] }).casilla, 80)
  assert.equal(calcularDisposicion({ ...pantalla, ...MAPAS[0] }).casilla, 102)
})

test('otros celulares alargados también ganan casilla, y 16:9 no cambia', () => {
  const casos = [
    { nombre: '844 x 390', pantalla: celular(844, 390), minimo: 40 },
    { nombre: '932 x 430', pantalla: celular(932, 430), minimo: 40 },
    { nombre: '915 x 412', pantalla: celular(915, 412), minimo: 40 },
  ]
  for (const { nombre, pantalla, minimo } of casos) {
    const disposicion = calcularDisposicion({ ...pantalla, ...MAPAS[1] })
    assert.equal(disposicion.tipo, 'lateral', nombre)
    assert.ok(disposicion.casilla * pantalla.zoom >= minimo, nombre + ': ' + disposicion.casilla * pantalla.zoom)
  }
  // Un celular de 16:9 no tiene espacio de sobra: se queda con la disposición clásica.
  for (const [ancho, alto] of [[1280, 720], [1136, 640], [667, 375]]) {
    const pantalla = celular(ancho, alto)
    assert.equal(calcularDisposicion({ ...pantalla, ...MAPAS[1] }).tipo, 'clasica', ancho + ' x ' + alto)
  }
  // Una pantalla alta (tableta, ventana angosta) tampoco usa el panel lateral.
  assert.equal(calcularDisposicion({ ancho: 1280, alto: 960, ...MAPAS[1] }).tipo, 'clasica')
  assert.equal(calcularDisposicion({ ancho: 1280, alto: 2800, ...MAPAS[0] }).tipo, 'clasica')
})

test('la disposición lateral cabe siempre dentro del lienzo y deja el panel completo', () => {
  for (let ancho = 1280; ancho <= 2600; ancho += 20) {
    for (const mapa of MAPAS) {
      const disposicion = calcularDisposicion({ ancho, alto: 720, ...mapa })
      const lienzo = { x: 0, y: 0, ancho: disposicion.diseno.ancho, alto: disposicion.diseno.alto }
      assert.ok(dentro(disposicion.mapa, lienzo), 'mapa dentro del lienzo con ancho ' + ancho)
      assert.equal(disposicion.mapa.ancho, mapa.columnas * disposicion.casilla)
      assert.equal(disposicion.mapa.alto, mapa.filas * disposicion.casilla)
      if (disposicion.tipo === 'lateral') {
        assert.ok(disposicion.diseno.ancho === ancho)
        assert.ok(disposicion.panel.ancho >= 340 && disposicion.panel.ancho <= 420)
        assert.ok(dentro(disposicion.panel, lienzo), 'panel dentro del lienzo')
        assert.ok(!seSuperponen(disposicion.panel, disposicion.mapa), 'el panel no pisa el mapa')
        // Entre el panel y el mapa queda un hueco.
        assert.ok(disposicion.mapa.x - (disposicion.panel.x + disposicion.panel.ancho) >= 12 - 1e-9)
      }
      // Nunca elige una casilla más chica que la clásica.
      assert.ok(disposicion.casilla >= calcularDisposicion({ ancho: 1280, alto: 720, ...mapa }).casilla)
      // La decoración no cae dentro del mapa.
      for (const lugar of disposicion.decoracion) {
        assert.ok(!(lugar.x > disposicion.mapa.x && lugar.x < disposicion.mapa.x + disposicion.mapa.ancho &&
          lugar.y > disposicion.mapa.y && lugar.y < disposicion.mapa.y + disposicion.mapa.alto), 'decoración fuera del camino')
      }
    }
  }
})

test('la barra clásica conserva las medidas de siempre', () => {
  const clasica = calcularDisposicion({ ancho: 1280, alto: 720, ...MAPAS[0] })
  const orden = distribuirBarra(clasica, ORDEN)
  assert.deepEqual(orden.caja, { x: 20, y: 12, ancho: 1240, alto: 104 })
  assert.deepEqual(orden.fichas.map((ficha) => ficha.x), [346, 456, 566, 676])
  assert.ok(orden.fichas.every((ficha) => ficha.ancho === 78 && ficha.y === 64))
  assert.deepEqual(orden.botones.escuchar, { x: 1030, y: 62, ancho: 138, alto: 72, tamano: 27 })
  assert.deepEqual(orden.botones.ayuda, { x: 1184, y: 62, ancho: 118, alto: 72, tamano: 28 })
  const clase = distribuirBarra(clasica, CLASE)
  assert.deepEqual(clase.icono, { x: 344, y: 64, lado: 78 })
  assert.deepEqual(clase.fichas.map((ficha) => ficha.x), [432, 502, 572, 642])
  assert.ok(clase.fichas.every((ficha) => ficha.ancho === 58 && ficha.alto === 58))
})

test('la tarjeta lateral reparte título, casillas y botones sin pisarse', () => {
  const lateral = calcularDisposicion({ ...celular(800, 360), ...MAPAS[1] })
  for (const regla of [ORDEN, CLASE, { ...ORDEN, secuencia: ['fresa', 'platano', 'fresa', 'platano', 'mango', 'pina'] },
    { ...CLASE, meta: 6 }]) {
    const barra = distribuirBarra(lateral, regla)
    assert.ok(dentro(barra.caja, { x: lateral.panel.x, y: 0, ancho: lateral.panel.ancho, alto: lateral.panel.alto }))
    const piezas = barra.fichas.map((ficha) => caja(ficha))
    if (barra.icono) piezas.push(caja({ ...barra.icono, ancho: barra.icono.lado, alto: barra.icono.lado }))
    const botones = Object.values(barra.botones).map((boton) => caja(boton))
    for (const pieza of [...piezas, ...botones]) assert.ok(dentro(pieza, barra.caja), 'cabe en la tarjeta')
    const todas = [...piezas, ...botones]
    for (let a = 0; a < todas.length; a += 1) {
      for (let b = a + 1; b < todas.length; b += 1) assert.ok(!seSuperponen(todas[a], todas[b]), 'sin pisarse')
    }
    // El título y el subtítulo quedan arriba de las casillas y de los botones.
    assert.ok(barra.subtitulo.y + 36 <= Math.min(...piezas.map((pieza) => pieza.y)) + 4)
    // Los botones se pueden tocar con el dedo: al menos 36 px de alto en un celular de 360.
    assert.ok(Object.values(barra.botones).every((boton) => boton.alto * 0.5 >= 36))
  }
})

test('la columna de Kusi cabe bajo la tarjeta y dentro del panel lateral', () => {
  const clasica = calcularDisposicion({ ancho: 1280, alto: 720, ...MAPAS[1] })
  const guiaClasica = distribuirGuia(clasica)
  assert.deepEqual(guiaClasica.caja, { x: 10, y: 276, ancho: 196, alto: 432 })
  assert.deepEqual(guiaClasica.altavoz, { x: 166, y: 674 })

  const lateral = calcularDisposicion({ ...celular(800, 360), ...MAPAS[1] })
  const guia = distribuirGuia(lateral)
  const barra = distribuirBarra(lateral, ORDEN)
  assert.equal(guia.caja.x, lateral.panel.x + 10)
  assert.ok(dentro(guia.caja, { x: lateral.panel.x, y: 0, ancho: lateral.panel.ancho, alto: lateral.panel.alto }))
  // La tarjeta termina antes de que empiece el letrero.
  assert.ok(barra.caja.y + barra.caja.alto < guia.etiqueta.y - guia.etiqueta.alto / 2)
  assert.ok(!seSuperponen(caja(guia.etiqueta), barra.caja))
  assert.ok(!seSuperponen(caja(guia.globo), caja(guia.etiqueta)))
  // Y la decoración del hueco no tapa ni el globo ni Kusi.
  for (const lugar of lateral.decoracion) {
    const marca = { x: lugar.x - 12, y: lugar.y - 12, ancho: 24, alto: 24 }
    assert.ok(!seSuperponen(marca, caja(guia.globo)) && !seSuperponen(marca, caja({ ...guia.kusi, y: guia.kusi.y - guia.kusi.alto / 2 })))
    assert.ok(!seSuperponen(marca, barra.caja))
  }
})
