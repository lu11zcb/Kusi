# Cierre del Sprint 2 · revisión del martes 27 de octubre de 2026

## Estado verificable

Las cinco fases tienen implementación escrita. **El cierre técnico queda pendiente de ejecutar Spring y Android desde la Terminal del usuario**: en este entorno Maven no puede abrir su bloqueo de caché y Gradle no encuentra Java. No se sustituyeron herramientas, cachés ni restricciones para rodear esos bloqueos. Las fases 1 a 4 no se confirman mediante commit mientras falten sus pruebas. La fase 5 contiene únicamente este informe, `.env.example` y `.mailmap`.

No se leyó ni modificó `.env`. No se cambió el arte, el diseño visual del laberinto, las migraciones V1–V5 ni una sola comprobación de `ValidadorLaberinto`. El archivo `movil/gradle/gradle-daemon-jvm.properties` continúa excluido. No se hizo push.

## Fase 1 · respaldo HU26

- El tipo de regla se toma primero de la propuesta, después de una regla válida de la IA y, por omisión, `orden`.
- Las secuencias inválidas se rehacen con dos tipos conocidos de la respuesta, completados con fresa y plátano si hace falta: ABAB, ABABAB y AABAAB según el nivel. Una secuencia buena se conserva.
- Clasificación conserva una clase válida o usa fruta, y ajusta la meta a los límites del catálogo.
- Se eliminan tipos desconocidos, se añaden los objetos necesarios y al menos una trampa para clasificar. Los objetos indispensables se colocan antes que los sobrantes.
- Los niveles ausentes se completan hasta tres. Una respuesta sin forma de nivel también admite respaldo.
- Si se rehace la regla o HU31 rechaza la consigna o las ayudas, se ponen textos sencillos de hasta 80 caracteres, sin revelar objetos en las ayudas. Las etapas indican en qué niveles se repararon regla y textos.
- Se añadieron casos de secuencias de 3 y 9, AAAA, ABCD, tipos desconocidos, meta 10, falta de objetos, consigna larga, ayuda que revela la respuesta, falta de ayudas y solo dos niveles, con ambas reglas. Se actualizaron los casos de proceso que antes esperaban fallo de un respaldo incompleto.

**Pruebas:** escritas, pendientes de Maven. HU31 sigue validando todo el resultado antes de guardarlo como listo.

Mensaje autorizado: `fix(HU26): el respaldo de mapas base también rehace la regla, los objetos y los textos`

## Fase 2 · catálogo HU29 y procedencia HU30

- `CatalogoLaberinto` identifica el catálogo como `laberinto`, versión `1`.
- La procedencia incluye `catalogo: { nombre, version }`; el panel sigue aceptando juegos anteriores sin ese campo.
- «Cómo se hizo este juego» distingue la propuesta de la IA de objetos y personajes reutilizados; enumera los recursos del paquete guardado. Cuando hay respaldo se explican sus reparaciones y no se le atribuyen esos mapas a la IA.
- La comprobación `OBJETO_TIPO` ya tenía pruebas de tipos desconocidos y se conserva. El juego prueba que el campo nuevo no impide abrir el guion.

**Pruebas:** panel 77/77, lint y build aprobados en esta fase; juego 158/158 y build aprobados. Maven pendiente.

Mensaje autorizado: `feat(HU29): el catálogo de objetos tiene versión y el panel distingue lo de la IA de lo reutilizado`

## Fase 3 · ayudas HU48 y avance HU49

