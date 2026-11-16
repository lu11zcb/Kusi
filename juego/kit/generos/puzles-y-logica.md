# Puzles y lógica para Kusi

Catálogo para diseñar juegos educativos de 1.º y 2.º de primaria en Perú (6 a 8 años). Contexto: celular horizontal, Phaser 2D, joystick, con imágenes quietas animadas por código. Consulta web: 16 de noviembre de 2026.

Un puzle plantea un estado que el jugador transforma hasta cumplir una regla. Puede usar rutas, piezas, gravedad o secuencias. Cocina se incluye como gestión de pedidos y pasos, no como puzle puro. En Kusi el protagonista debe seguir siendo controlable: los clics y arrastres se traducen a caminar, transportar y detenerse en estaciones.

**Valoración de la adaptación pequeña:** dificultad 2/5; encaje educativo 5/5. La dificultad 2/5 es para cuadrícula y reglas deterministas. Cuerdas físicas precisas o cocina con muchas tareas simultáneas pueden subir a 4/5. La fusión de números no se traslada a letras o conceptos con reglas falsas. Son juicios de diseño, no mediciones ni eficacia educativa demostrada.

Las fichas describen las versiones indicadas; sus controles originales no son instrucciones para implementar Kusi. «Qué lo hace entretenido» es análisis de las reglas. Las adaptaciones, ideas y requisitos del motor son propuestas propias. No se ejecutaron los juegos ni se inspeccionó el código de Kusi.

## Juegos de referencia

### Bad Ice-Cream

- **Qué hace el jugador:** Recorre un laberinto y recoge todos los objetos objetivo mientras evita adversarios. Puede crear o romper barreras para modificar las rutas antes de que termine el tiempo.
- **Controles y cámara:** Flechas o WASD para moverse; F o espacio crea o rompe barreras. Ángulo exacto de la cámara original en el texto consultado: **No encontrado**. Para Kusi se propone vista desde arriba, con el salto separado de cualquier colocación de barreras.
- **Qué lo hace entretenido:** Combina planificación de rutas y evasión; cambiar el camino permite protegerse o encerrar temporalmente a los perseguidores. Los niveles añaden nuevas distribuciones y obstáculos.
- **Qué se puede adaptar a Kusi:** Recoger solo elementos que cumplan una regla, reunir una cantidad exacta o seguir una secuencia. Las barreras pueden organizar conjuntos y abrir caminos al resolver una relación.
- **Qué NO se debe copiar o debe cambiarse:** Quitar persecución agobiante y cronómetros obligatorios; no copiar nombres, marcas, mapas ni recursos. Equivocarse debe permitir reorganizar y volver a intentar.

