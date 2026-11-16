# Aventura para Kusi

Catálogo para diseñar juegos educativos de 1.º y 2.º de primaria en Perú (6 a 8 años). Contexto: celular horizontal, Phaser 2D, joystick, con imágenes quietas animadas por código. Consulta web: 16 de noviembre de 2026.

La aventura une exploración, pistas y situaciones que abren el siguiente tramo. Puede cruzarse con puzles, plataformas y acción; Cactus McCoy está aquí por sus zonas y descubrimientos, aunque su creador lo presenta como plataformas de acción. Para Kusi, una misión breve y narrada permite viajar juntos sin depender de lectura larga ni combate.

**Valoración de la adaptación pequeña:** dificultad 3/5; encaje educativo 5/5. La dificultad 3/5 corresponde a pocas salas y dependencias simples. Un mapa enorme, diálogos ramificados o muchos objetos de inventario cambian el alcance. Son juicios de diseño, no mediciones ni eficacia educativa demostrada.

Las fichas describen las versiones indicadas; sus controles originales no son instrucciones para implementar Kusi. «Qué lo hace entretenido» es análisis de las reglas. Las adaptaciones, ideas y requisitos del motor son propuestas propias. No se ejecutaron los juegos ni se inspeccionó el código de Kusi.

## Juegos de referencia

### Wheely

