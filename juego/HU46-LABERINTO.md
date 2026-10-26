# HU46 · Laberinto completo, pasos 1 a 10

La parte A de HU46 está implementada: tres niveles escritos a mano, recolección,
reglas, puerta, zorro, ayudas, voz, tutorial y cierre. Los pasos 1 a 4 se revisaron
antes de continuar; los pasos 5 a 10 se guardaron por separado, sin push.

Para abrirlo desde PowerShell:

```powershell
cd D:\Escritorio\Kusi\juego
npm run dev
```

Visita <http://127.0.0.1:5174/?paquete=laberinto>. Sin el parámetro `paquete`,
<http://127.0.0.1:5174/> sigue abriendo el mercado.

## Qué probar

1. Toca la primera fresa. El cuy busca el camino y camina hasta ella, se la come
   y se detiene mirando a su última dirección. El circulito indica su destino.
2. Toca una fruta lejana: busca el camino más corto que evite los otros alimentos.
   Si solo puede pasar por encima de otro, lo atraviesa sin comerlo ni equivocarse.
   Solo se intenta comer la fruta elegida. Tocar camino no recoge frutas de paso.
3. Toca otro lugar mientras camina para cambiar de destino sin saltos de posición.
   Un muro o un punto fuera del mapa elige el camino alcanzable más cercano;
   ese ajuste no elige automáticamente una fruta vecina.
4. Las flechas conservan el control de computadora: una pulsación sigue hasta
   el muro y recoge al pasar, como antes. Una flecha cancela el destino tocado.
   Los arrastres no se interpretan como toques ni como direcciones.
5. Toca **Ayuda** para ver las pistas y **Escuchar** para oír el texto de Kusi,
   cuando el navegador disponga de voz. Los botones no hacen caminar al cuy.

La velocidad normal es de 3 casillas por segundo. Para las pruebas rápidas usa
<http://127.0.0.1:5174/?paquete=laberinto&rapido=1>, que multiplica esa velocidad por cuatro.

Los dibujos que falten se reemplazan con figuras simples bajo las mismas claves:
`fondo-pueblito`, `muro-adobe-1`, `muro-adobe-2`, `piso-tierra`,
`puerta-cerrada` y `puerta-abierta`.
El cuy utiliza las animaciones compartidas existentes; Kusi permanece fuera del mapa.

## Pueblito y profundidad

Los tres originales aprobados de `arte/laberinto/origen/` se conservan. Para
preparar las copias que usa el juego, desde `juego/`:

```powershell
.venv/Scripts/python herramientas/procesar_laberinto.py
```

El script requiere Pillow. Recorta los dos adobes y las dos puertas en PNG de
256 × 256 con alfa limpio, corrige suavemente los bordes del suelo para que
coincidan píxel a píxel y convierte el fondo a WebP de hasta 2048 px de ancho.
El kit servido pesa aproximadamente 1,26 MB; el fondo pesa 159 KB. Si falta un
original, procesa los demás y lo informa sin modificar las fuentes.

### Pantalla completa y dos disposiciones

El laberinto usa `Scale.EXPAND`: el lienzo ocupa toda la ventana, sin franjas
negras, y el fondo del pueblito lo cubre entero. El alto base (720 unidades) se
ve siempre completo; en una pantalla más ancha que 16:9 el lienzo se ensancha
hacia los lados. El mercado conserva `Scale.FIT` y su renderizador AUTO.

`src/logica/disposicionLaberinto.js` elige una de dos disposiciones al abrir
cada nivel. Es lógica pura, con pruebas en `pruebas/logica/disposicionLaberinto.test.js`.

- **Clásica**: la barra arriba, la columna de Kusi a la izquierda y el mapa a la
  derecha, dentro del mundo de 1280 × 720 centrado. Es la de 16:9 y la de las
  pantallas altas; no cambió.
- **Lateral**: en una pantalla alargada la barra se vuelve una tarjeta y se junta
  con Kusi (letrero, globo y altavoz) en un panel a la izquierda; el mapa ocupa
  todo el alto. Solo se elige si agranda las casillas al menos un 12 %.

Lo que mide de verdad una casilla, en píxeles de la pantalla:

