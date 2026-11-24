import { rename, writeFile } from 'node:fs/promises'
import path from 'node:path'

const [carpeta, modo] = process.argv.slice(2)
await import('../fixtures/supervisorDePrueba.mjs')

if (modo !== 'lento' && modo !== 'no') {
  const juego = path.join(carpeta, 'juego')
  // La escena original conserva cada fallo que el supervisor debe provocar.
  await rename(path.join(juego, 'juego.js'), path.join(juego, 'juego-base.js'))
  await writeFile(path.join(juego, 'frases.js'), `
export const FRASE_TUTORIAL = 'Toca la fresa para practicar.'
export const frasesDeKusi = () => [FRASE_TUTORIAL]
`)
  await writeFile(path.join(juego, 'juego.js'), `
import juego from './juego-base.js'
import { FRASE_TUTORIAL } from './frases.js'
import { crearTutorial } from '#kit/reproductor/interfaz/tutorial.js'
import { estiloTexto } from '#kit/reproductor/medidas.js'

class EscenaConTutorial extends juego.escena {
  create() {
    super.create()
    const { consigna } = this.datos.paquete.retos[this.datos.indiceNivel]
    const letrero = this.children.list.find((pieza) => pieza.type === 'Text' && pieza.text === consigna)
    letrero.destroy()
    this.add.text(640, 180, consigna, estiloTexto(48)).setOrigin(0.5)

    const fresa = this.add.image(640, 360, 'fresa').setDisplaySize(84, 84).setDepth(1).setInteractive()
    let practicado = false
    fresa.once('pointerdown', () => { practicado = true })
    this.tutorial = crearTutorial(this, ${modo === 'mudo' ? '{ decir() {} }' : 'this.hud'}, {
      pasos: [{
        frase: FRASE_TUTORIAL,
        gesto: 'tocar',
        objetivo: () => ({ x: fresa.x, y: fresa.y }),
        hecho: () => practicado,
      }],
      alTerminar: () => fresa.destroy(),
    })
  }

  update(_tiempo, delta) {
    this.tutorial.actualizar(delta / 1000)
  }
}

export default { ...juego, escena: EscenaConTutorial }
`)
}
