# Catálogo de mecánicas para Kusi

Este catálogo reúne **29 fichas de juegos, nueve géneros y 54 ideas de adaptación** para que una IA diseñadora proponga juegos educativos originales. Prioriza la memoria del Friv clásico y la contrasta con fichas de creadores, manuales y portales; añade referencias de Y8, Poki y otros juegos conocidos cuando aportan una mecánica distinta. No es una lista certificada de los más jugados.

Kusi está dirigido a niños de 1.º y 2.º de primaria en Perú, de 6 a 8 años. El niño controla a su protagonista y Kusi lo acompaña en viajes. La base es Phaser 2D, celular horizontal, joystick, exploración desde arriba, viaje en vehículo e interfaz común. Las imágenes son quietas y se animan por código. Los juegos de referencia no se ejecutaron; el código de Kusi se revisó después (ver «Cómo se usa en el taller»).

> **Importante:** en Kusi **no se salta entre lugares** (`taller/reglas.md`, 13.11): se viaja en vehículo. El salto pequeño y a escala dentro de
> un lugar, como en Fancy Pants o Fireboy and Watergirl, sí vale.

## Índice y comparación

Cada archivo se puede leer solo: explica el género, presenta fichas con cinco campos, distingue los controles originales de la adaptación, detalla el motor y termina con seis ideas educativas.

| Género y archivo | Juegos de referencia | Dificultad de construir con joystick y salto (1–5) | Encaje educativo (1–5) |
|---|---|---:|---:|
| [Acción y disparos](accion-y-disparos.md) | Metal Slug, Gun Force, Bomb It | 3 | 4 |
| [Aventura](aventura.md) | Wheely, Bob the Robber, Cactus McCoy | 3 | 5 |
| [Rol](rol.md) | Terraria, Pokémon Diamante Brillante/Perla Reluciente | 4 | 4 |
| [Estrategia](estrategia.md) | Plants vs. Zombies, Bloons Tower Defense, Kingdom Rush, Jacksmith | 4 | 5 |
| [Deportes y carreras](deportes-y-carreras.md) | Skate Mania, Extreme Car Parking!, Moto X3M, Subway Surfers, Basketball Stars | 3 | 4 |
| [Puzles y lógica](puzles-y-logica.md) | Bad Ice-Cream, Cut the Rope, 2048, Papa's Freezeria | 2 | 5 |
| [Plataformas](plataformas.md) | Fancy Pants Adventures: World 1, Fireboy and Watergirl, Vex, dos Bombastic | 2 | 5 |
| [Lucha reinterpretada](lucha.md) | Street Fighter 6, Super Smash Bros. Ultimate | 3 | 3 |
| [Terror reinterpretado](terror.md) | Five Nights at Freddy's | 2 | 3 |

[Fuentes y límites de la consulta](fuentes.md) reúne las direcciones y explica qué respalda cada página. Consulta: **16 de noviembre de 2026**.

Las puntuaciones son juicios de diseño sobre **una adaptación pequeña**, no sobre reproducir todo el juego. En lucha se valora un encuentro cooperativo; en terror, un misterio de observación sin miedo. La corrección de los contenidos la debe revisar el docente con una comprobación independiente; estas propuestas no son resultados de eficacia educativa.

**Dificultad:** 1 significa una regla y una sala con la base existente; 2, reutilizar movimiento y sumar estados simples; 3, añadir movimiento especializado o mecanismos coordinados; 4, incorporar sistemas como inventario, fabricación, estaciones o planificación; 5, combinar sistemas extensos, mundo destructible, simulación exigente o control complejo. Es comparación de alcance, no una estimación de días.

**Encaje educativo:** 1, la acción apenas representa el contenido; 2, exige añadir una actividad separada; 3, necesita una transformación fuerte; 4, varias decisiones del juego pueden demostrar aprendizaje; 5, ordenar, contar, clasificar o relacionar son la propia acción central. Un 5 no garantiza aprender: depende de la consigna, la dificultad y la revisión docente.

## Fichas de diseño del primer minuto

