# HU01 · Entrega para revisión

Fecha: 11 de octubre de 2026. Rama observada por lectura de `.git/HEAD`: `hu01-registrar-usuarios`.

**Estado: implementación comprobada; lista para registrar e integrar según la autorización actualizada de Luis. La revisión humana del compañero y el diseño final siguen pendientes.**

## Alcance

- Se trasladó `admin-web` a `web` después de comprobar que el destino no existía, conservando proyecto, dependencias y recursos. Se sustituyó la pantalla inicial de Vite por el registro provisional.
- Se retiró `edu-web` porque estaba vacía, sin borrado recursivo.
- `web/src` contiene `acceso`, `administracion`, `docente`, `componentes` y `servicios`. El área docente queda documentada, sin implementar otras historias.
- Diseño final, cuy y Rive siguen a cargo de Luis. No se modificaron `edu-api` ni `movil`.
- La sección 0 del encargo y el mensaje posterior de Luis autorizan comandos, comprobaciones, commits, push e integración de HU01 una vez comprobada.
- HU11 y las demás historias se trabajan directamente en `main` después de integrar HU01.

## Trabajo previo conservado

La lectura inicial encontró cambios de Luis en `cuentas/admin.py`, `cuentas/models.py`, `cuentas/views.py`, `kusi_admin/settings.py` y `requirements.txt`, además del formulario, servicio y migración inicial aún fuera del índice. Se conservan el modelo, administrador, formulario, servicio, migración y dependencias Django. Se amplía la vista de registro y se añade el manejo de errores CSRF a los ajustes existentes.

El código previo ya aporta UUID, unicidad del correo sin distinguir mayúsculas, hash, roles con grupos, contraseña temporal aleatoria de diez caracteres y transacción de cuenta/rol. Se revisaron `git status`, el diff, el índice y el remoto `https://github.com/lu11zcb/Kusi.git`.

La comparación directa final confirmó que modelo, administrador, formulario, servicio, migración inicial y `requirements.txt` conservan exactamente sus bytes iniciales. Las dependencias React tampoco cambiaron; el lockfile solo cambia el nombre del proyecto. No se encontraron referencias operativas al nombre anterior ni imports relativos sin destino.

## Cambios añadidos

| Archivos | Resultado |
|---|---|
| `admin-api/cuentas/views.py`, `cuentas/urls.py`, `kusi_admin/urls.py` | Ruta de registro y contexto; controles de sesión, rol, cuenta activa y cambio de contraseña pendiente; errores JSON y conflicto junto al correo. |
| `admin-api/kusi_admin/settings.py` | Error CSRF legible para `/api/`, conservando middleware y respuesta normal del administrador técnico. |
| `admin-api/cuentas/tests.py`, `kusi_admin/settings_pruebas.py` | Pruebas de persistencia, validación, permisos, transacción, unicidad y CSRF en PostgreSQL separado. |
| `web/src/App.tsx`, `acceso/*`, `administracion/*`, `componentes/*` | Comprobación de acceso, formulario con errores asociados a campos, bloqueo de doble envío y confirmación temporal. |
| `web/src/servicios/django.ts`, `web/tests/django.test.mjs` | Cliente con cookies, CSRF y caché desactivada; pruebas del contrato sin nuevas dependencias. |
| Configuración, manifiestos, HTML, CSS y README de `web` | Nombre `web`, proxy local, idioma español, organización y estilos provisionales adaptables. |

## Contrato HTTP

Ambas rutas requieren sesión activa, grupo `administrador` y cambio de contraseña ya resuelto. `is_staff` e `is_superuser` solos no sustituyen ese rol. Registrar un administrador no le concede indicadores técnicos.

- `GET /api/cuentas/registro/contexto/`: devuelve `usuario: {id, nombre, correo}` y `csrf_token`. No autentica ni devuelve contraseñas. React lo consulta al abrir el formulario y antes del envío para renovar el token.
- `POST /api/cuentas/usuarios/`: recibe JSON `{nombre, correo, rol}`; roles permitidos: `administrador`, `docente`, `estudiante`. Necesita cookies de sesión/CSRF y `X-CSRFToken`.
- `201`: devuelve `mensaje`, `usuario: {id, nombre, correo, rol}` y `contrasena_temporal`.
- `400`: JSON inválido o validación. Los errores de campo usan `errores: {campo: [{message, code}]}`; incluye el duplicado detectado al validar.
- `401`: sesión no autenticada. El backend de autenticación también deja de resolver sesiones de cuentas inactivas.
- `403`: permisos, contraseña pendiente o CSRF rechazado. `409`: duplicado posterior a validación, con `errores.correo`. `415`: contenido distinto de JSON. `405`: método no permitido.

La respuesta con contraseña incluye `Cache-Control: no-store, no-cache, private`. React conserva el resultado únicamente en memoria mientras está abierta la confirmación; no usa almacenamiento persistente ni consola, ni ofrece recuperar la contraseña. Al cerrar o abandonar la página se vacía el resultado; en `pagehide` se sincroniza también el DOM. Falta comprobar atrás/adelante y bfcache en navegador. El POST no se reintenta automáticamente: una desconexión puede dejar su resultado incierto.

El proxy conserva `Host` y `Origin`, compartiendo el origen de Vite para `/api`, `/admin` y `/static`. CSRF permanece activo; no se añaden permisos CORS generales. Esta es una configuración local, sin despliegue.

El login común, la elección entre roles y el cambio efectivo de contraseña temporal siguen pendientes de HU11/HU02. Se conserva el contrato del encargo para la sesión interna Django–Spring con `X-Clave-Interna` y caché máxima de 60 segundos; no se implementa en esta entrega.

