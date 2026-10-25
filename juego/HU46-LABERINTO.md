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

1. Pulsa y suelta una flecha. El cuy sigue solo hasta el muro, sin atravesarlo.
2. Desde el inicio, pulsa derecha. Después de pasar la primera casilla y antes
   del pasillo central, pulsa abajo: guarda la vuelta y baja por la columna 5.
3. Al llegar al muro inferior, pulsa arriba: camina de espaldas y queda quieto
   mirando hacia arriba al detenerse.
4. Desliza un dedo o arrastra el ratón en cualquier parte del lienzo. Se necesitan
   al menos 30 píxeles de pantalla; en diagonal manda el eje más largo.
5. Toca **Ayuda** para ver las pistas y **Escuchar** para oír el texto de Kusi,
   cuando el navegador disponga de voz. Los botones no hacen caminar al cuy.

La velocidad normal es de 3 casillas por segundo. Para las pruebas rápidas usa
<http://127.0.0.1:5174/?paquete=laberinto&rapido=1>, que multiplica esa velocidad por cuatro.

Los dibujos que falten se reemplazan con figuras simples bajo las mismas claves:
`muro-adobe`, `camino-tierra`, `pasto`, `puerta-cerrada` y `puerta-abierta`.
El cuy utiliza las animaciones compartidas existentes; Kusi permanece fuera del mapa.

## Reglas y niveles

En el nivel 1 se recoge fresa, plátano, fresa y plátano. En el nivel 2 se alternan
mango y mandarina con un zorro de patrulla. El nivel 3 pide cuatro frutas: las
verduras se dejan en el camino y el zorro persigue cuando está a tres pasos o
menos por los pasillos. La búsqueda en anchura mide el camino, sin cruzar muros.

La fruta correcta desaparece, el cuy muestra `feliz` y la barra marca lo recogido.
La fruta equivocada rebota y permanece; Kusi muestra la primera ayuda y después
la segunda. El movimiento del cuy continúa. Al cumplir la regla se abre la puerta;
entrar por ella lleva al siguiente nivel. La última puerta muestra el mensaje de
cierre. **Jugar otra vez** comienza una partida nueva.

El zorro avanza al 60 % de la velocidad del cuy y siempre usa su vista de frente.
Cada nivel espera el primer rumbo del niño antes de activar al zorro. Si atrapa
al cuy, este muestra `asustado`, ambos vuelven a sus posiciones iniciales y las
frutas recogidas se conservan. El aro del cuy indica dos segundos de protección;
`rapido` acelera el recorrido, pero no acorta esa protección. No hay vidas,
game over ni reloj de cuenta atrás.

La consigna se narra al entrar en cada nivel. **Escuchar** repite la consigna y
**Ayuda** muestra y narra una pista. La función única `decir(texto)` usa
`speechSynthesis` cuando está disponible y queda preparada para conectar
KusiPuente. El globo permite leer los mensajes también sin voz.

La mano del nivel 1 desaparece al elegir un rumbo y no vuelve a mostrarse en ese
navegador. La marca `kusi-laberinto-deslizar-v1` se guarda en `localStorage`; si el
WebView no permite almacenamiento, se recuerda durante la sesión.

## Capa de vida

Una capa de efectos va encima de las animaciones por cuadros: los dibujos no
cambian y ningún efecto rota ni inclina al personaje entero. Cada valor es una
constante al comienzo de su archivo.