El **proponedor** lee la ficha al elegir un juego cuya acción sirva para aprender el tema. El **supervisor** la vuelve a leer en su crítica para comprobar qué hace el niño al empezar, cómo responde el juego y qué decisiones debe fijar en el plan. Las opciones por defecto son puntos de partida. Cada excepción se usa dentro de las [reglas del taller](../../taller/reglas.md).

- [Plataformas](fichas/plataformas.md) · [Arcade clásico](fichas/arcade-clasico.md)
- [Objetos escondidos](fichas/objetos-escondidos.md) · [Puzle de casillas](fichas/puzle-de-casillas.md) · [Puzle de lógica](fichas/puzle-de-logica.md)
- [Carrera sin fin](fichas/carrera-sin-fin.md) · [Bloques que caen](fichas/bloques-que-caen.md)
- [Pesca](fichas/pesca.md) · [Cuidar y ordenar](fichas/cuidar-y-ordenar.md) · [Laberinto](fichas/laberinto.md)

## Cómo se usa en el taller

Este catálogo lo leen el **proponedor** (para que cada propuesta se inspire en una mecánica distinta, no en
«recorrer y recoger») y el **supervisor** (para elegir el motor del kit). Nunca se copian nombres, dibujos,
sonidos, textos ni niveles de los juegos de referencia: solo la mecánica, contada con palabras de Kusi.

**Qué motor del kit sirve hoy para cada tipo de juego** (`taller/reglas.md`, 13.16):

| Mecánica | Motor del kit | Modelo para copiar |
|---|---|---|
| Visto desde arriba, recorrer un lugar, esquivar a un adversario, reunir | Exploración | `kit/ejemplos/exploracion/` |
| Viajar entre varios lugares manejando un vehículo (barco, globo, carreta…) y explorar cada lugar a pie | Viaje | `kit/ejemplos/viaje/` |
| De lado, con saltos pequeños, recoger, llevar, interruptores y puertas | Plataformas | `kit/ejemplos/plataformas/` |
| Carrera lateral, estacionar, lanzar, arrastrar y ordenar, construir, estrategia, plataformas | Todavía no hay motor propio | Usar el más cercano (exploración o viaje) con la idea de la ficha, o proponer lo que sí se puede hacer con el joystick. el salto vale solo dentro de un lugar (`taller/reglas.md`, 13.11) |

**Reglas que valen siempre** (vienen de las fichas): el niño se maneja con el joystick (y un botón de saltar en plataformas); recoger o
entregar se confirma al detenerse en una zona grande (nunca por pasar por encima); no hay castigo ni «perdiste»;
la violencia, el miedo y la lucha se reinterpretan en versiones amables; y el contenido se comprueba con una
regla independiente del código del juego.

## Qué fue el Friv clásico

