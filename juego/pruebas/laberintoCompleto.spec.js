import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'

const RUTA_PAQUETE = new URL('../public/paquete-laberinto-ejemplo.json', import.meta.url)
const CLAVE_MANO = 'kusi-laberinto-deslizar-v1'
const estado = (pagina) => pagina.evaluate(() => window.kusi.estado())
const leerPaquete = async () => JSON.parse(await readFile(RUTA_PAQUETE, 'utf8'))

async function abrirLaberinto(pagina, rapido = true) {
  await pagina.goto('/?paquete=laberinto' + (rapido ? '&rapido=1' : ''))
  await pagina.waitForFunction(() => window.kusi?.listo && window.kusi.estado().familia === 'laberinto')
  return estado(pagina)
}

async function esperarCasilla(pagina, fila, columna) {
  await pagina.waitForFunction(({ fila, columna }) => {
    const movimiento = window.kusi.estado().movimiento
    return movimiento.fila === fila && movimiento.columna === columna && !movimiento.moviendose
  }, { fila, columna })
  return estado(pagina)
}

async function tocar(pagina, nombre) {
  const punto = await pagina.evaluate((nombre) => window.kusi.ubicar(nombre), nombre)
  expect(punto).not.toBeNull()
  await pagina.mouse.click(punto.x, punto.y)
}

async function servirPaquete(pagina, paquete) {
  await pagina.route('**/paquete-laberinto-ejemplo.json', (ruta) => ruta.fulfill({ json: paquete }))
}

function comprobarOrdenDeAvisos(avisos) {
  expect(avisos.length).toBeGreaterThan(0)
  expect(typeof avisos[0].partida).toBe('string')
  expect(avisos[0].partida.length).toBeGreaterThan(0)
  expect(avisos.every((aviso) => aviso.partida === avisos[0].partida)).toBe(true)
  expect(avisos.map((aviso) => aviso.orden)).toEqual(avisos.map((aviso, indice) => indice + 1))
}

// El recorrido utiliza únicamente teclas reales y espera en los muros. La vuelta
// se pide antes de la intersección para comprobar también que queda guardada.
async function recogerPrimerasTresFrutas(pagina) {
  await pagina.keyboard.press('ArrowRight')
  await esperarCasilla(pagina, 1, 9)
  await pagina.keyboard.press('ArrowDown')
  await pagina.waitForFunction(() => window.kusi.estado().movimiento.fila === 2)
  await pagina.keyboard.press('ArrowLeft')
  return esperarCasilla(pagina, 3, 5)
}

test('come las cuatro frutas del nivel real, abre la puerta y entra al nivel 2', async ({ page: pagina }) => {
  const errores = []
  pagina.on('pageerror', (error) => errores.push(error.message))
  await abrirLaberinto(pagina, false)
  const tresFrutas = await recogerPrimerasTresFrutas(pagina)
  expect(tresFrutas.regla.recogidos).toBe(3)
  expect(tresFrutas.puertaAbierta).toBe(false)
  await pagina.keyboard.press('ArrowDown')
  await esperarCasilla(pagina, 5, 5)
  await pagina.keyboard.press('ArrowRight')
  await pagina.waitForFunction(() => {
    const actual = window.kusi.estado()
    return actual.nivel === 1 && actual.regla.recogidos === 4 && actual.puertaAbierta
  })
  const abierta = await estado(pagina)
  expect(abierta.regla.completada).toBe(true)
  expect(abierta.regla.objetos.every((objeto) => objeto.recogido)).toBe(true)
  await pagina.waitForFunction(() => window.kusi.estado().nivel === 2)
  const segundo = await estado(pagina)
  expect(segundo.regla.recogidos).toBe(0)
  expect(segundo.puertaAbierta).toBe(false)
  expect(segundo.manoVisible).toBe(false)
  expect(segundo.zorros).toHaveLength(1)
  expect(segundo.zorros[0].mirando).toBe('frente')

  const avisos = await pagina.evaluate(() => window.kusi.avisos)
  comprobarOrdenDeAvisos(avisos)
  expect(avisos.filter((aviso) => aviso.tipo === 'listo')).toHaveLength(1)
  expect(avisos.filter((aviso) => aviso.tipo === 'inicio')).toHaveLength(1)
  expect(avisos.filter((aviso) => aviso.tipo === 'reto_completado')).toHaveLength(1)
  expect(avisos.filter((aviso) => aviso.tipo === 'accion').map((aviso) => [aviso.objeto, aviso.correcto]))
    .toEqual([['fresa', true], ['platano', true], ['fresa', true], ['platano', true]])
  expect(avisos.some((aviso) => aviso.tipo === 'fin')).toBe(false)
  expect(errores).toEqual([])
})