| Pantalla | Disposición | Nivel 1 (7 × 11) | Niveles 2 y 3 (9 × 15) |
| --- | --- | --- | --- |
| 1280 × 720 | clásica | 81 | 63 |
| 1366 × 768 | clásica | 86,4 | 67,2 |
| **800 × 360 táctil** | lateral | **51** | **40** |
| 844 × 390 | lateral | 55,2 | 43,3 |
| 915 × 412 | lateral | 58,4 | 45,8 |
| 932 × 430 | lateral | 60,9 | 47,8 |
| 740 × 360 | lateral | 51 | 37,5 |
| 667 × 375 (16:9) | clásica | 42,2 | 32,8 |

En 800 × 360 todas las casillas miden al menos 40 px y la barra y el mapa quedan
completos. Con la barra arriba era imposible en los niveles de 9 filas: nueve
filas de 40 px ocupan por sí solas los 360 px del celular (antes 31,5 px). Los
adobes de la primera y la última fila quedan a ras de la pantalla. Un celular de
360 px de alto necesita unos 780 px de ancho para llegar a 40 px en esos niveles;
con menos ancho (740 × 360) o en 16:9 (667 × 375) el panel y las 15 columnas ya
no caben y la casilla queda por debajo.

Si, con el nivel abierto, la ventana se hace más angosta que ese nivel (por
ejemplo, al girar el celular), la cámara se aleja lo justo para que la barra,
Kusi y el mapa sigan completos, y la partida continúa. Al pasar de nivel se vuelve
a elegir la disposición.

### Piso, adobes, adornos y contraste

- **Piso**: un solo `TileSprite` con `piso-tierra` (1024 px, se repite cada cinco
  casillas). Sus bordes opuestos coinciden: la diferencia media entre ellos es
  0,00 por canal, frente a 0,65 entre dos columnas vecinas, así que no hay uniones.
- **Adobes**: dos variantes (`muro-adobe-1` y `muro-adobe-2`) repartidas con una
  semilla fija por nivel (título del paquete y reto), así que una recarga no
  cambia el mosaico. Se dibujan de arriba hacia abajo, una profundidad por fila, y
  cada uno proyecta una sombra suave sobre el piso hacia abajo y a la derecha.
  La sombra (`sombra-adobe`) se arma con capas de transparencia, no con la
  propiedad `filter` del lienzo, que no existe en todos los navegadores de celular.
  Los adobes se guardan por filas en una `RenderTexture`; la puerta es aparte para
  poder abrirse y rebotar.
- **Adornos**: unas pocas flores y piedritas en el pasto, fuera del camino (alrededor
  del mapa en la disposición clásica; en el hueco junto al globo en la lateral) y
  una viñeta muy suave.
- **Contraste**: bajo cada fruta hay un apoyo claro que es parte del arte, así que
  se ve igual con `?vida=0`. Los personajes se leen por su contorno oscuro sobre
  el piso, con y sin efectos (revisado en las capturas de los tres niveles); su
  sombra de contacto es de la capa de vida. El letrero «Toca un lugar o usa las
  flechas» lleva un fondo claro porque sobre el follaje se perdía.
- **Despedida**: la cortina del cierre cubre todo el lienzo, también las franjas
  que EXPAND añade a los lados.

### Canvas o AUTO

El laberinto dibuja con **Canvas** y el mercado conserva **AUTO** (WebGL si el
equipo lo permite). Es un tablero 2D casi quieto y en un equipo sin tarjeta
gráfica WebGL se emula por software, que es lo más lento. Tampoco se usa el
suavizado de pasos de Phaser (`fps.smoothStep` en falso): los movimientos usan los
deltas reales.

Medido con `herramientas/medir_fps_laberinto.mjs`: tres momentos de juego (quieto,
caminando y caminando con el zorro del nivel 2), en 1280 × 720 y en un celular
táctil de 800 × 360, con la misma partida en Canvas y en AUTO. Sin el límite de la
pantalla, el número dice cuánto aguanta cada lienzo.

