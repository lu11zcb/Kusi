# Kusi edu-api (Spring Boot) — HU06–HU09, HU11 y HU16–HU25

Servicio educativo con persistencia en el esquema `edu` de la misma base PostgreSQL que usa Django (`admin`). Las cuentas/roles y el catálogo de cursos siguen siendo propiedad de Django; este servicio solo guarda secciones, vínculos estudiante-sección y asignaciones docente-curso-sección-año.

## Requisitos
- Java 21
- Maven 3.9+
- PostgreSQL, con acceso al esquema `edu` de la base compartida
- Django `admin-api` ejecutándose
- La misma variable `CLAVE_INTERNA` configurada en Django y Spring

## Ejecución local
En PowerShell, desde esta carpeta:

```powershell
$env:CLAVE_INTERNA="usa-un-secreto-local-largo-compartido-con-django"
$env:DJANGO_INTERNAL_URL="http://127.0.0.1:8000"
$env:PG_DATABASE="kusi"
# Define PG_USER y PG_PASSWORD con tus credenciales locales, fuera de Git.
mvn spring-boot:run
```

Al iniciar desde `edu-api`, Spring también puede cargar el archivo opcional `../.env`; las variables del proceso prevalecen. Django usa ese mismo archivo local. No versionar credenciales. La configuración por defecto apunta a `jdbc:postgresql://127.0.0.1:5432/kusi`; `PG_HOST`, `PG_PORT`, `PG_DATABASE`, `PG_USER` y `PG_PASSWORD` permiten cambiar la conexión. `EDU_DB_URL`, `EDU_DB_USER` y `EDU_DB_PASSWORD` tienen prioridad si el servicio necesita credenciales propias para el mismo esquema. H2 está disponible únicamente para las pruebas.

Flyway crea los objetos de `src/main/resources/db/migration` únicamente en `edu`; Hibernate valida la estructura y no la modifica con `ddl-auto=update`. No se ejecuta ninguna migración de usuarios Django ni el script histórico `admin-api/migrar_usuarios.sql` desde Spring. En producción usa TLS, secreto fuera del repositorio y no expongas `/interno` directamente a internet.

**Base existente:** antes del primer inicio con Flyway, revisar el contenido de `edu` y tener un respaldo. Si ya contiene tablas sin historial Flyway, el inicio se detiene deliberadamente (`baseline-on-migrate=false`): no se adopta, borra ni reconstruye una base existente automáticamente. La incorporación de ese esquema requiere una migración revisada para sus tablas reales; no activar un baseline a ciegas ni borrar los datos H2 anteriores.

## Contratos usados por el adaptador Django
- `POST /interno/secciones/` — `{nombre, grado, anio_escolar}`
- `POST /interno/vinculos-estudiantes/` — `{estudiante_id, seccion_id, anio_escolar}`
- `GET /interno/vinculos-estudiantes/`
- `POST /interno/asignaciones-docentes/` — `{docente_id, curso_id, seccion_id, anio_escolar}`
- `GET /interno/asignaciones-docentes/`

Todas las rutas internas requieren `X-Clave-Interna` y `X-Sesion-Kusi`. Spring valida la sesión contra Django y exige rol administrador para las mutaciones/listados administrativos. Los UUID de estudiante/docente y curso se comprueban contra Django. Las restricciones únicas de base de datos impiden duplicados aun con peticiones concurrentes. Cada asignación conserva el año escolar y se relaciona con una sección existente.

## HU08: autorización de recursos
`GET /interno/docentes/{uuid}/recursos/` filtra por la identidad de sesión verificada y rechaza UUID que no corresponden al usuario autenticado. Para integrarlo con las pantallas de docente, el adaptador web debe reenviar el `sessionid` del usuario y la clave interna desde servidor; nunca se debe confiar en un `docente_id` enviado por el navegador como prueba de identidad.

## Nota de estado
El servicio y los adaptadores deben probarse juntos con Django y PostgreSQL antes de declarar HU07/HU08 aceptadas. `mvn test` incluye normalización y regresiones HTTP con persistencia H2 aislada: carga de secciones relacionadas sin Open Session in View, duplicados detectados por la restricción de base y permisos de recursos docentes. Las respuestas Django se simulan solo en estas pruebas; no sustituyen una comprobación real entre servicios ni validan PostgreSQL por sí solas.

## HU18/HU16: solicitudes de propuestas
Rutas del panel docente, accesibles por el proxy de Vite (`/api/edu` → 8080). Spring lee la cookie `sessionid` de Django y la valida con `/api/interno/sesiones/validar/`; exige rol docente y asignación vigente al curso/sección.

