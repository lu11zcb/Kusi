# Kusi Android · recorrido del Sprint 2

## Bienvenida con Kusi animado en Compose · 22 de noviembre

La bienvenida («Ven, vamos a la aventura») muestra un valle andino con cantutas, nubes
y mariposas. El paisaje se desvanece arriba y abajo. Los bloques para contar y el libro
ilustrado señalan dos portales que se iluminan cuando Kusi los pisa. El logotipo se mece
en la bienvenida y en la carga. El primer arranque muestra el icono de Kusi con aros coral
y dorado sobre fondo blanco. La carga de la app usa el fondo menta y muestra a Kusi
sentado, que mira alrededor y reacciona al tocarlo.
`DibujoKusi.kt` reproduce dibujos de cuerpo completo alineados por las patas.
`kusi_intermedios.png` añade poses de impulso, subida, bajada y recuperación al salto,
y cuatro poses al gesto de invitación. Los dibujos parten de
`juego/arte/kusi/origen/kusi-chibi-v1.png`.
Al terminar el saludo, «¡Vamos!» se habilita. Kusi señala hacia abajo brevemente y luego
invita a jugar con las dos patas.
Pulsar el botón inicia un brinco de celebración y luego abre el ingreso. Tocar a Kusi
muestra hojitas junto al toque solo si el dedo cae sobre su dibujo. Después de la presentación alterna entre un brinco,
una risa y un saludo con el sombrero. El parlante reproduce la voz y la nota
musical activa o silencia los efectos. Los apoyos, el impulso y las cosquillas reutilizan
sonidos [Kenney CC0 del juego](../juego/kit/recursos/sonidos/ORIGEN.md). El roce del libro
es sonido de síntesis generado para Kusi.
Con las animaciones del sistema desactivadas, «¡Vamos!» se habilita de inmediato,
abre el ingreso al pulsarlo y las hojitas aparecen brevemente en su sitio.

## Cierre del Sprint 3 · 10 de noviembre

El contenedor de cualquier juego admite **Pausa**. Primero detiene la escena,
la entrada, las animaciones, los sonidos y la voz; después vacía la cola de
avisos y pide a Spring guardar el avance. Solo muestra «guardado» cuando el
servidor confirma la partida y su último orden. Si no lo confirma, mantiene la
pausa y ofrece guardar otra vez o seguir jugando; volver a la misión queda
habilitado después de confirmar el guardado.

Al abrir una aventura se consulta `GET /api/edu/estudiante/juegos/{id}/avance/`.
Un avance pendiente devuelve el paquete de la versión exacta, el reto y la
semilla de partida. El WebView abre `?paquete=mensaje&nivel=N` y envía esa semilla
con el paquete, por lo que no repite los avisos «listo» ni «inicio» y continúa
el orden confirmado. Mientras la pausa permanece abierta se conserva también
el estado dentro del reto. Si se cierra la aventura, al volver se conservan
los retos completados y se empieza el reto pendiente desde su inicio; no se
promete guardar el estado interno de cualquier familia de juego.

Cada aviso incorpora `juego_id` del juego que realmente abrió el contenedor,
incluida una versión anterior recuperada por el servidor. Así las respuestas y
las ayudas pueden aparecer en Resultados. Spring decide acceso, confirmación y
puntos; el cliente no concede puntos. El cierre muestra el total confirmado,
con un máximo de 20 por actividad, y explica que se reparten entre los retos,
se redondean, pedir ayuda no resta y repetir no vuelve a dar puntos.

La biblioteca muestra «Nueva» cuando Spring devuelve `nuevo: true`. Al abrir
la misión se confirma `POST .../{id}/visto/` antes de quitar la marca. Se vuelve
a consultar la biblioteca al regresar a primer plano con la misma cuenta; un
fallo de red conserva el aviso para intentarlo después.