| Dónde se mide | Canvas | AUTO (WebGL) | Canvas / AUTO |
| --- | --- | --- | --- |
| Chromium sin pantalla, con WebGL por software (SwiftShader): lo que vería un equipo sin tarjeta gráfica | 102 a 114 fps | 11 a 15 fps | 7 a 9 veces |
| Lo mismo con `--disable-gpu` | 97 a 109 fps | 11 a 15 fps | 7 a 9 veces |
| Chromium con ventana y la tarjeta de esta PC (NVIDIA RTX 5060 Ti), sin límite | 970 a 1155 fps | 980 a 1308 fps | parecido |
| Chromium con ventana y la tarjeta, al ritmo de la pantalla (72 Hz) | 72 fps, 0 % de cuadros lentos | 72 fps, 0 % de cuadros lentos | igual |

**Canvas va mejor.** Sin tarjeta gráfica da unos 105 fps contra 13 de AUTO (de 7 a 9
veces más, y más en el celular de 800 × 360, cuyo lienzo es más ancho), con
margen de sobra para una pantalla de 60 Hz; AUTO ni llega a 15 y se vería a
tirones. Con tarjeta gráfica los dos sostienen la pantalla sin un solo cuadro
lento, así que Canvas no cuesta nada. Por eso el laberinto se queda en Canvas.

Esta PC sí tiene tarjeta gráfica; el navegador sin pantalla de las pruebas no la
usa, y ese es el caso que representa un equipo sin ella. Sin el límite de la
pantalla, Canvas muestra además un 1 % de cuadros de unos 18 ms (los «peores» de
56 fps) que, con la pantalla a 72 Hz, no se notan. Como referencia, el mercado,
que sigue con AUTO, corre a unos 30 fps en ese mismo navegador sin pantalla; no se
cambió ni se probó con Canvas, porque la tarea pedía conservarlo.

### Cómo se comprobó cada efecto en Canvas

| Efecto | Comprobación |
| --- | --- |
| Sombras | `pruebas/canvas.spec.js` mide que el piso bajo la sombra del cuy es más oscuro que con `?vida=0`; comparación con AUTO |
| Rebote, respiración y parpadeo | Pruebas de estado de siempre y cuadros exactos junto a AUTO en `herramientas/comparar_efectos.mjs` |
| Polvito | Cuadros exactos junto a AUTO |
| Pop y estrellitas | `canvas.spec.js` cuenta los puntos con los colores de las estrellitas; con `?vida=0` no aparecen |
| Frutas vivas | Pruebas de estado de siempre (posición de cada fruta) |
| Temblor al ser atrapado | `comparar_efectos.mjs` mide cuánto se corre de verdad el lienzo en cada cuadro del temblor: coincide con el de la cámara con un error menor de 0,5 px, igual que con AUTO |
| Confeti de la puerta | `canvas.spec.js` cuenta los puntos de sus colores sobre la puerta |

Las comparaciones por cuadros son imágenes con Canvas arriba y AUTO abajo
(`evidencias/hu46-profundidad/canvas-contra-auto/comparacion-<efecto>.png`); en
todas se ve el mismo efecto con el mismo aspecto.

### Cómo verlo en el navegador

Con `npm run dev` encendido:

- Con efectos, nivel 1: <http://127.0.0.1:5174/?paquete=laberinto>
- Sin efectos: <http://127.0.0.1:5174/?paquete=laberinto&vida=0>
- Otro nivel: `&nivel=2` o `&nivel=3` (sin ganar el anterior).
- WebGL en lugar de Canvas, para comparar: `&renderizador=auto`.
- Celular alargado: en las herramientas del navegador (F12, modo dispositivo) elige
  800 × 360 con pantalla táctil, o haz la ventana el doble de ancha que alta (2:1).
  Con 16:9 se ve la disposición clásica.

### Herramientas

Todas se ejecutan desde `juego/` con Vite encendido y dejan su resultado en
`evidencias/` (carpeta local, no se versiona):

```powershell
node herramientas/capturar_hu46.mjs          # los 3 niveles, 1280 × 720 y 800 × 360 táctil, con y sin vida
node herramientas/comparar_efectos.mjs       # cada efecto con Canvas arriba y AUTO abajo; mide el temblor
node herramientas/medir_fps_laberinto.mjs 8  # fps de Canvas y AUTO; variantes: --sin-gpu, --ventana, --con-vsync
```

`capturar_hu46.mjs` también escribe `medidas.json` con el tamaño físico de las
casillas y los errores del navegador. Todo es emulación de Chromium; queda
pendiente probar el teléfono físico.

