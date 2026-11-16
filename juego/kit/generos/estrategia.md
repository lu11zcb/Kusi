# Estrategia para Kusi

Catálogo para diseñar juegos educativos de 1.º y 2.º de primaria en Perú (6 a 8 años). Contexto: celular horizontal, Phaser 2D, joystick, con imágenes quietas animadas por código. Consulta web: 16 de noviembre de 2026.

La estrategia consiste en preparar un plan y repartir recursos antes de observar su resultado. La defensa de torres coloca estaciones junto a rutas o carriles; la gestión organiza tareas y producción. En Kusi las estaciones clasifican, orientan o atienden, sin atacar. Joystick y salto no sustituyen directamente al ratón: hacen falta zonas de selección, planificación pausada y funciones nuevas de estaciones.

**Valoración de la adaptación pequeña:** dificultad 4/5; encaje educativo 5/5. La dificultad 4/5 refleja las extensiones de estaciones, costos, rutas y planificación, además de su traducción al joystick. Empezar con pocas casillas y una ronda corta. Son juicios de diseño, no mediciones ni eficacia educativa demostrada.

Las fichas describen las versiones indicadas; sus controles originales no son instrucciones para implementar Kusi. «Qué lo hace entretenido» es análisis de las reglas. Las adaptaciones, ideas y requisitos del motor son propuestas propias. No se ejecutaron los juegos ni se inspeccionó el código de Kusi.

## Juegos de referencia

### Plants vs. Zombies — original de defensa por carriles

