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

El proveedor de IA es **Groq** (`GeneradorGroq`). Se activa al poner `GROQ_API_KEY` en el `.env` local (la clave se crea en https://console.groq.com/keys y nunca se sube); `GROQ_MODELO` es opcional (por defecto `openai/gpt-oss-120b`). Sin clave la IA queda **no configurada**: la solicitud se guarda `pendiente` y no se inventa contenido. `GeneradorGroqTest` prueba el adaptador con un Groq simulado. `PropuestasSimuladasTest` usa IA y Django simulados.

HU19–HU25 (propósito, revisión y versiones) y `GET /api/edu/acceso/estudiante/` (HU11, app móvil) se describen en `docs/CONTRATO_PROPUESTAS_IA.md`.

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
