# Receta: la carrera contra un rival

Inspirada en Free Gear (adelantar a otro con un impulso) y en las carreras de Friv. **No hay modelo de código en
`kit/ejemplos/`**: el programador la escribe con las herramientas del kit.

## Por qué se juega una y otra vez

**Competir** contra alguien: ir por delante, que el rival te alcance, volver a pasarlo. Cada carrera es una historia
corta. Ganar se siente bien y perder de poco da ganas de repetir.

## Cómo se arma

- **Vista de lado** (como `corredor.md`) con **tres carriles** y el protagonista corriendo en su sitio mientras el mundo
  pasa. Al fondo, un **rival amable** (el zorro u otro animal del mundo) corre por su carril.
- **Control:** el joystick sube o baja de carril. Nada más.
- **El pulso de la carrera:** en el camino hay **portales con la respuesta**: uno correcto y uno equivocado a la vez,
  en carriles distintos. Pasar por el correcto da un **impulso** (se acelera un momento, con estela y sonido); por el
  equivocado, una pausa corta de medio segundo. El rival sigue su propio ritmo, con altibajos.
- **Competencia amable:** la carrera es corta (30 a 45 segundos). Si el rival llega primero, no pasa nada malo: se
  repite el tramo con otra ayuda. Nunca hay «perdiste»: Kusi dice «¡casi!, otra vez». Se premia con estrellas por
  llegar primero y por aciertos seguidos, y la ayuda no quita estrellas.
- **Meta:** una línea de llegada al final de cada nivel. Se muestra un indicador de la posición (el protagonista y el
  rival como dos puntos sobre una barra de recorrido).
- **Cómo se aprende:** la respuesta **es el portal**. Kusi pide «el que es más grande» o «la sílaba que empieza con
  ma» y el niño elige el carril del portal correcto. No hay preguntas con botones.

## Los niveles (mismo verbo, otra vuelta)

1. Rival lento, un portal por vez, sin obstáculos: se aprende a elegir carril.
2. Rival normal, portales con dos opciones, aparece un obstáculo que se esquiva cambiando de carril.
3. Rival más rápido que empuja al final, portales más cerca unos de otros, una meta con cinta.

## Números para empezar

- Impulso: +40 % de velocidad durante 1,2 s. Pausa por error: −30 % durante 0,5 s.
- El rival va al 90 %, 100 % y 105 % de la velocidad media del niño, con altibajos de ±10 %.
- Carrera: 30 a 45 s. Reintento de un nivel: menos de 3 s.

## Lo que no se hace

- Un rival injusto que siempre gana o que no se puede alcanzar.
- Castigos, reinicios al fallar o pantallas de «perdiste».
- Mezclar con explorar o armar algo: solo se corre.
