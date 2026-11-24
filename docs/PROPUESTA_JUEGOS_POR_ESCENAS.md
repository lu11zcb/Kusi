# Antecedente de propuesta: juegos por escenas

22 de octubre de 2026 · lui11zcb · luiscb.once@gmail.com.

**Actualización del 23: propuesta anterior conservada como historial.** El [plan vigente de demostración personal cartoon](PLAN_DEMO_PERSONAL_CARTOON.md) recoge la aclaración posterior: Luis quiere dejar atrás pixel art, conservar el cuy original y explorar patrones y clasificación para un juego distinto al mercado. Le gustan las referencias Yummy! What’s Next? y Toy Tidy-Up; la primera pantalla concreta sigue por revisar. La [guía cartoon](ARTE_CARTOON.md) sustituye la ruta pixel art. La pose del paso 02 fue rechazada por brazo separado y cuello abierto; su corrección permanece suspendida. No reanudar el mostrador, las poses ni los hitos de esta propuesta por leer sus secciones históricas.

El texto del 22 que sigue conserva las alternativas y razonamientos iniciales, sin demostrar implementación ni reemplazar el plan posterior. Los pedidos exactos y las colecciones de abajo no son los dos casos actuales elegidos como referencias.

## Experiencia y dirección visual

Propongo pequeñas escenas de mostrador o mesa, con una tarea clara y pocos objetos grandes que el niño pueda manipular. En la primera pantalla vería a un cliente, escucharía su pedido y colocaría los productos en una bandeja. La escena permanece estable mientras resuelve: las acciones sobre los objetos hacen avanzar la actividad.

La opción visual sería **cartoon 2D plano**, basada en el cuy original aprobado: marrón natural, beige claro y pañuelo coral, con acentos controlados y fondo sencillo. El cuy del niño aparecería como retrato fijo; **Kusi seguiría siendo la guía, otro personaje**. Productos reconocibles, contornos claros y separación entre zona de origen y destino ayudarían a entender dónde actuar. Esta opción modificaría la dirección pixel art anterior y necesita la elección de Luis. No exige generar otro cuy ni preparar nuevas vistas o animaciones.

## Referentes y qué tomar de ellos

