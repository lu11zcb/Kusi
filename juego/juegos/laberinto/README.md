# El laberinto de Kusi

El cuy recorre un laberinto visto desde arriba, recoge alimentos y abre el
portal mientras evita al zorro. Kusi da la consigna con voz y dos ayudas.

- **Reglas:** `orden` (seguir un patrón, como fresa, plátano, fresa, plátano) y
  `solo_clase` (recoger solo frutas o solo verduras).
- **Guion de ejemplo:** [`kit/recursos/paquete-laberinto-ejemplo.json`](../../kit/recursos/paquete-laberinto-ejemplo.json),
  con tres niveles.
- **Comprobaciones:** `ValidadorLaberinto` en `edu-api`, antes de que el juego
  llegue al docente.

Para un tema nuevo, la IA escribe solo el guion: el mapa, la regla, los
alimentos, el zorro, la consigna y las ayudas. El código del juego no cambia.

## Abrirlo

Desde `juego/`:

```sh
npm run dev
```

El ejemplo se sirve en <http://127.0.0.1:5174/>. La vista previa docente y
Android le envían el guion generado por el puente, sin cambiar de reproductor.

- `?nivel=2` y `?nivel=3` abren directamente esos niveles.
- `?vida=0` deja quieta la vegetación y apaga efectos y sonidos, conservando el
  movimiento del zorro.
- `?rapido=1` acelera los desplazamientos cuatro veces; los tiempos de alerta y
  descanso siguen en segundos reales.
- `?renderizador=auto` permite comparar con la selección automática de Phaser.

## Controles y objetivos

- El joystick permanece a la izquierda. Mantén el dedo y arrástralo para elegir
  un rumbo; al soltar, el cuy termina la casilla y se detiene en su centro.
- Las flechas eligen un rumbo y mantienen el avance hasta un muro.
- Los alimentos se recogen al pasar por su casilla. Tocar el mapa no elige un
  destino; la interacción táctil del recorrido usa el joystick.
- Kusi, con sombrero y poncho, está a la derecha, debajo de su consigna.
  Escuchar repite la consigna y Ayuda muestra las dos pistas del nivel.
- En `orden`, la barra conserva el patrón, muestra todos los alimentos a color,
  marca los recogidos y señala el siguiente con destellos.
- En `solo_clase`, la barra muestra las frutas o verduras que existen en el
  mapa, incluidas las repetidas. Se pueden recoger en cualquier orden y se
  marca la ficha del alimento realmente recogido. El contador indica la meta.
- Al completar la regla se abre la puerta. Una captura devuelve al cuy al
  inicio y conserva los alimentos recogidos; no hay vidas ni fin por captura.

## Niveles y zorro

El ejemplo contiene tres niveles: patrón de fresa/plátano sin enemigos,
patrón de mango/mandarina con zorro y clasificación de cuatro frutas entre
verduras con zorro. Los guiones enviados pueden combinar ambas reglas.

El zorro explora desde que aparece el nivel, sin esperar una acción del niño.
Prioriza los pasillos menos visitados, incluidos ramales y callejones. En modo
`patrulla` continúa explorando; `persigue_cerca` detecta al cuy a cinco pasos
transitables, muestra una alerta de 0,6 segundos y lo persigue al 60 % de su
velocidad. Tras cinco segundos de persecución descansa dos y vuelve a buscar.

El movimiento usa casillas por segundo, con pasos de simulación pequeños para
no atravesar muros ni perder capturas entre dos centros. El cuy avanza a tres
casillas por segundo en velocidad normal.

## Mundo y dibujos

El mapa y el paisaje comparten una vista desde arriba, sin horizonte ni casas
vistas de frente. El fondo y las plantas están en `kit/recursos/dibujos/mundo/`;
pasto, arbustos, margaritas y flores usan cuatro cuadros por tira, con raíces y
tamaños fijos. [Originales y preparación](../../kit/originales/README.md).

Se reutilizan los dos cuyes (el del niño y Kusi), el zorro, los ocho alimentos
y los dos cubos de adobe de `kit/recursos/dibujos/`. Cada muro es un cubo
suelto; sus dos variantes se eligen con una semilla estable por nivel. El patio
ilustrado cubre el mapa y el portal tiene estados cerrado y abierto.

El lienzo usa `Scale.EXPAND`. El mundo reserva columnas para los controles y la
guía; la cámara se ajusta para mantener visibles mapa, barra y consigna al cambiar
el tamaño. Redimensionar conserva la partida. Canvas es el renderizador habitual.

## Guiones y puente

El formato es `kusi-paquete/0`, familia `laberinto`. Un reto contiene mapa,
regla, objetos, enemigos, consigna y dos ayudas. Los símbolos son `#` muro,
`.` camino, `C` inicio y `P` puerta. El catálogo contiene fresa, platano, mango,
mandarina, pina, zanahoria, papa y choclo. La validación completa del guion
pertenece a Spring; el reproductor valida lo necesario para cargarlo.

`?paquete=mensaje` espera el guion. La página que contiene el juego puede enviar:

```js
iframe.contentWindow.postMessage({ tipo: 'paquete', paquete: guion }, origenJuego)
iframe.contentWindow.postMessage({ tipo: 'reiniciar' }, origenJuego)
```

Solo se aceptan órdenes de la ventana que contiene el juego. El reproductor
avisa `listo`, `cargado` y `error`, y comunica los avisos de partida al anfitrión.
Android usa `KusiPuente`; el protocolo está en `kit/reproductor/mensajes/puenteGuion.js`.

## Código de este juego

| Carpeta | Qué tiene |
| --- | --- |
| `escenas/` | `EscenaLaberinto.js`, la escena que arma el mapa y la partida. |
| `logica/` | Reglas, movimiento por casillas, zorros, joystick, disposición en pantalla, parámetros y avisos de la partida. |
| `interfaz/` | Barra de objetivos, joystick y mano que enseña. |
| `dibujos/` | El patio y el fondo del laberinto. |
| `efectos/` | Captura, portal y vegetación que se mueve. |
| `datos/` | `validarLaberinto.js`, lo mínimo para cargar un guion. |

Lo demás (personajes, voz, puente con la app, dibujos y sonidos) lo toma del
[kit](../../kit/README.md).

## Comprobar

Desde `juego/`:

```sh
npm run prueba:logica
npm run build
npx playwright install chromium
npm run prueba
```

Las herramientas de captura y rendimiento están en
[`kit/herramientas/`](../../kit/herramientas/README.md) y escriben sus
resultados en `evidencias/`, una carpeta local que no se sube a GitHub.
