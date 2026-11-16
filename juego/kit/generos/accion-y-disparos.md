# Acción y disparos para Kusi

Catálogo para diseñar juegos educativos de 1.º y 2.º de primaria en Perú (6 a 8 años). Contexto: celular horizontal, Phaser 2D, joystick, con imágenes quietas animadas por código. Consulta web: 16 de noviembre de 2026.

La acción pide moverse y decidir mientras cambia la situación. Los disparos añaden dirección y momento de activación. Para Kusi se conservan el recorrido y las decisiones de posición; el combate se transforma en activar, reparar o ayudar. Las referencias tienen acciones adicionales: no caben completas en joystick y salto. Bombastic está en [plataformas](plataformas.md); Bomb It es otro juego.

**Valoración de la adaptación pequeña:** dificultad 3/5; encaje educativo 4/5. La dificultad 3/5 supone activación por posición y obstáculos simples. Si se obliga a responder mientras se esquiva, el encaje educativo baja: separar observación, decisión y movimiento. Son juicios de diseño, no mediciones ni eficacia educativa demostrada.

Las fichas describen las versiones indicadas; sus controles originales no son instrucciones para implementar Kusi. «Qué lo hace entretenido» es análisis de las reglas. Las adaptaciones, ideas y requisitos del motor son propuestas propias. No se ejecutaron los juegos ni se inspeccionó el código de Kusi.

## Juegos de referencia

### Metal Slug — referencia: primer juego de 1996, no la versión 3D

- **Qué hace el jugador:** Avanza por tramos y supera encuentros con adversarios mediante movimiento, saltos y disparos. Recoge mejoras y puede utilizar vehículos para continuar hasta completar la misión.
- **Controles y cámara:** Vista lateral con desplazamiento; movimiento, salto y disparo. El esquema completo de botones del primer juego: **No encontrado** en la documentación consultada; la fuente de controles detallados corresponde a Metal Slug 5, no debe trasladarse sin aviso al original.
- **Qué lo hace entretenido:** Alternar movimiento y acción, recibir mejoras al ayudar, y cambiar temporalmente lo que puede hacer el jugador.
- **Qué se puede adaptar a Kusi:** Recorrer tramos cortos, esquivar obstáculos y activar únicamente objetivos que cumplan una regla; la elección de objetivo sirve para clasificar, contar o reconocer símbolos. Para Kusi la activación puede ser automática al detenerse frente al objetivo, con tiempo para pensar y salto separado.
- **Qué NO se debe copiar o debe cambiarse:** Sustituir combate, armas, granadas y rescates bélicos por activar, reparar, despejar o ayudar; reducir la presión y dar reintentos cercanos. No trasladar nombres propios, marcas, textos, niveles ni recursos del juego.

