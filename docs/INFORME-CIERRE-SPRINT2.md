# Cierre del Sprint 2 · revisión del martes 27 de octubre de 2026

## Estado verificable

Las fases 1–4 están confirmadas en cuatro commits separados y en el orden autorizado. El usuario confirmó **«pasaron»** después de repetir Maven y Gradle con los arreglos. La ejecución previa de Android había pasado 11/11 y compilado; la de Java había pasado 175/178 y motivó las correcciones. **Maven y Gradle quedan registrados como aprobados en la Terminal del usuario tras las correcciones**, sin inventar un total nuevo de pruebas de Java que no se comunicó. En este entorno pasaron 83 pruebas del panel, lint y build, además de 161 pruebas de lógica del juego y su build. La fase 5 anterior está confirmada en `23fa13c`; este informe se confirma por separado con el mensaje de resultados solicitado.

No se leyó ni modificó `.env`. No se cambió el arte, el diseño visual del laberinto, las migraciones V1–V5 ni una sola comprobación de `ValidadorLaberinto`. El archivo `movil/gradle/gradle-daemon-jvm.properties` continúa excluido. No se hizo push.

## Fase 1 · respaldo HU26

- El tipo de regla se toma primero de la propuesta, después de una regla válida de la IA y, por omisión, `orden`.
- Las secuencias inválidas se rehacen con dos tipos conocidos de la respuesta, completados con fresa y plátano si hace falta: ABAB, ABABAB y AABAAB según el nivel. Una secuencia buena se conserva.
- Clasificación conserva una clase válida o usa fruta, y ajusta la meta a los límites del catálogo.
- Se eliminan tipos desconocidos, se añaden los objetos necesarios y al menos una trampa para clasificar. Los objetos indispensables se colocan antes que los sobrantes.
- Los niveles ausentes se completan hasta tres. Una respuesta sin forma de nivel también admite respaldo.
- Si se rehace la regla o HU31 rechaza la consigna o las ayudas, se ponen textos sencillos de hasta 80 caracteres, sin revelar objetos en las ayudas. Las etapas indican en qué niveles se repararon regla y textos.
- Se añadieron casos de secuencias de 3 y 9, AAAA, ABCD, tipos desconocidos, meta 10, falta de objetos, consigna larga, ayuda que revela la respuesta, falta de ayudas y solo dos niveles, con ambas reglas. Se actualizaron los casos de proceso que antes esperaban fallo de un respaldo incompleto.

**Pruebas:** Maven aprobado en la Terminal del usuario, confirmado después de los arreglos. HU31 sigue validando todo el resultado antes de guardarlo como listo.

Mensaje autorizado: `fix(HU26): el respaldo de mapas base también rehace la regla, los objetos y los textos`

## Fase 2 · catálogo HU29 y procedencia HU30

- `CatalogoLaberinto` identifica el catálogo como `laberinto`, versión `1`.
- La procedencia incluye `catalogo: { nombre, version }`; el panel sigue aceptando juegos anteriores sin ese campo.
- Solo con mapas de respaldo, Spring guarda `reparaciones: { regla: [niveles], textos: [niveles] }`, con números desde 1. Las listas vacías acreditan que no se rehízo ese contenido; la ausencia del campo en juegos viejos se presenta como dato no registrado. El panel atribuye únicamente las partes conservadas y muestra qué rehízo Kusi, sin leer los mensajes de las etapas para deducirlo.
- «Cómo se hizo este juego» distingue la propuesta de la IA de objetos y personajes reutilizados; enumera los recursos del paquete guardado. Cuando hay respaldo se explican sus reparaciones y no se le atribuyen esos mapas a la IA.
- La comprobación `OBJETO_TIPO` ya tenía pruebas de tipos desconocidos y se conserva. El juego prueba que el campo nuevo no impide abrir el guion.

**Pruebas:** panel 77/77, lint y build aprobados durante la implementación inicial; juego 158/158 y build aprobados en ese punto. La revisión final amplió la cobertura a 83/83 en el panel y 161/161 en el juego. Maven aprobado según la confirmación del usuario.

Mensaje autorizado: `feat(HU29): el catálogo de objetos tiene versión y el panel distingue lo de la IA de lo reutilizado`

## Fase 3 · ayudas HU48 y avance HU49