Fuentes: [Poki, Bad Ice-Cream](https://poki.com/en/g/bad-ice-cream).

### Cut the Rope

- **Qué hace el jugador:** Decide qué cuerda cortar y en qué momento para que un objeto suspendido llegue al destino. Puede buscar una trayectoria que además recoja objetivos secundarios; si falla, prueba otro orden.
- **Controles y cámara:** Pantalla fija de puzle físico, sin caminar por el mundo; cortar mediante deslizamiento del dedo o ratón y tocar mecanismos. Para Kusi puede transformarse en vista lateral con el protagonista activando soportes desde zonas accesibles.
- **Qué lo hace entretenido:** Ver cómo una pequeña decisión produce una cadena de movimientos; experimentar con balanceo, gravedad y elementos que cambian la trayectoria. Completar una ruta y perfeccionarla son metas separadas.
- **Qué se puede adaptar a Kusi:** Anticipar antes/después, ordenar acciones, observar causa y efecto o llevar piezas a destinos según una clasificación.
- **Qué NO se debe copiar o debe cambiarse:** Evitar cortes que exijan precisión extrema y reflejos rápidos; no confundir éxito motor con comprensión. Dar reinicio y ayuda libres, sin anuncios ni recursos de la marca.

Fuentes: [ZeptoLab, Cut the Rope](https://www.zeptolab.com/games/cut-the-rope), [Arkadium, instrucciones](https://support.arkadium.com/support/solutions/articles/44002797498--cut-the-rope-how-to-play-tips-scoring), [Y8](https://www.y8.com/games/cut_the_rope).

### 2048

- **Qué hace el jugador:** Desplaza todas las fichas de una cuadrícula hacia una dirección. Las fichas del mismo valor se fusionan y duplican su número; aparecen fichas nuevas y hay que conservar espacio para seguir combinando.
- **Controles y cámara:** Tablero fijo de 4 × 4; flechas en ordenador y deslizamientos en móvil, sin personaje que camine. Para conservar el control del protagonista en Kusi, habría que rediseñarlo como transportar o empujar cantidades, no trasladar literalmente su tablero.
- **Qué lo hace entretenido:** Cada movimiento cambia varias piezas a la vez; una combinación libera espacio y acerca un valor mayor. Hay que anticipar y corregir el plan.
- **Qué se puede adaptar a Kusi:** Componer cantidades pequeñas con grupos visibles que el protagonista lleva a un lugar de unión; antes de juntar, el niño elige la relación válida. Usar reglas numéricas comprobables y permitir separar y corregir.
- **Qué NO se debe copiar o debe cambiarse:** El objetivo 2048 y su cadena larga no son adecuados como punto de partida para todos los niños de 1.º y 2.º. No presentar unir dos letras iguales como una regla de lectura ni inventar fusiones científicas falsas; quitar bloqueo definitivo y presión por récord.

Fuentes: [Poki, 2048](https://poki.com/en/g/2048), [play2048.co](https://play2048.co/).

### Papa's Freezeria

- **Qué hace el jugador:** Recibe pedidos, selecciona ingredientes y prepara cada encargo pasando por distintas estaciones. Compara lo entregado con lo pedido y recibe una valoración; al avanzar debe coordinar más tareas.
- **Controles y cámara:** Interfaz de estaciones, no un mapa de movimiento lateral o cenital; seleccionar y arrastrar con ratón, con interacción táctil en ediciones compatibles. Para Kusi se propone una sala desde arriba: caminar a estaciones y recoger o entregar al detenerse.
- **Qué lo hace entretenido:** Recordar combinaciones, cambiar de tarea a tiempo y ver terminado el encargo; aparecen ingredientes y pedidos nuevos.
- **Qué se puede adaptar a Kusi:** Cumplir instrucciones orales de dos o tres pasos, contar piezas, comparar cantidades y mantener un orden de preparación.
- **Qué NO se debe copiar o debe cambiarse:** No exigir leer pedidos largos, atender muchas órdenes simultáneas ni trabajar bajo presión; quitar propinas como juicio sobre el niño. No copiar recetas, marca ni interfaz.

Fuentes: [Poki, Papa's Freezeria](https://poki.com/en/g/papas-freezeria), [Flipline, página oficial](https://www.flipline.com/games/papasfreezeria/index.html).

## Qué necesita el motor

La base del kit: exploración a pie con un adversario amable (`kit/ejemplos/exploracion/`), viaje en vehículo entre lugares (`kit/ejemplos/viaje/`), plataformas con saltos pequeños (`kit/ejemplos/plataformas/`), joystick e interfaz común (`taller/reglas.md`, 13.16 y 13.17). Entre lugares no se salta (13.11). Lo siguiente indica qué reutilizar y qué ampliar.

- **Controles:** reutilizar joystick; movimiento por cuadrícula o libre con ajuste final, parada para recoger/colocar; salto disponible para recorrer, sin sustituirlo por arrastre.
- **Física:** cuadrícula sin gravedad para empujar; agregar reglas de ocupación y detección de bloqueo. Solo si se elige inspiración de cuerdas, extensión de péndulos y soportes; no necesaria en el primer alcance.
- **Cámara:** fija o cenital en una sala visible; si usa gravedad, lateral con toda la relación visible.
- **Adversarios:** opcionales y lentos; el reto puede ser exclusivamente el estado del tablero.
- **Objetos:** piezas movibles, huecos, destinos, puertas e interruptores con estado.
- **Interfaz:** consigna con voz y repetición, vista del objetivo, deshacer, reiniciar sin castigo, ayuda y confirmación de selección.
- **Dibujos:** objetos educativos, destinos diferenciados, piezas enteras y partes, señales de estado; movimientos y resaltado por código.

**Reglas de implementación propuestas:** las selecciones se confirman al detenerse dentro de una zona señalada, con espera breve visible y cancelación al alejarse; pasar por ella no cuenta como respuesta. El botón sigue siendo salto. Si una placa reacciona al aterrizaje, se explica antes. En vista desde arriba, un salto requiere altura y reglas de colisión propias: no basta activar gravedad lateral. Pausa y voz pueden usar la interfaz común. Guardar el estado confirmado y la versión del juego; validar el contenido con una regla o referencia independiente del código generado. Separar errores de coordinación de respuestas conceptuales.

## Ideas de adaptación con Kusi

Estas seis propuestas no fijan un tema. El docente elige el contenido y revisa su corrección; el aprendizaje se demuestra mediante decisiones y transformaciones dentro del juego. Kusi acompaña al protagonista, que controla el niño.

1. **Empujar y agrupar:** mover piezas a zonas, dejando juntos elementos que cumplen una propiedad. Sirve para clasificar, formar conjuntos y comparar cantidades (Matemática y Ciencia y Tecnología). **Qué observar:** criterio de agrupación, no solo llegada.
2. **Activar en orden:** recorrer interruptores que abren una salida solo si se siguen pasos correctos. Sirve para secuencias, instrucciones, ciclos y orden de procesos (Comunicación y Ciencia y Tecnología). **Qué observar:** secuencia de activación y correcciones.
3. **Repartir lo justo:** transportar piezas entre recipientes hasta cumplir una cantidad en cada uno. Sirve para contar, sumar, restar y comparar (Matemática). **Qué observar:** cantidades finales comparadas con el pedido.
4. **Ensamblar partes:** llevar cada pieza a su lugar de un esquema y probar si está completo. Sirve para partes de un todo, relación estructura/función y organización de espacios (Ciencia y Tecnología y Personal Social). **Qué observar:** pieza, posición y relación con el conjunto.
5. **Reconstruir un mensaje:** recoger unidades y colocarlas en una banda de orden; poder escucharlas antes de confirmar. Sirve para letras, sílabas, palabras y secuencias narrativas (Comunicación). **Qué observar:** orden final y escucha previa a la confirmación.
6. **Atender un encargo:** escuchar una instrucción breve y visitar estaciones en el orden solicitado; entregar y comparar con el pedido. Sirve para cantidades, comprensión oral, cooperación y pasos de una tarea (Matemática, Comunicación y Personal Social). **Qué observar:** instrucción cumplida, cantidades y orden de entrega.
