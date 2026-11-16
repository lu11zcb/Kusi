# Recetas de diversión

Cada juego del taller usa **una sola mecánica**. Esta carpeta dice **qué hace divertida** a cada una y con qué
números empezar. La IA las lee y escribe el juego: aquí no hay código.

| Receta | Cuándo se elige | Modelo para copiar |
| --- | --- | --- |
| [diversion.md](diversion.md) | **Siempre.** Lo que tiene todo buen juego sencillo (estilo Friv) y la lista de puntos que el revisor mide. | — |
| [exploracion.md](exploracion.md) | Recoger y esquivar desde arriba, con un adversario amable. | `kit/ejemplos/exploracion/` |
| [plataformas.md](plataformas.md) | Correr y saltar de lado, con saltos pequeños. | `kit/ejemplos/plataformas/` |
| [viaje.md](viaje.md) | Manejar un vehículo hasta paradas y bajar a explorar. | `kit/ejemplos/viaje/` |

Qué hay que pedir de más: la lista de juegos de Friv y qué motor necesita cada uno está en
[../generos/](../generos/). **Casi todo lo que falta son juegos de tablero** (emparejar, ordenar, armar una palabra,
buscar entre distractores): un motor nuevo de tablero con cursor movido por el joystick cubriría la mayoría.

## Cómo se usan

1. El proponedor y el supervisor **eligen una receta** (una, no dos) y la anotan en `plan.md`.
2. El programador la lee completa antes de escribir y parte del modelo de `kit/ejemplos/`.
3. El revisor mide el juego con «Los puntos que se miden» de [diversion.md](diversion.md).

Si ninguna receta encaja con la idea, la idea se cambia; no se mezclan recetas.