| Efecto | Qué hace | Dónde se ajusta |
| --- | --- | --- |
| Sombras | Una elipse suave y translúcida bajo el cuy y bajo cada zorro. La del zorro tiene la misma receta, 1,3 veces más grande, como su dibujo. | `SOMBRA` y `PROPORCION_ZORRO`, en `src/escenas/EscenaLaberinto.js` |
| Rebote al caminar | En cada paso el cuerpo sube unos píxeles (el cuy 0,06 casillas, el zorro 0,04) y, al apoyar el pie, se ensancha y se achata menos del 5 % (3,5 % el cuy; 4,5 % el zorro, que es más pesado y tarda más en soltarse). Sigue el reloj de los cuadros del caminar: aplaste máximo en el apoyo y altura máxima a mitad del paso. La sombra no rebota y el personaje nunca rota. | `PERFIL_CUY` y `PERFIL_ZORRO`, en `src/efectos/CuerpoVivo.js` |
| Puerta | Al abrirse, la puerta sube estirándose 0,14 casillas y cae rebotando hasta su sitio, y suelta 18 trozos de confeti de seis colores: salen en abanico, giran como hojitas, caen por su peso y se apagan en 1,1 s. | `REBOTE` y `CONFETI`, en `src/efectos/PuertaViva.js` |
| Captura | Cuando el zorro atrapa al cuy suena el quejido, el juego se congela 0,18 s (nada se mueve, ni las animaciones) y la pantalla tiembla muy suave: unos 2,6 px de lado a lado, 8 idas y vueltas por segundo, durante 0,45 s, sin girar ni acercar. Solo después el cuy vuelve al inicio y hace «asustado», con sus dos segundos de protección. | `CONGELADO` y `TEMBLOR`, en `src/efectos/CapturaLaberinto.js` |
| Frutas vivas | Las frutas y verduras del mapa suben y bajan muy despacio en su casilla: 0,04 casillas (unos 3 px) cada 3 s, cada una con un desfase distinto (la razón áurea reparte las fases). Una fruta comida deja de moverse y, tras el rebote de una equivocada, vuelve al vaivén sin saltos. | `FLOTAR`, en `src/efectos/FrutasVivas.js` |
| Comer bien | La fruta correcta hace «pop»: crece 1,45 veces en 0,22 s mientras se desvanece, y de ella salen 5 estrellitas que se abren en círculo, giran y se apagan en medio segundo. | Constantes arriba de `src/efectos/PopFruta.js` |
| Comer mal | La fruta equivocada rebota como siempre y el cuy se sacude un poquito: va y viene de lado a lado 0,05 casillas, a 11 idas y vueltas por segundo, y se apaga en 0,32 s. Sigue caminando mientras se sacude y no gira ni sube. | `PERFIL_CUY.sacudida`, en `src/efectos/CuerpoVivo.js` |
| Polvito | Al caminar, el cuy y el zorro sueltan una nubecita de tierra cada dos pasos, detrás de los pies: 3 o 4 bolitas que se abren, suben un poco y se desvanecen en medio segundo. La del zorro es 1,3 veces más grande. | Constantes arriba de `src/efectos/Polvito.js` |
| Respiración | Quieto, el cuy se estira y se encoge a lo alto un 2,5 % cada 2 s, con los pies en el suelo. Al caminar o al hacer una expresión se apaga con suavidad y al detenerse vuelve. El zorro no respira. | `PERFIL_CUY.respiracion`, en `src/efectos/CuerpoVivo.js` |
| Parpadeo | El cuy parpadea de frente, al azar, cada 2 a 4 s que pasa quieto, con los cuadros 0, 1, 2, 1, 0 de la tira de parpadeo a 16 por segundo. Si el niño elige un rumbo a mitad del parpadeo, camina de inmediato. | `ESPERA_MINIMA` y `ESPERA_MAXIMA`, en `src/efectos/ParpadeoCuy.js`; los cuadros, en el manifiesto del cuy |
| Sonidos | Pisadas del cuy y del zorro cuando un pie se apoya, pop al comer bien, boing al equivocarse, «ay» al ser atrapado, puerta al abrirse y fanfarria al entrar a un nivel nuevo o al llegar al cierre. | `SONIDOS_LABERINTO`, en `src/efectos/SonidosLaberinto.js`; autoría en `public/sonidos/ORIGEN.md` |

Con `?vida=0` se apagan todos a la vez y los sonidos ni siquiera se descargan, para
comparar con y sin efectos: <http://127.0.0.1:5174/?paquete=laberinto&vida=0>. Sin
ese parámetro la capa está encendida. Las pisadas comparten un intervalo mínimo y
no se superponen, así que con el cuy y el zorro caminando a la vez se oye una sola.
El navegador solo permite sonar después del primer toque o tecla.

El estado de pruebas expone `vida` con las sombras, los parpadeos y los sonidos
reproducidos. Todavía no hay un botón para silenciar: el controlador ya tiene
`cambiarSilencio()`, pero ninguna pantalla lo usa.

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

## Verificación

```powershell
npm run prueba:logica
npm run prueba -- --workers=1
npm run build
.venv/Scripts/python -m unittest discover -s herramientas/animaciones
```

Verificado el 25 de octubre de 2026: **57 pruebas de lógica**, **51 pruebas de
navegador**, **25 pruebas de las hojas de animación** (Python) y compilación
correctas. La suite completa incluye el mercado y la capa de vida.

La lógica y la validación se prueban con `node --test`, sin instalar paquetes
adicionales: movimiento, vuelta guardada, recorrido de cada casilla, reglas,
clasificación, patrulla, búsqueda en anchura, captura y orden de avisos.

Playwright verifica el nivel 1 real hasta la puerta y el nivel 2, fruta equivocada
y ayudas, voz, mano persistente, clasificación y cierre, continuidad de la partida,
captura con frutas conservadas y dos segundos de protección, además de teclado,
ratón, tacto, distribución de pantalla y reintento de carga. Los escenarios
controlados de clasificación, captura y transición de tres niveles usan paquetes
válidos interceptados en la carga; no modifican el estado de la escena.

Las capturas locales de revisión están en `output/laberinto-completo/`: inicio,
niveles 2 y 3 y cierre en 1280 × 720 y 844 × 390. El nivel 2 se alcanza completando
el primer mapa real; las capturas de nivel 3 y cierre usan entradas previas cortas
para preparar esos estados. El mercado y sus recursos se conservan.
