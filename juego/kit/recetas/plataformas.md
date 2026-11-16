# Receta: correr y saltar de lado

Inspirada en Fancy Pants Adventure y Fireboy and Watergirl. **Modelo:** `kit/ejemplos/plataformas/`,
`kit/reproductor/logica/plataformas.js` y `salto.js`.

## Por qué se juega una y otra vez

El niño siente que **domina el salto**: correr, calcular, saltar y caer justo. Cada nivel es un recorrido corto
que se mejora al repetirlo.

## Cómo se arma

- **El recorrido:** una pantalla o dos de ancho, con escalones, charcos, cajas y huecos **pequeños**. El salto
  es corto y a escala del mundo; usa `separacionComoda()` para que todo hueco se pueda cruzar sin esfuerzo.
- **Qué se recoge:** la respuesta educativa, repartida **sobre el camino** y en pequeños desvíos que piden un
  salto. Las equivocadas están a la vista, también al alcance, y rebotan suave.
- **Controles:** joystick para correr y **un botón de saltar**. Nada más.
- **Un obstáculo que se esquiva** (algo que va y viene, un tronco que rueda lento): da el reto sin castigar.
  Si toca al protagonista, vuelve unos pasos atrás, sin perder lo reunido.
- **Caer no mata:** si cae a un hueco, reaparece en el último escalón firme en menos de 2 s.
- **Se siente bien:** al aterrizar, polvito y un rebote corto; al correr, el protagonista se inclina; al recoger,
  destello y sonido.

## Los niveles (mismo verbo, otra vuelta)

1. Terreno llano con 2 saltos fáciles y 3 cosas.
2. Huecos más separados y un desnivel; 4 cosas; un obstáculo que va y viene.
3. Un tramo con plataformas a distintas alturas y un atajo arriesgado; 5 cosas.

## Números para empezar

- Velocidad al caminar: 380 px/s (la del modelo). Alcance de un salto: pensado para hueco de 1 a 2 personajes.
- Cosas por nivel: 3, 4, 5. Un nivel dura 1 a 3 minutos.

## Lo que no se hace

- Saltos grandes entre islas, nubes o planetas: entre lugares se viaja en vehículo.
- Responder una pregunta durante un salto.
- Huecos que exijan precisión de adulto ni caídas que reinicien el nivel.
