import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'

// El catálogo del kit le dice a la IA qué piezas existen. Esta prueba revisa que
// cada archivo nombrado en el catálogo exista de verdad en public/, para que la
// lista nunca quede desactualizada cuando se agregue o se borre un dibujo.
const catalogo = JSON.parse(readFileSync(new URL('../../kit/catalogo.json', import.meta.url), 'utf8'))

// Junta todos los textos del catálogo que terminan en una extensión de archivo.
function rutasDelCatalogo(valor, rutas = []) {
  if (typeof valor === 'string') {
    if (/\.(png|json|ogg|wav|webp)$/.test(valor)) rutas.push(valor)
  } else if (Array.isArray(valor)) {
    for (const elemento of valor) rutasDelCatalogo(elemento, rutas)
  } else if (valor && typeof valor === 'object') {
    for (const elemento of Object.values(valor)) rutasDelCatalogo(elemento, rutas)
  }
  return rutas
}

test('cada archivo del catálogo del kit existe en public/', () => {
  const rutas = rutasDelCatalogo(catalogo)
  assert.ok(rutas.length > 30, 'el catálogo debería nombrar más de 30 archivos')
  for (const ruta of rutas) {
    assert.ok(existsSync(new URL('../../kit/recursos/' + ruta, import.meta.url)), 'falta ' + ruta)
  }
})

test('el catálogo tiene los ocho alimentos con su clase', () => {
  const clases = Object.fromEntries(catalogo.objetos.map((objeto) => [objeto.id, objeto.clase]))
  assert.deepEqual(Object.keys(clases).sort(), ['choclo', 'fresa', 'mandarina', 'mango', 'papa', 'pina', 'platano', 'zanahoria'])
  assert.equal(Object.values(clases).filter((clase) => clase === 'fruta').length, 5)
})
