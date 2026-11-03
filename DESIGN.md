# Diseño vigente de Kusi

20 de octubre de 2026 · lui11zcb · luiscb.once@gmail.com.

Esta guía describe el código integrado de administración, docencia y Android. Sustituye la composición antigua de MarcoPanel/Segoe y sus menús. La revisión visual de los paneles del 3 de noviembre de 2026 toma como referencia el Inicio de administración elegido por Luis; no implica validación con niños ni aceptación académica del sprint.

## Identidad y separación de experiencias

Kusi conserva el cuy, referencias andinas y tono cercano. Los adultos necesitan organizar y revisar; el niño necesita reconocer una acción y explorar. Comparten personaje y cuidado visual, con composiciones apropiadas para cada función. El color acompaña etiquetas e iconos; no reemplaza su significado.

## Paneles web

Implementación: `web/src/componentes/Tablero.tsx`, `web/src/index.css`, `web/src/componentes/paneles.css`, `web/src/administracion/administracion.css` y `web/src/docente/docente.css`. `Tablero` comparte el marco y `paneles.css` aplica el lenguaje visual del Inicio de administración a ambos paneles; cada módulo conserva su distribución.

| Elemento | Valor vigente |
|---|---|
| Fondo / superficies | `#FDF7EE`, `#FFFBF5`, `#F6EAD8` |
| Tinta / texto / secundario | `#5A1C15`, `#4A2B24`, `#7D6863` |
| Borde / acción / relieve | `#EAD9C3`, `#F8B73E`, `#DF851C` |
| Error / verde / cielo | `#D2402C`, `#2F9D62`, `#4C9ED9` |
| Tipografía | Fredoka 500/600 en títulos; Nunito 700/800/900 en textos y controles |
| Forma | Tarjetas crema con borde de 2 px, esquinas redondeadas y relieve; botones principales dorados en forma de píldora |
| Iconos de gestión | SVG de línea compartidos desde `web/src/componentes/Icono.tsx`, blancos sobre bloques de color en tarjetas y cabeceras |

Las fuentes web se solicitan desde Google Fonts en `web/index.html`, con alternativas del sistema. Android incluye sus fuentes localmente. Se conservan las fuentes, la paleta y el personaje. El Inicio de administración muestra a Kusi organizando la escuela; el docente lo muestra preparando una actividad con tarjetas. Las imágenes tienen poses propias y sus originales e indicaciones están en `web/arte/paneles-v1/LEEME.md`. Botones con etiqueta visible, campos identificados, foco de teclado y errores comprensibles. Los estilos de cada panel se limitan a `.panel-administracion` y `.panel-docente`; no extender reglas de una ficha indiscriminadamente al acceso.

Ambos inicios usan `PrimerosPasos`: la barra cuenta acciones completadas con los datos disponibles. Administración conserva sus cinco pasos de organización escolar; docencia presenta crear una idea, preparar un juego y enviarlo a la clase. La barra no representa tiempos de generación ni se coloca en una propuesta aprobada. Mientras se consultan los datos, el avance no se inventa.

**Administración:** Inicio, Estudiantes, Docentes, Secciones, Cursos y Administradores. El registro comienza eligiendo tipo de cuenta; DNI solo para estudiantes. Directorios con búsqueda sin tildes, filtros y paginación consultada completa. Cada ficha reúne datos, roles, acceso y relaciones; sección desde estudiante y curso/sección desde docente. Cursos con icono/color/nombre; secciones existentes junto a su formulario. Sin UUID técnicos en las tarjetas de gestión. Se conservan permisos y roles combinados del servidor.

La contraseña temporal se muestra una sola vez, con cierre expreso; el secreto deja de mostrarse después. Escrituras y entrega de contraseña bloquean navegación y salida para evitar perder el resultado. Estados vacío/error/cargando se distinguen.

