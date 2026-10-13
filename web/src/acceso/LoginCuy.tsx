// Login de Kusi con el cuy animado en Rive (diseño de Luis: kusi-login-cuarto).
// Rive dibuja la escena y React dibuja el formulario encima. React le avisa al cuy
// lo que pasa con las propiedades del ViewModel "Cuy" (ver CONTRATO_FINAL.md).
// Si falta /login-cuy.riv o no carga, se ve la ilustración fija del mismo cuarto.
import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, CSSProperties, FormEvent } from 'react'
import {
  Alignment, Fit, Layout, RuntimeLoader, useRive, useViewModel, useViewModelInstance,
  useViewModelInstanceBoolean, useViewModelInstanceNumber, useViewModelInstanceTrigger,
} from '@rive-app/react-webgl2'
import riveWasm from '@rive-app/webgl2/rive.wasm?url'
import escena from '../assets/kusi/escena-cuy.webp'
import { ingresar } from '../servicios/acceso'
import type { Cuenta } from '../servicios/acceso'
import './LoginCuy.css'

// El motor de Rive se sirve desde el proyecto, no desde un CDN.
RuntimeLoader.setWasmUrl(riveWasm)

// Tamaño de la escena en Rive (igual que la ilustración)
const ANCHO_ESCENA = 1672
const ALTO_ESCENA = 941
// Dónde va la tarjeta del login dentro de la escena (en píxeles de la ilustración)
const TARJETA_X = 871
const TARJETA_Y = 262
// Dónde va el globo de texto (encima de la cabeza del cuy)
const GLOBO_X = 598
const GLOBO_Y_ABAJO = 382
// Parte de la escena que se ve en celular: solo el rincón del cuy
const RECORTE_CELULAR = { minX: 240, minY: 255, maxX: 880, maxY: 790 }
// Rive dibuja en el mismo hilo que el teclado: cuantos más píxeles por cuadro,
// más se atrasan las letras. En compu la escena mide 1672 px, así que con
// densidad 1 ya se ve nítida; en celular se acerca al cuy y necesita un poco más.
const DENSIDAD_COMPU = 1
const DENSIDAD_CELULAR = 1.5

type Medidas = { escala: number; x: number; y: number; celular: boolean }

function medir(): Medidas {
  const ancho = window.innerWidth
  const alto = window.innerHeight
  if (ancho < 860 || ancho / alto < 1.25) return { escala: 1, x: 0, y: 0, celular: true }
  // Con Fit.Cover la escena llena la pantalla; la tarjeta usa la misma escala.
  const escala = Math.max(ancho / ANCHO_ESCENA, alto / ALTO_ESCENA)
  return { escala, x: (ancho - ANCHO_ESCENA * escala) / 2, y: (alto - ALTO_ESCENA * escala) / 2, celular: false }
}

