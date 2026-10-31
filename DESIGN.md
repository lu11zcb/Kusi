# Diseño vigente de Kusi

20 de octubre de 2026 · lui11zcb · luiscb.once@gmail.com.

Esta guía describe el código integrado de administración, docencia y Android. Sustituye la composición antigua de MarcoPanel/Segoe y sus menús. Luis autoriza publicar la revisión actual; no implica validación con niños ni aceptación académica del sprint.

## Identidad y separación de experiencias

Kusi conserva el cuy, referencias andinas y tono cercano. Los adultos necesitan organizar y revisar; el niño necesita reconocer una acción y explorar. Comparten personaje y cuidado visual, con composiciones apropiadas para cada función. El color acompaña etiquetas e iconos; no reemplaza su significado.

## Paneles web

Implementación: `web/src/componentes/Tablero.tsx`, `web/src/index.css`, `web/src/administracion/administracion.css` y `web/src/docente/docente.css`. El componente compartido usa `Tablero`; no se reconstruye el marco anterior.

| Elemento | Valor vigente |
|---|---|
| Fondo / superficies | `#FDF7EE`, `#FFFBF5`, `#F6EAD8` |
| Tinta / texto / secundario | `#5A1C15`, `#4A2B24`, `#7D6863` |
| Borde / acción / relieve | `#EAD9C3`, `#F8B73E`, `#DF851C` |
| Error / verde / cielo | `#D2402C`, `#2F9D62`, `#4C9ED9` |
| Tipografía | Fredoka 500/600 en títulos; Nunito 700/800/900 en textos y controles |
| Forma | Tarjetas redondeadas; radio base 24 px, acciones con relieve |
| Iconos de gestión | Phosphor Duotone local, licencia y procedencia en `web/src/docente/licencias/` |

Las fuentes web se solicitan desde Google Fonts en `web/index.html`, con alternativas del sistema. Android incluye sus fuentes localmente. El Inicio de ambos paneles conserva su identidad ilustrada. Botones con etiqueta visible, campos identificados, foco de teclado y errores comprensibles. Los estilos de cada panel se limitan a `.panel-administracion` y `.panel-docente`; no extender reglas de una ficha indiscriminadamente al acceso.

**Administración:** Inicio, Estudiantes, Docentes, Secciones, Cursos y Administradores. El registro comienza eligiendo tipo de cuenta; DNI solo para estudiantes. Directorios con búsqueda sin tildes, filtros y paginación consultada completa. Cada ficha reúne datos, roles, acceso y relaciones; sección desde estudiante y curso/sección desde docente. Cursos con icono/color/nombre; secciones existentes junto a su formulario. Sin UUID técnicos en las tarjetas de gestión. Se conservan permisos y roles combinados del servidor.

La contraseña temporal se muestra una sola vez, con cierre expreso; el secreto deja de mostrarse después. Escrituras y entrega de contraseña bloquean navegación y salida para evitar perder el resultado. Estados vacío/error/cargando se distinguen.

**Docente:** Inicio, Mis cursos, Mis estudiantes, Crear propuesta y Mis propuestas. Búsqueda por nombre/DNI, filtro por sección y listado adaptable. La propuesta muestra objetivo, historia, acciones, reglas, retos, ayudas y recursos; incluye edición, observaciones, alternativas, aprobación/rechazo y versiones. Tema/objetivo/propósito/instrucciones y filtros se conservan al navegar; se bloquea navegación al guardar. La propuesta textual y la generación posterior del paquete son etapas distintas.

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
