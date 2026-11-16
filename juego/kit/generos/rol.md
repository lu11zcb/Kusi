# Rol para Kusi

Catálogo para diseñar juegos educativos de 1.º y 2.º de primaria en Perú (6 a 8 años). Contexto: celular horizontal, Phaser 2D, joystick, con imágenes quietas animadas por código. Consulta web: 16 de noviembre de 2026.

El rol combina viaje, decisiones, objetos y capacidades que progresan. La versión para Kusi propone una misión corta, pocas opciones y descubrimientos que quedan registrados. Terraria es un híbrido de exploración, construcción, acción y progresión, no un ejemplo de rol puro; se incluye por fabricar y desbloquear posibilidades. La adaptación no necesita mundo infinito ni combate.

**Valoración de la adaptación pequeña:** dificultad 4/5; encaje educativo 4/5. La dificultad 4/5 incluye misión, inventario breve, recetas y guardado. Un mundo completamente excavable y construible como Terraria subiría a 5/5 y queda fuera de esta valoración. Son juicios de diseño, no mediciones ni eficacia educativa demostrada.

Las fichas describen las versiones indicadas; sus controles originales no son instrucciones para implementar Kusi. «Qué lo hace entretenido» es análisis de las reglas. Las adaptaciones, ideas y requisitos del motor son propuestas propias. No se ejecutaron los juegos ni se inspeccionó el código de Kusi.

## Juegos de referencia

### Terraria