## Reglas y niveles

En el nivel 1 se recoge fresa, plátano, fresa y plátano. En el nivel 2 se alternan
mango y mandarina con un zorro que persigue de cerca. El nivel 3 pide cuatro frutas:
las verduras se dejan en el camino y su zorro también usa `persigue_cerca`.
Ambos persiguen cuando el cuy está a cinco pasos o menos por los pasillos;
si se aleja más, vuelven a patrullar. La búsqueda en anchura mide el camino,
sin cruzar muros. El signo «!» aparece brevemente sobre la cabeza del zorro
al empezar cada persecución, también con `?vida=0`.
La duración de ese aviso (0,8 s) y su tamaño se ajustan en
`AVISO_PERSECUCION`, al comienzo de `src/escenas/EscenaLaberinto.js`.

La fruta correcta desaparece, el cuy muestra `feliz` y la barra marca lo recogido.
La fruta equivocada rebota y permanece; Kusi muestra la primera ayuda y después
la segunda. Con flechas el cuy continúa; con un toque se detiene en la fruta elegida.
Al cumplir la regla se abre la puerta;
entrar por ella lleva al siguiente nivel. La última puerta muestra el mensaje de
cierre. **Jugar otra vez** comienza una partida nueva.

El zorro avanza al 60 % de la velocidad del cuy y siempre usa su vista de frente.
Después de perseguir durante cinco segundos seguidos descansa quieto dos segundos
y continúa. Alejarse del radio de persecución reinicia la cuenta de esfuerzo;
`rapido` acelera el desplazamiento, pero no acorta el esfuerzo ni el descanso.
El radio y los tiempos se ajustan al comienzo de `src/logica/zorrosLaberinto.js`;
el 60 % se fija en `PROPORCION_VELOCIDAD_ZORRO`, en `src/escenas/EscenaLaberinto.js`.
Cada nivel espera el primer rumbo del niño antes de activar al zorro. Si atrapa
al cuy, este muestra `asustado`, ambos vuelven a sus posiciones iniciales y las
frutas recogidas se conservan. El aro del cuy indica dos segundos de protección;
`rapido` acelera el recorrido, pero no acorta esa protección. No hay vidas,
game over ni reloj de cuenta atrás.

La consigna se narra al entrar en cada nivel. **Escuchar** repite la consigna y
**Ayuda** muestra y narra una pista. La función única `decir(texto)` usa
`speechSynthesis` cuando está disponible y queda preparada para conectar
KusiPuente. El globo permite leer los mensajes también sin voz.

La mano del nivel 1 señala la primera fruta con un dedo que toca y un anillo que
se agranda. Desaparece al elegir un destino o usar una flecha y no vuelve a
mostrarse en ese navegador. La marca `kusi-laberinto-tocar-v1` se guarda en `localStorage`; si el
WebView no permite almacenamiento, se recuerda durante la sesión.
El texto inferior dice «Toca donde quieres ir · También puedes usar las flechas».
Una captura del zorro cancela el destino y su circulito; la capa de vida se conserva.

## Capa de vida

Una capa de efectos va encima de las animaciones por cuadros: los dibujos no
cambian y ningún efecto rota ni inclina al personaje entero. Cada valor es una
constante al comienzo de su archivo.

