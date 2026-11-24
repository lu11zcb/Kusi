---
name: diseno-cartoon
description: Crea o edita imágenes cartoon de personajes, animales, objetos y escenas con formas claras, color plano y expresividad orgánica. Úsala al pedir ilustraciones cartoon o al invocarla expresamente; no para implementar interfaces ni generar fotografías realistas.
---

# Diseño cartoon

Crear imágenes cartoon con una identidad visual deliberada, legibles y expresivas. Aplicar este lenguaje a cualquier tema o proyecto; no heredar personajes, especies, paletas, ropa ni accesorios de encargos anteriores.

## Alcance y preferencias

- Las indicaciones actuales del usuario y sus referencias aprobadas tienen prioridad sobre los valores por defecto de esta skill.
- Partir de cartoon 2D con formas simples, contornos orgánicos y colores planos. Adaptar la técnica si se solicita otra variante cartoon.
- Para un personaje u objeto aislado, entregar un solo sujeto por imagen y una sola propuesta inicial. No añadir otras poses, miniaturas, fichas ni variantes sin que se pidan. En grupos o escenas, respetar la cantidad de sujetos y el entorno solicitados; no forzar un protagonista.
- No personificar objetos ni convertir animales en bípedos salvo que el encargo lo indique. La especie, anatomía, edad, postura, ropa y número de dedos se deciden para el sujeto actual.
- No generar imágenes adicionales solo para demostrar el funcionamiento de la skill ni convertir una petición de dibujo en una integración de código o modelado 3D.

## Preparar la imagen

Determinar sujeto, acción o emoción, uso previsto, composición y referencias a partir del pedido. Preguntar solo si falta una decisión imprescindible; resolver detalles menores con criterio visual sin imponer elementos narrativos nuevos.

Si hay referencias, distinguir su función: identidad que conservar, estilo que interpretar o imagen concreta que editar. En una edición, indicar qué cambia y qué permanece: silueta, proporciones, manchas, prendas, expresión, pose, fondo y colores que el usuario haya aprobado. Una petición de recolor no autoriza a rediseñar el personaje.

## Lenguaje visual

### Forma, trazo y expresión

- Diseñar una silueta clara con masas grandes, ritmo y espacio negativo. Reducir el detalle hasta que el sujeto siga siendo legible a su tamaño de uso.
- Usar contornos cerrados, rellenos opacos y un trazo con variación moderada de grosor. Dar organicidad mediante gestos, curvas y asimetrías intencionales; conservar anatomía y construcción consistentes.
- En personajes, expresar la emoción con postura, cejas, ojos, mejillas y boca. Utilizar compresión y estiramiento cuando ayuden al gesto, evitando deformaciones accidentales o una pose rígida.
- Representar pelo, pelaje, plumas y otros materiales mediante pocas formas gráficas. Los mechones deben conectar con la silueta, quedar cerrados y rellenos hasta la punta, sin huecos que muestren el fondo.
- Cuando se mencionen obras de referencia, traducirlas a principios útiles: elasticidad, línea de acción, expresiones, economía de formas y ritmo. Conservar una identidad propia para el sujeto.

### Paleta y acabado

- Elegir la paleta para el sujeto, su personalidad y el contexto. No fijar marrón, beige, un pañuelo ni ninguna otra característica de un personaje previo como regla universal.
- Usar 60/30/10 como orientación flexible de jerarquía: un dominante descansado, un secundario que diferencie masas y un acento pequeño que guíe la mirada. No tratar los porcentajes como una cuota exacta ni sustituir colores pedidos para cumplirlos.
- Concentrar la saturación más intensa en el punto de interés. Adaptar la intensidad al encargo, sin efectos neón por defecto.
- Por defecto, usar rellenos uniformes, sin sombras sobre los sujetos, degradados, iluminación volumétrica, reflejos ni brillos en los ojos. No añadir plástico, porcelana, metal brillante, pelo realista o textura de papel/grano como acabado automático.
- Cambiar un color significa cambiar el relleno local, no la exposición, el brillo global ni la iluminación. Al aclarar una zona, preservar los demás colores y sus límites.
- Una sombra de apoyo exterior es opcional, plana y discreta, solo si aporta apoyo al suelo o separación. No introducirla cuando se pidan ausencia total de sombras o un recorte transparente.
- Si se solicitan sombras o iluminación expresamente, integrarlas como decisiones gráficas controladas: por ejemplo, formas simples con un matiz propio coherente con la escena. No añadir efectos prohibidos por el usuario para aparentar volumen.