test('la fruta equivocada permanece, el cuy sigue su camino y Kusi da las dos ayudas', async ({ page: pagina }) => {
  const paquete = await leerPaquete()
  await abrirLaberinto(pagina)
  await pagina.keyboard.press('ArrowRight')
  await esperarCasilla(pagina, 1, 9)
  await pagina.keyboard.press('ArrowDown')
  await esperarCasilla(pagina, 5, 9)
  expect((await estado(pagina)).nivel).toBe(1)
  await pagina.keyboard.press('ArrowLeft')
  const primerError = await esperarCasilla(pagina, 5, 5)
  expect(primerError.regla.recogidos).toBe(2)
  expect(primerError.regla.errores).toBe(1)
  expect(primerError.consigna).toBe(paquete.retos[0].ayudas[0])
  expect(primerError.regla.objetos.find((objeto) => objeto.fila === 5 && objeto.columna === 7).recogido)
    .toBe(false)
  await pagina.keyboard.press('ArrowRight')
  const segundoError = await esperarCasilla(pagina, 5, 9)
  expect(segundoError.regla.recogidos).toBe(2)
  expect(segundoError.regla.errores).toBe(2)
  expect(segundoError.consigna).toBe(paquete.retos[0].ayudas[1])
  expect(segundoError.puertaAbierta).toBe(false)
  const avisos = await pagina.evaluate(() => window.kusi.avisos)
  expect(avisos.filter((aviso) => aviso.tipo === 'accion' && !aviso.correcto).map((aviso) => aviso.objeto))
    .toEqual(['platano', 'platano'])
  expect(avisos.filter((aviso) => aviso.tipo === 'ayuda').map((aviso) => aviso.ayuda)).toEqual([1, 2])
  comprobarOrdenDeAvisos(avisos)
})

test('la voz dice la consigna al entrar y Escuchar la repite después de una ayuda', async ({ page: pagina }) => {
  const paquete = await leerPaquete()
  // Se observa la salida del navegador, sin sustituir decir() ni acceder a la
  // escena: la misma llamada queda lista para conectar KusiPuente en el futuro.
  await pagina.addInitScript(() => {
    window.frasesKusi = []
    Object.defineProperty(window, 'SpeechSynthesisUtterance', {
      configurable: true,
      value: class {
        constructor(texto) { this.text = texto }
      },
    })
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: { cancel() {}, speak(frase) { window.frasesKusi.push({ texto: frase.text, idioma: frase.lang }) } },
    })
  })
  await abrirLaberinto(pagina)
  await expect.poll(() => pagina.evaluate(() => window.frasesKusi.map((frase) => frase.texto)))
    .toEqual([paquete.retos[0].consigna])
  await tocar(pagina, 'ayuda')
  await tocar(pagina, 'sonido')
  expect(await pagina.evaluate(() => window.frasesKusi.map((frase) => frase.texto)))
    .toEqual([paquete.retos[0].consigna, paquete.retos[0].ayudas[0], paquete.retos[0].consigna])
  expect(await pagina.evaluate(() => window.frasesKusi.every((frase) => frase.idioma.startsWith('es')))).toBe(true)
})

