// La historia con que empieza un juego del taller: un cuento de pocas páginas que cuenta
// por qué Kusi necesita ayuda, antes de la primera consigna. Sin Phaser, para probarla con
// node --test. La escena que la muestra es ../escenas/EscenaHistoria.js.

// Tres páginas como máximo: un niño de 6 años no lee más antes de jugar.
export const MAX_PAGINAS_HISTORIA = 3
// Lo que cabe cómodo en una página a letra grande. Una sola frase más larga se deja
// entera (se parte en líneas), pero nunca pasa de MAX_CARACTERES_FRASE.
export const MAX_CARACTERES_PAGINA = 110
export const MAX_CARACTERES_FRASE = 180

// Parte la historia en páginas: junta frases cortas seguidas mientras quepan y se queda
// con las primeras MAX_PAGINAS_HISTORIA. Sin historia (o con algo que no es texto),
// devuelve una lista vacía y el juego empieza directo.
export function partirHistoria(historia) {
  if (typeof historia !== 'string') return []
  const frases = historia.replace(/\s+/g, ' ').trim().split(/(?<=[.!?…])\s+/).filter(Boolean)
    .map(recortarFrase)
  const paginas = []
  for (const frase of frases) {
    const ultima = paginas.length - 1
    if (ultima >= 0 && (paginas[ultima] + ' ' + frase).length <= MAX_CARACTERES_PAGINA) {
      paginas[ultima] += ' ' + frase
    } else {
      paginas.push(frase)
    }
  }
  return paginas.slice(0, MAX_PAGINAS_HISTORIA)
}

// Una frase demasiado larga se corta en una palabra y termina en puntos suspensivos.
function recortarFrase(frase) {
  if (frase.length <= MAX_CARACTERES_FRASE) return frase
  const corte = frase.lastIndexOf(' ', MAX_CARACTERES_FRASE - 1)
  return frase.slice(0, corte > 0 ? corte : MAX_CARACTERES_FRASE - 1).replace(/[,;:\s]+$/, '') + '…'
}

// Las piezas que se ven en cada página del cuento: las del juego (sin los fondos) se
// reparten de a una por página, vuelta tras vuelta, hasta MAX_PIEZAS_PAGINA por página.
// Así cada página muestra algo distinto y todo lo que el niño va a tocar aparece antes
// de jugar. Una página sin piezas queda con Kusi solo.
export const MAX_PIEZAS_PAGINA = 3

export function repartirPiezas(piezas, cantidadPaginas) {
  const paginas = Array.from({ length: Math.max(0, cantidadPaginas) }, () => [])
  if (!paginas.length) return paginas
  const objetos = [...new Set(Array.isArray(piezas) ? piezas : [])].filter((pieza) => typeof pieza === 'string' && !pieza.startsWith('fondo-'))
  objetos.forEach((pieza, numero) => {
    const pagina = paginas[numero % paginas.length]
    if (pagina.length < MAX_PIEZAS_PAGINA) pagina.push(pieza)
  })
  return paginas
}

// Las láminas del cuento (fondo-cuento-1, fondo-cuento-2…): una ilustración por página, en
// orden. Las pide el supervisor al dibujante. Sin láminas, el cuento se arma con el
// escenario y las piezas del juego.
export const PATRON_LAMINA = /^fondo-cuento-[1-9]$/

export function laminasDelCuento(piezas) {
  return [...new Set(Array.isArray(piezas) ? piezas : [])].filter((pieza) => typeof pieza === 'string' && PATRON_LAMINA.test(pieza)).sort()
}

// La lámina de una página: la que le toca, o la última si hay menos láminas que páginas.
export function laminaDePagina(laminas, pagina) {
  if (!laminas.length) return null
  return laminas[Math.min(pagina, laminas.length - 1)]
}

// El fondo del juego: el primer fondo nuevo que no es una lámina del cuento, o null
// (entonces va el patio del kit).
export function fondoDelCuento(piezas) {
  return (Array.isArray(piezas) ? piezas : []).find((pieza) => typeof pieza === 'string' && pieza.startsWith('fondo-') && !PATRON_LAMINA.test(pieza)) ?? null
}

// La historia se cuenta al abrir el juego desde el principio. No se cuenta si no hay
// nada que contar, si se pidió un nivel con ?nivel=, si se apagó con ?historia=0 (las
// pruebas y el revisor) o si la partida se reanuda donde se había dejado.
export function debeContarHistoria({ busqueda = '', partida = null, paginas = [] } = {}) {
  if (!paginas.length) return false
  const parametros = new URLSearchParams(busqueda)
  if (parametros.get('historia') === '0' || parametros.has('nivel')) return false
  if (partida?.reanudada) return false
  return true
}