- `GET /api/edu/acceso/csrf/` — `{csrf_token}` y cookie `kusi_edu_csrf`; toda escritura en `/api/edu/` exige `X-XSRF-TOKEN` igual a esa cookie.
- `GET /api/edu/contexto/propuestas/` — `{contextos, ia_configurada}` del docente autenticado.
- `POST /api/edu/propuestas/solicitudes/` — `{id_solicitud, curso_id, seccion_id, tema, objetivo}`; 201 nueva, 200 si ya existía igual, 409 si el UUID tiene otro contenido.
- `GET /api/edu/propuestas/solicitudes/{id}/` y `POST .../{id}/reintentar/`.

La IA se configura en la sección «Configurar la IA» (más abajo en este archivo). Sin clave la IA queda **no configurada**: la solicitud se guarda `pendiente` y no se inventa contenido. `GeneradorPropuestasIaTest` prueba la llamada 1 con una IA simulada en un servidor local. `PropuestasSimuladasTest` usa IA y Django simulados.


## HU31: comprobaciones del guion del laberinto
`pe.kusi.edu.laberinto.ValidadorLaberinto` es código puro (sin IA ni base de datos): recibe el guion (`kusi-paquete/0`, familia `laberinto`) como JSON y devuelve la lista de problemas, vacía si está bien. Cada problema trae un `codigo` estable y un `motivo` en español sencillo que empieza con «Nivel N:» cuando es de un nivel. Incluye todo lo que comprueba el juego (`juego/src/datos/validarLaberinto.js`) y además:

| Grupo | Códigos |
| --- | --- |
| Formato y niveles | `FORMATO`, `FAMILIA`, `TITULO_FALTA`, `NIVELES_CANTIDAD` (de 3 a 5), `DIFICULTAD_MAPA` (los mapas no se achican), `NIVEL1_ENEMIGOS` |
| Mapa | `MAPA_FORMA`, `MAPA_FILAS`, `MAPA_SIMBOLO`, `MAPA_INICIO`, `MAPA_PUERTA`, `MAPA_BORDE`, `MAPA_TAMANO` (máximo 9 filas × 15 columnas: casillas de 40 px en un celular de 800 × 360) |
| Objetos y enemigos | `OBJETOS_FALTAN`, `OBJETO_TIPO`, `OBJETO_POSICION`, `OBJETO_FUERA_DEL_CAMINO`, `OBJETO_INALCANZABLE`, `PUERTA_INALCANZABLE`, `CASILLA_REPETIDA`, `ENEMIGOS_FALTAN`, `ENEMIGO_TIPO`, `ENEMIGO_MOVIMIENTO`, `ENEMIGO_POSICION`, `ENEMIGO_FUERA_DEL_CAMINO`, `ENEMIGO_CERCA` (menos de 3 casillas de camino del cuy) |
| Reglas | `REGLA_TIPO`, `REGLA_DISTINTA` (cuando la propuesta eligió una regla), `SECUENCIA_LARGO`, `SECUENCIA_TIPO`, `SECUENCIA_NO_PATRON`, `SECUENCIA_FALTAN_OBJETOS`, `CLASE_INVALIDA`, `META_RANGO`, `CLASE_FALTAN_OBJETOS`, `CLASE_SIN_TRAMPA` |
| Textos | `CONSIGNA_FALTA`, `CONSIGNA_LARGA`, `AYUDAS_CANTIDAD`, `AYUDA_VACIA`, `AYUDA_LARGA`, `AYUDA_REVELA` (una ayuda nombra una fruta o verdura, sin importar tildes, mayúsculas ni plural) |

Los objetos son `fresa`, `platano`, `mango`, `mandarina`, `pina` (frutas) y `zanahoria`, `papa`, `choclo` (verduras); el único enemigo es el `zorro`, con movimiento `patrulla` o `persigue_cerca`. La alcanzabilidad se mide con una búsqueda en anchura que no atraviesa muros ni la puerta. `ValidadorLaberintoTest` usa el paquete de ejemplo del juego como caso bueno y le hace un solo cambio por cada caso malo.

## Configurar la IA
Hay un solo adaptador de IA, `ClienteIa`, que habla con cualquier proveedor compatible con la API de chat de OpenAI (Groq, la IA de Tecsup...). Las dos llamadas pasan por él: la llamada 1 (la propuesta, `GeneradorPropuestasIa`) y la llamada 2 (el guion del laberinto, `GeneradorGuionIa`). Se configura con variables del `.env` de la raíz del repositorio (cópialo de `.env.example`; el `.env` nunca se sube):

