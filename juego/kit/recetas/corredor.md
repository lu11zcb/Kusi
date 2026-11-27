# Receta: el corredor de carriles

Inspirada en los juegos de correr sin parar. En Friv se parece a Fancy Pants Adventure (la velocidad es lo divertido)
y a Free Gear (ir más rápido que otro). **No hay modelo de código en `kit/ejemplos/`**: el programador la escribe con
las herramientas del kit (`controles.js`, `hud.js`, `mundoVivo.js`, el protagonista).

## Por qué se juega una y otra vez

El protagonista **corre solo** y el niño decide por dónde. Siempre pasa algo: llega lo que hay que agarrar y lo que hay
que esquivar. Es **acción**, se entiende en 5 segundos, y cada vuelta sale un poco distinta y un poco más rápida.

## Cómo se arma

- **Vista de lado.** El mundo pasa de derecha a izquierda y el protagonista corre en su sitio, mirando a la derecha
  (vista `derecha`). El suelo es una franja con **tres carriles** (arriba, medio, abajo).
- **Control:** dos botones grandes del kit, **Subir** abajo a la izquierda y **Bajar** abajo a la derecha
  (`crearControles(escena, { carriles: true })`). Lee `controles.leer().y` una vez por cuadro y aplica
  `-1` para subir o `1` para bajar un carril, con un deslizamiento suave. Con `0` se mantiene el carril.
  Las flechas arriba y abajo y las teclas W y S también sirven, con un pulso por pulsación.
- **Lo que viene por los carriles:** (1) **lo correcto**, que se agarra al pasar por encima (la letra, el número, la
  fruta que pide Kusi); (2) **lo equivocado**, que se puede agarrar pero no suma, rebota y Kusi da una pista; (3) un
  **obstáculo** del mundo (un charco, una caja) que frena un momento si se choca, sin quitar nada.
- **La acción sube sola:** la velocidad aumenta un poco cada vez que el niño acierta, y las cosas llegan en grupos de
  2 o 3 para que haya que decidir rápido. Al fallar la velocidad baja un poco: así nunca se pierde.
- **Racha:** acertar varias seguidas enciende un brillo y suena más alegre. Una racha larga da una estrella extra.
- **Meta:** juntar N aciertos (3, 4 y 5 por nivel). Al llegar, el protagonista cruza una meta con celebración.
- **Cómo se aprende:** la respuesta **es el carril**. Kusi dice «las vocales fuertes» y el niño lleva al protagonista por
  el carril donde vienen las fuertes. No hay preguntas con botones.

## Los niveles (mismo verbo, otra vuelta)

1. Una sola cosa correcta a la vez, sin obstáculos, velocidad suave: se aprende que los botones Subir y Bajar cambian de carril (sin joystick, corrección 115).
2. Aparecen lo equivocado y un obstáculo; las cosas llegan en pares.
3. La velocidad sube más y llegan en grupos de 3; un tramo con curvas de fondo (el paisaje cambia).

## Números para empezar (ajústalos jugando)

- Cada carril mide unos 130 px de alto. Cosa que llega cada 0,9 s al inicio, cada 0,6 s al final.
- Velocidad inicial: el mundo pasa a 260 px/s; sube un 6 % por acierto hasta un tope de 520 px/s.
- Reintento: sin pantalla de «perdiste». Un choque frena 0,4 s.

## Lo que no se hace

- Que algo aparezca en medio de la pantalla. Todo entra por el borde derecho y se acerca con el suelo, como en el juego
  del dinosaurio sin internet: el niño lo ve venir (corrección 119).

- Perder por chocar o empezar de cero. Aquí solo se frena.
- Tres carriles con cosas tan pegadas que no se pueda decidir. Siempre hay un carril libre.
- Fondo quieto: el mundo se mueve (nubes, árboles, suelo pasando) o parece que el protagonista no avanza.

## Variante anotada para otro juego (idea del equipo, 27 nov)

Un corredor **en vertical**, como los juegos de correr sin parar: sin joystick ni botones, se juega **deslizando el dedo** (izquierda y
derecha cambian de carril, arriba salta, abajo se agacha), el protagonista corre todo el tiempo y **alguien lo persigue** de forma amable
(un personaje travieso del tema, nunca un policía que castiga). Pide gestos de deslizar en el kit y la orientación vertical en el
reproductor: todavía no existen. En los juegos de carriles horizontales se usan los botones **Subir** y **Bajar** (correcciones 115 y 118).