| Efecto | Qué hace | Dónde se ajusta |
| --- | --- | --- |
| Sombras | Una elipse suave y translúcida bajo el cuy y bajo cada zorro. La del zorro tiene la misma receta, 1,3 veces más grande, como su dibujo. No rebota: se queda en el suelo mientras el cuerpo sube. | `SOMBRA` y `PROPORCION_ZORRO`, en `src/escenas/EscenaLaberinto.js` |
| Rebote al caminar | En cada paso el cuerpo sube unos píxeles (el cuy 0,06 casillas, el zorro 0,04) y, al apoyar el pie, se ensancha y se achata menos del 5 % (3,5 % el cuy; 4,5 % el zorro, que es más pesado y tarda más en soltarse). Sigue el reloj de los cuadros del caminar: aplaste máximo en el apoyo y altura máxima a mitad del paso. El personaje nunca rota. | `PERFIL_CUY` y `PERFIL_ZORRO`, en `src/efectos/CuerpoVivo.js` |
| Respiración | Quieto, el cuy se estira y se encoge a lo alto un 2,5 % cada 2 s, con los pies en el suelo. Al caminar o al hacer una expresión se apaga con suavidad y al detenerse vuelve. El zorro no respira. | `PERFIL_CUY.respiracion`, en `src/efectos/CuerpoVivo.js` |
| Parpadeo | El cuy parpadea de frente, al azar, cada 2 a 4 s que pasa quieto, con los cuadros 0, 1, 2, 1, 0 de la tira de parpadeo a 16 por segundo. Si el niño elige un rumbo a mitad del parpadeo, camina de inmediato. | `ESPERA_MINIMA` y `ESPERA_MAXIMA`, en `src/efectos/ParpadeoCuy.js`; los cuadros, en el manifiesto del cuy |
| Polvito | Al caminar, el cuy y el zorro sueltan una nubecita de tierra cada dos pasos, detrás de los pies: 3 o 4 bolitas que se abren, suben un poco y se desvanecen en medio segundo. La del zorro es 1,3 veces más grande. | Constantes arriba de `src/efectos/Polvito.js` |
| Comer bien | La fruta correcta hace «pop»: crece 1,45 veces en 0,22 s mientras se desvanece, y de ella salen 5 estrellitas que se abren en círculo, giran y se apagan en medio segundo. | Constantes arriba de `src/efectos/PopFruta.js` |
| Comer mal | La fruta equivocada rebota como siempre y el cuy se sacude un poquito: va y viene de lado a lado 0,05 casillas, a 11 idas y vueltas por segundo, y se apaga en 0,32 s. Con flechas sigue caminando; con un toque se detiene en la fruta elegida. No gira ni sube. | `PERFIL_CUY.sacudida`, en `src/efectos/CuerpoVivo.js` |
| Frutas vivas | Las frutas y verduras del mapa suben y bajan muy despacio en su casilla: 0,04 casillas (unos 3 px) cada 3 s, cada una con un desfase distinto (la razón áurea reparte las fases). Una fruta comida deja de moverse y, tras el rebote de una equivocada, vuelve al vaivén sin saltos. | `FLOTAR`, en `src/efectos/FrutasVivas.js` |
| Captura | Cuando el zorro atrapa al cuy suena el quejido, el juego se congela 0,18 s (nada se mueve, ni las animaciones) y la pantalla tiembla muy suave: unos 2,6 px de lado a lado, 8 idas y vueltas por segundo, durante 0,45 s, sin girar ni acercar. Solo después el cuy vuelve al inicio y hace «asustado», con sus dos segundos de protección. | `CONGELADO` y `TEMBLOR`, en `src/efectos/CapturaLaberinto.js` |
| Puerta | Al abrirse, la puerta sube estirándose 0,14 casillas y cae rebotando hasta su sitio, y suelta 18 trozos de confeti de seis colores: salen en abanico, giran como hojitas, caen por su peso y se apagan en 1,1 s. | `REBOTE` y `CONFETI`, en `src/efectos/PuertaViva.js` |
| Sonidos | A volumen bajo: pisadas del cuy y del zorro cuando un pie se apoya, pop al comer bien, boing al equivocarse, «ay» al ser atrapado, puerta al abrirse y fanfarria al entrar a un nivel nuevo o al llegar al cierre. | `SONIDOS_LABERINTO`, en `src/efectos/SonidosLaberinto.js`; autoría y licencias CC0 de Kenney en `public/sonidos/` |
| Botón de sonido | Un altavoz junto a Kusi, abajo a la izquierda, apaga y enciende todos esos sonidos de golpe; se tacha y se pone gris cuando están apagados. La elección se conserva en los niveles siguientes y al volver a abrir el juego. «Escuchar» sigue leyendo la consigna con la voz de Kusi. | `BOTON_SONIDO`, en `src/interfaz/BotonSonido.js`; la marca, en `src/efectos/silencio.js` |

Con `?vida=0` se apagan todos a la vez, también el botón de sonido, y los sonidos ni
siquiera se descargan. El navegador solo permite sonar después del primer toque o
tecla, y las pisadas comparten un intervalo mínimo y no se superponen, así que con el
cuy y el zorro caminando a la vez suena sobre todo la del cuy.

