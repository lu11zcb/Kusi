# Kusi edu-api (Spring Boot) — HU06, HU07 y HU08

Servicio educativo con persistencia propia. Las cuentas/roles y el catálogo de cursos siguen siendo propiedad de Django; este servicio solo guarda secciones, vínculos estudiante-sección y asignaciones docente-curso-sección-año.

## Requisitos
- Java 21
- Maven 3.9+
- Django `admin-api` ejecutándose
- La misma variable `CLAVE_INTERNA` configurada en Django y Spring

## Ejecución local
En PowerShell, desde esta carpeta:

```powershell
$env:CLAVE_INTERNA="usa-un-secreto-local-largo-compartido-con-django"
$env:DJANGO_INTERNAL_URL="http://127.0.0.1:8000"
$env:EDU_DB_URL="jdbc:h2:file:./data/kusi-edu;AUTO_SERVER=TRUE"
mvn spring-boot:run
```

Para PostgreSQL, define `EDU_DB_URL=jdbc:postgresql://localhost:5432/kusi_edu`, `EDU_DB_USER`, `EDU_DB_PASSWORD` y `EDU_DB_DRIVER=org.postgresql.Driver`. En producción usa TLS, secreto fuera del repositorio y migraciones versionadas (Flyway); no expongas `/interno` directamente a internet.

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
El servicio y los adaptadores están preparados en el repositorio entregado, pero deben probarse juntos en el entorno local con Java/Maven, Django y una base persistente antes de declarar HU07/HU08 aceptadas. La prueba automatizada incluida comprueba la normalización de sección; las pruebas end-to-end necesitan servicios y credenciales de desarrollo configurados.
