# Kusi edu-api (Spring Boot) — HU06, HU07, HU08, HU18 y HU16

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

Sin un bean `GeneradorPropuestas` real la IA queda **no configurada**: la solicitud se guarda `pendiente` y no se inventa contenido. El adaptador del proveedor se añadirá cuando Luis elija proveedor/modelo y configure la clave fuera de Git. `PropuestasSimuladasTest` usa IA y Django simulados.
