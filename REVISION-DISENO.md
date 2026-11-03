# Revisión del diseño de Kusi

El panel conserva la paleta, las fuentes y el cuy. Todas las secciones de administración y docencia toman como referencia el Inicio de administración: botones dorados con relieve, tarjetas crema, bordes redondeados e iconos blancos de línea sobre bloques de color. Cada Inicio tiene una ilustración nueva de Kusi relacionada con su función. La app conserva su identidad infantil. Las versiones, comprobaciones y procedencia siguen guardándose; el docente trabaja con su idea y su juego actual.

## Comprobaciones realizadas

- Web: 91 pruebas Node de servicios y pantallas aprobadas, TypeScript, compilación de producción y ESLint. Incluyen el conteo y la carga de Primeros pasos.
- Revisión visual en el Chrome abierto: Inicio y Cursos de administración; Inicio, Mis cursos, Mis juegos y revisión de una propuesta con su chat en docencia. Se comprobaron las dos ilustraciones y la coherencia de botones, tarjetas e iconos. El recorrido fue de lectura, sin enviar cambios, crear cuentas ni eliminar datos.
- Juego: 210 pruebas de lógica y compilación de producción aprobadas.
- Spring: 171 pruebas aisladas aprobadas con H2, incluyendo permisos, generaciones y sustitución del juego enviado conservando paquetes, comprobaciones y envíos anteriores. Las pruebas que abren servidores HTTP necesitan ejecutarse fuera del entorno restringido.
- Android: se compilaron los archivos Kotlin de la app y las pruebas de pantalla con Compose, el SDK y las dependencias locales. Las cinco pruebas JVM del protocolo y de la presentación del juego se ejecutaron directamente con JUnit.
- La compilación completa mediante Gradle y la ejecución de pantallas requieren la Terminal local y un teléfono o emulador. Gradle no puede abrir su socket de bloqueo en el entorno restringido. Chromium automatizado tampoco pudo iniciarse; se pudo revisar el panel abierto mediante el control nativo de Chrome.

## Ejecutar en tu Terminal

Panel, desde `web/`:

```sh
npm test
npm run build
npm run lint
npm run dev
```

Android, desde `movil/`, con el teléfono o emulador conectado para el último comando:

```sh
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
./gradlew :app:testDebugUnitTest :app:assembleDebug
./gradlew :app:connectedDebugAndroidTest
```

Para comprobar todas las pruebas de Spring, desde `edu-api/`:

```sh
./mvnw test
```

## Recorrido funcional y comprobaciones adicionales

1. En una ventana estrecha, comprobar el menú, las tarjetas, los formularios y las acciones de ambos paneles. Revisar también Mis estudiantes.
2. Crear una propuesta, revisar la idea y usar «Aprobar y preparar juego». Mientras espera, visitar otra sección y volver a Mis juegos.
3. Comprobar que el juego listo se puede probar, ampliar, reducir y volver a empezar. No deben aparecer versiones, pasos internos, cronómetros o diagnósticos.
4. Pedir cambios por chat. Comprobar que se conserva la conversación al volver, se revisa la idea ajustada y se prepara el juego actualizado.
5. Enviar el juego a la clase. En Android, usar «Buscar juegos nuevos», abrir la misión y jugar. El curso, título y consigna deben corresponder al juego real.
6. Cambiar un juego ya enviado: la app debe conservar el anterior hasta enviar la actualización. Después debe mostrar una sola aventura de ese trabajo.
7. En Android, comprobar ayuda en ingreso, biblioteca y misión; regreso desde una partida; cierre y sus dos acciones. Repetir con texto grande y en modo oscuro.
8. Probar «Eliminar» con un juego de prueba, incluyendo cancelar. Confirmar que desaparece del panel y de la biblioteca actualizada de la app.

Estas comprobaciones de interfaz usan los servicios habituales. Generar propuestas o cambios consume llamadas del proveedor que tengas configurado.


## Integración de los avances del compañero

Base remota revisada: `3cdf27b`, con ocho commits nuevos respecto de `bea6429`. La revisión encontró once archivos con conflictos de texto y varios cambios que retiraban funciones ya disponibles.

- Se conservan la migración V9, la entidad, el repositorio y los datos de entrada del buzón del taller.
- El procesador actual reclama y termina la misma tarea del buzón; rechaza una tarea que otro trabajador ya recogió. El resultado y los errores quedan guardados internamente.
- Se mantienen los permisos, la validación del tipo de juego, la eliminación y el envío explícito a los estudiantes. La biblioteca conserva el último juego enviado hasta que el docente envíe su actualización.
- El reproductor activo sigue en `juego/kit/reproductor` y `juego/juegos/laberinto`, con sus recursos y pruebas correspondientes. Los archivos de referencia añadidos en `juego/src` y `juego/public` se conservan.
- La definición del laberinto de ejemplo se conserva para pruebas. La biblioteca normal sigue mostrando los juegos enviados por el docente.
- Los borradores locales de `juego/kit/estilo` y `juego/taller`, y la subida local de Gradle a 9.4.1, quedan fuera de los dos commits de esta entrega.

El panel conserva sus 91 pruebas aprobadas y el juego sus 210 pruebas de lógica. Spring aplica las nueve migraciones en H2 y aprueba 171 pruebas, incluidas las del buzón, el envío y la eliminación. Android compila su código y las pruebas de pantalla; sus cinco pruebas JVM pasan. Las pruebas que requieren servidor HTTP local, navegador automatizado o dispositivo siguen necesitando ejecutarse fuera del entorno restringido.