| Variable | Qué es | Si está vacía |
| --- | --- | --- |
| `IA_CLAVE` | La clave del proveedor | se usa `GROQ_API_KEY` |
| `IA_URL` | La dirección del chat: completa (termina en `/chat/completions`) o solo hasta `/v1` | se usa `GROQ_URL` o la de Groq |
| `IA_MODELO` | El modelo | se usa `GROQ_MODELO` o `openai/gpt-oss-120b` |
| `IA_ESQUEMA_ESTRICTO` | `true` pide el esquema JSON estricto (`json_schema`); `false` lo apaga y solo se pide «un objeto JSON» | `true` solo con los modelos `openai/gpt-oss-120b` y `openai/gpt-oss-20b` de Groq |

`GROQ_API_KEY`, `GROQ_MODELO` y `GROQ_URL` siguen funcionando igual que antes. Sin ninguna clave la IA queda **no configurada**: las solicitudes de propuesta quedan `pendiente`, `POST /api/edu/generaciones/{id}/procesar/` responde 503 y deja la generación `pendiente`; no se inventa ningún contenido.

- **Groq:** crea una clave gratis en https://console.groq.com/keys y pon solo `GROQ_API_KEY=` en el `.env`.
- **IA de Tecsup:** `IA_URL=` con la dirección que te den, `IA_CLAVE=`, `IA_MODELO=Qwen/Qwen3.6-35B-A3B-FP8` e `IA_ESQUEMA_ESTRICTO=true`. Si el servidor rechaza el esquema estricto (error 400), el aviso lo dice: pon `IA_ESQUEMA_ESTRICTO=false`.

## HU26: la IA genera el guion del laberinto
Con la propuesta aprobada, `POST /api/edu/propuestas/solicitudes/{id}/versiones/{n}/generar/` (HU27) crea la generación `pendiente` y `POST /api/edu/generaciones/{id}/procesar/` la procesa de verdad (reemplaza al antiguo procesamiento de un paquete de prueba; la ruta no cambió). La respuesta llega cuando termina, con la generación en su estado final (`lista` o `fallida`); mientras tanto el panel puede consultar `GET /api/edu/generaciones/{id}/` para ver el estado y las etapas. Puede tardar: cada llamada a la IA espera hasta 90 segundos y hay hasta 3.

Qué hace (`ProcesoGeneracionLaberinto`):

1. **Llamada 2.** Manda a la IA la propuesta aprobada completa (la IA no recuerda la llamada 1) y le pide el guion del laberinto con un esquema JSON estricto *sin* `anyOf`: la regla es siempre un solo objeto con `tipo` (`orden` o `solo_clase`), `secuencia` (vacía en `solo_clase`), `clase` (`fruta`, `verdura`, o vacía en `orden`) y `meta` (0 en `orden`); `ConstructorGuion` la pasa a la forma que lee el juego. Las instrucciones no llevan ejemplos con valores reales (la IA los copiaría). Para que los juegos varíen, el servidor sortea para cada nivel en qué esquina empieza el cuy, en cuál está la puerta y por qué zonas repartir los objetos, y se lo indica a la IA (las IA eligen mal «al azar»).
2. **Comprobación.** El guion pasa por `ValidadorLaberinto` (HU31).
3. **Corrección.** Si no pasa, se vuelve a pedir con la lista de problemas y su respuesta anterior: hasta 2 correcciones (3 intentos en total).
4. **Mapa base.** Si sigue sin pasar, se usan los tres mapas base (`src/main/resources/laberinto/mapas-base.json`, los mismos del paquete de ejemplo del juego) y de la IA se conservan la regla, los objetos (recolocados donde el cuy sí llega), las consignas y las ayudas. Ese guion también tiene que pasar `ValidadorLaberinto`. Si ni así pasa, o la IA no responde, la generación queda `fallida` con su motivo en `ultimo_error`.

Estados de la generación: `pendiente` → `generando` → `comprobando` → `lista`; `correccion` mientras se pide corregir; `fallida` si no se pudo. Cada paso queda como una etapa (`etapas` en la respuesta):

| Etapa | Estados | Mensaje |
| --- | --- | --- |
| `solicitud` | `completada` | la generación quedó registrada |
| `generacion` | `en_progreso`, `completada`, `fallida` | el pedido a la IA del primer intento |
| `comprobacion` | `completada`, `fallida` | si falla: «Intento N: K problemas» y, debajo, un problema por línea como `CODIGO: motivo` (los muestra la HU33) |
| `correccion` | `en_progreso`, `completada`, `fallida` | el pedido de corrección (intentos 2 y 3) |
| `mapa_base` | `en_progreso`, `completada`, `fallida` | el uso de los mapas base |

