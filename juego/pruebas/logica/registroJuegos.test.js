import { test } from 'node:test'
import assert from 'node:assert/strict'
// Se importa con el atajo #kit/ a propósito: es el mismo que usan los juegos del taller,
// así que esta prueba también comprueba que el atajo funciona con node --test.
import {
  esIdTrabajo, rutaFicha, rutaGuionEjemplo, rutaPieza, claveEscena, trabajoPedido,
  elegirJuego, revisarFicha, clasificarPiezas, erroresDelValidar,
} from '#kit/reproductor/datos/registroJuegos.js'
import { OBJETOS_KIT } from '#kit/reproductor/dibujos/kitFinal.js'

// El registro decide qué juego abre un guion y dónde están sus archivos. El id del
// trabajo llega de afuera, así que solo un UUID arma una ruta.

const TRABAJO = '7a1f2b3c-4d5e-4f60-8a71-92b3c4d5e6f7'
class EscenaDePrueba {}
const fichaBuena = () => ({
  familia: 'memoria_andina',
  nombre: 'La memoria de Kusi',
  escena: EscenaDePrueba,
  validar: () => ({ valido: true, errores: [] }),
  piezas: ['fresa', 'olla-de-barro'],
})

test('solo un UUID en minúsculas es un id de trabajo', () => {
  assert.equal(esIdTrabajo(TRABAJO), true)
  for (const malo of ['../../kit', TRABAJO.toUpperCase(), TRABAJO + '/', TRABAJO.slice(1), 'http://otra.pagina/juego',
    '', null, undefined, 42, TRABAJO.replaceAll('-', '')]) {
    assert.equal(esIdTrabajo(malo), false, 'No debía aceptar ' + String(malo))
  }
})

test('las rutas del trabajo están dentro de taller/trabajos/<id>/', () => {
  assert.equal(rutaFicha(TRABAJO), 'taller/trabajos/' + TRABAJO + '/juego/juego.js')
  assert.equal(rutaGuionEjemplo(TRABAJO), 'taller/trabajos/' + TRABAJO + '/juego/guion-ejemplo.json')
  assert.equal(rutaPieza(TRABAJO, 'olla-de-barro'), 'taller/trabajos/' + TRABAJO + '/piezas/olla-de-barro.png')
  assert.equal(claveEscena(TRABAJO), 'taller:' + TRABAJO)
})

test('con un id que no es un UUID o una pieza mal escrita no se arma ninguna ruta', () => {
  assert.throws(() => rutaFicha('../../kit'), /no es un id válido/)
  assert.throws(() => rutaGuionEjemplo('x'), /no es un id válido/)
  assert.throws(() => claveEscena('laberinto'), /no es un id válido/)
  for (const pieza of ['../cuy', 'Olla', 'olla de barro', 'olla.png', '']) {
    assert.throws(() => rutaPieza(TRABAJO, pieza), /no tiene un nombre válido/)
  }
})

test('?juego= dice qué trabajo abrir', () => {
  assert.equal(trabajoPedido('?juego=' + TRABAJO + '&vida=0'), TRABAJO)
  assert.equal(trabajoPedido('?paquete=mensaje'), null)
  assert.equal(trabajoPedido('?juego='), null)
  // El id pedido se devuelve tal cual: la carga lo revisa con esIdTrabajo.
  assert.equal(trabajoPedido('?juego=../../kit'), '../../kit')
})

test('un guion sin trabajo es de la biblioteca; con trabajo, del taller', () => {
  assert.deepEqual(elegirJuego({ familia: 'laberinto' }), { taller: false })
  assert.deepEqual(elegirJuego({ familia: 'memoria_andina', trabajo: TRABAJO }), { taller: true, trabajo: TRABAJO })
  // El guion de ejemplo de ?juego= puede no decir su trabajo.
  assert.deepEqual(elegirJuego({ familia: 'memoria_andina' }, TRABAJO), { taller: true, trabajo: TRABAJO })
  assert.deepEqual(elegirJuego(undefined, TRABAJO), { taller: true, trabajo: TRABAJO })
})

test('un trabajo que no es un UUID, o el guion de otro trabajo, no se abre', () => {
  assert.throws(() => elegirJuego({ trabajo: '../../kit' }), /no es un id válido/)
  assert.throws(() => elegirJuego(undefined, 'laberinto'), /no es un id válido/)
  const otro = '00000000-0000-4000-8000-000000000000'
  assert.throws(() => elegirJuego({ trabajo: otro }, TRABAJO), /no del/)
})

test('una ficha completa de la misma familia que el guion pasa', () => {
  assert.deepEqual(revisarFicha(fichaBuena(), { familia: 'memoria_andina' }), { valido: true, errores: [] })
  assert.deepEqual(revisarFicha({ ...fichaBuena(), piezas: [] }, { familia: 'memoria_andina' }).valido, true)
})

test('una ficha incompleta o de otra familia no pasa, con sus motivos', () => {
  assert.equal(revisarFicha(undefined, {}).errores.length, 1)
  const incompleta = revisarFicha({ familia: 'memoria_andina' }, { familia: 'memoria_andina' })
  assert.equal(incompleta.valido, false)
  assert.equal(incompleta.errores.length, 4) // nombre, escena, validar y piezas
  assert.match(revisarFicha(fichaBuena(), { familia: 'otra_cosa' }).errores[0], /familia/)
  assert.match(revisarFicha({ ...fichaBuena(), familia: 'laberinto' }, { familia: 'laberinto' }).errores[0], /biblioteca/)
  assert.match(revisarFicha({ ...fichaBuena(), familia: 'Memoria' }, { familia: 'Memoria' }).errores[0], /familia/)
  assert.match(revisarFicha({ ...fichaBuena(), piezas: ['../cuy'] }, { familia: 'memoria_andina' }).errores[0], /pieza/)
})

test('las piezas se reparten entre el kit y el trabajo, sin repetir', () => {
  assert.deepEqual(clasificarPiezas(['fresa', 'olla-de-barro', 'fresa', 'papa', 'fondo-chacra'], OBJETOS_KIT), {
    delKit: ['fresa', 'papa'],
    delTrabajo: ['olla-de-barro', 'fondo-chacra'],
  })
})

test('el resultado del validar de un juego se lee igual que el de los validadores del kit', () => {
  assert.deepEqual(erroresDelValidar({ valido: true, errores: [] }), [])
  assert.deepEqual(erroresDelValidar({ valido: false, errores: ['Falta el nivel 2.'] }), ['Falta el nivel 2.'])
  assert.equal(erroresDelValidar({ valido: false }).length, 1)
  assert.equal(erroresDelValidar(true).length, 1)
  assert.equal(erroresDelValidar(undefined).length, 1)
})
