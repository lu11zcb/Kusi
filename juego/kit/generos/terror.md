# Terror: reinterpretación como misterio para Kusi

Catálogo para diseñar juegos educativos de 1.º y 2.º de primaria en Perú (6 a 8 años). Contexto: celular horizontal, Phaser 2D, joystick, con imágenes quietas animadas por código. Consulta web: 16 de noviembre de 2026.

Este apartado solo transforma observación, memoria, pistas y administración de recursos en curiosidad y cuidado. La versión de Kusi deja de ser terror: no usa sustos, amenaza, oscuridad amenazante ni encierro. Se incluye una referencia conocida para explicar qué se conserva y qué se elimina, no para recomendar que la jueguen los niños.

**Valoración de la adaptación pequeña:** dificultad 2/5; encaje educativo 3/5. Dificultad 2/5 y encaje 3/5 valoran únicamente una sala de observación o un mapa de pistas sin miedo. No incluyen sistemas de terror ni primera persona. Son juicios de diseño, no mediciones ni eficacia educativa demostrada.

Las fichas describen las versiones indicadas; sus controles originales no son instrucciones para implementar Kusi. «Qué lo hace entretenido» es análisis de las reglas. Las adaptaciones, ideas y requisitos del motor son propuestas propias. No se ejecutaron los juegos ni se inspeccionó el código de Kusi.

## Juegos de referencia

### Five Nights at Freddy's (primero)

- **Qué hace el jugador:** Observa varias zonas mediante cámaras y decide cuándo usar mecanismos de protección. Debe administrar energía limitada y comprobar si algo cambió antes de que termine el periodo.
- **Controles y cámara:** Puesto fijo en primera persona con selección de monitores y mecanismos por clic; no es un recorrido lateral o desde arriba. Para Kusi se transforma en un mapa cenital donde el protagonista visita estaciones y observa cambios.
- **Qué lo hace entretenido:** Vigilar varias cosas, recordar su estado anterior y decidir dónde prestar atención con recursos limitados.
- **Qué se puede adaptar a Kusi:** Comparar antes/después, hallar una diferencia, seguir pistas y distribuir una cantidad pequeña de recursos para cuidar varios espacios.
- **Qué NO se debe copiar o debe cambiarse:** Quitar por completo sustos, oscuridad amenazante, encierro, persecución y amenaza de daño; mantener curiosidad y sorpresa anticipada. Energía agotada significa pedir ayuda o recargar, nunca quedar indefenso.

Fuentes: [Steam, ficha del desarrollador de Five Nights at Freddy's](https://store.steampowered.com/app/319510/Five_Nights_at_Freddys/).

## Qué necesita el motor

La base del kit: exploración a pie con un adversario amable (`kit/ejemplos/exploracion/`), viaje en vehículo entre lugares (`kit/ejemplos/viaje/`), plataformas con saltos pequeños (`kit/ejemplos/plataformas/`), joystick e interfaz común (`taller/reglas.md`, 13.16 y 13.17). Entre lugares no se salta (13.11). Lo siguiente indica qué reutilizar y qué ampliar.

- **Controles:** joystick en mapa cenital y salto para atravesar obstáculos bajos; observar y seleccionar al detenerse en estaciones.
- **Física:** reutilizar colisiones cenitales; no se necesita oscuridad dinámica, primera persona ni simulación 3D.
- **Cámara:** cenital fija o seguimiento lento; ninguna cámara brusca ni sobresalto.
- **Adversarios:** ninguno obligatorio; acompañantes o fenómenos previsibles que cambian estados.
- **Objetos:** pistas, mecanismos, estaciones de observación, recursos contables y destinos.
- **Interfaz:** inventario pequeño de evidencias, voz y repetición, comparador antes/después, registro de hipótesis; recarga asistida si un recurso se agota.
- **Dibujos:** piezas educativas con estados distinguibles y pistas grandes; revelados suaves y cambios de estado por código, sin recursos de los referentes de terror.

**Reglas de implementación propuestas:** las selecciones se confirman al detenerse dentro de una zona señalada, con espera breve visible y cancelación al alejarse; pasar por ella no cuenta como respuesta. El botón sigue siendo salto. Si una placa reacciona al aterrizaje, se explica antes. En vista desde arriba, un salto requiere altura y reglas de colisión propias: no basta activar gravedad lateral. Pausa y voz pueden usar la interfaz común. Guardar el estado confirmado y la versión del juego; validar el contenido con una regla o referencia independiente del código generado. Separar errores de coordinación de respuestas conceptuales.

## Ideas de adaptación con Kusi

Estas seis propuestas no fijan un tema. El docente elige el contenido y revisa su corrección; el aprendizaje se demuestra mediante decisiones y transformaciones dentro del juego. Kusi acompaña al protagonista, que controla el niño.

1. **Encontrar qué cambió:** visitar una sala, observarla, salir y volver para señalar la diferencia al detenerse junto a ella. Sirve para propiedades y descripción de cambios (Comunicación y Ciencia y Tecnología). **Qué observar:** cambio señalado y propiedad que lo distingue.
2. **Seguir pistas encadenadas:** escuchar una pista que lleva a una zona; allí aparece la siguiente. Sirve para comprensión oral y orientación espacial (Comunicación y Personal Social). **Qué observar:** pista interpretada y destino encontrado.
3. **Reconstruir lo sucedido:** recoger evidencias y ubicarlas en antes/durante/después, con posibilidad de revisar. Sirve para secuencia narrativa y cambios en el tiempo (Comunicación y Personal Social). **Qué observar:** orden de evidencias y posibilidad de revisarlo.
4. **Cuidar varios espacios:** distribuir recursos visibles entre estaciones según necesidades explícitas. Sirve para contar, comparar, cuidado y uso responsable (Matemática, Ciencia y Tecnología y Personal Social). **Qué observar:** recursos distribuidos y necesidades cubiertas.
5. **Observar un ciclo:** visitar estaciones o esperar un cambio seguro y registrar qué estado viene después. Sirve para ciclos y regularidades (Ciencia y Tecnología y Matemática). **Qué observar:** estado predicho y regularidad observada.
6. **Comprobar una hipótesis:** elegir una explicación entre pocas opciones, activar un mecanismo y observar si ocurre lo previsto. Sirve para causa/efecto, experimentación y explicación oral (Ciencia y Tecnología y Comunicación). **Qué observar:** explicación inicial, resultado observado y cambio de hipótesis.
