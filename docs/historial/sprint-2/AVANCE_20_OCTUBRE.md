# Avance del martes 20 de octubre de 2026

lui11zcb · luiscb.once@gmail.com.

Luis autoriza dejar el diseño actual integrado, comprobarlo y publicarlo en GitHub. Esta es la revisión del **avance de hoy**, no el cierre del Sprint 2. Por su indicación, HU46 queda fuera de la exposición y se retoma el viernes 23; el burndown se omite y se revisará después.

## Qué se puede presentar

| Parte prevista | Estado comprobado | Cómo mostrarla |
|---|---|---|
| Correcciones pendientes del Sprint 1 | Implementadas: propuesta corta para docente, lectura completa, selección por listas y paneles actualizados. Django 88/88, web 48/48 y Spring 66/66. | Web en `http://127.0.0.1:5173/`, con la cuenta del rol correspondiente. |
| Administrador | Nuevo diseño integrado: estudiantes/docentes, registro por rol con DNI condicional, fichas, cursos, secciones y relaciones. | Recorrer Estudiantes → registrar por tipo → ficha → Secciones/Cursos. No necesita la antigua maqueta. |
| Docente y propuestas | Diseño integrado y flujos de creación/revisión/edición/versiones/aprobación comprobados en navegador con respuestas sintéticas. El adaptador Groq se comprobó con una llamada real hoy y pasó el validador local tras corregir el formato. | Mostrar el panel con una cuenta docente asignada. La evidencia real de respaldo está en `docs/historial/sprint-2/evidencias/20-octubre/propuesta-ia-real.json`; es una propuesta de tema ficticio, sin cuenta ni aprobación persistida. |
| App con nuevo diseño | APK compilado. Bienvenida, ingreso, cambio de clave, aventuras, misión horizontal, contenedor y cierre. Catorce casos instrumentados y recorrido debug completo comprobados. | Instalar el APK y abrir **Kusi · presentación** para los ejemplos visibles. La app normal conserva autenticación real y biblioteca sin conectar. |
| Dibujos e interacción | Cuatro escenas nuevas ya integradas; iconos sólidos, Baloo 2/Nunito locales, botones con relieve y respuesta al tocar al cuy. | Bienvenida, aventuras, misión y cierre. Son ilustraciones y gestos breves de interfaz, no animación articulada del mercado. |
| Trabajo nuevo de Jesús | Integrado `64f765b`: procesa el paquete JSON de ejemplo, guarda estado/etapas y expone su procesamiento. Compila y las regresiones pasan. | Explicarlo como procesamiento de un paquete de prueba; no es generación con IA ni acredita catálogo completo HU29. |
| Enfoque de generación | N1 previsto en S2; N3 sigue como objetivo posterior. | Explicar qué crea la IA y qué programa el equipo, con los límites siguientes. |

La prueba del proveedor real no repite hoy el recorrido autenticado completo de creación → guardado → aprobación en PostgreSQL. Ese recorrido funcionó según Luis el 18; los casos actuales de navegador usan datos sintéticos. Las evidencias se separan para no presentar un sustituto como integración real.

## Orden sugerido de la exposición

1. Mostrar las correcciones y la organización del administrador.
2. Entrar como docente: cursos, propuesta completa, edición y versiones; demostrar generación real con la configuración local disponible. Hay una respuesta real de respaldo identificada si falla la conexión.
3. Abrir el APK de presentación: bienvenida → ingreso → nueva clave → aventuras → misión → página local de prueba → cierre. Aclarar que esos datos son ejemplos y que la biblioteca/juego reales se conectan después.
4. Mostrar escenas e interacción y explicar N1: el equipo construye recursos, reproductor y validadores; la IA genera contenido/paquete bajo restricciones. La propuesta textual ya usa IA real; el generador de paquetes todavía está pendiente. N3 no se declara conseguido.
5. Cerrar con pendientes para el 27. HU46 y burndown se omiten conforme a las indicaciones de Luis.

## Lo que sigue pendiente para cerrar Sprint 2

Generación real del paquete desde la propuesta aprobada, comprobaciones completas que bloqueen fallos críticos, dos comportamientos de juego distintos y conexión de biblioteca autorizada, WebView, ayudas, eventos y guardado real del alumno. Un JSON de ejemplo y las aventuras de Mateo no cumplen esas condiciones. Tampoco se han demostrado resultados de aprendizaje.

El avance **tiene código y material preparados para mostrar las partes de la tabla**, con sus límites explícitos. No se presenta como Sprint 2 terminado. [Verificación técnica](VERIFICACION_20_OCTUBRE.md), [diseño vigente](../../../DESIGN.md) e [instrucciones](../../../README.md).