test('la mano enseña a deslizar una sola vez y no reaparece al recargar', async ({ page: pagina }) => {
  await abrirLaberinto(pagina)
  expect((await estado(pagina)).manoVisible).toBe(true)
  await pagina.keyboard.press('ArrowRight')
  await pagina.waitForFunction(() => window.kusi.estado().manoVisible === false)
  expect(await pagina.evaluate((clave) => localStorage.getItem(clave), CLAVE_MANO)).toBeTruthy()
  await pagina.reload()
  await pagina.waitForFunction(() => window.kusi?.listo)
  expect((await estado(pagina)).manoVisible).toBe(false)
  expect((await estado(pagina)).nivel).toBe(1)
})

test('solo_clase deja las verduras, reúne cuatro frutas y muestra el cierre sin vidas ni reloj', async ({ page: pagina }) => {
  const paquete = await leerPaquete()
  paquete.retos = [{
    ...paquete.retos[2],
    mapa: ['###########', '#C.......P#', '###########'],
    enemigos: [],
    objetos: [
      { tipo: 'fresa', fila: 1, columna: 2 },
      { tipo: 'zanahoria', fila: 1, columna: 3 },
      { tipo: 'mango', fila: 1, columna: 4 },
      { tipo: 'papa', fila: 1, columna: 5 },
      { tipo: 'mandarina', fila: 1, columna: 6 },
      { tipo: 'pina', fila: 1, columna: 8 },
    ],
  }]
  await servirPaquete(pagina, paquete)
  await abrirLaberinto(pagina)
  await pagina.keyboard.press('ArrowRight')
  await pagina.waitForFunction(() => window.kusi.estado().terminada)
  const final = await estado(pagina)
  expect(final.regla.recogidos).toBe(4)
  expect(final.regla.completada).toBe(true)
  expect(final.regla.objetos.filter((objeto) => ['zanahoria', 'papa'].includes(objeto.tipo))
    .every((objeto) => !objeto.recogido)).toBe(true)
  expect(final.mensajeCierre).toBe(paquete.cierre.mensaje)
  expect(final.movimiento.moviendose).toBe(false)
  expect(final).not.toHaveProperty('vidas')
  expect(final).not.toHaveProperty('reloj')
  const avisos = await pagina.evaluate(() => window.kusi.avisos)
  comprobarOrdenDeAvisos(avisos)
  expect(avisos.filter((aviso) => aviso.tipo === 'accion').map((aviso) => aviso.correcto))
    .toEqual([true, false, true, false, true, true])
  expect(avisos.filter((aviso) => aviso.tipo === 'reto_completado')).toHaveLength(1)
  expect(avisos.filter((aviso) => aviso.tipo === 'fin')).toHaveLength(1)
  await pagina.keyboard.press('ArrowLeft')
  await pagina.waitForTimeout(180)
  expect((await estado(pagina)).movimiento).toEqual(final.movimiento)
})