- El juego conserva consola y envía `{ tipo: 'aviso', aviso }` al contenedor y a `KusiPuente.emitir()` cuando existe. `listo`, `cargado` y `error` también llegan al puente nativo. La voz nativa tiene prioridad y la web conserva su voz del navegador.
- V6 añade `partidas` y `avisos_partida`. Todas las consultas JDBC del servicio y de su prueba usan `edu.partidas` y `edu.avisos_partida` explícitamente, porque JDBC no hereda el esquema de Hibernate. Se revisó el resto del SQL manual; las consultas JPQL conservan sus nombres de entidad. El identificador de propietario sale de la sesión, no de JavaScript. Un docente queda marcado como prueba; un estudiante, como partida estudiantil.
- `POST /api/edu/partidas/avisos/` recibe `{ aviso }`. Se validan tipo, identidad, orden, fecha, nivel, ayuda y tamaño. La clave primaria `(partida_id, orden)` deduplica incluso entre peticiones concurrentes. Un reenvío idéntico responde bien; otro contenido con la misma clave devuelve 409.
- `GET /api/edu/partidas/{id}/` devuelve `{ resumen }` con `partida`, `prueba_docente`, `ayudas_usadas`, `niveles_completados` y `termino`. Otro usuario no puede consultar ni escribir esa partida.
- El panel acepta avisos solo del origen y la ventana de su iframe, los encola y muestra el resumen confirmado por Spring. Si se pierde una respuesta permite reenviar el aviso original. No hace retroceder contadores por una confirmación antigua.
- Se añadieron pruebas de persistencia, aislamiento entre usuarios, CSRF, validación, reenvío, cola y salidas web/nativa.

**Pruebas actuales:** panel 83/83, lint y build aprobados; juego 161/161 y build aprobados. Persistencia y rutas de Spring incluidas en el Maven aprobado por el usuario tras los arreglos.

Mensaje autorizado: `feat(HU48): registrar las ayudas y el avance de cada partida (HU49)`

## Fase 4 · Android HU46 y cierre HU50

- `GET /api/edu/estudiante/juegos/` exige sesión de estudiante y devuelve solo cinco generaciones listas de solicitudes de secciones vinculadas a ese estudiante. Orden descendente y filtrado se hacen en Spring. Hay una prueba de sección ajena y límite de cinco.
- La app carga la biblioteca real y añade siempre al final «El laberinto de Kusi (ejemplo)». El ejemplo sigue disponible si falla la consulta de juegos, con la sesión estudiantil ya validada.
- `JUEGO_URL` se configura con `KUSI_JUEGO_URL`, por omisión `http://10.0.2.2:5174`. Generados usan `?paquete=mensaje`; el ejemplo abre sin guion enviado por la app.
- El WebView horizontal usa el puente nativo para recibir `listo`, entregar el paquete como texto JSON mediante `evaluateJavascript`, emitir eventos y hablar con la voz existente de Kusi. Los callbacks visuales vuelven al hilo principal.
- El WebView restringe navegación y recursos al servidor/ruta configurados, no tiene acceso a archivos ni contenido local y permite sonido sin gesto previo. Al salir destruye el puente y descarta callbacks tardíos.
- El evento `fin` abre el cierre. La cola de guardado vive en el modelo para que desmontar el WebView no cancele el último aviso. El cierre permite volver a biblioteca, repetir y reenviar guardados pendientes.
- Las peticiones de eventos usan sesión del alumno, GET del CSRF de Spring y `X-XSRF-TOKEN`. Las operaciones de Django conservan su cabecera anterior.
- Se añadieron pruebas puras de protocolo, escape del paquete, navegación, cola sin duplicados y transporte HTTP con cookies/CSRF simulado.

**Pruebas:** el usuario informó 11/11 aprobadas y compilación correcta en su Terminal, y confirmó que las comprobaciones pasaron de nuevo al autorizar los commits. El intento local de Gradle no encontró Java en esta caja. No se instaló el APK ni se probó el Moto G15 aquí; sigue pendiente el recorrido Android de extremo a extremo.

Mensaje autorizado: `feat(HU46): la app abre el laberinto y habla con el juego por KusiPuente (cierre de HU50)`

## Fase 5 · detalles

- `.env.example`: `DJANGO_DEBUG=1`.
- `.mailmap`: normaliza las identidades que usen `luiscb.once@gmail.com` a `lu11zcb <luiscb.once@gmail.com>`, sin reescribir commits.
- Este informe reúne alcance, evidencia, bloqueos y la prueba de mañana.

