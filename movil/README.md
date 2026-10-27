# Kusi Android · recorrido del Sprint 2

Actualización visual: **lui11zcb** · **luiscb.once@gmail.com**.

Actualización del 20 de octubre de 2026, a partir del plan visual que Luis aportó y su indicación de hacer la app más infantil sin usar Impeccable.

## Abrir la aplicación

Abrir esta carpeta `movil` en Android Studio y ejecutar debug, o instalar `app/build/outputs/apk/debug/app-debug.apk`. El APK abre la app Kusi:

- **Kusi:** acceso real del alumno mediante Django/Spring. Los servidores predeterminados son `http://10.0.2.2:8000` y `http://10.0.2.2:8080`, accesibles desde el emulador. El juego se abre desde `http://10.0.2.2:5174`. Para un celular físico configurar `KUSI_DJANGO_URL`, `KUSI_EDU_URL` y `KUSI_JUEGO_URL` y volver a compilar (con `adb reverse`, las tres apuntan a `localhost`). La biblioteca muestra los juegos listos que el docente envió a las secciones del estudiante, como máximo cinco. Si todavía no hay ninguno, muestra «Tu profe te avisará cuando puedas jugar» y el botón «Buscar juegos nuevos»; el juego se abre en un WebView horizontal y habla con la app por `KusiPuente` (HU46 y HU50).

## Recorrido acordado

Arranque y revisión de sesión → bienvenida cuando no hay sesión → ingreso → nueva contraseña si es temporal → selección de aventuras → misión → contenedor de juego → cierre. Las primeras pantallas son verticales; misión/juego/cierre solicitan horizontal. Android puede gestionar esa solicitud de otra manera en dispositivos grandes; los componentes también se adaptan al ancho disponible.

El Sprint 2 no presenta barra inferior, cursos, Mi cuy, puntos, medallas, rachas ni personalización. El botón Atrás vuelve según el contexto. Cerrar sesión requiere confirmación. En una sesión temporal recién iniciada se reutiliza la clave que se escribió: solo se mantiene en memoria hasta cambiarla, salir o cerrar el modelo. Si se recupera una sesión temporal sin esa clave en memoria, se solicita la actual para cumplir el contrato del servidor.

## Diseño e interacción

Cuatro escenas de bienvenida, feria, jardín de palabras y celebración. La revisión más reciente usa Baloo 2 en títulos, Nunito en texto y campos, e iconos Phosphor Fill sólidos y coherentes. Botones dorados y verdes con base fija y cara que se hunde al pulsar, recuperación breve y respuesta háptica del sistema. Los secundarios, la ayuda, el regreso y los campos comparten el mismo lenguaje visual. El cuy saluda con un movimiento breve al tocarlo y ofrece voz cuando el teléfono dispone del idioma. Cambios de pantalla con fundido y desplazamiento corto. Sin movimiento decorativo continuo; se respetan las animaciones desactivadas del sistema. Modo oscuro y texto escalable. Se consultaron las guías oficiales de [animaciones Compose](https://developer.android.com/develop/ui/compose/animation/quick-guide) y [WebView](https://developer.android.com/develop/ui/views/layout/webapps/webview).

`TemaKusi.kt` contiene los estilos; `ComponentesKusi.kt`, los controles y la voz; `PantallasInfantiles.kt`, las pantallas; `RecorridoInfantil.kt`, los estados de entrada, biblioteca, aventura y cierre. Las imágenes `kusi_*_v2.png` fueron creadas con ImageGen y el cuy existente como referencia. Sus datos de origen están en los PNG y en `assets/licencias/ilustraciones.json`. La fuente Baloo 2 y los diecinueve iconos vectoriales Phosphor Fill tienen licencia, revisión fija y hashes en `assets/licencias/pulido-infantil-procedencia.json`. Sustituyen los títulos Fredoka y los iconos bicolor anteriores. La plaza anterior queda como recurso histórico, sin usarse en las pantallas de este recorrido. [Guía vigente](DESIGN.md).

## Conexión con el juego (cierre del Sprint 2)

`AplicacionInfantil` recibe `EstadoBibliotecaInfantil`, `EstadoCierreInfantil`, reintentos y un bloque `contenidoJuego(aventura, alFinalizar, alVolver)`. Desde el cierre del Sprint 2 esas entradas están conectadas: `AccesoViewModel` carga la biblioteca con `GET /api/edu/estudiante/juegos/`, `JuegoLaberinto.kt` abre el juego en un WebView y `ProtocoloJuego.kt` valida los mensajes de `KusiPuente`. Los avisos de la partida se guardan con `POST /api/edu/partidas/avisos/`, con la sesión del alumno y el CSRF de Spring. El docente envía el juego desde la revisión final; la biblioteca filtra los juegos publicados de las secciones vigentes del estudiante. Detalle y pruebas en `docs/INFORME-CIERRE-SPRINT2.md`.

Las ilustraciones creadas con ImageGen son ayuda visual de desarrollo. Esta actualización programa interfaz, animaciones y textos; no genera ni valida contenido educativo mediante IA. La generación de paquetes y sus controles técnicos/educativos y revisión docente siguen siendo necesarios.

## Comprobar

Con Java 21 y un emulador: `gradlew.bat :app:assembleDebug :app:testDebugUnitTest :app:connectedDebugAndroidTest`. En la Mac, el comando `java` del sistema no tiene un Java registrado; se usa el de Android Studio: `export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"` y después `./gradlew :app:testDebugUnitTest :app:assembleDebug`. Las pruebas instrumentadas usan datos sintéticos y no crean alumnos. Las pruebas de servicios reales están desactivadas por defecto. Compilar y revisar pantallas no demuestra usabilidad con niños ni resultados de aprendizaje.