### Construcción y limpieza

- Mantener orejas, extremidades, manos, patas y accesorios pertenecientes al mismo diseño; las diferencias deben explicarse por perspectiva, movimiento o una decisión explícita.
- Elegir y conservar una convención de dedos adecuada al sujeto. No imponer tres dedos a todo personaje ni añadir extremidades para resolver una pose.
- Construir brazos y piernas con articulaciones legibles y solapes claros. Evitar cruces ambiguos entre torso y codo, muñones involuntarios y pequeñas cuñas oscuras que parezcan sombras.
- Coordinar las pupilas con una misma intención de mirada y la perspectiva de los ojos. Usar formas regulares y claras; añadir asimetría u otras convenciones oculares solo cuando sean deliberadas. Sin reflejos o puntos brillantes por defecto.
- Separar los contornos de accesorios, mandíbula, hombros y extremidades para evitar tangencias accidentales. Una intersección debe leerse como un solape intencional.
- En escenas, aplicar la misma claridad a planos, objetos y distancias. No añadir caras, manos ni rasgos de personaje a paisajes u objetos que no los necesitan.

## Generar y editar

Usar el generador de imágenes disponible para entregar la imagen real, no un prompt como sustituto del resultado solicitado. En este entorno, utilizar la herramienta integrada `image_gen` y aplicar la skill `imagegen` para su ejecución, referencias, transparencia y guardado.

- Para una imagen nueva, describir sujeto, acción, composición, lenguaje visual y restricciones concretas. Para una edición, priorizar el cambio solicitado y repetir los elementos que deben conservarse.
- Inspeccionar las referencias locales antes de editarlas. Usar la imagen aprobada más reciente como referencia de identidad; no confiar únicamente en recordar el texto del chat.
- Generar la primera propuesta sin pedir aprobación adicional cuando el pedido esté claro. Usar fondo transparente si se solicita, conservando el canal alfa.
- Si falta la herramienta de imagen o una referencia imprescindible, comunicar qué falta. No afirmar que se generó una imagen ni sustituirla silenciosamente por un boceto de código.
- No instalar programas, comprar recursos, publicar ni modificar un proyecto por el mero hecho de invocar esta skill.

## Revisar antes de entregar

Inspeccionar la imagen producida y corregir los defectos visibles relevantes para el pedido:

- Tema, cantidad de sujetos, pose, encuadre y elementos solicitados.
- Identidad y aspectos que debían permanecer intactos en una edición.
- Paleta y saturación; ausencia de brillos, sombras o texturas no solicitadas.
- Ojos y dirección de la mirada, articulaciones, extremidades y dedos, cuando corresponda.
- Contornos y rellenos completos, especialmente mechones y bordes de color.
- Solapes claros, ausencia de tangencias confusas y separación del fondo.

Corregir con una edición localizada, preservando lo que ya funciona. No generar variantes sin propósito ni encadenar revisiones solo para embellecer. Si el mismo fallo persiste tras dos correcciones dirigidas, informar con precisión de lo pendiente y conservar la mejor versión sin afirmar que está resuelto.

Mostrar la imagen final de forma visible y describir brevemente el resultado. Guardar los recursos destinados a un proyecto dentro de ese proyecto sin sobrescribir una referencia aprobada salvo petición expresa. En una exploración visual, basta con mostrar la imagen y conservar su archivo generado.