**Comprobaciones:** `git diff --check` sin problemas; `git check-mailmap 'Luis <luiscb.once@gmail.com>'` devuelve la identidad pedida. No se cambió la configuración global.

Mensaje autorizado: `chore: DJANGO_DEBUG=1 en el ejemplo, .mailmap e informe del cierre del Sprint 2`

## Arreglos posteriores a la primera ejecución del usuario

| Arreglo | Cambio y cobertura | Fase del commit |
| --- | --- | --- |
| Esquema del registro | Los ocho SQL de `PartidasService` y el count de `PartidasTest` nombran el esquema `edu`. La revisión de JDBC no encontró otras consultas sin esquema; JPQL y las migraciones gestionadas por Flyway conservan sus contratos. | 3 |
| Límite de textos válidos | La prueba general compara con `CatalogoLaberinto.MAX_CARACTERES_TEXTO` (90). Una regresión comprueba que la consigna válida del segundo nivel, de 84 caracteres, se conserva. Los textos nuevos de respaldo siguen limitados a 80. No se tocó HU31 ni el ejemplo. | 1 |
| Barra sin posición fija | La consigna de orden dice «Sigue el patrón de la barra. Después busca la puerta.»; las ayudas ya no dicen arriba ni figura. Las de clasificación siguen los textos solicitados y no nombran objetos. | 1 |
| Atribución verificable | El servidor calcula las reparaciones por nivel sobre la respuesta normalizada y el guion final y las guarda en procedencia solo con respaldo. Se añadieron pruebas de datos guardados y consultados, ausencia sin respaldo, listas vacías, atribución parcial o completa y compatibilidad antigua. El juego acepta el campo nuevo. | 2 |

Comprobaciones de esta corrección: **83 pruebas del panel, lint y build aprobados; 161 pruebas de lógica del juego y build aprobados**. `git diff --check` pasa. El usuario confirmó la aprobación de Maven y Gradle tras los arreglos. Los resultados anteriores de 175/178 y 11/11 se conservan como antecedentes; no se atribuye al entorno una ejecución que realizó el usuario ni se inventa un total final de Maven.

Con la confirmación del usuario se separaron los archivos compartidos por fases mediante `git add -p`, editando los bloques mezclados solo en el índice. Antes de cada commit se revisaron `git diff --cached --stat`, la lista de rutas y los errores de espacios. Se comprobó que los 36 archivos de código finales son idénticos, byte por byte, a los archivos validados antes de separar las fases.

| Fase | Commit |
| --- | --- |
| 1 · respaldo, objetos y textos | `1e90871` |
| 2 · catálogo y procedencia verificable | `ebc1f9c` |
| 3 · registro de ayudas y avance, con SQL en edu | `6ed343b` |
| 4 · biblioteca, WebView y cierre Android | `5f4771c` |

Autor y committer de los cuatro commits: `lu11zcb <luiscb.once@gmail.com>`. El commit adicional `docs: resultados de las pruebas del cierre del Sprint 2` contiene únicamente este informe. No se añadieron el archivo de Gradle excluido, `.env`, `CLAUDE.md` ni `.claude/`; no se cambió la configuración global de Git y no se hizo push.

## Bloqueos locales anteriores y comandos para reproducir la validación

Maven falló antes de compilar con `Could not open file channel` bajo `/Users/luis/.m2/repository/.locks/`. Comando intentado desde `edu-api/`: `mvn -o test`.

Gradle terminó sin iniciar las tareas: `Unable to locate a Java Runtime`. Comando intentado desde la raíz: `./movil/gradlew --offline -p movil :app:testDebugUnitTest :app:assembleDebug`.

Ejecuta primero, con Java 21 disponible en tu Terminal:

```bash
cd ~/Desktop/Kusi/Kusi/edu-api
mvn -o test
# Si tu caché no tiene las dependencias, en tu Terminal con red:
mvn test

cd ~/Desktop/Kusi/Kusi/movil
./gradlew --offline :app:testDebugUnitTest :app:assembleDebug
# Si faltan dependencias en tu caché:
./gradlew :app:testDebugUnitTest :app:assembleDebug
```

Comprobaciones ya aprobadas aquí, para reproducirlas:

