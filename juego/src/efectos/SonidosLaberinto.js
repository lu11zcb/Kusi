// El audio del laberinto conserva sus propias instancias. Silenciarlo o salir
// no modifica el volumen global de Phaser ni los sonidos de otras escenas.
export const SONIDOS_LABERINTO = Object.freeze({
  paso_cuy: { archivo: 'paso-cuy.ogg', volumen: 0.08, espera: 140 },
  paso_zorro: { archivo: 'paso-zorro.ogg', volumen: 0.09, espera: 160 },
  comer: { archivo: 'fruta-pop.ogg', volumen: 0.14, espera: 80 },
  error: { archivo: 'fruta-boing.ogg', volumen: 0.1, espera: 100 },
  captura: { archivo: 'cuy-ay.ogg', volumen: 0.08, espera: 400 },
  puerta: { archivo: 'puerta.ogg', volumen: 0.1, espera: 250 },
  nivel: { archivo: 'nivel-fanfarria.ogg', volumen: 0.08, espera: 400 },
})
const PREFIJO_CLAVE = 'laberinto-sonido-'
const CARPETA_SONIDOS = 'sonidos/'
const ESPERA_ENTRE_PASOS = 140
const TIPOS_PASO = new Set(['paso_cuy', 'paso_zorro'])
// Los ciclos de caminar repiten el cuadro central (0,1,2,1): el pie se apoya en
// el primer y en el tercer cuadro de la secuencia. Phaser numera desde 1.
const CUADROS_DE_PISADA = new Set([1, 3])

export const esCuadroDePisada = (cuadro) => CUADROS_DE_PISADA.has(cuadro?.index)

export function pedirSonidosLaberinto(escena) {
  for (const [tipo, datos] of Object.entries(SONIDOS_LABERINTO)) {
    const clave = PREFIJO_CLAVE + tipo
    if (!escena.cache.audio.exists(clave)) escena.load.audio(clave, CARPETA_SONIDOS + datos.archivo)
  }
}

export class SonidosLaberinto {
  constructor(escena, { activo = true, silenciado = false } = {}) {
    this.escena = escena
    this.activo = activo
    this.silenciado = silenciado
    this.destruido = false
    this.sonidos = new Map()
    this.ultimos = new Map()
    this.ultimoPaso = -Infinity
    this.reproducciones = {}
  }

  reproducir(tipo) {
    const datos = SONIDOS_LABERINTO[tipo]
    if (!datos || !this.activo || this.silenciado || this.destruido) return false
    const gestor = this.escena.sound
    // Phaser desbloquea Web Audio con el primer teclado o toque. No guardamos
    // pasos pendientes durante ese bloqueo: sonarían juntos al desbloquearse.
    if (!gestor || gestor.locked) return false
    const clave = PREFIJO_CLAVE + tipo
    if (!this.escena.cache.audio.exists(clave)) return false
    const ahora = this.escena.game?.loop?.now ?? globalThis.performance.now()
    if (ahora - (this.ultimos.get(tipo) ?? -Infinity) < datos.espera) return false
    if (TIPOS_PASO.has(tipo) && (ahora - this.ultimoPaso < ESPERA_ENTRE_PASOS ||
        [...TIPOS_PASO].some((paso) => this.sonidos.get(paso)?.isPlaying))) return false

    let sonido = this.sonidos.get(tipo)
    if (!sonido) {
      sonido = gestor.add(clave, { volume: datos.volumen, loop: false })
      this.sonidos.set(tipo, sonido)
    }
    if (sonido.isPlaying) return false
    const reproducido = sonido.play({ volume: datos.volumen, loop: false })
    if (reproducido === false) return false
    this.ultimos.set(tipo, ahora)
    if (TIPOS_PASO.has(tipo)) this.ultimoPaso = ahora
    this.reproducciones[tipo] = (this.reproducciones[tipo] ?? 0) + 1
    return true
  }

  cambiarSilencio() {
    this.silenciado = !this.silenciado
    if (this.silenciado) this.detener()
    return this.silenciado
  }

  detener() {
    for (const sonido of this.sonidos.values()) sonido.stop()
  }

  destruir() {
    if (this.destruido) return
    this.detener()
    for (const sonido of this.sonidos.values()) sonido.destroy()
    this.sonidos.clear()
    this.ultimos.clear()
    this.destruido = true
  }

  estado() {
    return {
      activo: this.activo, silenciado: this.silenciado, destruido: this.destruido,
      enReproduccion: [...this.sonidos].filter(([, sonido]) => sonido.isPlaying).map(([tipo]) => tipo),
      reproducciones: { ...this.reproducciones },
    }
  }
}
