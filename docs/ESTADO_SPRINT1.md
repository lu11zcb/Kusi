# Entrega del bloque del 11 de octubre de 2026

Repositorio de implementación: `D:\Escritorio\Kusi`. Rama de trabajo final: `main`. Remoto existente: `https://github.com/lu11zcb/Kusi.git`. Este informe separa implementación comprobada, dependencias y revisión humana; no declara cerradas las ocho historias ni descuenta puntos académicos.

## Estado por historia

| Historia | Estado real | Evidencia / pendiente |
|---|---|---|
| HU01 | Implementada y comprobada; integrada desde `hu01-registrar-usuarios` por avance rápido | Registro React/Django, errores, CSRF, UUID, hash, contraseña temporal de 10 caracteres y cierre comprobados. Commit `d76bdc2`; corrección posterior `fd73c26` protege la confirmación al navegar. Revisión del compañero pendiente. |
| HU11 | Django y web implementados y comprobados; parcial en integración | Ingreso común, contraseña temporal obligatoria, elección de roles, interiores separados, salida y endpoint interno de sesión. Commit `9db70b9`; error de salida corregido en `fd73c26`. Faltan Spring y acceso Kotlin. |
| HU02 | Implementada y comprobada en Django/web | Roles individuales y administrador/docente, permisos API y ausencia de privilegios técnicos, historial. Commit `3469ba1`. Spring aún debe consumir roles y validar recursos. Revisión humana pendiente. |
| HU03 | Implementada y comprobada | Siete cursos iniciales, consulta/renombrado, UUID conservado y duplicados rechazados. Commit `a3e99d2`. El vínculo con futuras actividades Spring no pudo probarse; UUID estable sí. Revisión humana pendiente. |
| HU04 | Implementada y comprobada | Nombre/correo validados, unicidad, siguiente consulta actualizada, UUID/roles/hash/historial conservados y transacción atómica. Commit `844ff64`. Revisión humana pendiente. |
| HU06 | Parcial, bloqueada en persistencia e integración | Formulario y adaptador Django → Spring comprobados; contrato y 503 sin servicio. Commit `6d938a5`. Falta estructura confirmada de Spring, migraciones `edu`, creación real, duplicados y permisos de extremo a extremo. |
| HU18 | Bloqueada; contrato preparado | Falta Spring e integración IA real para sugerir objetivo ausente y distinguir su origen docente/IA. No hubo generación simulada en producto. |
| HU16 | Bloqueada; contrato preparado | Falta Spring, proveedor/modelo y credencial utilizable para generar y persistir solicitud/resultado real. No se llamó a un proveedor ni se activaron gastos. |

## Comprobaciones ejecutadas

- Django: **56/56 pruebas aprobadas**, con `--settings=kusi_admin.settings_pruebas --noinput`; base desechable `test_kusi_hu01`, `search_path=public`, creada/eliminada por el runner. Incluye 21 HU01, 12 acceso, 6 roles, 5 catálogo, 6 edición y 6 contrato secciones.
- Las 6 pruebas de secciones simulan el transporte Spring expresamente. No acreditan persistencia Spring ni integración educativa real.
- Django `check`: sin problemas. `makemigrations --check --dry-run`: sin cambios. Las migraciones 0002–0004 se probaron primero en aislamiento y después se aplicaron correctamente en `kusi`, esquema admin. Cuenta existente conservada: 1 antes y 1 después; catálogo: 7 cursos.
- React: build completo, lint completo y **15/15 pruebas del cliente aprobadas**, salidas 0. Las restricciones EPERM de creación de procesos se resolvieron ejecutando las comprobaciones con autorización de la herramienta, sin eliminar validaciones.
- Chrome: ingreso inválido, elección administrador/docente, cambio de panel y salida; registro válido/errores/contraseña temporal/cierre; búsqueda y roles; duplicados/renombrado de curso; edición de cuenta y nueva consulta con historial; secciones sin servicio muestran error y conservan datos.
- Correcciones finales: navegación/salida bloqueadas durante registro y confirmación; al cerrar se elimina la contraseña visible. El error de salida durante cambio obligatorio se comprobó deteniendo exclusivamente QA. No se cambió una contraseña mediante navegador; ese recorrido se verifica con las pruebas Django.
- Revisión responsive: capturas de escritorio y viewport 390, ancho útil/contenido 375/375 sin desbordamiento horizontal en secciones. La captura móvil es parcial. Detector automático Impeccable: `[]`. Revisión automática final `ship` limitada a las dos correcciones, documentada en `REVISION_INTERFAZ.md`; no sustituye revisión humana.
- Los recorridos de navegador usaron bases `test_kusi_navegador_*` independientes, con datos ficticios. Las bases propias creadas se eliminaron y el servidor QA quedó detenido. No se probaron datos de estudiantes reales.

## Git y autoría

Antes de cada commit se comprobaron las identidades efectivas mediante `git var`; después se verificaron autor y committer mediante `git show --format=fuller`. En todos los commits creados ambos son **lu11zcb <luiscb.once@gmail.com>**, sin coautores ni identidades de herramientas. La integración HU01 fue por avance rápido: no generó otro autor ni un commit de merge. No se cambió configuración global, no se reescribió historia ni se hizo force push.

Se revisaron remoto, diff, índice y archivos excluidos. Se conserva el traslado de `admin-web` a `web`, sus dependencias y el trabajo previo. `edu-web` se retiró únicamente estando vacía. `edu-api` y `movil` siguen vacías y no se generaron sus estructuras. Las credenciales locales, bases y entornos no forman parte de los archivos preparados.

La comprobación del resultado del push y los hashes remotos se entrega en el mensaje final; no se presenta este archivo previo al push como prueba de subida.

## Dependencias imprescindibles para continuar

1. Luis crea y confirma `edu-api` Spring Boot/Maven con web, validación, seguridad, JPA y PostgreSQL. Después se implementarán los permisos por recurso, secciones y propuestas en `edu`; no se trasladan a Django.
2. Luis crea y confirma `movil` Kotlin/Compose para implementar y comprobar el acceso del estudiante de HU11.
3. Confirmar proveedor/modelo de IA disponible y configurar su credencial localmente, sin enviarla en chat ni subirla al repositorio. No se detectaron las variables habituales de IA ni `CLAVE_INTERNA` configuradas en los ámbitos consultados; faltan también las configuraciones de comunicación entre servicios.

Contratos: [identidad, cuentas y catálogo](CONTRATOS_SERVICIOS.md), [secciones](HU06_REVISION.md), [propuestas IA](CONTRATO_PROPUESTAS_IA.md).

## Pendientes separados del código

El diseño final de ingreso, paneles y móvil sigue reservado a Luis; Rive y el cuy quedan fuera. La revisión humana del compañero, su fecha/referencia al commit y la aceptación académica del mecanismo de revisión en main siguen pendientes. No se asumieron las historias restantes de Jesús ni se inició el bloque del lunes.