- **Qué hace el jugador:** Explora, extrae recursos y los convierte en herramientas o construcciones. Decide qué preparar o mejorar para alcanzar nuevas zonas y afrontar retos mayores. [Página de Re-Logic en Steam](https://store.steampowered.com/app/105600/Terraria/).
- **Controles y cámara:** Vista lateral 2D; en PC combina movimiento, salto, puntero, uso de herramientas e inventario. La guía de inicio documenta teclado y ratón; en móvil existen más controles que un joystick y salto. [Guía oficial comunitaria de inicio](https://terraria.wiki.gg/wiki/Guide%3AGetting_started), [página del editor](https://store.steampowered.com/app/105600/Terraria/).
- **Qué lo hace entretenido:** Encontrar recursos, elegir qué construir, ver que una mejora permite explorar algo nuevo y dar una forma propia al recorrido. Se apoya en la construcción, fabricación y elección libre descritas por el editor. [Página del editor](https://store.steampowered.com/app/105600/Terraria/).
- **Qué se puede adaptar a Kusi:** Un área pequeña donde reunir cantidades y combinar dos o tres tipos de piezas para fabricar un paso o herramienta. Cada receta requiere una relación comprobable: contar, agrupar, ordenar o elegir material por propiedad.
- **Qué NO se debe copiar o debe cambiarse:** Quitar combate, muerte, oscuridad amenazante y extracción sin límite; evitar mundo enorme, inventario amplio y búsqueda tediosa. Seleccionar herramientas automáticamente por contexto y usar espacios prefijados de construcción, con recursos propios.

### Pokémon Diamante Brillante y Perla Reluciente — decisiones por turnos y colección

- **Qué hace el jugador:** Viaja entre lugares, reúne opciones para su equipo y decide qué acción realizar en cada encuentro. Las decisiones suceden por turnos, con tiempo para seleccionar una acción o cambiar un recurso. [Guía oficial de encuentros](https://diamondpearl.pokemon.com/en-us/trainersguide/fundamentals/battling/).
- **Controles y cámara:** La guía oficial confirma turnos y selección de acciones, equipo y objetos mediante menús. Cámara exacta y tabla completa de botones de esta edición: **No encontrado** en las fuentes primarias consultadas; para Kusi se propone exploración desde arriba y opciones por posición. [Guía oficial](https://diamondpearl.pokemon.com/en-us/trainersguide/fundamentals/battling/).
- **Qué lo hace entretenido:** Decidir sin presión de reflejos, comparar capacidades y ampliar las opciones disponibles. Los turnos y la selección cuidadosa del equipo están descritos por la guía. [Guía oficial](https://diamondpearl.pokemon.com/en-us/trainersguide/fundamentals/battling/).
- **Qué se puede adaptar a Kusi:** Reemplazar encuentros de combate por situaciones que se resuelven eligiendo una herramienta, una relación o una acción; guardar descubrimientos en un álbum de conceptos. Las opciones se recorren con joystick y se confirman al detenerse en una zona señalada, sin botón de ataque.
- **Qué NO se debe copiar o debe cambiarse:** Quitar daño, captura, estadísticas complejas, azar determinante y textos largos. No reproducir nombres, criaturas, símbolos ni recursos de la marca; el progreso representa misiones y descubrimientos, no daño infligido.

## Qué necesita el motor

La base del kit: exploración a pie con un adversario amable (`kit/ejemplos/exploracion/`), viaje en vehículo entre lugares (`kit/ejemplos/viaje/`), plataformas con saltos pequeños (`kit/ejemplos/plataformas/`), joystick e interfaz común (`taller/reglas.md`, 13.16 y 13.17). Entre lugares no se salta (13.11). Lo siguiente indica qué reutilizar y qué ampliar.

- **Controles:** Recolección al detenerse, selección en estaciones por posición, acciones contextuales automáticas; no conservar los numerosos botones originales.
- **Física:** Para fabricación lateral: bloques en puntos limitados. Para rol superior: colisiones sencillas, sin gravedad. No implementar ambos sistemas juntos en el primer juego.
- **Cámara:** Un mapa pequeño y escenas breves de decisión; seguimiento suave sin cámara 3D.
- **Adversarios:** Situaciones, rutas cerradas o recursos que faltan; retirar combate y daño.
- **Objetos:** Inventario con pocas clases, recetas verificables, registro de descubrimientos y desbloqueos.
- **Interfaz:** Una misión activa narrada, álbum simple, cantidades visibles, ayuda y resumen de lo que se consiguió. Guardar misión, inventario y versión exacta.
- **Dibujos:** Piezas de terreno, objetos de recolección, herramientas, estaciones y estados de construcción; el protagonista y Kusi usan el sistema común.

**Reglas de implementación propuestas:** las selecciones se confirman al detenerse dentro de una zona señalada, con espera breve visible y cancelación al alejarse; pasar por ella no cuenta como respuesta. El botón sigue siendo salto. Si una placa reacciona al aterrizaje, se explica antes. En vista desde arriba, un salto requiere altura y reglas de colisión propias: no basta activar gravedad lateral. Pausa y voz pueden usar la interfaz común. Guardar el estado confirmado y la versión del juego; validar el contenido con una regla o referencia independiente del código generado. Separar errores de coordinación de respuestas conceptuales.

## Ideas de adaptación con Kusi

Estas seis propuestas no fijan un tema. El docente elige el contenido y revisa su corrección; el aprendizaje se demuestra mediante decisiones y transformaciones dentro del juego. Kusi acompaña al protagonista, que controla el niño.

1. **Fabricación por receta:** Reunir y combinar cantidades concretas produce una herramienta que cambia el recorrido. Sirve para composición y descomposición de números, agrupación y equivalencias (Matemática). **Qué observar:** composición elegida y resultado de la receta.
2. **Álbum de descubrimientos:** Encontrar algo permite registrarlo; completar una relación desbloquea la siguiente página o zona, sin repetir recolección. Sirve para clasificar, comparar propiedades y registrar observaciones (Ciencia y Tecnología). **Qué observar:** criterio de clasificación y relación registrada.
3. **Conversación con elección:** Escuchar una situación y caminar hacia una de dos respuestas hace avanzar una misión; la consecuencia explica la elección. Sirve para comprensión oral, intención comunicativa y vocabulario (Comunicación). **Qué observar:** respuesta elegida después de escuchar y su revisión.
4. **Resolver por turnos:** El juego se detiene en un reto; se elige una acción, se observa su efecto y se puede cambiar la estrategia antes de continuar. Sirve para operaciones sencillas, predicción y explicación de procedimientos (Matemática y Ciencia y Tecnología). **Qué observar:** procedimiento escogido y cambio entre intentos.
5. **Herramienta según función:** El niño elige en una estación qué objeto llevar; cada herramienta permite una clase de acción y abre una ruta distinta. Sirve para relacionar partes, propiedades y usos sin exigir nombres técnicos (Ciencia y Tecnología). **Qué observar:** objeto elegido y función que hizo posible.
6. **Misiones relacionadas:** Cumplir una tarea ayuda a otra persona a realizar la siguiente; el mapa registra qué necesita cada estación y quién puede ayudar. Sirve para funciones en la comunidad, cooperación y secuencias temporales (Personal Social). **Qué observar:** dependencias resueltas y orden de colaboración.