Pruebas: `ProtocoloJuegoTest`, `AvanceJuegoApiTest` y `JuegoApiTest` usan datos
sintéticos para comprobar identidad del juego, conservación del paquete,
semilla y nivel, CSRF y guardados no confirmados. Las pruebas de navegador del
reproductor en `juego/pruebas/navegador/pausa.spec.js` comprueban que los zorros,
el protagonista y sus animaciones dejan de avanzar durante la pausa y que
reabrir continúa en el reto confirmado sin duplicar los avisos iniciales.
La revisión en un celular físico queda a cargo del equipo.

Actualización visual: **lu11zcb** · **luiscb.once@gmail.com**.

Actualización del 20 de octubre de 2026, a partir del plan visual que Luis aportó y su indicación de hacer la app más infantil sin usar Impeccable.

## Abrir la aplicación

Abrir esta carpeta `movil` en Android Studio y ejecutar debug, o instalar `app/build/outputs/apk/debug/app-debug.apk`. El APK de desarrollo muestra dos accesos:

- **Kusi:** acceso real del alumno mediante Django/Spring. Los servidores predeterminados son `http://10.0.2.2:8000` y `http://10.0.2.2:8080`, accesibles desde el emulador. El juego se abre desde `http://10.0.2.2:5174`. Para un celular físico configurar `KUSI_DJANGO_URL`, `KUSI_EDU_URL` y `KUSI_JUEGO_URL` y volver a compilar (con `adb reverse`, las tres apuntan a `localhost`). La biblioteca muestra los juegos «listos» de las secciones del estudiante, como máximo cinco, y al final el ejemplo del laberinto; el juego se abre en un WebView horizontal y habla con la app por `KusiPuente` (HU46 y HU50).
- **Kusi · presentación:** recorrido visual con datos de ejemplo, sin consultar ni escribir en el servidor. Solo existe en `src/debug`; no forma parte del código de producción. Puede mostrarse sin crear una cuenta real. Una franja visible identifica la demostración en todas sus pantallas.

En presentación: tocar «¡Vamos a entrar!», usar DNI de ejemplo `12345678` y cualquier contraseña, elegir después una nueva de ocho caracteres o más y repetirla. Aparece Mateo con dos aventuras ficticias. Elegir una, escuchar la misión, tocar «¡Jugar!» y usar «Terminar» en la página de prueba para llegar al cierre. No son credenciales ni juegos reales. No se guardan esos resultados.

## Recorrido acordado

Arranque y revisión de sesión → bienvenida cuando no hay sesión → ingreso → nueva contraseña si es temporal → selección de aventuras → misión → contenedor de juego → cierre. Las primeras pantallas son verticales; misión/juego/cierre solicitan horizontal. Android puede gestionar esa solicitud de otra manera en dispositivos grandes; los componentes también se adaptan al ancho disponible.

El Sprint 2 no presenta barra inferior, cursos, Mi cuy, puntos, medallas, rachas ni personalización. El botón Atrás vuelve según el contexto. Cerrar sesión requiere confirmación. En una sesión temporal recién iniciada se reutiliza la clave que se escribió: solo se mantiene en memoria hasta cambiarla, salir o cerrar el modelo. Si se recupera una sesión temporal sin esa clave en memoria, se solicita la actual para cumplir el contrato del servidor.

## Diseño e interacción