```bash
cd ~/Desktop/Kusi/Kusi/web
npm test
npm run lint
npm run build

cd ~/Desktop/Kusi/Kusi/juego
npm run prueba:logica
npm run build
```

No se inició Vite ni se ejecutó Playwright para esta nueva integración. El recorrido visual comprobado anteriormente no acredita las rutas y el puente añadidos ahora. En tu Terminal, con los servicios activos, ejecuta también `cd ~/Desktop/Kusi/Kusi/juego && npx playwright test`.

## Instalar en el Moto G15 por USB

1. Activa la depuración USB y autoriza tu computadora en el teléfono. Comprueba que `adb devices` lo muestre como `device`. Si hay varios dispositivos usa `adb -s SERIAL` en cada comando.
2. Levanta Django en 8000, Spring en 8080 y el juego Vite en 5174, en tres terminales distintas. Spring aplica V6 al arrancar. PostgreSQL debe estar activo y Django/Spring deben compartir su configuración local ya existente.

```bash
cd ~/Desktop/Kusi/Kusi/admin-api
.venv/bin/python manage.py runserver 127.0.0.1:8000
```

```bash
cd ~/Desktop/Kusi/Kusi/edu-api
mvn spring-boot:run
```

```bash
cd ~/Desktop/Kusi/Kusi/juego
npm run dev
```

3. Conecta los tres puertos y genera el APK debug apuntando a localhost del teléfono:

```bash
adb devices
adb reverse tcp:8000 tcp:8000
adb reverse tcp:8080 tcp:8080
adb reverse tcp:5174 tcp:5174
adb reverse --list

cd ~/Desktop/Kusi/Kusi/movil
./gradlew :app:assembleDebug \
  -PKUSI_DJANGO_URL=http://localhost:8000 \
  -PKUSI_EDU_URL=http://localhost:8080 \
  -PKUSI_JUEGO_URL=http://localhost:5174
adb install -r app/build/outputs/apk/debug/app-debug.apk
adb shell am start -n pe.kusi.movil/.MainActivity
```

La variante debug permite HTTP local. Usa el icono **Kusi**, no la actividad antigua de presentación. Conserva los procesos y el USB conectados durante la revisión. El ejemplo no necesita IA ni juegos generados, pero sí que el servidor del juego esté activo. Para la biblioteca y el registro hace falta sesión estudiantil y Spring.

## Cómo probar mañana

1. Maven y Gradle ya fueron aprobados por el usuario y los commits están separados con los mensajes indicados. Si cambias código antes de la revisión, repite las comprobaciones de arriba. La prueba en el dispositivo sigue siendo necesaria para comprobar el recorrido completo.
2. Abre el panel docente con `cd ~/Desktop/Kusi/Kusi/web && npm run dev`. Desde una propuesta aprobada genera un juego. Si la IA da mapas o reglas malos, revisa los tres intentos y las reparaciones de respaldo; el resultado debe pasar HU31. Mira catálogo, versión, recursos y procedencia.
3. Abre el iframe, pide las dos ayudas y termina un nivel. «Lo que Kusi registró en esta prueba» debe actualizarse con valores confirmados. Reinicia: la nueva partida debe tener sus propios contadores. Reenvía un aviso guardado y comprueba que no aumenta el contador. Otra sesión no debe consultar esa partida.
4. Desde administración vincula la cuenta estudiantil de prueba a la sección de esa solicitud. En el Moto inicia sesión con su DNI. La biblioteca debe mostrar como máximo cinco juegos generados y, al final, el ejemplo. Un estudiante de otra sección no debe ver los juegos ajenos.
5. Abre un generado: espera la entrega del paquete, escucha la voz nativa, mueve al cuy y usa una ayuda. Completa los niveles y comprueba que `fin` abre el cierre. Vuelve a biblioteca y repite. Abre también el ejemplo para demostrar la alternativa sin generación.
6. Comprueba los registros del estudiante y la marca `prueba_docente` de la vista previa. Interrumpe la conexión al guardar, restáurala y usa reintentar: el aviso original debe registrarse una sola vez.

Las colas de avisos son de memoria: una respuesta perdida puede reenviarse durante esta sesión, pero cerrar por completo el proceso antes de confirmar puede perder pendientes. No se declara persistencia offline ni una asignación formal a estudiantes; la biblioteca sirve los juegos de prueba solicitados para esta demo.