- **Qué hace el jugador:** Reúne un recurso, elige unidades y las coloca en una cuadrícula para impedir que sucesivas oleadas lleguen al final. Reparte recursos entre producción, bloqueo y otras funciones mientras incorpora nuevas opciones. [Manual de PopCap alojado por EA](https://akamai.cdn.ea.com/eadownloads/u/f/manuals/GAME-PVZ/en_US_readme.html).
- **Controles y cámara:** Tablero fijo organizado en filas y columnas, visto de forma elevada; con ratón se recoge recurso, se elige una unidad y se coloca en una casilla. [Manual oficial](https://akamai.cdn.ea.com/eadownloads/u/f/manuals/GAME-PVZ/en_US_readme.html).
- **Qué lo hace entretenido:** Decidir si invertir en obtener más recursos o atender la necesidad inmediata; cubrir varias rutas y adaptar el plan cuando cambian las oleadas. El manual documenta recursos, recarga y nuevas capacidades. [Manual oficial](https://akamai.cdn.ea.com/eadownloads/u/f/manuals/GAME-PVZ/en_US_readme.html).
- **Qué se puede adaptar a Kusi:** Recorrer casillas con el protagonista y preparar estaciones que reciben o clasifican elementos de una fila. Planificar con cantidades pequeñas antes de iniciar una ronda permite enseñar presupuesto, suma, conteo y relaciones entre función y necesidad.
- **Qué NO se debe copiar o debe cambiarse:** Quitar no muertos, ataques y castigos; los elementos que pasan sin atender vuelven a una bandeja para reintentar. Reducir carriles, detener la ronda mientras se decide y usar imágenes, nombres y sonidos propios.

### Bloons Tower Defense — primer juego

- **Qué hace el jugador:** Coloca y mejora estaciones a los lados de una ruta para actuar sobre oleadas que avanzan hasta la salida. Lo que obtiene de una ronda se usa para preparar la siguiente y cubrir mejor el recorrido. [Publicación de Ninja Kiwi en Kongregate](https://www.kongregate.com/en/games/ninjakiwi/bloons-tower-defense), [ficha de Poki](https://poki.com/en/g/bloons-td).
- **Controles y cámara:** Tablero fijo visto desde arriba; ratón para elegir, colocar, mejorar o vender. La ficha de Poki indica elección y colocación con ratón. [Kongregate](https://www.kongregate.com/en/games/ninjakiwi/bloons-tower-defense), [Poki](https://poki.com/en/g/bloons-td).
- **Qué lo hace entretenido:** Buscar puntos donde una estación cubra varios tramos, combinar funciones y comprobar si una mejora resuelve la siguiente oleada. Las mejoras y oleadas están documentadas. [Kongregate](https://www.kongregate.com/en/games/ninjakiwi/bloons-tower-defense).
- **Qué se puede adaptar a Kusi:** Colocar clasificadores amables junto a una ruta; cada uno atiende elementos con una propiedad conocida. El niño anticipa qué pasará y prueba una ronda corta, con opción de reorganizar todo sin costo de error.
- **Qué NO se debe copiar o debe cambiarse:** Quitar armas y explosiones; no confundir color con única pista. Evitar rutas largas, muchísimas oleadas y mejoras numéricas difíciles; no copiar nombres, unidades ni símbolos.

### Kingdom Rush — original

- **Qué hace el jugador:** Prepara defensas en puntos de un recorrido y las mejora o especializa para responder a grupos con capacidades diferentes. También decide cuándo usar apoyos y cómo repartir recursos. [Página del creador](https://www.ironhidegames.com/Games/kingdom-rush), [página del editor](https://armorgames.com/play/12141/kingdom-rush).
- **Controles y cámara:** Tablero fijo con vista elevada del recorrido y selección de puntos de construcción. La edición original usa ratón; el estudio técnico sobre su adaptación documenta esa interfaz. [Investigación de Clemson sobre la adaptación](https://malloy.people.clemson.edu/publications/kingdomRush/stith.pdf). No traducir la perspectiva elevada en necesidad de un motor 3D.
- **Qué lo hace entretenido:** La especialización cambia para qué sirve una estación; planear combinaciones y ajustar la respuesta a nuevas necesidades evita repetir siempre la misma solución. La especialización y las capacidades variadas están documentadas por el creador. [Ironhide](https://www.ironhidegames.com/Games/kingdom-rush).
- **Qué se puede adaptar a Kusi:** Estaciones con funciones complementarias —observar, separar, completar— que el protagonista mejora eligiendo una propiedad o una parte adecuada. Enseña planificación, funciones, secuencias de procesamiento y uso de cantidades limitadas.
- **Qué NO se debe copiar o debe cambiarse:** Quitar guerra, daño, seres amenazantes y violencia; convertir el conflicto en organización de una ruta de ayuda o clasificación. Limitar especializaciones, explicar efectos con una demostración y usar nombres y recursos propios.

### Jacksmith — estrategia, gestión y fabricación

- **Qué hace el jugador:** Elige materiales y moldes, y completa una cadena de fabricación antes de entregar lo producido. Después acompaña una fase de avance donde obtiene recursos para preparar mejores encargos. [Ficha de Flipline](https://www.flipline.com/games/jacksmith/info.html).
- **Controles y cámara:** Ratón para seleccionar y manipular materiales en estaciones de fabricación, seguidas de una fase lateral de avance. El creador confirma ratón, proceso manual y fase posterior; **No encontrado:** una descripción textual completa de la cámara de cada estación en su ficha. [Flipline](https://www.flipline.com/games/jacksmith/info.html).
- **Qué lo hace entretenido:** Preparar algo paso a paso, comprobar que lo fabricado modifica el resultado y reunir componentes para mejorar el siguiente intento. La selección de materiales, fases y desbloqueos está documentada por Flipline. [Ficha del creador](https://www.flipline.com/games/jacksmith/info.html).
- **Qué se puede adaptar a Kusi:** Fabricar herramientas inocuas o completar conjuntos en estaciones; elegir material, cantidad, orden y piezas, y probar después si cumplen su función. Sirve para propiedades, partes de un objeto, secuencias e instrucciones.
- **Qué NO se debe copiar o debe cambiarse:** Reemplazar armas y batallas por construcción y prueba segura; retirar fundición peligrosa y gestos de precisión. El protagonista visita estaciones con joystick, se detiene en opciones amplias y usa placas de salto para confirmar pasos claramente separados.

## Qué necesita el motor

La base del kit: exploración a pie con un adversario amable (`kit/ejemplos/exploracion/`), viaje en vehículo entre lugares (`kit/ejemplos/viaje/`), plataformas con saltos pequeños (`kit/ejemplos/plataformas/`), joystick e interfaz común (`taller/reglas.md`, 13.16 y 13.17). Entre lugares no se salta (13.11). Lo siguiente indica qué reutilizar y qué ampliar.

- **Controles:** El protagonista camina hasta un pedestal para seleccionar; se detiene sobre una opción para confirmar y puede saltar en una placa para iniciar la ronda. Selecciones con espera breve visible y cancelación al alejarse; sin otro botón obligatorio.
- **Física:** No hace falta gravedad; rutas fijas para lo que se mueve y zonas que detectan alcance. No asumir simulación física realista.
- **Cámara:** Tablero pequeño completo en pantalla; evitar desplazamiento mientras llegan elementos.
- **Adversarios:** Oleadas de objetos o tareas que se atienden, con velocidad regulable y pausa de planificación.
- **Objetos:** Estaciones con estados, rutas, cantidades, costos, alcances y funciones verificables; selección de pocas opciones.
- **Interfaz:** Planificar/probar como estados distintos, cantidades pequeñas, próxima ronda narrada, deshacer y explicación de por qué un elemento tomó una ruta.
- **Dibujos:** Estaciones y sus estados, marcas de alcance, objetos clasificables, fichas contables, señales, rutas y placas. Recursos propios, sin copiar unidades originales.

**Reglas de implementación propuestas:** las selecciones se confirman al detenerse dentro de una zona señalada, con espera breve visible y cancelación al alejarse; pasar por ella no cuenta como respuesta. El botón sigue siendo salto. Si una placa reacciona al aterrizaje, se explica antes. En vista desde arriba, un salto requiere altura y reglas de colisión propias: no basta activar gravedad lateral. Pausa y voz pueden usar la interfaz común. Guardar el estado confirmado y la versión del juego; validar el contenido con una regla o referencia independiente del código generado. Separar errores de coordinación de respuestas conceptuales.

## Ideas de adaptación con Kusi

Estas seis propuestas no fijan un tema. El docente elige el contenido y revisa su corrección; el aprendizaje se demuestra mediante decisiones y transformaciones dentro del juego. Kusi acompaña al protagonista, que controla el niño.

1. **Presupuesto de casillas:** El protagonista recoge una cantidad limitada de fichas y decide qué estaciones construir; cada costo se muestra con objetos contables. Sirve para suma, resta, equivalencia y planificación (Matemática). **Qué observar:** recursos iniciales, costos y saldo.
2. **Red de clasificadores:** Cada estación atiende una propiedad; el niño la instala en una ruta para que todos los elementos lleguen a su categoría. Sirve para clasificación, atributos y relaciones entre grupos (Ciencia y Tecnología y Matemática). **Qué observar:** criterio de cada estación y destino de los elementos.
3. **Secuencia de estaciones:** El resultado de una estación pasa a la siguiente; el niño organiza primero, después y al final antes de iniciar la ronda. Sirve para procesos, instrucciones y ciclos sencillos (Ciencia y Tecnología y Comunicación). **Qué observar:** orden construido y producto de cada paso.
4. **Cobertura del recorrido:** Colocar elementos en posiciones marcadas permite cubrir sectores cercanos; antes de probar se muestra el alcance. Sirve para cerca/lejos, posición, comparación de distancias y orientación (Matemática). **Qué observar:** ubicación elegida y sectores cubiertos.
5. **Distribución según necesidad:** Varias estaciones piden recursos y el niño elige el orden de atención; al probar observa quién recibió lo necesario y puede reorganizar. Sirve para cooperación, necesidades, acuerdos y distribución justa (Personal Social). **Qué observar:** necesidades atendidas y explicación de prioridades.
6. **Mensajes que encaminan:** Elegir una señal oral o escrita determina a qué ruta va cada mensaje; se revisan los destinos y se corrigen los desvíos. Sirve para comprensión de instrucciones, vocabulario, letras y categorías de palabras (Comunicación). **Qué observar:** señal elegida y correspondencia entre mensaje y ruta.
