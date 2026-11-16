// El trabajador del taller (taller/README.md): corre en esta Mac, pregunta al buzón de
// Spring cada pocos segundos, crea el juego (o escribe la propuesta) con los roles y
// devuelve el resultado.
//
//   cd juego && npm run taller            pregunta sin parar (Ctrl+C para salir)
//   npm run taller -- --una-vez           atiende como máximo un trabajo y termina
//
// Lee EDU_API_URL y TALLER_CLAVE del .env de la raíz sin mostrarlos. Qué programa hace
// cada rol está en taller/roles.local.json, que no se sube.

import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { cargarConfiguracion, CARPETA_JUEGO } from './trabajador/configuracion.js'
import { crearBuzon } from './trabajador/buzon.js'
import { armarBiblioteca } from './trabajador/carpeta.js'
import { leerAgentes, leerRoles, lanzar, cortarActivos } from './trabajador/roles.js'
import { comprobarJuego } from './trabajador/comprobar.js'
import { procesarTrabajo } from './trabajador/procesar.js'
import { procesarPropuesta } from './trabajador/proponer.js'

const decir = (texto) => console.log('[taller] ' + texto)
const unaVez = process.argv.includes('--una-vez')
const configuracion = cargarConfiguracion()

if (!configuracion.clave) {
  console.error('[taller] Falta TALLER_CLAVE en el .env. Créala con: python3 scripts/configurar_local.py')
  process.exit(1)
}
if (!existsSync(configuracion.roles)) {
  console.error('[taller] Falta el archivo de roles: ' + configuracion.roles)
  process.exit(1)
}

const buzon = crearBuzon({ url: configuracion.eduApiUrl, clave: configuracion.clave })
const roles = await leerRoles(configuracion.roles)
const agentes = await leerAgentes()
decir('Buzón: ' + configuracion.eduApiUrl + ' (con clave; no se muestra). Juegos: ' + configuracion.juegoUrl)
decir('Roles: ' + Object.keys(roles).join(', ') + '. Límite por trabajo: ' + Math.round(configuracion.limiteMs / 60000) + ' minutos.')

// El revisor y las comprobaciones abren el juego en el Vite de esta Mac: si no está
// encendido, el trabajador lo enciende y lo apaga al salir.
let vite = null
async function responde(direccion) {
  try {
    return (await fetch(direccion)).ok
  } catch {
    return false
  }
}
if (!(await responde(configuracion.juegoUrl))) {
  decir('El servidor de juegos no responde: lo enciendo.')
  vite = spawn('npm', ['run', 'dev'], { cwd: CARPETA_JUEGO, stdio: 'ignore', detached: true })
  const hasta = Date.now() + 60_000
  while (!(await responde(configuracion.juegoUrl))) {
    if (Date.now() > hasta) {
      console.error('[taller] El servidor de juegos no arrancó en 60 s.')
      process.exit(1)
    }
    await new Promise((listo) => setTimeout(listo, 500))
  }
  decir('Servidor de juegos listo.')
}

let saliendo = false
const salir = () => {
  saliendo = true
  // Los roles corren en su propio grupo de procesos: sin esto, al cerrar con Ctrl+C quedaban vivos el supervisor
  // (gastando la suscripción) y el navegador sin pantalla jugando el juego. Spring devuelve el trabajo a «pendiente».
  const cortados = cortarActivos('SIGKILL')
  if (cortados > 0) decir('Corté ' + cortados + ' proceso(s) de roles que seguían trabajando.')
  if (vite) try { process.kill(-vite.pid, 'SIGTERM') } catch { /* ya terminó */ }
}
process.on('SIGINT', () => { decir('Saliendo.'); salir(); process.exit(0) })
process.on('SIGTERM', () => { salir(); process.exit(0) })

let ultimoProblema = null
while (!saliendo) {
  let trabajo = null
  try {
    trabajo = await buzon.siguiente()
    if (ultimoProblema) decir('Spring responde otra vez.')
    ultimoProblema = null
  } catch (error) {
    // Spring apagado o la clave equivocada: se dice una vez y se sigue preguntando.
    const problema = String(error.message ?? error)
    if (problema !== ultimoProblema) decir('No pude preguntar al buzón: ' + problema)
    ultimoProblema = problema
  }

  if (trabajo) {
    try {
      // Un trabajo «proponer» es la propuesta de un tema: no lleva biblioteca ni supervisor.
      if (trabajo.tipo === 'proponer') {
        const final = await procesarPropuesta(trabajo, {
          buzon, roles, agentes, lanzar, trabajos: configuracion.trabajos, limiteMs: configuracion.limitePropuestaMs,
        })
        decir('Propuesta ' + trabajo.id + ' terminada: ' + final.resultado + '.')
        if (unaVez) break
        continue
      }
      let enviados = []
      try {
        enviados = await buzon.biblioteca()
      } catch (error) {
        decir('No pude leer la biblioteca del buzón (' + error.message + '): el supervisor verá solo los ejemplos.')
      }
      const biblioteca = await armarBiblioteca({ enviados, trabajos: configuracion.trabajos })
      const final = await procesarTrabajo(trabajo, {
        buzon, roles, agentes, lanzar, comprobar: comprobarJuego, biblioteca,
        trabajos: configuracion.trabajos, juegoUrl: configuracion.juegoUrl, limiteMs: configuracion.limiteMs,
      })
      decir('Trabajo ' + trabajo.id + ' terminado: ' + final.resultado + '.')
    } catch (error) {
      // Un error del propio trabajador también se informa, para que el docente no espere en vano.
      decir('Trabajo ' + trabajo.id + ': error del trabajador: ' + error.message)
      try {
        await buzon.fallo(trabajo.id, 'Error del trabajador: ' + error.message)
      } catch { /* Spring lo devolverá a pendiente a los 15 minutos */ }
    }
    if (unaVez) break
    continue
  }
  if (unaVez) break
  await new Promise((listo) => setTimeout(listo, configuracion.esperaMs))
}
salir()