Fuentes: [SNK, historia oficial](https://www.snk-corp.co.jp/us/anniversary/metalslug30th/history/), [SNK, original](https://game.snk-corp.co.jp/event/virtual-console/metalslug/index_metalslug_j.html), [SNK, controles de la quinta entrega](https://game.snk-corp.co.jp/official/ms5/ms5_system.html).

### Gun Force / GunForce — referencia: arcade original, no GunForce II

- **Qué hace el jugador:** Recorre etapas de acción lateral, supera adversarios y usa distintas herramientas de ataque. Puede cambiar de condición al subir a vehículos, lo que introduce una forma distinta de avanzar.
- **Controles y cámara:** Vista lateral con desplazamiento horizontal. El panel del manual original identifica joystick de ocho direcciones y botones FIRE y JUMP-ON/OFF; no necesita un esquema con muchos botones, pero sí uno más que joystick y salto.
- **Qué lo hace entretenido:** Variar herramientas y vehículos dentro de un recorrido y decidir cómo atravesar cada tramo.
- **Qué se puede adaptar a Kusi:** Cambiar temporalmente la herramienta al pasar por una estación; cada herramienta sirve para un tipo de objeto y el niño decide dónde emplearla. Permite relaciones objeto-función, clasificaciones y usos adecuados de materiales; el uso se activa al detenerse en una zona señalada.
- **Qué NO se debe copiar o debe cambiarse:** Eliminar combate, armas y destrucción; usar recuperación o transformación de obstáculos. Enseñar una función nueva cada vez, conservar el salto como salto y omitir menús de equipo, nombres, marcas y diseños originales.

Fuentes: [Tozai Games, reedición oficial](https://tozaigames.co.jp/products/irem-collection-2/index.html), [Manual de Irem conservado](https://www.crazykong.com/manuals/GunForce.man.pdf).

### Bomb It — referencia adicional independiente de Bombastic

- **Qué hace el jugador:** Se mueve por una arena y coloca bombas, intentando abrirse paso y superar a los otros participantes. Puede jugarse individualmente o entre dos; no debe confundirse con los títulos llamados Bombastic.
- **Controles y cámara:** Vista de arena desde arriba, desplazamiento por direcciones y una acción para colocar bomba. Y8 documenta movimiento, bomba, pausa y modo de dos jugadores; la disposición exacta de teclas no aparece como texto accesible: **No encontrado**.
- **Qué lo hace entretenido:** Combinar colocación y retirada: la misma acción que abre una ruta obliga a planear dónde esperar.
- **Qué se puede adaptar a Kusi:** Dejar una señal que activa varias casillas después de una cuenta visible, para predecir recorridos o contar distancias. Con el control actual, colocarla automáticamente al permanecer en una casilla preparada; si no hay salto físico, representar un pequeño salto con altura dibujada para cruzar obstáculos bajos.
- **Qué NO se debe copiar o debe cambiarse:** Evitar bombas, explosiones dañinas, eliminación de rivales y encierros sin salida. Mostrar por anticipado las casillas afectadas y permitir cancelar o reintentar; no trasladar recursos ni marcas.

Fuentes: [Y8, Bomb It](https://www.y8.com/games/bomb_it).

## Qué necesita el motor

La base del kit: exploración a pie con un adversario amable (`kit/ejemplos/exploracion/`), viaje en vehículo entre lugares (`kit/ejemplos/viaje/`), plataformas con saltos pequeños (`kit/ejemplos/plataformas/`), joystick e interfaz común (`taller/reglas.md`, 13.16 y 13.17). Entre lugares no se salta (13.11). Lo siguiente indica qué reutilizar y qué ampliar.

- **Controles:** joystick para mover; botón siempre para saltar; activar al detenerse frente a un objetivo válido o al entrar en una estación. No automatizar una respuesta correcta: el niño debe elegir objetivo o posición. Permitir rechazar sin activar al pasar de largo.
- **Física:** gravedad y salto si la vista es lateral; colisiones sencillas de proyectiles amables o zonas de activación. En vista superior, colisiones de mapa y altura dibujada separada si hay salto; no combinar sin reglas de alcance claras.
- **Cámara:** seguimiento lateral moderado, o sala superior fija; ver el siguiente peligro con antelación y dejar zonas seguras de decisión.
- **Adversarios:** obstáculos móviles de ruta breve y estado anunciado; al contacto reposicionar sin perder avance confirmado. No hacen falta combates ni jefes.
- **Objetos:** objetivos con propiedades educativas, receptores, herramientas temporales y activadores; separar dato de contenido, respuesta esperada y efecto de juego.
- **Interfaz:** consigna con voz y repetición, objetivo visible, contador comprensible, pausa, aviso previo y devolución amable; registrar selección y corrección, no convertir toda colisión en respuesta incorrecta.
- **Dibujos:** protagonista suministrado por el motor, compañero Kusi, objetos de contenido, receptores, marcadores de alcance y estados del obstáculo; imágenes quietas con movimiento, escala, giro u opacidad por código. Dibujos propios, sin recrear los de las referencias.

**Reglas de implementación propuestas:** las selecciones se confirman al detenerse dentro de una zona señalada, con espera breve visible y cancelación al alejarse; pasar por ella no cuenta como respuesta. El botón sigue siendo salto. Si una placa reacciona al aterrizaje, se explica antes. En vista desde arriba, un salto requiere altura y reglas de colisión propias: no basta activar gravedad lateral. Pausa y voz pueden usar la interfaz común. Guardar el estado confirmado y la versión del juego; validar el contenido con una regla o referencia independiente del código generado. Separar errores de coordinación de respuestas conceptuales.

## Ideas de adaptación con Kusi

Estas seis propuestas no fijan un tema. El docente elige el contenido y revisa su corrección; el aprendizaje se demuestra mediante decisiones y transformaciones dentro del juego. Kusi acompaña al protagonista, que controla el niño.

1. **Activar objetivos por regla:** caminar, detenerse frente a un objeto y activar automáticamente solo el que cumple la consigna; no hay botón de disparo. Sirve para clasificar, reconocer letras o identificar propiedades de materiales (Matemática, Comunicación, Ciencia y Tecnología). **Qué observar:** qué propiedad eligió, no su puntería.
2. **Recolectar y entregar una cantidad:** recoger unidades durante un tramo y llevar la cantidad solicitada a una estación; las sobrantes pueden dejarse. Sirve para conteo, correspondencia uno a uno y sumas o restas concretas (Matemática). **Qué observar:** cantidad entregada y corrección de sobrantes.
3. **Esperar la ventana correcta:** los obstáculos alternan estados lentos y predecibles; se avanza cuando el patrón permite pasar. Sirve para patrones repetitivos, secuencias temporales y ciclos, con pausa segura para observar (Matemática, Ciencia y Tecnología). **Qué observar:** predicción del estado y decisión de paso.
4. **Cambiar de herramienta por compatibilidad:** una estación entrega automáticamente una herramienta; acercarse al receptor compatible produce la acción. Sirve para relaciones parte-función, objeto-uso y cuidado del entorno (Ciencia y Tecnología, Personal Social). **Qué observar:** herramienta elegida y uso compatible.
5. **Interceptar y ordenar envíos:** elegir dónde colocarse para recoger unidades que llegan despacio, llevarlas a espacios y formar un orden antes de continuar. Sirve para secuencias de cantidades, letras, sílabas o hechos (Matemática, Comunicación, Personal Social). **Qué observar:** orden final y cambios hechos para corregirlo.
6. **Crear una reacción anunciada:** permanecer en una casilla activa otras casillas cuya distancia se ve antes; el niño elige origen para alcanzar exactamente los receptores pedidos. Sirve para relaciones espaciales, conteo de pasos y anticipación de consecuencias (Matemática, Ciencia y Tecnología). **Qué observar:** origen elegido y receptores alcanzados.
