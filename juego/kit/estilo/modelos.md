# Piezas modelo

Estas son las piezas aprobadas del kit con las que se compara cada pieza nueva.
La guía no las copia: los enlaces llevan a los archivos reales que usa el juego.

## La lámina

[lamina-modelos.png](lamina-modelos.png) (1376 × 832) junta las piezas modelo a
**tamaño real**, en celdas de 256 × 256 sobre el papel crema del juego. Sirve
para dos cosas:

- el dibujante la usa como referencia de estilo al pedir una pieza;
- el revisor pone la pieza nueva al lado y compara su contorno, sus colores y
  su tamaño.

| Fila | Piezas, de izquierda a derecha |
| --- | --- |
| 1 | fresa, plátano, mango, mandarina, piña |
| 2 | zanahoria, papa, choclo, portal cerrado, botón de voz |
| 3 | cuy (de frente), zorro (de frente), Kusi, muro de adobe, suelo del patio |

En la fila 3 se ve la diferencia de contorno: los personajes llevan una línea
más fina y más oscura que los objetos de las filas 1 y 2.

## Objetos

| Pieza | Archivo | Por qué es modelo |
| --- | --- | --- |
| Fresa | [fresa.png](../recursos/dibujos/objetos/fresa.png) | Contorno de 8 a 10 px, brillo arriba a la izquierda, sombra a la derecha, apoyada en y = 244. |
| Plátano | [platano.png](../recursos/dibujos/objetos/platano.png) | Objeto sin base: va centrado. |
| Mango | [mango.png](../recursos/dibujos/objetos/mango.png) | Dos tonos y un brillo, con hoja de otro color. |
| Mandarina | [mandarina.png](../recursos/dibujos/objetos/mandarina.png) | Forma redonda muy simple que se reconoce en gris. |
| Piña | [pina.png](../recursos/dibujos/objetos/pina.png) | Líneas de adentro más finas que el contorno. |
| Zanahoria | [zanahoria.png](../recursos/dibujos/objetos/zanahoria.png) | Verdura alargada, apoyada en y = 244. |
| Papa | [papa.png](../recursos/dibujos/objetos/papa.png) | Detalles chicos (ojitos de la papa) que todavía se ven a 64 px. |
| Choclo | [choclo.png](../recursos/dibujos/objetos/choclo.png) | Objeto peruano reconocible, con granos dibujados sin textura. |

## Interfaz y mundo

| Pieza | Archivo | Por qué es modelo |
| --- | --- | --- |
| Portal | [portal-cerrado.png](../recursos/dibujos/mundo/portal-cerrado.png) y [portal-abierto.png](../recursos/dibujos/mundo/portal-abierto.png) | Objeto del mundo de frente y apenas desde arriba, con dos estados. |
| Botón de voz | [boton-voz.png](../recursos/dibujos/interfaz/boton-voz.png) | Interfaz: amarillo con contorno de tinta. |
| Muro | [muro-a.png](../recursos/dibujos/mundo/muro-a.png) y [muro-b.png](../recursos/dibujos/mundo/muro-b.png) | Cubo visto desde arriba y de frente, opaco. Son solo dos: cada muro del mapa es un cubo suelto. |
| Suelo | [tierra-patio.png](../recursos/dibujos/mundo/tierra-patio.png) | Suelo arena con piedritas, suave para que resalte lo que se toca. |
| Fondo | [fondo-patio.png](../recursos/dibujos/mundo/fondo-patio.png) | Fondo desde arriba, con el centro libre y tejados recortados en las esquinas. |
| Plantas | [arbusto.png](../recursos/dibujos/mundo/arbusto.png) y [pasto.png](../recursos/dibujos/mundo/pasto.png) | Vegetación vista desde arriba, con contorno verde oscuro. |

## Personajes (no se dibujan en este sprint)

| Personaje | Hoja | Manifiesto |
| --- | --- | --- |
| Cuy, el protagonista de hoy | [cuy.png](../recursos/dibujos/personajes/cuy.png) | [cuy.json](../recursos/dibujos/personajes/cuy.json) |
| Zorro | [zorro.png](../recursos/dibujos/personajes/zorro.png) | [zorro.json](../recursos/dibujos/personajes/zorro.json) |
| Kusi | [kusi.png](../recursos/dibujos/personajes/kusi.png) | no tiene: sus cuadros están en `kit/reproductor/logica/hablaKusi.js` |

## Los pedidos que ya funcionaron

- [kit/originales/mundo/patio-pedidos.txt](../originales/mundo/patio-pedidos.txt):
  el fondo desde arriba y la hoja de plantas.
- [kit/originales/personajes/espaldas-pedidos.txt](../originales/personajes/espaldas-pedidos.txt): la
  corrección de las espaldas del cuy y del zorro.

## Cómo se rehace la lámina

La lámina se arma componiendo los archivos de arriba, sin redibujar nada. Si
cambia una pieza modelo, se vuelve a armar desde `juego/` con:

```sh
node kit/herramientas/armar_lamina.mjs
```