export function LoginCuy({ alIngresar }: { alIngresar: (cuenta: Cuenta) => void }) {
  const [riveListo, establecerRiveListo] = useState(false)
  const [medidas, establecerMedidas] = useState<Medidas>(medir)
  const { rive, RiveComponent } = useRive({
    src: '/login-cuy.riv',
    artboard: 'Login',
    stateMachines: 'Login',
    autoplay: true,
    layout: new Layout({ fit: Fit.Cover, alignment: Alignment.Center }),
    onLoad: () => establecerRiveListo(true),
    onLoadError: () => establecerRiveListo(false),
  }, {
    customDevicePixelRatio: Math.min(window.devicePixelRatio || 1, medidas.celular ? DENSIDAD_CELULAR : DENSIDAD_COMPU),
    // Solo hay un cuy en la página: dibuja directo en su lienzo, sin copiarlo
    // desde un lienzo compartido en cada cuadro.
    useOffscreenRenderer: false,
  })

  // El ViewModel "Cuy" y su instancia marcada como Default en Rive.
  const modeloCuy = useViewModel(rive, { name: 'Cuy' })
  const cuy = useViewModelInstance(modeloCuy, { rive })
  const { setValue: ponerEscribiendo } = useViewModelInstanceBoolean('escribiendo', cuy)
  const { setValue: ponerTapado } = useViewModelInstanceBoolean('tapado', cuy)
  const { setValue: ponerEspiando } = useViewModelInstanceBoolean('espiando', cuy)
  const { setValue: ponerHablando } = useViewModelInstanceBoolean('hablando', cuy)
  const { setValue: ponerQuieto } = useViewModelInstanceBoolean('quieto', cuy)
  const { setValue: ponerMirar } = useViewModelInstanceNumber('mirar', cuy)
  const { trigger: dispararTecla } = useViewModelInstanceTrigger('tecla', cuy)
  const { trigger: dispararError } = useViewModelInstanceTrigger('error', cuy)
  const { trigger: dispararExito } = useViewModelInstanceTrigger('exito', cuy)
  const { trigger: dispararSaludo } = useViewModelInstanceTrigger('saludar', cuy)

  const [correo, establecerCorreo] = useState('')
  const [clave, establecerClave] = useState('')
  const [verClave, establecerVerClave] = useState(false)
  const [enviando, establecerEnviando] = useState(false)
  const [listo, establecerListo] = useState(false)
  const [campoMal, establecerCampoMal] = useState<'' | 'correo' | 'clave' | 'ambos'>('')
  const [mensajeServidor, establecerMensajeServidor] = useState('')
  const [globo, establecerGlobo] = useState('')
  const relojEscribir = useRef<number | undefined>(undefined)
  const relojGlobo = useRef<number | undefined>(undefined)
  const campoClave = useRef<HTMLInputElement>(null)

  // Recalcula la posición de la tarjeta cuando cambia el tamaño de la ventana.
  useEffect(() => {
    const acomodar = () => establecerMedidas(medir())
    window.addEventListener('resize', acomodar)
    return () => window.removeEventListener('resize', acomodar)
  }, [])

  // En celular solo se ve el rincón del cuy; en compu, la escena completa.
  useEffect(() => {
    if (!rive) return
    // Rive solo permite cambiar el encuadre con su setter `layout`.
    // eslint-disable-next-line react-hooks/immutability
    rive.layout = medidas.celular
      ? new Layout({ fit: Fit.Cover, alignment: Alignment.Center, ...RECORTE_CELULAR })
      : new Layout({ fit: Fit.Cover, alignment: Alignment.Center })
    rive.resizeDrawingSurfaceToCanvas()
  }, [rive, medidas.celular])

  // Si la persona pidió "reducir movimiento", el ambiente se queda quieto.
  useEffect(() => {
    ponerQuieto?.(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  }, [ponerQuieto])

  // El cuy habla con un globo de texto.
  function decir(texto: string, milisegundos = 2800) {
    establecerGlobo(texto)
    ponerHablando?.(true)
    window.setTimeout(() => ponerHablando?.(false), Math.min(1500, 400 + texto.length * 30))
    window.clearTimeout(relojGlobo.current)
    relojGlobo.current = window.setTimeout(() => establecerGlobo(''), milisegundos)
  }

  // Al abrir la página el cuy saluda.
  useEffect(() => {
    if (!cuy) return
    const reloj = window.setTimeout(() => {
      dispararSaludo?.()
      decir('¡Hola, profe! Soy Kusi. ¿Entramos?', 3200)
    }, 700)
    return () => window.clearTimeout(reloj)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cuy])

  useEffect(() => () => { window.clearTimeout(relojEscribir.current); window.clearTimeout(relojGlobo.current) }, [])

  // "mirar" va de 0 a 100: el cuy mira hacia donde termina el texto.
  const calcularMirada = (texto: string) => Math.min(95, 25 + texto.length * 2.4)

  function alEscribirCorreo(evento: ChangeEvent<HTMLInputElement>) {
    const texto = evento.target.value
    establecerCorreo(texto)
    establecerCampoMal('')
    establecerMensajeServidor('')
    ponerEscribiendo?.(true)
    ponerMirar?.(calcularMirada(texto))
    dispararTecla?.()
    // Si deja de escribir 1,5 segundos, el cuy deja de teclear.
    window.clearTimeout(relojEscribir.current)
    relojEscribir.current = window.setTimeout(() => ponerEscribiendo?.(false), 1500)
  }

  function alSalirDelCorreo() {
    window.clearTimeout(relojEscribir.current)
    ponerEscribiendo?.(false)
    ponerMirar?.(50)
  }

  function alEscribirClave(evento: ChangeEvent<HTMLInputElement>) {
    establecerClave(evento.target.value)
    establecerCampoMal('')
    establecerMensajeServidor('')
    if (verClave) ponerMirar?.(calcularMirada(evento.target.value))
  }

  // En la contraseña se tapa los ojos, o espía si la clave está visible.
  function alEntrarAClave() {
    ponerTapado?.(!verClave)
    ponerEspiando?.(verClave)
    decir(verClave ? 'Bueno… solo un poquito' : '¡No miro, lo prometo!', 2000)
  }

  function alSalirDeClave() {
    ponerTapado?.(false)
    ponerEspiando?.(false)
  }

  function cambiarVerClave() {
    const mostrar = !verClave
    establecerVerClave(mostrar)
    ponerTapado?.(!mostrar)
    ponerEspiando?.(mostrar)
    decir(mostrar ? 'Bueno… solo un poquito' : '¡Listo, ya no miro!', 1800)
    campoClave.current?.focus()
  }

  async function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (enviando || listo) return
    const correoLimpio = correo.trim()
    if (!correoLimpio) { establecerCampoMal('correo'); decir('Primero escribe tu correo', 2600); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correoLimpio)) {
      establecerCampoMal('correo')
      decir('Mmm… a tu correo le falta algo. Revisa la @', 3000)
      return
    }
    if (!clave) { establecerCampoMal('clave'); decir('Te falta la contraseña', 2600); return }

    establecerEnviando(true)
    alSalirDeClave()
    decir('Revisando…', 1400)
    try {
      const resultado = await ingresar(correoLimpio, clave)
      establecerClave('')
      if (!resultado.usuario) throw new Error('No se pudo iniciar sesión.')
      const cuenta = resultado.usuario
      establecerListo(true)
      dispararExito?.()
      decir('¡Bienvenido, profe! Vamos a crear juegos', 3600)
      // Deja ver la celebración del cuy antes de abrir el panel.
      window.setTimeout(() => alIngresar(cuenta), 1100)
    } catch (error) {
      establecerClave('')
      establecerCampoMal('ambos')
      dispararError?.()
      const mensaje = error instanceof Error ? error.message : 'No se pudo iniciar sesión.'
      establecerMensajeServidor(mensaje)
      decir('¡Uy! ' + mensaje, 3000)
    } finally { establecerEnviando(false) }
  }

  // En compu, la tarjeta y el globo se escalan igual que la escena.
  const estiloTarjeta: CSSProperties = medidas.celular ? {} : {
    left: (medidas.x + TARJETA_X * medidas.escala) + 'px',
    top: (medidas.y + TARJETA_Y * medidas.escala) + 'px',
    transform: 'scale(' + medidas.escala + ')',
  }
  const estiloGlobo: CSSProperties = medidas.celular ? {} : {
    left: (medidas.x + GLOBO_X * medidas.escala) + 'px',
    top: (medidas.y + GLOBO_Y_ABAJO * medidas.escala) + 'px',
    transform: 'translateY(-100%) scale(' + medidas.escala + ')',
  }
  const claseCampo = (nombre: 'correo' | 'clave') => 'campo' + (campoMal === nombre || campoMal === 'ambos' ? ' mal' : '')

  return <div className={'login-cuy' + (medidas.celular ? ' celular' : '')}>
    <div className="escena">
      <img className={'respaldo' + (riveListo ? ' oculta' : '')} src={escena} alt="" />
      <RiveComponent className="lienzo" aria-hidden="true" />
      {globo && <p className="globo" style={estiloGlobo} aria-live="polite">{globo}</p>}
    </div>

    <form className="tarjeta" style={estiloTarjeta} onSubmit={alEnviar} noValidate>
      <h1>¡Bienvenido a Kusi!</h1>
      <p className="subtitulo">Inicia sesión para crear juegos de aprendizaje con IA y acompañar a tus estudiantes.</p>

      <label className={claseCampo('correo')}>
        <span className="oculto">Correo electrónico</span>
        <svg className="icono" viewBox="0 0 32 32" aria-hidden="true"><rect x="3.5" y="7" width="25" height="18" rx="3.2" fill="none" stroke="currentColor" strokeWidth="2.6" /><path d="M5,9.5 L16,17.5 L27,9.5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round" /></svg>
        <input type="email" autoComplete="username" autoCapitalize="none" placeholder="Correo electrónico" value={correo}
          aria-invalid={campoMal === 'correo' || campoMal === 'ambos'}
          onChange={alEscribirCorreo} onFocus={() => { if (!correo) decir('Escribe tu correo, yo lo anoto', 2200) }} onBlur={alSalirDelCorreo} />
      </label>

      <label className={claseCampo('clave')}>
        <span className="oculto">Contraseña</span>
        <svg className="icono" viewBox="0 0 32 32" aria-hidden="true"><path d="M10.5,14 V10.5 a5.5,5.5 0 0 1 11,0 V14" fill="none" stroke="currentColor" strokeWidth="2.8" /><rect x="6.5" y="13.5" width="19" height="15" rx="3" fill="currentColor" /></svg>
        <input ref={campoClave} type={verClave ? 'text' : 'password'} autoComplete="current-password" placeholder="Contraseña"
          aria-invalid={campoMal === 'clave' || campoMal === 'ambos'}
          value={clave} onChange={alEscribirClave} onFocus={alEntrarAClave} onBlur={alSalirDeClave} />
        <button type="button" className="ver-clave" onMouseDown={(evento) => evento.preventDefault()} onClick={cambiarVerClave}
          aria-label={verClave ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={verClave}>
          <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M3,16 C7,9.5 11.5,7 16,7 C20.5,7 25,9.5 29,16 C25,22.5 20.5,25 16,25 C11.5,25 7,22.5 3,16 Z" fill="none" stroke="currentColor" strokeWidth="2.6" /><circle cx="16" cy="16" r="4.6" fill="currentColor" />{verClave && <path d="M6,27 L26,5" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />}</svg>
        </button>
      </label>

      {/* Solo el administrador genera contraseñas en Kusi. */}
      <button type="button" className="olvide" onClick={() => decir('Pídele una nueva al administrador de tu colegio', 3400)}>¿Olvidaste tu contraseña?</button>

      {mensajeServidor && <p className="error-servidor" role="alert">{mensajeServidor}</p>}

      <button className={'entrar' + (listo ? ' listo' : '')} type="submit" disabled={enviando}>
        {enviando ? 'Entrando…' : (listo ? '¡Listo!' : 'Entrar')}
        {!enviando && !listo && <svg viewBox="0 0 40 40" aria-hidden="true"><path d="M7,20 H31 M21,10 L31,20 L21,30" fill="none" stroke="currentColor" strokeWidth="4.6" strokeLinecap="round" strokeLinejoin="round" /></svg>}
      </button>
    </form>
  </div>
}