- **Good Pizza, Great Pizza:** su presentación oficial describe pedidos y escenas de cocina y mostrador. Tomaríamos el encuadre fijo y la relación visible entre pedido, preparación y entrega. No se presenta aquí como programa educativo para niños de 6–7 años ni como evidencia de aprendizaje. [Fuente oficial](https://www.goodpizzagreatpizza.com/press/).
- **Toca Kitchen 2, dentro de Toca Boca Jr:** sirve como referencia de manipulación directa de alimentos y respuesta comprensible del personaje. Toca Boca Jr se dirige a edades de 2–6 y promueve juego libre; nuestra actividad necesitaría objetivos y condiciones de logro propios, revisados por el docente. [Fuente oficial](https://www.tocaboca.com/toca-boca-jr).
- **Khan Academy Kids:** declara edades de 2–8, personajes guía y actividades de aprendizaje. Nos orientaría su combinación de acompañamiento y tareas acotadas. Sus edades o resultados no prueban automáticamente la adecuación de Kusi al currículo peruano. [Fuente oficial](https://www.khanacademy.org/kids).

Son referencias de interacción y organización; Kusi conservaría personajes, contexto andino e identidad propios.

## Dos mecánicas iniciales

Estos ejemplos describen actividades candidatas, no dos juegos humanos fijos que la IA se limite a seleccionar. Pedidos exactos e igualar colecciones podrían terminar usando el mismo contador y la misma condición de éxito; cambiar la fuente verbal o visual del objetivo no demostraría por sí solo HU28. Para comprobar diferencias reales, el experimento deberá incluir acciones, transiciones o condiciones distintas, por ejemplo reunir productos frente a ordenar acontecimientos con consecuencias según el orden.

**Pedidos exactos:** escuchar «Pon tres panes en la bandeja», añadir unidades y comprobar la entrega. El niño puede retirar un producto si cambia de idea. La condición de logro compara producto y cantidad; un pedido con varios productos solo se habilita si corresponde al punto de partida elegido.

**Igualar colecciones:** observar una colección modelo y añadir o quitar objetos de otra hasta que tengan la misma cantidad. Cambia la regla del juego: la comparación con una colección visible determina la solución, en lugar de completar un pedido verbal. Podemos variar disposición y objetos sin perder esa diferencia de comportamiento.

El marco sería **0–20, según indicación docente y punto de partida**, sin asumir que todo niño debe empezar con veinte elementos. Habría audio en español, instrucción escrita breve y opción de tocar o arrastrar. Las ayudas describirían lo observable —«Hay dos panes; el pedido pide tres»— y permitirían volver a escuchar. El inicio no tendría presión temporal. El uso de ayudas, los errores y los aciertos aportarían información para revisar la experiencia.

## Factibilidad y condición de cumplimiento

El formato por escenas reduce las vistas y animaciones del avatar necesarias para la primera prueba; no resuelve por sí solo la generación ni la validación. Es una ruta técnicamente acotada que debe comprobarse, no una viabilidad ya demostrada en Android.

Para conservar el objetivo, el equipo prepararía capacidades reutilizables —objetos, selección, arrastre, colecciones, condiciones, estados y transiciones— y la IA generaría la composición, las acciones habilitadas, las reglas, sus consecuencias y el recorrido concreto desde la propuesta aprobada. El reproductor interpretaría ese paquete. Elegir un minijuego fijo y cambiar cantidades o textos no sería suficiente. Una salida estructurada tampoco acredita que el juego funcione.

Antes de ampliar arte y pantallas, conviene realizar un experimento con recursos existentes: generar y ejecutar dos propuestas con diferencias efectivas en acciones o reglas, y después una solicitud no usada para preparar los ejemplos, dentro de las capacidades declaradas. Conservar solicitud aprobada, salida original, recursos, correcciones humanas, versión y verificaciones. Una capacidad ausente se informa; no se promete cobertura de todo primero de primaria.

Esto evalúa **N1, generación dentro de un kit**, el alcance previsto para Sprint 2. No demuestra N3 ni resuelve el objetivo posterior de ampliar la generación más allá de un repertorio fijo. La rúbrica académica completa no está disponible: no se garantiza aceptación del objetivo final a partir de este piloto. [Alcance vigente](../PRODUCT.md) y [criterios HU26/HU28/HU31](SPRINT2_PENDIENTES.md).

## Desarrollo por hitos y aprobación

1. **Fijar alcance.** Elegir formato, habilidad, rango inicial, papel de cada personaje y dispositivos previstos. Registrar qué entra en la primera prueba. Luis aprueba este alcance antes de diseñar.
2. **Diseñar una pantalla.** Concretar posiciones, objetos, instrucción, audio y respuesta al error de pedidos exactos, usando el arte existente. Revisar legibilidad y acción principal con Luis. Solo su aprobación permite construirla.
3. **Crear un kit mínimo.** Implementar capacidades reutilizables para objetos, controles, condiciones y transiciones, con los recursos indispensables. Las dos actividades sirven como casos de prueba del kit, sin convertirse en dos juegos cerrados seleccionados por la IA. Revisar su funcionamiento antes de ampliar contenido. La animación del cuy no es un requisito de este hito.
4. **Integrar generación IA real N1.** La IA produciría un paquete de narrativa, reglas permitidas, cantidades, colecciones y referencias a objetos de un catálogo validado. El reproductor aplicaría esas reglas, con diferencias reales entre mecánicas. Conservaríamos procedencia y versión; no se limitaría a cambiar nombres o colores ni generaría código libre. Aprobar el contrato del paquete antes de conectarlo.
5. **Validar y revisar contenido.** Comprobar estructura, objetos admitidos, límites, correspondencia entre audio e instrucción y existencia de solución alcanzable. El docente revisaría el contenido educativo antes de autorizarlo al alumno. Revisar los fallos antes de ampliar el catálogo.
6. **Conectar Android y pilotar.** Integrar biblioteca autorizada, misión, juego y eventos de ayuda, respuesta, progreso y cierre. Comprobar persistencia y uso táctil en dispositivos reales; después, realizar un piloto revisado por el docente. Luis revisa el resultado antes de aprobar una ampliación.

## Trabajo que se conserva

Mantendríamos Phaser/Vite, Android Kotlin/Compose y los servicios React, Django, Spring y PostgreSQL. Aprovecharíamos acceso, revisión docente y validaciones útiles. La plaza actual se conserva como prototipo, sin borrarla. Elegir escenas no cierra Sprint 2: siguen pendientes la generación educativa real y la integración de extremo a extremo. El siguiente acuerdo sería únicamente el alcance del primer hito.
