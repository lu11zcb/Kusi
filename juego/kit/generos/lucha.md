# Lucha: reinterpretación amable para Kusi

Catálogo para diseñar juegos educativos de 1.º y 2.º de primaria en Perú (6 a 8 años). Contexto: celular horizontal, Phaser 2D, joystick, con imágenes quietas animadas por código. Consulta web: 16 de noviembre de 2026.

Aquí solo interesa reinterpretar distancia, anticipación, posiciones y turnos como un encuentro cooperativo. No se propone hacer lucha para niños: se eliminan golpes, daño y expulsión. Los dos referentes muestran decisiones espaciales que pueden transformarse en imitar, ofrecer, recibir y completar una meta común.

**Valoración de la adaptación pequeña:** dificultad 3/5; encaje educativo 3/5. Dificultad 3/5 y encaje 3/5 valoran exclusivamente la versión cooperativa sin daño. Las combinaciones de combate del original no forman parte de la propuesta. Son juicios de diseño, no mediciones ni eficacia educativa demostrada.

Las fichas describen las versiones indicadas; sus controles originales no son instrucciones para implementar Kusi. «Qué lo hace entretenido» es análisis de las reglas. Las adaptaciones, ideas y requisitos del motor son propuestas propias. No se ejecutaron los juegos ni se inspeccionó el código de Kusi.

## Juegos de referencia

### Street Fighter 6

- **Qué hace el jugador:** Se enfrenta a un rival en rondas y ajusta la distancia para actuar, defenderse y responder a lo que el otro hace. Gestiona acciones con distintos alcances y recuperaciones, con indicadores de vitalidad y tiempo.
- **Controles y cámara:** Enfrentamiento lateral; el sistema clásico exige seis botones y combinaciones, y existen modos simplificados. Incluso los controles Modern no equivalen al joystick y un único botón de Kusi.
- **Qué lo hace entretenido:** Leer la intención del rival, descubrir una respuesta y mejorar mediante práctica; una misma situación permite varias decisiones.
- **Qué se puede adaptar a Kusi:** Convertir ataque/defensa en ofrecer/recibir, imitar movimientos, responder por turnos o seleccionar una postura según una regla.
- **Qué NO se debe copiar o debe cambiarse:** Eliminar golpes, daño, derrotas humillantes y combinaciones complejas. Mantener solo anticipación, distancia y turnos: un desacierto abre otra oportunidad.

Fuentes: [Capcom, tipos de control](https://www.capcom-support.com/hc/en-us/articles/7122030981660-What-are-the-control-types-in-Street-Fighter-6), [manual oficial, interfaz de batalla](https://game.capcom.com/manual/SF6/en/ps4/page/3/2).

### Super Smash Bros. Ultimate

- **Qué hace el jugador:** Se mueve por una arena y usa ataques para desplazar a los demás fuera del área de juego. Cuanto más daño acumula un participante, más lejos sale impulsado; también importa volver a una plataforma segura.
- **Controles y cámara:** Arena lateral con plataformas; desplazamiento, salto y varias acciones de combate. No cabe completo en un solo botón: en Kusi el salto puede alcanzar señales o devolver un objeto de forma automática.
- **Qué lo hace entretenido:** Recuperarse de una situación difícil, disputar posiciones y reaccionar a cambios en una arena compartida.
- **Qué se puede adaptar a Kusi:** Un juego de posiciones, turnos y devolución de objetos entre compañeros, con retos compartidos y sin expulsar a nadie.
- **Qué NO se debe copiar o debe cambiarse:** Eliminar daño, golpes y expulsión; poner límites seguros y regreso suave al suelo. No trasladar franquicias, objetos especiales ni marcas.

Fuentes: [Nintendo, fundamentos](https://www.smashbros.com/en_US/howtoplay/basic.html), [Nintendo, cómo jugar](https://www.smashbros.com/en_US/howtoplay/).

## Qué necesita el motor

La base del kit: exploración a pie con un adversario amable (`kit/ejemplos/exploracion/`), viaje en vehículo entre lugares (`kit/ejemplos/viaje/`), plataformas con saltos pequeños (`kit/ejemplos/plataformas/`), joystick e interfaz común (`taller/reglas.md`, 13.16 y 13.17). Entre lugares no se salta (13.11). Lo siguiente indica qué reutilizar y qué ampliar.

- **Controles:** joystick y salto; devolución/interacción automática solo cuando se está bien colocado, con selección y confirmación visibles.
- **Física:** base de plataformas con límites seguros; trayectorias lentas de objetos, sin cajas de daño ni expulsión.
- **Cámara:** lateral fija con ambos participantes a la vista; una sola pantalla.
- **Adversarios:** compañero controlado por reglas simples con intención anticipada; nada de red multijugador para este alcance.
- **Objetos:** pelota u objetos de intercambio, marcadores de posición, plataformas seguras.
- **Interfaz:** turnos, consigna con voz, meta común, repetir demostración y ayuda; ningún indicador de vida.
- **Dibujos:** señales de turno, objetos y zonas objetivo; reutilizar el protagonista de Kusi, animaciones con desplazamiento y escala por código.

**Reglas de implementación propuestas:** las selecciones se confirman al detenerse dentro de una zona señalada, con espera breve visible y cancelación al alejarse; pasar por ella no cuenta como respuesta. El botón sigue siendo salto. Si una placa reacciona al aterrizaje, se explica antes. En vista desde arriba, un salto requiere altura y reglas de colisión propias: no basta activar gravedad lateral. Pausa y voz pueden usar la interfaz común. Guardar el estado confirmado y la versión del juego; validar el contenido con una regla o referencia independiente del código generado. Separar errores de coordinación de respuestas conceptuales.

## Ideas de adaptación con Kusi

Estas seis propuestas no fijan un tema. El docente elige el contenido y revisa su corrección; el aprendizaje se demuestra mediante decisiones y transformaciones dentro del juego. Kusi acompaña al protagonista, que controla el niño.

1. **Eco de movimientos:** observar una secuencia corta y repetirla con direcciones y saltos. Sirve para patrones y comprensión oral (Matemática y Comunicación). **Qué observar:** secuencia reproducida y correcciones sin presión.
2. **Devolver al destino:** colocarse para interceptar un objeto lento y, al saltar, enviarlo a la zona elegida. Sirve para clasificar y relacionar partes o símbolos (Ciencia y Tecnología y Comunicación). **Qué observar:** destino seleccionado, separado del contacto físico.
3. **Rondas de comparación:** elegir una de dos zonas y esperar el turno para mostrar una cantidad; ambos participantes ven la comparación. Sirve para más/menos/igual y representación numérica (Matemática). **Qué observar:** representación elegida y comparación realizada.
4. **Completar entre dos:** cada participante lleva una parte y ambos deben ubicarse en posiciones complementarias. Sirve para partes de un todo, pares y relaciones de función (Ciencia y Tecnología). **Qué observar:** partes aportadas y posiciones complementarias.
5. **Ceder el paso:** responder a señales de turno para avanzar o esperar; el compañero necesita el mismo espacio. Sirve para convivencia, normas y coordinación (Personal Social). **Qué observar:** señal de turno interpretada y decisión de esperar.
6. **Cadena compartida:** añadir un elemento correcto a una secuencia que empezó el compañero, con tiempo de escuchar antes de actuar. Sirve para sílabas, orden narrativo, patrones y ciclos (Comunicación y Ciencia y Tecnología). **Qué observar:** elemento añadido y relación con la cadena previa.