## Comprobaciones

```cmd
cd /d D:\Escritorio\Kusi\admin-api
.venv\Scripts\python.exe manage.py check
.venv\Scripts\python.exe manage.py makemigrations --check --dry-run
.venv\Scripts\python.exe manage.py test cuentas --settings=kusi_admin.settings_pruebas
cd /d D:\Escritorio\Kusi\web
npm run build
npm run lint
npm test
```

El runner Django crea y elimina solo `test_kusi_hu01`, con esquema `public`. El usuario PostgreSQL necesita permiso para crear bases de pruebas. Reservar ese nombre para pruebas; si existe una base con información útil, abortar sin aceptar su recreación. No ejecutar `migrate`, `flush` ni el servidor con `settings_pruebas`: se usa únicamente con el runner. No se modifica el esquema `admin` ni los datos de `kusi`. La entrega conserva la migración inicial y no cambia el modelo.

Se corrigió la colisión del test de roles utilizando `registro-<rol>@example.com`, conservando la expectativa 201 y las comprobaciones de grupo y privilegios. Se ejecutaron las 21 pruebas Django: todas pasan, con base aislada creada y eliminada. Los fallos de transacción y el conflicto entre validación/escritura se simulan; no se acredita concurrencia real.

| Verificación | Estado |
|---|---|
| Tres documentos e instrucciones locales | Leídos; no se encontró `AGENTS.md` en el repositorio ni sus padres revisados. |
| Destino ausente y carpeta educativa vacía antes del traslado | Comprobados por lectura directa. |
| Conservación de archivos y dependencias previos | Revisada contra la lectura inicial. |
| Django check y pruebas PostgreSQL | Ejecutados: sin incidencias, 21/21 pruebas aprobadas. |
| Migraciones pendientes | Luis aportó `No changes detected`; el arreglo posterior solo cambia datos de prueba. |
| React build y pruebas del cliente | Luis aportó build satisfactorio y 11/11 pruebas aprobadas; el arreglo posterior no cambia React. |
| React lint | Ejecutado completamente: código de salida 0. |
| Chrome, acceso y formulario | Comprobados sobre `test_kusi_navegador_c62b161324`: acceso, obligatorios, correo inválido, registro, temporal de diez caracteres, cierre y duplicado con mayúsculas. |
| Teclado completo, lector de pantalla y ancho móvil | Pendientes de comprobación complementaria. |
| Revisión estática independiente | Dos hallazgos corregidos y comprobados por el revisor: recuperación de sesión caducada y validación estricta del rol recibido. No certifica compilación, render ni ejecución, ni sustituye la revisión humana. |
| Git e identidad efectiva | Estado/diff/remoto revisados; autor y committer: `lu11zcb <luiscb.once@gmail.com>`. Los tres commits históricos también coinciden. |
| Commit e integración | Autorizados después de las comprobaciones; sus referencias constarán en el informe del bloque. |
| Revisión humana del compañero | Pendiente; la revisión automática no la sustituye. |

## Recorrido manual

Iniciar Django en una ventana CMD:

```cmd
cd /d D:\Escritorio\Kusi\admin-api
.venv\Scripts\python.exe manage.py runserver 127.0.0.1:8000
```

Iniciar Vite en otra ventana CMD:

```cmd
cd /d D:\Escritorio\Kusi\web
npm run dev
```

1. Abrir `http://127.0.0.1:5173/`. Sin sesión debe pedir acceso. **Iniciar sesión** usa el administrador técnico de Django y devuelve al formulario. Usar la cuenta administradora técnica de prueba existente y siempre este mismo origen, también para `/admin/`; no alternar `localhost`, `127.0.0.1` ni puertos. Si falta la cuenta inicial, solicitar el comando `createsuperuser`; no se crean cuentas automáticamente en la base local.
2. Enviar campos vacíos, correo inválido y correo repetido con distintas mayúsculas. Comprobar errores junto al campo, etiquetas, Tab y foco visible.
3. Registrar una persona ficticia; revisar nombre, correo, rol y contraseña temporal. Cerrar la confirmación, recargar y probar atrás/adelante: no debe poder recuperarse. Las pruebas Django verifican UUID, hash, rol y cambio obligatorio.
4. Durante el envío no debe poder registrarse dos veces. Con Django detenido, el formulario debe conservar lo ingresado y mostrar el error; reiniciar Django para continuar. Si caduca la sesión, debe aparecer un enlace para volver a iniciarla, sin repetir el POST automáticamente.
5. Revisar escritorio y 390 px sin desplazamiento horizontal. Las pruebas Django cubren llamadas directas sin sesión, roles ajenos, cuenta inactiva, contraseña pendiente, CSRF incorrecto/ausente y origen ajeno.

## Git, autoría y siguiente paso autorizado

Antes de cada commit, verificar `git var GIT_AUTHOR_IDENT` y `git var GIT_COMMITTER_IDENT` en el mismo entorno contra `lu11zcb <luiscb.once@gmail.com>`. No añadir otras identidades ni trailers de coautoría.

La identidad fue confirmada por Luis y comprobada en Git. No cambiar configuración global ni reescribir historial. Después de cada commit, comprobar `git show --no-patch --format=fuller HEAD`.

Registrar HU01, integrar en `main` conforme a la autorización actualizada y continuar allí. El diseño final y la revisión humana siguen separados del estado de implementación comprobada; no se acredita el cierre académico completo.