Cuatro escenas de bienvenida, feria, jardín de palabras y celebración. La revisión más reciente usa Baloo 2 en títulos, Nunito en texto y campos, e iconos Phosphor Fill sólidos y coherentes. Botones dorados y verdes con base fija y cara que se hunde al pulsar, recuperación breve y respuesta háptica del sistema. Los secundarios, la ayuda, el regreso y los campos comparten el mismo lenguaje visual. El cuy saluda con un movimiento breve al tocarlo y ofrece voz cuando el teléfono dispone del idioma. Cambios de pantalla con fundido y desplazamiento corto. Sin movimiento decorativo continuo; se respetan las animaciones desactivadas del sistema. Modo oscuro y texto escalable. Se consultaron las guías oficiales de [animaciones Compose](https://developer.android.com/develop/ui/compose/animation/quick-guide) y [WebView](https://developer.android.com/develop/ui/views/layout/webapps/webview).

`TemaKusi.kt` contiene los estilos; `ComponentesKusi.kt`, los controles y la voz; `PantallasInfantiles.kt`, las pantallas; `RecorridoInfantil.kt`, los estados de entrada, biblioteca, aventura y cierre. Las imágenes `kusi_*_v2.png` fueron creadas con ImageGen y el cuy existente como referencia. Sus datos de origen están en los PNG y en `assets/licencias/ilustraciones.json`. La fuente Baloo 2 y los diecinueve iconos vectoriales Phosphor Fill tienen licencia, revisión fija y hashes en `assets/licencias/pulido-infantil-procedencia.json`. Sustituyen los títulos Fredoka y los iconos bicolor anteriores. La plaza anterior queda como recurso histórico, sin usarse en las pantallas de este recorrido. [Guía vigente](DESIGN.md).

## Conexión con el juego (cierre del Sprint 2)

`AplicacionInfantil` recibe `EstadoBibliotecaInfantil`, `EstadoCierreInfantil`, reintentos y un bloque `contenidoJuego(aventura, alFinalizar, alVolver)`. Desde el cierre del Sprint 2 esas entradas están conectadas: `AccesoViewModel` carga la biblioteca con `GET /api/edu/estudiante/juegos/`, `JuegoLaberinto.kt` abre el juego en un WebView y `ProtocoloJuego.kt` valida los mensajes de `KusiPuente`. Los avisos de la partida se guardan con `POST /api/edu/partidas/avisos/`, con la sesión del alumno y el CSRF de Spring. Todavía no hay una asignación formal de juegos a estudiantes: la biblioteca muestra los juegos listos de sus secciones. Detalle y pruebas en `docs/INFORME-CIERRE-SPRINT2.md`.

La presentación inyecta una WebView con HTML fijo local y seis botones de avisos. El puente `KusiPuente.emitir` de esa actividad es exclusivo de debug y una prueba de recorrido: no constituye todavía el acuerdo de eventos del juego ni su registro en Spring. La WebView no carga URLs o contenido externo. `juego/` y HU46 no se modifican.

Las ilustraciones creadas con ImageGen son ayuda visual de desarrollo. Esta actualización programa interfaz, animaciones y textos; no genera ni valida contenido educativo mediante IA. La generación de paquetes y sus controles técnicos/educativos y revisión docente siguen siendo necesarios.

## Comprobar

### Juegos del taller (10 de noviembre, para revisión del integrante de la app)

`ProtocoloJuego.kt` admite el laberinto de la biblioteca sin `trabajo`, y juegos
del taller con familia válida y el UUID canónico de su trabajo. El paquete se
envía completo como texto escapado a la misma WebView; el reproductor carga el
juego y sus piezas. Se rechazan familias o identificadores que parezcan rutas,
trabajos ausentes y paquetes con menos de uno o más de cinco retos.

Para un juego del taller sin `meta`, la misión usa su primera consigna. Si no
trae `curso`, muestra «Tu actividad», para que un juego de animales no anuncie
una misión de patrones con alimentos. El laberinto conserva sus textos.

Cambio mínimo del paso 7: revisar `ProtocoloJuego.kt` y `ProtocoloJuegoTest.kt`.
Las pruebas comprueban aceptación del sobre, conservación de `trabajo`, textos
escapados y rechazo de rutas. La autorización para recibir una actividad sigue
correspondiendo a Spring; este cambio no publica ni asigna juegos.

### Ejecutar las pruebas

Con Java 21 y un emulador: `gradlew.bat :app:assembleDebug :app:testDebugUnitTest :app:connectedDebugAndroidTest`. En la Mac, el comando `java` del sistema no tiene un Java registrado; se usa el de Android Studio: `export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"` y después `./gradlew :app:testDebugUnitTest :app:assembleDebug`. Las pruebas instrumentadas usan datos sintéticos y no crean alumnos. Las pruebas de servicios reales están desactivadas por defecto. Compilar y revisar pantallas no demuestra usabilidad con niños ni resultados de aprendizaje.
