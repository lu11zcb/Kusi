import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { crearZorro, avanzarZorro, restablecerZorro, elegirCaminoDeBusqueda, posicionEnCasillas } from '../../src/logica/zorrosLaberinto.js'

const MAPA = ['#############', '#C.........P#', '#...........#', '#...........#', '#############']
const crear = (fila = 1, columna = 6, semilla = 37) => crearZorro(
  { fila, columna, movimiento: 'persigue_cerca' }, MAPA, { vivo: true, semilla },
)
const CUY = { fila: 1, columna: 1 }

test('a cinco pasos se detiene 0,6 s antes de perseguir al 60 %', () => {
  const zorro = crear()
  avanzarZorro(zorro, MAPA, CUY, 0.59, 1.8)
  assert.equal(zorro.fase, 'alerta')
  assert.deepEqual(posicionEnCasillas(zorro), { fila: 1, columna: 6 })
  assert.equal(zorro.iniciosPersecucion, 1)
  avanzarZorro(zorro, MAPA, CUY, 0.01, 1.8)
  assert.equal(zorro.fase, 'perseguir')
  avanzarZorro(zorro, MAPA, CUY, 0.5, 3 * 0.6)
  assert.equal(zorro.direccion, 'izquierda')
  assert.ok(Math.abs(posicionEnCasillas(zorro).columna - 5.1) < 0.000001)
  assert.equal(zorro.iniciosPersecucion, 1)
})

test('a seis pasos o detrás de muros sigue buscando; la distancia usa pasillos', () => {
  const zorro = crear(1, 7)
  avanzarZorro(zorro, MAPA, CUY, 0.01)
  assert.equal(zorro.fase, 'buscar')
  const separado = ['#######', '#C#..P#', '#.#.#.#', '#.....#', '#######']
  const otro = crearZorro({ fila: 1, columna: 3, movimiento: 'persigue_cerca' }, separado, { vivo: true })
  avanzarZorro(otro, separado, CUY, 0.01)
  assert.equal(otro.fase, 'buscar')
})

test('se cansa a los cinco segundos, descansa dos y vuelve a buscar', () => {
  const zorro = crear()
  avanzarZorro(zorro, MAPA, CUY, 0.6 + 5)
  assert.equal(zorro.fase, 'cansado')
  assert.equal(zorro.segundosDescanso, 2)
  const posicion = posicionEnCasillas(zorro)
  avanzarZorro(zorro, MAPA, CUY, 1.9)
  assert.deepEqual(posicionEnCasillas(zorro), posicion)
  avanzarZorro(zorro, MAPA, { fila: 3, columna: 11 }, 0.1)
  assert.equal(zorro.fase, 'buscar')
  assert.equal(zorro.segundosDescanso, 0)
})

test('el paseo elige salidas reproducibles y evita regresar si hay otra salida', () => {
  const zorro = crear(2, 6)
  for (let indice = 0; indice < 100; indice++) {
    assert.notEqual(elegirCaminoDeBusqueda(zorro, MAPA), 'izquierda')
  }
  const primero = crear(2, 6, 818)
  const segundo = crear(2, 6, 818)
  const muestras = []
  for (let indice = 0; indice < 100; indice++) {
    avanzarZorro(primero, MAPA, { fila: -1, columna: -1 }, 0.1)
    avanzarZorro(segundo, MAPA, { fila: -1, columna: -1 }, 0.1)
    assert.deepEqual(primero, segundo)
    assert.notEqual(MAPA[primero.fila][primero.columna], '#')
    muestras.push(primero.direccion)
  }
  assert.ok(new Set(muestras).size > 1)
  restablecerZorro(primero)
  assert.equal(primero.fase, 'buscar')
  assert.equal(primero.semilla, 818)
})

test('un cuadro largo y muchos pequeños recorren los mismos estados y posiciones', () => {
  const largo = crear()
  const corto = crear()
  avanzarZorro(largo, MAPA, CUY, 9)
  for (let indice = 0; indice < 900; indice++) avanzarZorro(corto, MAPA, CUY, 0.01)
  assert.equal(largo.fase, corto.fase)
  assert.equal(largo.iniciosPersecucion, corto.iniciosPersecucion)
  assert.ok(Math.abs(largo.segundosPersiguiendo - corto.segundosPersiguiendo) < 0.000001)
  assert.deepEqual(posicionEnCasillas(largo), posicionEnCasillas(corto))
})

test('la hoja tiene alerta en la quinta fila y el primer nivel sigue sin zorro', async () => {
  const datos = JSON.parse(await readFile(new URL('../../public/dibujos/zorro-animado-v1.json', import.meta.url)))
  assert.equal(datos.cuadricula.filas, 5)
  assert.deepEqual(datos.animaciones.frente.alerta.fotogramas, [12, 13, 14, 13])
  const paquete = JSON.parse(await readFile(new URL('../../public/paquete-laberinto-ejemplo.json', import.meta.url)))
  assert.deepEqual(paquete.retos[0].enemigos, [])
})

test('la búsqueda visita todos los pasillos y ramales aunque el jugador no se mueva', async () => {
  const paquete=JSON.parse(await readFile(new URL('../../public/paquete-laberinto-ejemplo.json',import.meta.url)))
  for(const reto of paquete.retos.slice(1)){
    const zorro=crearZorro(reto.enemigos[0],reto.mapa,{vivo:true,semilla:307})
    let cantidad=0
    for(const fila of reto.mapa)for(const c of fila)if(c!=='#')cantidad++
    // Fuera del radio de detección para medir únicamente la exploración.
    for(let i=0;i<10000&&Object.keys(zorro.visitas).length<cantidad;i++){
      avanzarZorro(zorro,reto.mapa,{fila:-1,columna:-1},.1,1.8)
      assert.notEqual(reto.mapa[zorro.fila][zorro.columna],'#')
    }
    assert.equal(Object.keys(zorro.visitas).length,cantidad,reto.id)
    restablecerZorro(zorro)
    assert.equal(Object.keys(zorro.visitas).length,1)
  }
})