Friv sitúa su primera beta en noviembre de 2006. Su menú clásico de 2006 a 2020 reunía muchos iconos en una pantalla y dependía de Flash, igual que sus juegos de esa etapa. El portal explica el cambio de menú, el uso de HTML5 y la recuperación parcial de juegos antiguos mediante emulación; también señala que aquel menú completo resulta demasiado pequeño en un celular. [Ayuda oficial de Friv](https://www.friv.com/help-es.html).

Adobe terminó el soporte de Flash el 31 de diciembre de 2020 y bloqueó su ejecución desde el 12 de enero de 2021. Son las fechas de su explicación y preguntas frecuentes; un encabezado de esa misma página muestra una fecha incongruente. [Adobe, fin de Flash](https://www.adobe.com/products/players/flash-player-distribution.html).

Para estudiar ese legado conviene separar **recuerdo, presencia y popularidad**. La [lista alfabética oficial de Friv](https://www.friv.com/gameslist.html) incluye Bad Ice Cream, Fancy Pants Adventure y Extreme Car Parking, entre otros. Una [lista publicada en 2018](https://detodojuegos.com/2018/12/friv-com-todos-los-juegos-y-secretos/) incluye Skate Mania: es evidencia histórica secundaria, no prueba de su autoría ni de cuántas personas lo jugaron. La [selección de Friv](https://www.friv.com/z/play/games.html) destaca títulos como Fireboy and Watergirl, Bloxorz y Moto X3M, pero no ofrece cifras comparables de partidas. Estar en estas páginas no equivale a ocupar un puesto histórico.

Poki describe Subway Surfers como uno de sus juegos más jugados; se conserva como afirmación del portal, sin asignarle posición ni jugadores únicos. [Poki, Subway Surfers](https://poki.com/en/g/subway-surfers). Un ranking público, histórico y comparable de Friv, Y8 y Poki: **No encontrado**. Votos y partidas son métricas distintas. No todos los juegos de este catálogo se presentan como juegos que estuvieron en Friv; Metal Slug, Gun Force y las referencias de rol, lucha y terror amplían el vocabulario de mecánicas.

La lección de diseño que proponemos extraer del portal es ofrecer retos comprensibles, intentos cortos y variación entre niveles. Esta es una interpretación para Kusi, no una conclusión estadística sobre el público de Friv ni una invitación a copiar sus juegos.

## Cómo usarlo al diseñar

1. Elegir el tipo de aprendizaje: contar, ordenar, clasificar, leer relaciones, reconocer partes, comprender instrucciones, observar cambios o cooperar.
2. Buscar una mecánica cuya acción demuestre ese aprendizaje. Ejemplo general: transportar una cantidad y corregir los sobrantes muestra conteo; saltar después de responder un cuestionario no lo integra por sí solo.
3. Tomar un bucle pequeño y una dificultad a la vez. Dibujar el recorrido con palabras, decidir dónde el niño puede detenerse y comprobar que exista una ruta terminable.
4. Conservar joystick y salto. Recoger, elegir o entregar se activa al detenerse en zonas grandes con confirmación visible y posibilidad de cancelar; nunca al pasar por encima sin querer. No resolver automáticamente la elección correcta por el niño.
5. Comparar la respuesta con una regla o referencia independiente del código generado. Registrar selección, corrección y ayuda por separado; una caída o un roce no demuestra que el niño no entendió.
6. Revisar con el docente y probar la comprensión y los controles con el público antes de dar por válida la adaptación.

Se usan géneros como orientaciones, no como cajas cerradas: Fireboy and Watergirl cruza plataformas y puzles; Cactus McCoy, aventura y acción; Terraria, construcción, exploración y progresión. Cocina está en puzles por organización de pedidos y pasos, aunque es gestión/simulación. El corredor infinito está en deportes y carreras por su avance, con un cruce evidente con plataformas.

Las fichas describen solo reglas y funcionamiento. Las adaptaciones deben usar nombres, dibujos, sonidos, textos y mapas propios de Kusi. El apartado «Dibujos» enumera recursos necesarios; no reproduce ni describe el arte de los referentes.

## Datos que no pudieron confirmarse

- Ranking histórico o actual comparable, con cifras verificables, entre Friv, Y8 y Poki: **No encontrado**.
- Qué Bombastic recuerda el equipo y su vínculo exacto con Friv: **No encontrado**. Se identifican dos juegos diferentes, de Inarsy y Jamie Rowan; no se sustituyen por Bomb It.
- Cámara exacta de Skate Mania y Extreme Car Parking!, y ángulo original explícito de Bad Ice-Cream en el texto consultado: **No encontrado**. Las vistas propuestas para Kusi se señalan como propuestas.
- Autoría original de Skate Mania con documentación plenamente accesible: **No encontrado**.
- Asignaciones completas de teclas de Bob the Robber, Vex, Bomb It y Bombastic de Inarsy; seguimiento de cámara de Bombastic de Rowan; esquema completo del primer Metal Slug en las fuentes consultadas: **No encontrado** para esos detalles.
- Cámara y botones completos de la edición de Pokémon, botones universales por mando de Super Smash Bros. Ultimate y cámara completa de cada estación de Jacksmith: **No encontrado** en la documentación accesible empleada.
- Algunas páginas solo ofrecieron un fragmento del buscador o bloquearon la apertura. Se detallan en fuentes.md; no se presentan como páginas leídas por completo. No se comprobó eficacia educativa ni se midió esfuerzo de programación en el código.