- **Qué hace el jugador:** Prepara una ruta resolviendo mecanismos de cada pantalla. Ordena el avance y la parada del vehículo para alcanzar la salida sin sufrir un accidente. [Instrucciones de Coolmath Games](https://www.coolmathgames.com/0-wheely), [ficha de Y8](https://www.y8.com/games/wheely).
- **Controles y cámara:** Vista lateral por pantallas; clic para avanzar o parar, y clic o arrastre sobre botones y palancas. No es conducción directa con joystick. [Instrucciones de Coolmath Games](https://www.coolmathgames.com/0-wheely).
- **Qué lo hace entretenido:** Descubrir el orden de los mecanismos, coordinar movimiento y parada, y abrir una salida antes bloqueada.
- **Qué se puede adaptar a Kusi:** El niño camina con joystick y salta sobre placas para activar mecanismos; experimentar con antes/después, secuencias y causa/efecto permite descubrir una ruta segura. Una placa debe poder desactivarse para corregir la decisión.
- **Qué NO se debe copiar o debe cambiarse:** Quitar accidentes destructivos y objetos peligrosos; sustituir los arrastres pequeños por zonas amplias activadas al detenerse o saltar. Usar nombres y recursos propios; destacar lo que se puede tocar y ofrecer reinicio sin castigo.

### Bob the Robber

- **Qué hace el jugador:** Recorre habitaciones en varios pisos, observa recorridos de vigilancia y busca la forma de abrir zonas cerradas. Resuelve obstáculos como claves, interruptores y alarmas para alcanzar un objetivo sin ser detectado. [Ficha de Y8](https://www.y8.com/games/bob_the_robber).
- **Controles y cámara:** Recorrido lateral entre pisos; la ficha distingue mover, subir/leer/usar, acción y buscar. **No encontrado:** equivalencia exacta de todas las teclas en la extracción de la ficha consultada; no asignarlas por suposición. [Ficha de Y8](https://www.y8.com/games/bob_the_robber).
- **Qué lo hace entretenido:** Esperar una oportunidad, reconocer un patrón de movimiento, descubrir un acceso y mejorar una ruta. La ficha menciona rutas secretas y dificultad creciente. [Ficha de Y8](https://www.y8.com/games/bob_the_robber).
- **Qué se puede adaptar a Kusi:** Explorar un lugar autorizado buscando información o piezas, observar ciclos lentos y usar pistas para abrir pasos. Las claves pueden ser órdenes, cantidades o relaciones espaciales; equivocarse deja probar otra combinación.
- **Qué NO se debe copiar o debe cambiarse:** Quitar robo, golpes y amenaza de captura; usar obstáculos móviles previsibles o puertas que esperan su turno. Reducir lectura y pasos ocultos, explicar pistas con voz y usar recursos propios.

### Cactus McCoy — aventura con plataformas y acción

- **Qué hace el jugador:** Recorre una zona hasta encontrar el mapa que abre la siguiente. Puede desviarse para buscar objetos escondidos y mover elementos que permiten alcanzar otros lugares. [Manual del creador](https://i.flipline.com/games/cactusmccoycot/faq.html).
- **Controles y cámara:** Vista lateral; flechas para correr, A para saltar, flecha abajo para recoger y D para soltar; el original añade S para atacar. También permite usar cuerdas y escaleras. [Manual del creador](https://i.flipline.com/games/cactusmccoycot/faq.html).
- **Qué lo hace entretenido:** Una ruta principal permite avanzar, mientras los desvíos ofrecen descubrimientos opcionales; mover objetos abre accesos. El manual confirma tesoros escondidos, retos por zona y progreso entre áreas. [Manual](https://i.flipline.com/games/cactusmccoycot/faq.html).
- **Qué se puede adaptar a Kusi:** Buscar partes de una indicación y reunirlas para descubrir el siguiente destino; mover o apilar pocas cajas para llegar a una pista. Sirve para orden, orientación, composición de mensajes y relaciones espaciales.
- **Qué NO se debe copiar o debe cambiarse:** Quitar armas, golpes, maldiciones y amenazas; cambiar adversarios por obstáculos lentos y saltables. Recoger al detenerse y soltar en zonas de entrega evita añadir botones; conservar rutas opcionales sin obligar a reunirlo todo.

## Qué necesita el motor

La base del kit: exploración a pie con un adversario amable (`kit/ejemplos/exploracion/`), viaje en vehículo entre lugares (`kit/ejemplos/viaje/`), plataformas con saltos pequeños (`kit/ejemplos/plataformas/`), joystick e interfaz común (`taller/reglas.md`, 13.16 y 13.17). Entre lugares no se salta (13.11). Lo siguiente indica qué reutilizar y qué ampliar.

- **Controles:** Caminar y detenerse en zonas de interacción; salto sobre placas. No añadir otro botón de acción obligatorio; indicar con voz cuándo basta detenerse.
- **Física:** Elegir una vista por juego; colisiones de puertas, cajas y rampas, sin simular maquinaria compleja.
- **Cámara:** Habitaciones fijas o seguimiento suave; transición sin ocultar la consigna.
- **Adversarios:** Obstáculos móviles que avisan, esperan y devuelven al último punto seguro.
- **Objetos:** Inventario de pocas piezas, interruptores con estados claros, puntos de entrega y dependencias entre puertas.
- **Interfaz:** Encargo visible con voz repetible, una pista a la vez, inventario breve, confirmación de entrega y avance guardable.
- **Dibujos:** Piezas de camino, puertas abiertas/cerradas, placas, objetos transportables, señales y estados de los mecanismos; usar al protagonista que entrega el reproductor.

**Reglas de implementación propuestas:** las selecciones se confirman al detenerse dentro de una zona señalada, con espera breve visible y cancelación al alejarse; pasar por ella no cuenta como respuesta. El botón sigue siendo salto. Si una placa reacciona al aterrizaje, se explica antes. En vista desde arriba, un salto requiere altura y reglas de colisión propias: no basta activar gravedad lateral. Pausa y voz pueden usar la interfaz común. Guardar el estado confirmado y la versión del juego; validar el contenido con una regla o referencia independiente del código generado. Separar errores de coordinación de respuestas conceptuales.

## Ideas de adaptación con Kusi

Estas seis propuestas no fijan un tema. El docente elige el contenido y revisa su corrección; el aprendizaje se demuestra mediante decisiones y transformaciones dentro del juego. Kusi acompaña al protagonista, que controla el niño.

1. **Ruta de encargos:** El protagonista recorre estaciones, recoge una cantidad y entrega exactamente lo pedido; puede recuperar un objeto mal entregado. Sirve para contar, sumar, restar y correspondencia uno a uno (Matemática). **Qué observar:** cantidad solicitada frente a la entregada.
2. **Cadena de pistas:** Kusi da una pista oral; el niño visita el lugar que coincide y recibe la siguiente. Sirve para vocabulario, comprensión oral y relaciones entre descripción y objeto (Comunicación). **Qué observar:** relación entre pista y destino elegido.
3. **Mecanismos encadenados:** Saltar sobre placas cambia rampas o puertas; el niño observa qué provoca cada acción y prepara un paso seguro. Sirve para secuencias, predicciones y causa/efecto (Ciencia y Tecnología). **Qué observar:** orden de activación y predicción comprobada.
4. **Mapa que se completa:** Explorar y reconocer referencias permite colocar una marca de posición; luego se sigue una instrucción espacial hasta otro punto. Sirve para orientación y lectura inicial de mapas (Personal Social y Matemática). **Qué observar:** posición marcada y ruta seguida.
5. **Restituir partes:** Transportar piezas hasta sus sitios cambia el funcionamiento de un conjunto; probar una pieza muestra si encaja y permite retirarla. Sirve para partes y funciones, composición y relaciones todo/parte (Ciencia y Tecnología). **Qué observar:** pieza, lugar y función restituida.
6. **Decidir con consecuencias:** En una bifurcación el niño se detiene sobre una opción y ve una consecuencia breve; puede volver y comparar. Sirve para convivencia, acuerdos, cuidado y orden de acciones (Personal Social y Comunicación). **Qué observar:** opción elegida, consecuencia observada y revisión.
