# Ilustraciones de los paneles

3 de noviembre de 2026. Generadas con la herramienta integrada `image_gen`, sin usar el CLI ni una clave del proyecto. Son dos imágenes nuevas basadas en la identidad existente de Kusi; la imagen de referencia fue `web/src/assets/kusi/hero-docente.webp`, usada para el personaje y el estilo, no como pose que hubiera que repetir.

| Uso | Original conservado, 1536 × 1024 | Archivo utilizado por el panel |
|---|---|---|
| Inicio de administración | `kusi-administrador-v1.png` | `web/src/assets/kusi/hero-administrador-v1.webp` |
| Inicio docente | `kusi-docente-v1.png` | `web/src/assets/kusi/hero-docente-v2.webp` |

Los PNG se guardan sin modificaciones. Los WebP se obtuvieron mediante `cwebp -q 88 -m 6`, conservando dimensiones y composición. Los archivos anteriores permanecen disponibles y el acceso conserva su imagen propia.

## Indicaciones de generación

Resumen del conjunto de prompts utilizado:

**Base compartida:** ilustración para el Inicio de un panel web de Kusi. Mantener el mismo cuy, su rostro, proporciones, sombrero andino, ropa, colores y estilo pictórico cálido de la referencia. Ambientar la escena en una escuela andina luminosa. El personaje debe aparecer en una pose nueva, con una actividad relacionada con la función del panel. Composición horizontal que funcione a la derecha de un saludo situado fuera de la imagen. Sin letras, logotipos añadidos ni marcas de agua. No repetir la pose de saludo ni mostrar al personaje ante una computadora.

**Administración:** Kusi de pie como organizador de la escuela, sosteniendo una tabla con una lista y ordenando carpetas de colores en una oficina escolar acogedora. Expresar organización y cercanía. Usar símbolos y marcas sencillas en lugar de texto legible.

**Docencia:** Kusi de pie junto a un caballete de aula, colocando tarjetas de fresas y plátanos que forman un patrón para una actividad de primero de primaria. Mostrar materiales sencillos y un gesto de enseñanza. La pose debe diferenciarse tanto de administración como de la imagen del acceso.

## Revisión

Se revisaron ambas salidas y su integración en los paneles. Conservan el personaje y la estética de la referencia; las escenas comunican organizar la escuela y preparar una actividad, respectivamente. El texto del saludo y los botones se renderizan en HTML y no están incrustados en las ilustraciones.
