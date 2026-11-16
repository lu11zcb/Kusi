# Receta: recoger y esquivar desde arriba

Inspirada en Bad Ice-Cream y los juegos de laberinto. **Modelo:** `kit/ejemplos/exploracion/` y
`kit/reproductor/logica/exploracion.js`.

## Por qué se juega una y otra vez

El niño recorre un lugar pequeño y decide el camino mientras un adversario lento lo obliga a pensar por dónde
ir. La tensión viene de **elegir la ruta**, no de ir rápido.

## Cómo se arma

- **El lugar:** pequeño y con forma (calles, pasillos, estantes, surcos), no una explanada. Lo que se reúne está
  repartido en varias esquinas, no todo en línea recta. Que haya **dos caminos** para llegar a lo mismo.
- **Qué se recoge:** la respuesta educativa (la fruta que toca, la sílaba, el animal). Las cosas equivocadas
  también están ahí, **del mismo tamaño y bien visibles**: rebotan suave y Kusi da una pista distinta.
- **Recoger:** al tocar la cosa correcta, **al instante** (nada de esperar parado). Efecto de «pop» y sonido.
- **El adversario amable:** avisa 0,6 s antes de perseguir, va al 60 % de la velocidad del protagonista, persigue
  hasta 5 s y descansa 2 s. Si alcanza al protagonista, lo devuelve al inicio **conservando lo reunido**.
  Nunca asusta ni suena a golpe.
- **Joystick** para mover; ningún botón.

## Los niveles (mismo verbo, otra vuelta)

1. Sin adversario, 3 cosas, un solo camino claro: se aprende el verbo.
2. Entra el adversario; 4 cosas; un atajo.
3. Un obstáculo que se mueve o una puerta que se abre al recoger la primera cosa; 5 cosas.

## Números para empezar (ajústalos jugando)

- Velocidad del protagonista: 360 px/s (la del modelo). Lugar de 1 a 3 pantallas.
- Cosas por nivel: 3, 4, 5. Equivocadas a la vista: tantas como correctas, como máximo.
- Reintento tras ser alcanzado: menos de 2 s.

## Lo que no se hace

- Esperar junto a la cosa para recogerla. Recoger es tocarla.
- Un lugar enorme que obliga a caminar sin nada que hacer.
- Un adversario rápido, que no descansa o que quita lo reunido.