Para comparar en el navegador (después de `npm run dev`):

- Con efectos: <http://127.0.0.1:5174/?paquete=laberinto>
- Sin efectos: <http://127.0.0.1:5174/?paquete=laberinto&vida=0>

El estado de pruebas expone `vida` con el cuerpo, las sombras, el polvo, el pop, las
frutas, la captura, la puerta y los sonidos, para que las pruebas midan cada efecto.

## Recorrido para la revisión

Para completar el primer nivel con las flechas, a velocidad normal:

1. Pulsa derecha y espera al muro: recoge la primera fresa y el primer plátano.
2. Pulsa abajo; tras bajar una casilla, pulsa izquierda. El giro se guarda hasta
   la siguiente esquina y pasa por la segunda fresa.
3. Al llegar al muro izquierdo del pasillo, pulsa abajo hasta el muro inferior.
4. Pulsa derecha: recoge el último plátano, abre la puerta y entra al nivel 2.

Para probar un error, desde el inicio ve a la derecha y después baja hasta la
puerta cerrada. Pulsa izquierda: el plátano del pasillo inferior rebota porque
todavía falta la segunda fresa. Volver a pasar por él muestra la segunda ayuda.

## Avisos y validación

La carga rechaza los mapas incompatibles con un mensaje amable y permite volver
a intentarlo, descargando otra vez el paquete. Los avisos son `listo`, `inicio`,
`accion`, `ayuda`, `reto_completado`, `fin` y `fallo`. Cada aviso lleva `partida`
y un `orden` consecutivo. Comer añade `{ objeto, correcto }`; una captura añade
`{ atrapado: true }`. Se mantienen el identificador y el orden entre niveles;
inicio, cada reto y cierre se notifican una sola vez. `fin` es el último aviso de
esa partida. La comprobación completa HU31 sigue perteneciendo a Spring.

## Recibir el guion por mensaje (HU26)

El juego puede recibir el guion que generó la IA sin pedirlo a ningún servidor: la
página que lo contiene (por ejemplo, la vista previa del panel docente, con el juego
en un iframe) se lo manda con `postMessage`.

- `?paquete=mensaje` abre el laberinto **sin guion** y espera el que le manden.
- `?paquete=laberinto` abre el ejemplo y también acepta guiones por mensaje.
- Sin parámetro (el mercado) el juego no escucha mensajes.

Lo que la página le manda al juego:

| Mensaje | Qué hace |
| --- | --- |
| `{ "tipo": "paquete", "paquete": … }` | Entrega el guion (`kusi-paquete/0`, familia `laberinto`), como objeto o como texto JSON. El juego lo comprueba, pide los dibujos que le falten y empieza por el primer nivel. Si ya había un juego, lo reemplaza. El bloque `procedencia` que guarda Spring no estorba. |
| `{ "tipo": "reiniciar" }` | Vuelve al primer nivel del guion que se está jugando, con una partida nueva (igual que «Jugar otra vez»). Antes de recibir un guion no hace nada. |

Lo que el juego le avisa a la página (a `window.parent`):

| Aviso | Cuándo |
| --- | --- |
| `{ "tipo": "listo" }` | El juego ya puede recibir un guion. Se avisa una sola vez: la página debe esperarlo antes de mandar el primero. |
| `{ "tipo": "cargado", "niveles": N }` | El primer nivel del guion está en pantalla (también tras `reiniciar` y «Jugar otra vez»). |
| `{ "tipo": "error", "motivo": "…" }` | El guion no se puede jugar. El motivo dice qué falló, con «Nivel N:». El niño ve «Este camino no está listo todavía» y un guion nuevo lo reemplaza. |

Desde la página que contiene el juego:

```js
const juego = document.querySelector('#vista-previa') // el iframe con ?paquete=mensaje
window.addEventListener('message', (evento) => {
  if (evento.source !== juego.contentWindow) return
  if (evento.data.tipo === 'listo') juego.contentWindow.postMessage({ tipo: 'paquete', paquete: guion }, '*')
})
```

