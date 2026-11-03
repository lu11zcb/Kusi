# Diseño infantil Kusi · Sprint 2

20 de octubre de 2026 · lui11zcb · luiscb.once@gmail.com.

Luis pide mejorar de nuevo iconos, botones y letra. Esta revisión sustituye los siete dibujos bicolor, los títulos Fredoka y los botones turquesa con sombra difusa. Conserva las cuatro ilustraciones y el recorrido del Sprint 2. La implementación está en Kotlin/Compose y no emplea Impeccable. Una comprobación técnica no equivale a aceptación visual de Luis ni a un ensayo con niños.

## Identidad vigente

- Títulos: [Baloo 2](https://github.com/google/fonts/tree/main/ofl/baloo2), local, eje de peso 700. Escala 44/48, 40/44, 36/40, 34/38, 30/34, 26/30 y 23/27 sp. Cuerpo Nunito local, pesos 500/600/750; texto 18/26, 16/23 y 14/20 sp. Controles principales con título Baloo 2; campos con Nunito de 18 sp. Ninguna fuente depende de internet al ejecutar.
- Iconos: [Phosphor Fill](https://github.com/phosphor-icons/core/tree/main/assets/fill), una misma familia rellena. Diecinueve usos convertidos a VectorDrawable sin alterar la geometría; las copias SVG originales y las licencias se conservan. Color aplicado por contexto: texto del botón, insignia o superficie. No mezclar estos controles con los dibujos bicolor anteriores.
- Claro: papel cálido `#FFF9EE`, superficie blanca, tinta `#37304D`, morado `#6541A0`, botón dorado `#FFBE45` con tinta `#4D3016` y base `#D18A21`. Acción secundaria verde claro `#DFF5ED` con tinta `#205749`; insignias lavanda `#EEE5FF` con tinta `#594084`. Límites suaves `#E6DDEB`. Oscuro: fondo `#152439`, superficie `#1D3045`, texto `#FFF0DA`; conserva dorado principal y adapta verdes/lavandas con sus propios colores de texto.
- Las cuatro escenas `kusi_*_v2.png` se conservan: bienvenida, feria, jardín de palabras y celebración. Sus datos de origen y prompts siguen documentados. La marca utiliza el cuy existente; las imágenes de las tarjetas mantienen proporción 16:9.

## Controles e interacción

`TemaKusi.kt` define colores y letra; `ComponentesKusi.kt` controla botones, campos, marca y voz; `ArteInfantil.kt` reúne insignias; `PantallasInfantiles.kt` compone el recorrido. El origen exacto de los nuevos recursos, revisiones fijas y hashes está en `app/src/main/assets/licencias/pulido-infantil-procedencia.json`; Baloo 2 conserva OFL y Phosphor MIT.

- Botón principal: cara mínima de 60 dp más base de 6 dp, esquinas de 20 dp, icono sólido dentro de círculo tonal. Solo baja la cara al tocar; la base queda fija. Resorte breve y respuesta háptica del sistema. El botón secundario usa la misma construcción con color verde. Los controles compactos para horizontal tienen cara mínima de 48 dp y base de 4 dp.
- Se utiliza `Button` nativo: conserva rol, foco, estado deshabilitado y un solo envío por pulsación. Campos de contraseña mantienen ocultar/mostrar y etiquetas; DNI sigue limitado a ocho dígitos ASCII. No se cambia la autenticación ni sus validaciones.
- Regreso y ayuda: controles tonales de 48 dp, iconos de 26 dp y descripciones accesibles. Las insignias Explora/Descubre/Juega son decorativas y no simulan navegación.
- El cuy responde al toque con un gesto breve y voz opcional; el mensaje también está escrito. No hay movimiento decorativo continuo. Compose respeta la escala de animación del sistema. No se afirma animación articulada: se transforma la ilustración completa.
- Contenido máximo de 1040 dp, formularios desplazables con espacio para teclado. Misión/cierre usan dos columnas desde 600 dp en horizontal y se apilan en vertical. En teléfono horizontal se omite el encabezado decorativo y se usan acciones compactas. En tablet vertical la imagen tiene altura acotada, sin estirar la ilustración.

## Alcance conservado

Arranque → bienvenida → ingreso → cambio de clave solo si es temporal → aventuras autorizadas → misión → juego → cierre. Sin pestañas, Cursos, Mi cuy, premios ni personalización de sprints futuros. Cerrar sesión pide confirmación. Carga, error, biblioteca vacía y guardado dependen de estados recibidos.

`PresentacionInfantilActivity` y su HTML existen únicamente en debug. Las dos aventuras de Mateo y el contador final son ejemplos, identificados en todas las pantallas, sin cuentas ni persistencia reales. La app normal conserva acceso real y biblioteca sin conectar; no se inventa un juego disponible ni un guardado exitoso. La intervención real de IA en paquetes educativos y su validación/docente siguen pendientes de integración y diferenciadas de las ilustraciones de apoyo.

La instantánea histórica `.impeccable/design.json` pertenece a otra composición y no es la autoridad de este diseño. Esta actualización no la utiliza ni regenera. [Instrucciones de ejecución](README.md).