- El juego conserva consola y envía `{ tipo: 'aviso', aviso }` al contenedor y a `KusiPuente.emitir()` cuando existe. `listo`, `cargado` y `error` también llegan al puente nativo. La voz nativa tiene prioridad y la web conserva su voz del navegador.
- V6 añade `partidas` y `avisos_partida`. El identificador de propietario sale de la sesión, no de JavaScript. Un docente queda marcado como prueba; un estudiante, como partida estudiantil.
- `POST /api/edu/partidas/avisos/` recibe `{ aviso }`. Se validan tipo, identidad, orden, fecha, nivel, ayuda y tamaño. La clave primaria `(partida_id, orden)` deduplica incluso entre peticiones concurrentes. Un reenvío idéntico responde bien; otro contenido con la misma clave devuelve 409.
- `GET /api/edu/partidas/{id}/` devuelve `{ resumen }` con `partida`, `prueba_docente`, `ayudas_usadas`, `niveles_completados` y `termino`. Otro usuario no puede consultar ni escribir esa partida.
- El panel acepta avisos solo del origen y la ventana de su iframe, los encola y muestra el resumen confirmado por Spring. Si se pierde una respuesta permite reenviar el aviso original. No hace retroceder contadores por una confirmación antigua.
- Se añadieron pruebas de persistencia, aislamiento entre usuarios, CSRF, validación, reenvío, cola y salidas web/nativa.

**Pruebas finales:** panel 80/80, lint y build aprobados; juego 161/161 y build aprobados. Persistencia y rutas de Spring pendientes de Maven.

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

**Pruebas:** escritas, no ejecutadas; Gradle no encuentra Java en esta caja. No se instaló el APK ni se probó el Moto G15. No se acredita aún el recorrido Android de extremo a extremo.

Mensaje autorizado: `feat(HU46): la app abre el laberinto y habla con el juego por KusiPuente (cierre de HU50)`

## Fase 5 · detalles

- `.env.example`: `DJANGO_DEBUG=1`.
- `.mailmap`: normaliza las identidades que usen `luiscb.once@gmail.com` a `lu11zcb <luiscb.once@gmail.com>`, sin reescribir commits.
- Este informe reúne alcance, evidencia, bloqueos y la prueba de mañana.

**Comprobaciones:** `git diff --check` sin problemas; `git check-mailmap 'Luis <luiscb.once@gmail.com>'` devuelve la identidad pedida. No se cambió la configuración global.

Mensaje autorizado: `chore: DJANGO_DEBUG=1 en el ejemplo, .mailmap e informe del cierre del Sprint 2`

## Comandos bloqueados y validación en tu Terminal

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

1. Ejecuta primero Maven y Gradle y corrige cualquier fallo antes de dar por cerrado el sprint o confirmar las fases 1–4. Los mensajes de commit deben ser exactamente los indicados arriba, con autor y committer `lu11zcb <luiscb.once@gmail.com>` y sin añadir el archivo de Gradle excluido.
2. Abre el panel docente con `cd ~/Desktop/Kusi/Kusi/web && npm run dev`. Desde una propuesta aprobada genera un juego. Si la IA da mapas o reglas malos, revisa los tres intentos y las reparaciones de respaldo; el resultado debe pasar HU31. Mira catálogo, versión, recursos y procedencia.
3. Abre el iframe, pide las dos ayudas y termina un nivel. «Lo que Kusi registró en esta prueba» debe actualizarse con valores confirmados. Reinicia: la nueva partida debe tener sus propios contadores. Reenvía un aviso guardado y comprueba que no aumenta el contador. Otra sesión no debe consultar esa partida.
4. Desde administración vincula la cuenta estudiantil de prueba a la sección de esa solicitud. En el Moto inicia sesión con su DNI. La biblioteca debe mostrar como máximo cinco juegos generados y, al final, el ejemplo. Un estudiante de otra sección no debe ver los juegos ajenos.
5. Abre un generado: espera la entrega del paquete, escucha la voz nativa, mueve al cuy y usa una ayuda. Completa los niveles y comprueba que `fin` abre el cierre. Vuelve a biblioteca y repite. Abre también el ejemplo para demostrar la alternativa sin generación.
6. Comprueba los registros del estudiante y la marca `prueba_docente` de la vista previa. Interrumpe la conexión al guardar, restáurala y usa reintentar: el aviso original debe registrarse una sola vez.

Las colas de avisos son de memoria: una respuesta perdida puede reenviarse durante esta sesión, pero cerrar por completo el proceso antes de confirmar puede perder pendientes. No se declara persistencia offline ni una asignación formal a estudiantes; la biblioteca sirve los juegos de prueba solicitados para esta demo.
