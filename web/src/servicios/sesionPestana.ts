// Varias cuentas a la vez en el mismo navegador: cada pestaña guarda su propia sesión.
//
// El navegador comparte la cookie de sesión entre todas las pestañas, así que entrar con otra cuenta en una
// pestaña cambiaba la cuenta de las demás. Cada pestaña guarda su sesión en sessionStorage (es de esa pestaña:
// sobrevive a recargar, pero una pestaña nueva empieza vacía) y la manda en la cabecera X-Kusi-Sesion en cada
// pedido; Django y Spring la usan antes que la cookie. Si la pestaña no inició sesión, la cabecera va vacía y el
// servidor no usa la cookie de otra pestaña.

export const CABECERA_SESION = 'X-Kusi-Sesion'
const CLAVE = 'kusi-sesion-pestana'
// Las claves de sesión de Django son letras minúsculas y números.
const SESION_VALIDA = /^[a-z0-9]{1,64}$/

function almacen(): Storage | null {
  try { return globalThis.sessionStorage ?? null } catch { return null }
}

export function sesionDeEstaPestana(): string {
  const valor = almacen()?.getItem(CLAVE) ?? ''
  return SESION_VALIDA.test(valor) ? valor : ''
}

// Entrar y cambiar la contraseña renuevan la sesión: el servidor devuelve la nueva en «sesion».
export function recordarSesionDeEstaPestana(datos: unknown) {
  const sesion = datos && typeof datos === 'object' && 'sesion' in datos ? (datos as { sesion: unknown }).sesion : null
  if (typeof sesion === 'string' && SESION_VALIDA.test(sesion)) {
    try { almacen()?.setItem(CLAVE, sesion) } catch { /* sin almacenamiento, la pestaña queda sin sesión propia */ }
  }
}

export function olvidarSesionDeEstaPestana() {
  try { almacen()?.removeItem(CLAVE) } catch { /* nada que olvidar */ }
}

export const cabeceraDeSesion = (): Record<string, string> => ({ [CABECERA_SESION]: sesionDeEstaPestana() })
