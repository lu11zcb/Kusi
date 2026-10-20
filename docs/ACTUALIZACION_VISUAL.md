# Actualización visual de Kusi

20 de octubre de 2026 · lui11zcb · luiscb.once@gmail.com

## Paneles web

Ambos paneles están integrados en `web/`. Abrir `http://127.0.0.1:5173/` con los servicios Django/Spring y la web encendidos. Ingresar con una cuenta propia del rol correspondiente; cuando tiene ambos roles, elegir Administración o Docente.

El administrador organiza Estudiantes, Docentes, Secciones, Cursos y Administradores. El registro muestra primero el tipo de cuenta y solicita DNI únicamente para estudiantes. Las fichas reúnen datos, acceso y relaciones de cada persona; curso/sección se asignan desde la ficha docente y la sección desde la ficha estudiantil. Búsqueda sin tildes, filtros de estado y consulta de todas las páginas; roles adultos combinados conservados. Las contraseñas temporales se muestran una sola vez y bloquean la navegación hasta cerrarlas expresamente. No se cambiaron los contratos ni permisos del servidor.

El docente conserva Inicio, cursos y estudiantes, creación de propuestas con IA, revisión completa, observaciones, edición, versiones y aprobación. Sus estados y borradores se conservan como antes.

## App Android

Instalador de desarrollo: `movil/app/build/outputs/apk/debug/app-debug.apk`.

- **Kusi:** acceso real mediante DNI/contraseña. La biblioteca autorizada y el juego todavía necesitan conexión con el servicio educativo.
- **Kusi · presentación:** demostración aislada, identificada en pantalla y sin persistencia. DNI de ejemplo `12345678`, cualquier contraseña y después una nueva de al menos ocho caracteres. Elegir aventura, escuchar misión, tocar Jugar y Terminar en la página local de prueba. No son una cuenta ni un juego generado reales.

Cuatro escenas: libro de bienvenida, feria, jardín de palabras y celebración. Se crearon con ImageGen tomando el personaje existente como referencia; no son pruebas de generación educativa. En `app/src/main/res/drawable/` aparecen como `kusi_bienvenida_v2.png`, `kusi_feria_v2.png`, `kusi_palabras_v2.png` y `kusi_celebracion_v2.png`; la procedencia se conserva en `app/src/main/assets/licencias/ilustraciones.json`. Ante el nuevo pedido de Luis se cambiaron los títulos a Baloo 2, se unificaron diecinueve iconos con Phosphor Fill y se reemplazaron los botones turquesa con sombra difusa por acciones doradas/verdes con base fija que se hunden al pulsar. Ayuda, regreso, campos y acciones secundarias comparten el diseño; fuentes e iconos se incluyen localmente con licencias y revisión fija. Misión, contenedor y cierre solicitan horizontal; no hay pestañas ni premios de sprints posteriores. [Guía nativa vigente](../movil/DESIGN.md).

Las instrucciones de creación de las cuatro escenas se conservan en `movil/recursos/prompts-ilustraciones.json`. Las fuentes y los iconos Phosphor de los paneles conservan sus licencias. Los ejemplos del modo presentación no certifican aprendizaje ni cierre del Sprint 2. HU46 y el juego siguen pendientes conforme al plan del equipo.
