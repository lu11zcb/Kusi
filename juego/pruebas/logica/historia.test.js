import test from 'node:test'
import assert from 'node:assert/strict'
import {
  partirHistoria, debeContarHistoria, repartirPiezas, fondoDelCuento, laminasDelCuento, laminaDePagina, MAX_PIEZAS_PAGINA, MAX_PAGINAS_HISTORIA, MAX_CARACTERES_PAGINA, MAX_CARACTERES_FRASE,
} from '../../kit/reproductor/logica/historia.js'

test('una historia corta se junta en un solo globo', () => {
  assert.deepEqual(partirHistoria('Kusi arma un muñeco. ¡Ayúdalo!'), ['Kusi arma un muñeco. ¡Ayúdalo!'])
})

test('las frases que no caben juntas pasan a otro globo, sin pasar de tres', () => {
  const frase = 'Esta frase tiene casi la medida de un globo para que la siguiente no quepa con ella.'
  const paginas = partirHistoria([frase, frase, frase, frase, frase].join(' '))
  assert.equal(paginas.length, MAX_PAGINAS_HISTORIA)
  for (const pagina of paginas) assert.ok(pagina.length <= MAX_CARACTERES_PAGINA, pagina)
})

test('una frase demasiado larga se corta en una palabra, con puntos suspensivos', () => {
  const larga = Array.from({ length: 80 }, (_, n) => 'palabra' + n).join(' ') + '.'
  const [pagina] = partirHistoria(larga)
  assert.ok(pagina.length <= MAX_CARACTERES_FRASE)
  assert.match(pagina, /palabra\d+…$/)
})

test('sin historia, o con algo que no es texto, no hay globos', () => {
  for (const valor of [undefined, null, 7, {}, '', '   ']) assert.deepEqual(partirHistoria(valor), [], String(valor))
})

test('la historia se cuenta salvo que se pida un nivel, se apague o se reanude la partida', () => {
  const paginas = ['Hola.']
  assert.equal(debeContarHistoria({ busqueda: '?juego=x', paginas }), true)
  assert.equal(debeContarHistoria({ busqueda: '?juego=x&historia=0', paginas }), false)
  assert.equal(debeContarHistoria({ busqueda: '?juego=x&nivel=2', paginas }), false)
  assert.equal(debeContarHistoria({ busqueda: '', partida: { reanudada: true }, paginas }), false)
  assert.equal(debeContarHistoria({ busqueda: '', partida: { reanudada: false }, paginas }), true)
  assert.equal(debeContarHistoria({ busqueda: '', paginas: [] }), false)
})

test('las piezas del juego se reparten entre las páginas, sin fondos y con un máximo por página', () => {
  assert.deepEqual(repartirPiezas(['cabeza', 'fondo-fiesta', 'tronco', 'brazo', 'pierna'], 2), [['cabeza', 'brazo'], ['tronco', 'pierna']])
  const muchas = repartirPiezas(Array.from({ length: 12 }, (_, n) => 'pieza-' + n), 2)
  for (const pagina of muchas) assert.ok(pagina.length <= MAX_PIEZAS_PAGINA)
  assert.deepEqual(repartirPiezas(['a', 'a', 'b'], 1), [['a', 'b']])
  assert.deepEqual(repartirPiezas(undefined, 2), [[], []])
  assert.deepEqual(repartirPiezas(['a'], 0), [])
})

test('el fondo del cuento es el primer fondo nuevo del juego, o ninguno', () => {
  assert.equal(fondoDelCuento(['fresa', 'fondo-casa', 'fondo-rio']), 'fondo-casa')
  assert.equal(fondoDelCuento(['fresa']), null)
  assert.equal(fondoDelCuento(undefined), null)
})

test('las láminas del cuento se reconocen, van en orden y no cuentan como fondo del juego', () => {
  const piezas = ['fresa', 'fondo-cuento-2', 'fondo-tienda', 'fondo-cuento-1', 'fondo-cuento-1', 'fondo-cuento-10', 'cuento-1']
  assert.deepEqual(laminasDelCuento(piezas), ['fondo-cuento-1', 'fondo-cuento-2'])
  assert.equal(fondoDelCuento(piezas), 'fondo-tienda')
  assert.equal(fondoDelCuento(['fondo-cuento-1']), null)
  assert.deepEqual(repartirPiezas(['fondo-cuento-1', 'cabeza'], 1), [['cabeza']])
  assert.deepEqual(laminasDelCuento(undefined), [])
})

test('cada página usa su lámina, y si hay menos láminas que páginas, la última', () => {
  const laminas = ['fondo-cuento-1', 'fondo-cuento-2']
  assert.equal(laminaDePagina(laminas, 0), 'fondo-cuento-1')
  assert.equal(laminaDePagina(laminas, 1), 'fondo-cuento-2')
  assert.equal(laminaDePagina(laminas, 2), 'fondo-cuento-2')
  assert.equal(laminaDePagina([], 0), null)
})