`guion` es el campo `paquete` de `GET /api/edu/generaciones/{id}/`, que llega como texto
y sirve tal cual. Sin el panel, abre <http://127.0.0.1:5174/?paquete=mensaje> y pega en la
consola del navegador `postMessage({ tipo: 'paquete', paquete: <el guion> }, '*')`. El juego solo hace caso a la página que lo contiene (`window.parent`):
los mensajes de otra ventana o iframe se ignoran. Los avisos no llevan nada privado, así
que van a cualquier origen. Un mensaje que llega después de que el juego empezó a cargar
espera su turno aunque todavía no haya dicho `listo`; uno anterior se pierde, por eso la
página espera el `listo`.

La barra de arriba pide «Sigue el orden», «Busca frutas» o «Busca verduras» según la
regla del nivel. Las pruebas son `pruebas/mensajes.spec.js` (en el navegador, con los
guiones de `pruebas/fixtures`, que son los mismos que arma Spring con su IA falsa) y
`pruebas/logica/puenteGuion.test.js`.

## Verificación

```powershell
npm run prueba:logica
npm run prueba
npm run build
.venv/Scripts/python -m unittest discover -s herramientas/animaciones
```

Verificado el 26 de octubre de 2026 tras agregar el guion por mensaje:
**158 pruebas de lógica**, **130 pruebas de navegador** y compilación correctas.
La suite completa incluye el mercado y la capa de vida, y corre con un solo
trabajador (`workers: 1` en `playwright.config.js`): varias pruebas miden tiempos
de animación y sonido y fallaban por unos milisegundos cuando varios navegadores
competían por el procesador. Las pruebas de navegador miden cada efecto con el
reloj del propio efecto, porque un Chromium sin pantalla corre con WebGL por
software y no siempre a tiempo real.

Las pruebas de la profundidad miden en la pantalla real, con la proyección de la
cámara: los tres niveles en 1280 × 720 y en un celular táctil de 800 × 360, con y
sin `?vida=0`, comprueban que el fondo cubre todo, que la barra, el mapa y la
columna de Kusi caben sin pisarse, que cada casilla mide al menos 40 px y que las
frutas se ven. Otras comprueban el cambio de tamaño de la ventana en los dos
sentidos, la despedida a pantalla completa, el lienzo pedido (`?renderizador`) y
el nivel pedido (`?nivel`).

La lógica y la validación se prueban con `node --test`, sin instalar paquetes
adicionales: movimiento, vuelta guardada, rutas por búsqueda en anchura, selección
de la fruta tocada, ajuste del destino al camino y cambio de ruta sin saltos, reglas,
clasificación, patrulla, búsqueda en anchura, captura y orden de avisos.
La persecución se verifica dentro y fuera de cinco pasos, con caminos separados
por muros, fatiga tras cinco segundos seguidos, dos segundos quieto y reanudación
desde la misma posición. Las pruebas de navegador comprueban el aviso sobre la
cabeza, su ocultación, la velocidad del 60 % y su nueva aparición tras descansar.

Playwright verifica el nivel 1 real hasta la puerta y el nivel 2, fruta equivocada
y ayudas, voz, mano persistente, clasificación y cierre, continuidad de la partida,
captura con frutas conservadas y dos segundos de protección, además de teclado,
ratón, tacto, distribución de pantalla y reintento de carga. También prueba el
toque de la primera fruta, el rodeo de otras frutas, el paso sin comer una fruta
intermedia inevitable, el cambio de destino y su cancelación por teclado o zorro.
Los escenarios
controlados de clasificación, captura y transición de tres niveles usan paquetes
válidos interceptados en la carga; no modifican el estado de la escena.

Las capturas locales de revisión están en `output/laberinto-completo/`: inicio,
niveles 2 y 3 y cierre en 1280 × 720 y 844 × 390. El nivel 2 se alcanza completando
el primer mapa real; las capturas de nivel 3 y cierre usan entradas previas cortas
para preparar esos estados. El mercado y sus recursos se conservan.

Las capturas del control por toque están en `output/laberinto-tocar/`, tomadas con
Playwright en **800 × 360, `hasTouch: true` e `isMobile: true`**, y revisadas visualmente:
`inicio-800x360.png`, `destino-800x360.png` y `fruta-comida-800x360.png` muestran el
primer mapa real; `fruta-intermedia-intacta-800x360.png` muestra el escenario controlado
de un pasillo con un plátano intermedio que permanece y una fresa lejana elegida.