test('los tres niveles conservan la partida y emiten un solo fin', async ({ page: pagina }) => {
  const paquete = await leerPaquete()
  // Mapas pequeños controlan el tránsito entre niveles. El recorrido del
  // primer nivel de producción y el BFS del zorro se verifican por separado.
  paquete.retos = paquete.retos.map((reto, indice) => ({
    ...reto,
    mapa: ['#######', '#C...P#', '#######'],
    enemigos: [],
    objetos: [{ tipo: indice === 1 ? 'mango' : 'fresa', fila: 1, columna: 2 }],
    regla: indice === 2 ? { tipo: 'solo_clase', clase: 'fruta', meta: 1 }
      : { tipo: 'orden', secuencia: [indice === 1 ? 'mango' : 'fresa'] },
  }))
  await servirPaquete(pagina, paquete)
  await abrirLaberinto(pagina)
  for (const nivel of [2, 3]) {
    await pagina.keyboard.press('ArrowRight')
    await pagina.waitForFunction((nivel) => window.kusi.estado().nivel === nivel, nivel)
    const actual = await estado(pagina)
    expect(actual.regla.recogidos).toBe(0)
    expect(actual.manoVisible).toBe(false)
    expect(actual.terminada).toBe(false)
  }
  await pagina.keyboard.press('ArrowRight')
  await pagina.waitForFunction(() => window.kusi.estado().terminada)
  const avisos = await pagina.evaluate(() => window.kusi.avisos)
  comprobarOrdenDeAvisos(avisos)
  expect(avisos.filter((aviso) => aviso.tipo === 'listo')).toHaveLength(1)
  expect(avisos.filter((aviso) => aviso.tipo === 'inicio')).toHaveLength(1)
  expect(avisos.filter((aviso) => aviso.tipo === 'reto_completado').map((aviso) => aviso.nivel))
    .toEqual([1, 2, 3])
  expect(avisos.filter((aviso) => aviso.tipo === 'fin')).toHaveLength(1)
  expect(avisos[avisos.length - 1].tipo).toBe('fin')
})

test('el zorro devuelve al inicio sin perder frutas y protege durante dos segundos', async ({ page: pagina }) => {
  const paquete = await leerPaquete()
  paquete.retos = [{
    ...paquete.retos[0],
    mapa: ['#############', '#C.........P#', '#############'],
    regla: { tipo: 'orden', secuencia: ['fresa', 'platano'] },
    objetos: [{ tipo: 'fresa', fila: 1, columna: 2 }, { tipo: 'platano', fila: 1, columna: 10 }],
    enemigos: [{ tipo: 'zorro', fila: 1, columna: 2, movimiento: 'patrulla' }],
  }]
  await servirPaquete(pagina, paquete)
  await abrirLaberinto(pagina, false)
  await pagina.keyboard.press('ArrowRight')
  await pagina.waitForFunction(() => window.kusi.estado().capturas === 1)
  const atrapado = await estado(pagina)
  expect(atrapado.regla.recogidos).toBe(1)
  expect(atrapado.regla.objetos[0].recogido).toBe(true)
  expect(atrapado.movimiento).toMatchObject({ fila: 1, columna: 1, progreso: 0, moviendose: false })
  expect(atrapado.zorros[0]).toMatchObject({ fila: 1, columna: 2, mirando: 'frente' })
  expect(atrapado.animacionCuy.clave).toContain(':asustado')
  expect(atrapado.invulnerable).toBe(true)
  expect(atrapado.segundosInvulnerable).toBeGreaterThan(1.7)

  // Un segundo contacto durante la protección no puede volver a atraparlo.
  // Ambas posiciones se leen; las únicas acciones siguen siendo las flechas.
  await pagina.keyboard.press('ArrowRight')
  await pagina.waitForFunction(() => {
    const actual = window.kusi.estado()
    const columna = (movimiento) => movimiento.columna +
      (movimiento.direccion === 'derecha' ? movimiento.progreso
        : movimiento.direccion === 'izquierda' ? -movimiento.progreso : 0)
    return actual.invulnerable && Math.abs(columna(actual.movimiento) - columna(actual.zorros[0])) < 0.3
  })
  expect((await estado(pagina)).capturas).toBe(1)
  await pagina.keyboard.press('ArrowLeft')
  await pagina.waitForFunction(() => !window.kusi.estado().invulnerable)
  expect((await estado(pagina)).segundosInvulnerable).toBe(0)
  expect((await estado(pagina)).capturas).toBe(1)
  const avisos = await pagina.evaluate(() => window.kusi.avisos)
  comprobarOrdenDeAvisos(avisos)
  expect(avisos.filter((aviso) => aviso.tipo === 'accion' && aviso.atrapado === true)).toHaveLength(1)
})