**Docente:** Inicio, Mis cursos, Mis estudiantes, Crear propuesta y Mis juegos. Inicio y las demás secciones usan los mismos iconos de línea, controles y tarjetas que administración. Las cantidades se calculan con los juegos reales; no se muestran metas de aprobación ni barras de avance estimadas. Cada trabajo presenta la idea vigente o el juego para probar, sin versiones, cronómetros, diagnósticos, procedencia ni configuración del proveedor.

El docente pide ajustes mediante una conversación que recupera las observaciones ya guardadas, conserva el mensaje ante errores y consulta un envío incierto antes de repetirlo. «Aprobar y preparar juego» reúne la aprobación y la preparación existentes. El juego ocupa el ancho disponible, permite ampliarse y se envía explícitamente a la clase después de abrirse correctamente. El historial, las comprobaciones y los registros de prueba siguen persistiendo. La biblioteca infantil muestra un solo envío vigente por trabajo; el anterior continúa disponible hasta enviar la actualización y permanece en el historial interno.

Mis juegos distingue trabajos por revisar, en preparación, para probar, enviados y por terminar. Eliminar está integrado en las acciones de la tarjeta y requiere confirmar su alcance. Se conservan los permisos, el borrador al navegar y las funciones de edición y alternativas.
El menú se pliega en móvil; expresa `aria-expanded` y `aria-controls`. Escape lo cierra y devuelve el foco. Cambiar de sección lleva el foco al contenido. Texto y fichas se apilan sin perder acciones. Se respeta `prefers-reduced-motion`.

## App infantil Android

La guía del módulo es [movil/DESIGN.md](movil/DESIGN.md). Implementación Kotlin/Compose con Material 3: `TemaKusi.kt`, `ComponentesKusi.kt`, `ArteInfantil.kt` y `PantallasInfantiles.kt`. Baloo 2 local para títulos/acciones y Nunito para lectura/campos. Iconos Phosphor Fill locales, de formas sólidas, aplicados al color de cada control; licencias y revisiones fijas incluidas.

Fondo cálido `#FFF9EE`, tinta `#37304D`, morado `#6541A0`, botón dorado `#FFBE45` con tinta `#4D3016` y base `#D18A21`. Secundarios verdes `#DFF5ED` con tinta `#205749`; insignias lavanda `#EEE5FF` con tinta `#594084`. Esquema oscuro propio. No trasladar los colores de docencia a la app por una regla global.

Botón nativo con cara mínima de 60 dp y base fija de 6 dp: se hunde al pulsar y recupera con resorte breve. En horizontal compacto, cara de 48 dp/base de 4 dp. El secundario conserva forma y respuesta. Ayuda/regreso de 48 dp con descripciones. Sin animación continua que distraiga o haga perseguir un control. El cuy responde al tacto con movimiento breve y voz opcional; el texto ofrece alternativa.

Flujo Sprint 2: arranque/sesión → bienvenida → ingreso → nueva clave solo si es temporal → aventuras autorizadas → misión → juego → cierre. Misión/juego/cierre solicitan horizontal y se adaptan a tablet. Formularios desplazables con margen de teclado, letra ampliable y áreas del sistema respetadas. Sin pestañas, Cursos/Mi cuy, puntos ni premios de sprints futuros.

La app usa acceso real y biblioteca de juegos enviados por el docente. El laberinto se abre en un WebView horizontal, recibe su guion por el puente y registra los avisos de partida. La actividad de presentación con datos de ejemplo fue retirada. En el juego, Kusi está a la derecha y el joystick a la izquierda; el terreno y los tejados comparten la vista cenital del mapa. Pasto, arbustos y flores cambian de cuadro en hojas de sprites, y las imágenes anteriores se conservan como recursos.

Cuatro escenas de bienvenida, feria, jardín de palabras y celebración, con sus prompts y procedencia. Las imágenes son apoyo visual de desarrollo. La generación educativa real exige contenido/paquete de IA, validación técnica/educativa y revisión docente; ninguna ilustración sustituye esas funciones.

## Verificación y entrega

Compilar y recorrer ejemplos no acredita resultados de aprendizaje, accesibilidad completa o preferencia de niños/docentes. Mantener los contratos existentes al integrar biblioteca y eventos.