Procedencia (para la HU30): el `paquete` incluye un bloque `procedencia` con `{proveedor, modelo, intentos, mapa_base}` (`intentos` es el número de veces que se pidió el guion a la IA; `mapa_base` dice si hubo que usar los mapas base) y la respuesta lo repite como `procedencia`. `GET /api/edu/generaciones/{id}/` devuelve el `paquete` (el guion como texto JSON) cuando la generación está `lista`, con los mismos permisos de siempre: solo el docente de la solicitud con su asignación vigente.

| Respuesta | Cuándo |
| --- | --- |
| 200 | la generación terminó, `lista` o `fallida` |
| 404 | no existe o es de otro docente |
| 403 | sin rol docente o sin asignación vigente |
| 409 | no está `pendiente` o ya la está procesando otra petición |
| 503 | no hay IA configurada (la generación sigue `pendiente`) |

Las pruebas no usan internet ni clave: `GeneracionesProcesoTest` recorre todo el flujo con una IA falsa (un guion bueno, uno malo que se corrige en el segundo intento y uno siempre malo que termina en el mapa base), `GeneradorGuionIaTest` revisa lo que se le pide a la IA (esquema sin `anyOf`, plan de variación, correcciones), y `ConstructorGuionTest` y `MapasBaseTest` el armado del guion y del respaldo.

Para probar con Groq de verdad, sin el panel:
1. En el `.env` pon `GROQ_API_KEY=` con tu clave y arranca PostgreSQL, Django (`admin-api`, puerto 8000) y `edu-api` (puerto 8080).
2. Entra como docente y copia el valor de la cookie `sessionid`.
3. Con esa cookie, `GET /api/edu/acceso/csrf/` da el token CSRF; las escrituras llevan la cookie `kusi_edu_csrf` y la cabecera `X-XSRF-TOKEN` con ese mismo valor.
4. `GET /api/edu/contexto/propuestas/` da el `curso_id` y el `seccion_id`; luego `POST /api/edu/propuestas/solicitudes/` (con un `id_solicitud` nuevo), `POST .../{id}/versiones/1/aprobar/`, `POST .../{id}/versiones/1/generar/` y `POST /api/edu/generaciones/{id}/procesar/`.
5. `GET /api/edu/generaciones/{id}/` muestra las etapas, la `procedencia` y el `paquete`. Cada generación gasta llamadas reales a la IA.
6. Para jugar ese `paquete`, con el juego en marcha (`cd juego && npm run dev`), abre <http://127.0.0.1:5174/?paquete=mensaje>, abre la consola del navegador y pega `postMessage({ tipo: 'paquete', paquete: <el valor del campo paquete, con sus comillas> }, '*')`. El juego lo comprueba y empieza por el primer nivel; el protocolo completo está en `juego/HU46-LABERINTO.md`.

## HU28: la propuesta elige la regla del juego
Kusi hoy hace un solo juego, el laberinto, con dos reglas: `orden` (patrones que se repiten, de primer grado) y `solo_clase` (solo frutas o solo verduras). La llamada 1 (la propuesta) ya no ofrece el mercado ni el juego de ordenar: usa solo los objetos de la fase 1 (fresa, plátano, mango, mandarina, piña, zanahoria, papa y choclo, con el zorro como único enemigo), **elige la regla según el tema** y la devuelve en `regla_juego`. Si el tema no encaja en ninguna regla, elige la más cercana y lo dice en la historia.

- La regla se guarda con cada versión de la propuesta (columna `propuestas.regla_juego`, migración `V5__regla_del_juego.sql`; queda vacía en las versiones anteriores) y sale en la propuesta de la API como `regla_juego`: `"orden"`, `"solo_clase"` o `null`.
- El docente edita los textos, no la regla: una versión editada (HU23) conserva la de su base. Si la IA ajusta una versión (observaciones) o propone una alternativa y no repite `regla_juego`, hereda la de la base; si la repite, manda la nueva.
- La llamada 2 la respeta: al pedir el guion se le dice «usa `orden` en todos los niveles» y `ValidadorLaberinto` marca `REGLA_DISTINTA` en cada nivel que use otra, lo que dispara la corrección (hasta 2 veces) como cualquier otro problema. El respaldo con mapas base no cambia la regla: si la IA insiste en otra, la generación queda `fallida`.
- Una propuesta sin regla (como las de antes de la HU28) deja que la llamada 2 elija. Una regla que no sea una de las dos hace inválida la respuesta de la IA (502, la solicitud se puede reintentar).

`GeneracionesProcesoTest` (sección HU28, con una IA falsa) comprueba que un tema de patrones da `orden`, que uno de clasificar da `solo_clase` y que el guion cambia de verdad en cada nivel: otra regla, otra barra (una ficha por cada fruta del patrón, o por cada objeto que hay que juntar) y otras trampas (lo que no va en el patrón, o los objetos de la otra clase). No acredita que una IA real elija bien la regla: eso se mira a mano con Groq.
