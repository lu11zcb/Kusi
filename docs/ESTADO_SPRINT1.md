# Estado del Sprint 1 — actualización del 13 de octubre de 2026 (cierre)

## Estado por historia (23 HU / 33 puntos)

| HU | Responsable | Estado | Evidencia / pendiente |
|---|---|---|---|
| HU01, HU02, HU03, HU04 | Luis | Implementadas y comprobadas | Django/web. HU01/HU04 aceptan DNI para estudiantes (HU12). |
| HU05, HU15, HU07, HU08 | Jesús | Implementadas y comprobadas | Proxy de Vite ajustado a `/api/edu/` para que `/api/educacion/` llegue a Django. |
| HU06 | Luis | Implementada y comprobada | Spring + PostgreSQL real (Flyway V1–V3 aplicado en PostgreSQL 16). |
| HU09 | Jesús | Implementada y comprobada | Django añade nombre y DNI del estudiante. Recorrido real Django→Spring comprobado. |
| HU17 | Jesús | Implementada y comprobada | Solo cursos asignados; la selección se descarta si deja de estar asignada. |
| HU11 | Luis | Implementada y comprobada | `GET /api/edu/acceso/estudiante/` para la app. Lógica de acceso de la app (`AccesoApi.kt`) compilada y probada en JVM, incluida su integración real con Django y Spring. La app Android completa debe compilarse en Android Studio. |
| HU12 | Jesús | Implementada y comprobada | Redefinida por Luis: el administrador registra al estudiante con su **DNI** (correo opcional para estudiantes); el estudiante ingresa a la app con DNI y contraseña; solo el **administrador** crea y genera contraseñas: al registrar la cuenta y, si el estudiante la olvida, con «Generar contraseña temporal» en «Usuarios y roles» (se muestra una vez, cierra sesiones anteriores, queda en el historial sin la contraseña). El docente se la comunica al estudiante, que debe cambiarla al ingresar. |
| HU13 | Jesús | Implementada; probada en JVM | La app recuerda la sesión en el celular (preferencias privadas, `allowBackup=false`), con casilla «Recordar mi sesión en este celular»; se olvida al cerrar sesión o si caduca. `AlmacenPreferencias.kt` (Android) no se compiló aquí. |
| HU18, HU16 | Luis | Implementadas; **prueba real de IA pendiente** | Persistencia, estados, reintentos y permisos comprobados; IA simulada. |
| HU19 | Luis | Implementada y comprobada | Propósito (preparación/refuerzo) e instrucciones guardados y enviados a la IA. |
| HU20 | Luis | Implementada y comprobada | «Mis propuestas»: objetivo, historia, acciones, reglas, retos, ayudas y recursos; lo que falta aparece como «Pendiente». |
| HU21 | Luis | Implementada y comprobada | Aprueba la versión exacta vigente; registra docente y fecha. Solo la versión vigente aprobada es apta para el juego (Sprint 2). |
| HU24 | Luis | Implementada; alternativa con IA simulada | Rechazada no es apta para juego; «Pedir otra alternativa» conserva la rechazada. |
| HU22 | Luis | Implementada; **IA simulada** | Las observaciones generan una versión nueva que indica la versión ajustada. |
| HU23 | Luis | Implementada y comprobada | Edición docente = versión nueva pendiente; si partía de una aprobada necesita otra aprobación. |
| HU25 | Luis | Implementada y comprobada | Historial de la más reciente a la más antigua, identificando IA o docente. |

## Comprobaciones del 13 de octubre

- Django **76/76** (PostgreSQL temporal). Spring **49/49**: incluye 18 pruebas de propuestas **simuladas** (IA y Django dobles) y una prueba de transporte HTTP real. Web: lint, build y **38/38**.
- **Recorrido real entre procesos** (Django + Spring + PostgreSQL 16, datos ficticios): 14/14 comprobaciones. Encontró y corrigió que Spring enviaba a Django el cuerpo con `Transfer-Encoding: chunked` y Django respondía 400: ninguna llamada Spring→Django funcionaba fuera de las pruebas simuladas.
- Navegador (Chromium, Vite): ingreso docente, estudiantes de mis secciones, propósito, aprobar, modificar e historial, sin errores de consola. La propuesta usada se insertó como **SIMULADA** porque no hay IA configurada.
- HU12/HU13: Django **86/86**; web **39/39**; `AccesoApi.kt` 4/4 en JVM y `AccesoRealTest` 2/2 contra Django + Spring + PostgreSQL reales; el estudiante ingresó con su DNI y la contraseña temporal real.
- Revisión cruzada: realizada según Luis (13/10).
- Pendientes: prueba con IA real (API key de Luis), compilar la app en Android Studio y diseño final. Cuentas de estudiante creadas antes de HU12 necesitan que el administrador registre su DNI.

## Revisión anterior (12 de octubre)

**Actualización 13/10:** se completó el backend Spring de HU18/HU16 (ver [CONTRATO_PROPUESTAS_IA.md](CONTRATO_PROPUESTAS_IA.md)). Spring: **39/39 pruebas aprobadas** (30 anteriores + 9 nuevas de propuestas, todas con Django e IA simulados y H2/Flyway). Siguen pendientes: acceso Kotlin del estudiante (HU11, `movil` no está publicada en GitHub), adaptador y prueba real de IA, recorrido conjunto con PostgreSQL real y revisión del compañero.

## Resultado actual de la revisión de GitHub

Luis pidió revisar `https://github.com/lu11zcb/kusi/`, corregir fallos y conservar una sola rama. La revisión se hizo en un clon aislado: el checkout `D:/Escritorio/Kusi` tenía cambios sin publicar, incluidos `edu-api` y `movil`, y no se modificó. No debe actualizarse ese checkout descartando sus cambios; primero hay que conciliarlos con `main`.

Se incorporaron los seis commits pendientes de `feature/hu05-hu15-hu07-hu08`, conservando la historia y autoría de Jesús. HU05/HU15 ya tenían commits en `main`; la rama añadía Spring y las interfaces de HU07/HU08. El cierre de esta revisión publica la integración en `main` y retira la referencia de la rama solo tras verificar que su punta está incluida. Los resultados del push y la comprobación de las ramas se entregan después de ejecutarlos; este archivo no los da por realizados anticipadamente.

Correcciones de esta revisión:

- Django conserva una sola configuración activa y carga secretos locales desde el entorno o `.env`; se retiraron credenciales fijas del texto actual. Esto no elimina valores de commits históricos. `.env.example` contiene únicamente nombres y valores de ejemplo sin secretos.
- Las cuentas desactivadas pierden sus sesiones anteriores; reactivarlas requiere un nuevo ingreso. Las sesiones históricas con identificadores incompatibles se invalidan sin producir errores 500.
- La interfaz conserva la confirmación de una escritura aunque falle la consulta posterior. Desactivarse o quitarse el rol administrador actualiza el acceso sin mostrar falsamente que el guardado falló. Se muestran los UUID necesarios para los formularios provisionales de vínculos/asignaciones.
- Los adaptadores validan configuración y respuestas, conservan 401/403 y no confunden caducidad de sesión con indisponibilidad. Spring limita los tiempos de conexión/lectura y devuelve 503 ante fallos del servicio de cuentas.
- Spring lee relaciones JPA dentro de transacciones y responde 409 cuando una restricción única detecta duplicados concurrentes, sin continuar una transacción fallida.
- Spring usa PostgreSQL compartido, esquema `edu`, migraciones Flyway y validación de Hibernate. H2 queda para pruebas. Un esquema existente sin historial Flyway requiere revisión previa: no se borra ni se adopta automáticamente.
- El SQL histórico BIGINT→UUID queda manual, con precondiciones y bloqueo ante relaciones que no puede preservar. No se ejecutó sobre la base del proyecto.

### Alcance comprobado y pendientes

| Bloque | Estado en GitHub tras esta integración |
|---|---|
| HU01/HU02/HU03/HU04 | Implementación Django/web y regresiones comprobadas. |
| HU05/HU15 | Desactivación, conservación de datos e historial; regresiones comprobadas. |
| HU06/HU07/HU08 | Código Django/web/Spring y persistencia aislada comprobados. Falta recorrido conjunto con PostgreSQL real para acreditar integración completa. |
| HU11 | Django/web y consumidor interno Spring comprobados por componentes; acceso Kotlin e integración completa pendientes. |
| HU18/HU16 | Cliente React y backend Spring persistente implementados (13/10): solicitudes y propuestas en `edu`, estados pendiente/generando/generada/fallida, idempotencia, reintento explícito, permisos por asignación, CSRF Spring y validación del resultado. 9 pruebas Spring **simuladas** aprobadas. Adaptador del proveedor real y prueba real de IA pendientes (aplazados por Luis). |

El diseño final sigue a cargo de Luis; las pantallas son provisionales. No se probó una IA real ni se eligió proveedor/modelo. La clave y esa prueba siguen aplazadas por Luis. Esta revisión técnica no sustituye revisión del compañero, aceptación académica ni pruebas con estudiantes.

### Verificación del 12 de octubre

- Django: **75/75 pruebas aprobadas** sobre PostgreSQL temporal independiente, creada y eliminada por el runner; sin aplicar migraciones ni modificar datos de la base del proyecto. Incluye invalidación de sesiones, identificadores históricos y conservación de 401/403 al consultar Spring.
- Django `check`: sin problemas. `makemigrations --check --dry-run`: sin cambios, con comprobación PostgreSQL autorizada.
- Spring: **30/30 pruebas aprobadas**, incluidas 14 pruebas HTTP con persistencia H2/Flyway y Django simulado, 15 casos del cliente interno con servidor HTTP simulado y 1 prueba de normalización. Las pruebas fuerzan la base en memoria para no utilizar credenciales locales. No acreditan PostgreSQL educativo ni el recorrido entre procesos reales.
- React: **35/35 pruebas aprobadas**, compilación y lint correctos. Las pruebas de propuestas IA siguen identificadas como simuladas. No se ejecutó un nuevo recorrido de navegador en esta revisión.
- Git: integración sin reescribir historia ni force push. Los commits nuevos de esta revisión usan `lu11zcb <luiscb.once@gmail.com>`; los commits previos de Jesús conservan su autoría. Caches, bases temporales, dependencias y secretos excluidos.

## Informe histórico del 11 de octubre de 2026

Lo que sigue conserva la evidencia de aquella entrega. Sus referencias a estructuras vacías, reserva de creación y tareas de Jesús pendientes fueron sustituidas por las decisiones y avances descritos arriba; no describen el estado actual.

Repositorio de implementación: `D:\Escritorio\Kusi`. Rama de trabajo final: `main`. Remoto existente: `https://github.com/lu11zcb/Kusi.git`. Este informe separa implementación comprobada, dependencias y revisión humana; no declara cerradas las ocho historias ni descuenta puntos académicos.

Instrucción vigente de Luis: **Prueba real de IA aplazada por Luis hasta configurar su API key**. No se solicita la clave ni se llama al proveedor. Se avanza con implementación y pruebas simuladas identificadas; no se eligió proveedor/modelo por cuenta propia. La falta de credencial no detiene ese trabajo. Las estructuras iniciales Spring y Kotlin siguen reservadas a Luis y continúan vacías, por lo que la implementación dentro de ellas espera su confirmación.

## Estado por historia

| Historia | Estado real | Evidencia / pendiente |
|---|---|---|
| HU01 | Implementada y comprobada; integrada en main; rama antigua retirada | Registro React/Django, errores, CSRF, UUID, hash, contraseña temporal de 10 caracteres y cierre comprobados. Commit `d76bdc2`; corrección posterior `fd73c26` protege la confirmación al navegar. Nueva comprobación HTTP y pruebas completas aprobadas. Revisión del compañero pendiente. |
| HU11 | Django y web implementados y comprobados; parcial en integración | Ingreso común, contraseña temporal obligatoria, elección de roles, interiores separados, salida y endpoint interno de sesión. Commits `9db70b9`, `fd73c26` y `1355b8a` (TTL limitado por la expiración persistida). Faltan consumidor Spring, permisos educativos y acceso Kotlin. |
| HU02 | Implementada y comprobada en Django/web | Roles individuales y administrador/docente, permisos API y ausencia de privilegios técnicos, historial. Commit `3469ba1`. Spring aún debe consumir roles y validar recursos. Revisión humana pendiente. |
| HU03 | Implementada y comprobada | Siete cursos iniciales, consulta/renombrado, UUID conservado y duplicados rechazados. Commit `a3e99d2`. El vínculo con futuras actividades Spring no pudo probarse; UUID estable sí. Revisión humana pendiente. |
| HU04 | Implementada y comprobada | Nombre/correo validados, unicidad, siguiente consulta actualizada, UUID/roles/hash/historial conservados y transacción atómica. Commit `844ff64`. Revisión humana pendiente. |
| HU06 | Parcial, bloqueada en persistencia e integración | Formulario y adaptador Django → Spring comprobados; contrato y 503 sin servicio. Commits `6d938a5` y `6a9762c` (configuración mal formada rechazada con 503). Falta estructura confirmada de Spring, migraciones `edu`, creación real, duplicados y permisos de extremo a extremo. |
| HU18 | Cliente React implementado y comprobado; backend pendiente | Commit `42c4e64`. Formulario con tema obligatorio, objetivo opcional conservado exactamente y distinción de origen docente/IA. Validaciones y resultados simulados comprobados. Faltan persistencia Spring y sugerencia real, aplazada expresamente. No hay contenido ficticio en producto. |
| HU16 | Cliente y contrato implementados; backend pendiente | Commit `0d55124`. UUID por entrada, CSRF Spring, consulta antes de reintento, respuestas inválidas y fallos comprobados con simulaciones. Faltan persistencia/transiciones/permisos reales y adaptador configurable dentro de Spring. La estructura, no la API key aplazada, bloquea ese backend. No se llamó a un proveedor. |

## Comprobaciones ejecutadas

- Django: **58/58 pruebas aprobadas** después de las correcciones, con `--settings=kusi_admin.settings_pruebas --noinput`; base desechable `test_kusi_hu01`, `search_path=public`, creada/eliminada por el runner. Incluye 21 HU01, 14 acceso, 6 roles, 5 catálogo, 6 edición y 6 contrato secciones.
- Las dos pruebas nuevas comprueban expiración persistida/TTL, roles actuales e invalidación de otras sesiones tras cambiar la contraseña. Las de secciones también comprueban URLs mal formadas y puertos inválidos; no se eliminaron ni debilitaron validaciones.
- Las 6 pruebas de secciones simulan el transporte Spring expresamente. No acreditan persistencia Spring ni integración educativa real.
- Django `check` repetido: sin problemas. `makemigrations --check --dry-run` repetido: sin cambios. En la entrega anterior las migraciones 0002–0004 se probaron primero en aislamiento y después se aplicaron correctamente en `kusi`, esquema admin (cuenta existente: 1 antes y 1 después; catálogo: 7). En esta continuación no se aplicaron migraciones ni se modificaron datos de `kusi`.
- React: build completo, lint completo y **30/30 pruebas del cliente aprobadas**, salidas 0. Quince originales de acceso/registro y quince nuevas identificadas como **SIMULADO** para solicitudes educativas. Incluyen límites, objetivo docente conservado, origen IA, propuesta incompleta rechazada, CSRF, permisos, respuesta perdida sin duplicación, reintento explícito, 404, cambios de entrada y concurrencia del cliente. No acreditan persistencia ni concurrencia PostgreSQL educativa. Las restricciones EPERM de procesos se resolvieron mediante autorización de la herramienta, sin quitar validaciones.
- HTTP real con el servidor Django y la base desechable `test_kusi_navegador_0ef150f8cf`: CSRF, ingreso inválido, registro válido/errores/duplicado, contraseña temporal de diez caracteres y no-store, roles y combinación inválida, edición seguida de consulta con UUID/historial conservados, catálogo de siete cursos y renombrado con UUID estable, sesión interna con clave/no autorizada, salida e invalidación. Docente, estudiante y administrador con contraseña temporal no acceden a operaciones administrativas. Secciones devuelve 400 para grado inválido y 503 sin Spring; no crea datos educativos. Recorrido aprobado, salida 0.
- Chrome, evidencia de la entrega anterior conservada: ingreso inválido, elección administrador/docente, cambio de panel y salida; registro válido/errores/contraseña temporal/cierre; búsqueda y roles; duplicados/renombrado de curso; edición de cuenta y nueva consulta con historial; secciones sin servicio muestran error y conservan datos.
- Nuevo recorrido Chrome, base aislada `test_kusi_navegador_ebb5a70a9f`: ingreso docente, formulario de tema/objetivo disponible aunque falte el servicio educativo, curso/envío deshabilitados sin contexto autorizado, aviso visible y conservación de tema/objetivo incluidos espacios/saltos de línea después de recargar cursos. Cierre de sesión seguido de pantalla de ingreso comprobado. No se mostró guardado ni generación ficticios. Los estados de éxito/reintentos educativos se comprobaron solo con Node simulado, no en navegador contra Spring. Se verificó que no quedaban los procesos QA/Vite y se eliminó exclusivamente esa base desechable.
- Correcciones finales: navegación/salida bloqueadas durante registro y confirmación; al cerrar se elimina la contraseña visible. El error de salida durante cambio obligatorio se comprobó deteniendo exclusivamente QA. No se cambió una contraseña mediante navegador; ese recorrido se verifica con las pruebas Django.
- Revisión responsive anterior de secciones: viewport 390, ancho útil/contenido 375/375 sin desbordamiento horizontal; captura móvil parcial. Revisión nueva del formulario docente: escritorio 1440x900 (1425/1425) y móvil 390x844 (375/375), sin desbordamiento horizontal. Se guardaron pares superior/inferior porque la captura fullPage falló por timeout del navegador; cada imagen acredita únicamente su región. Se corrigió la tipografía de textarea para heredar el sistema existente. Detector Impeccable ejecutado una vez: `[]`. La revisión automática está separada de la revisión humana en `REVISION_INTERFAZ.md`.
- Los recorridos de navegador y HTTP usaron bases `test_kusi_navegador_*` independientes, con datos ficticios. Las bases propias creadas se eliminaron y los servidores QA quedaron detenidos; se comprobó que no quedaba el proceso del servidor de esta continuación. No se probaron datos de estudiantes reales.

## Git y autoría

Antes de cada commit se comprobaron las identidades efectivas mediante `git var`; después se verificaron autor y committer mediante `git show --format=fuller`. En todos los commits creados ambos son **lu11zcb <luiscb.once@gmail.com>**, sin coautores ni identidades de herramientas. La integración HU01 fue por avance rápido: no generó otro autor ni un commit de merge. No se cambió configuración global, no se reescribió historia ni se hizo force push.

Continuación con IA aplazada: `0d55124` incorpora el cliente/contrato y pruebas simuladas HU16; `42c4e64`, el formulario docente HU18 y su revisión provisional. Ambos comprobaron nuevamente autor y committer antes y después. La actualización del informe, configuración y aviso de Jesús se registra aparte; su hash final y la comprobación del push se entregan en la respuesta.

Se revisaron remoto, diff, índice y archivos excluidos. Se conserva el traslado de `admin-web` a `web`, sus dependencias y el trabajo previo. `edu-web` se retiró únicamente estando vacía. `edu-api` y `movil` siguen vacías y no se generaron sus estructuras. Las credenciales locales, bases y entornos no forman parte de los archivos preparados.

La comprobación del resultado del push y los hashes remotos se entrega en el mensaje final; no se presenta este archivo previo al push como prueba de subida.

Eliminación de la rama antigua HU01: se actualizaron las referencias con `git fetch --prune origin` y main mediante `git merge --ff-only origin/main`. Las puntas local y remota de `hu01-registrar-usuarios` coincidían en `d76bdc28e9a581a9771e1ea33438b328ebdff267`; ambas superaron `git merge-base --is-ancestor ... main` (salida 0), sobre main actualizado `1f227e5`. Se retiró únicamente esa rama con `git push origin --delete hu01-registrar-usuarios` y `git branch -d hu01-registrar-usuarios`, sin eliminación forzada. `git ls-remote origin refs/heads/hu01-registrar-usuarios` devolvió vacío y salida 0; solo quedan main y sus referencias remotas. El commit HU01 sigue siendo ancestro de main. No hubo trabajo adicional que integrar ni se borraron otras ramas.

## Dependencias imprescindibles para continuar

Las carpetas se volvieron a comprobar y siguen vacías. Se enviaron pasos concretos en una sola solicitud a Luis; todavía no hay confirmación. Se continuó con cliente React, contratos, pruebas simuladas y aviso para Jesús. Configuración completa: [PREPARAR_EDU_Y_MOVIL.md](PREPARAR_EDU_Y_MOVIL.md).

1. Luis crea y confirma `edu-api` Spring Boot/Maven, Java 21, paquete `pe.kusi.edu`, con web, validación, seguridad, JPA, PostgreSQL y Flyway. Después se implementarán los permisos por recurso, secciones y propuestas en `edu`; no se trasladan a Django.
2. Luis crea y confirma `movil` Kotlin/Compose, paquete `pe.kusi.movil`, para implementar y comprobar el acceso del estudiante de HU11.
3. **Prueba real de IA aplazada por Luis hasta configurar su API key**. La configuración IA permanece deshabilitada y sin proveedor/modelo elegidos. No se pide la credencial hoy ni se hacen llamadas. Después de confirmar `edu-api` se implementará el adaptador configurable y su simulación de pruebas sin esperar esa clave. Faltan además las configuraciones de comunicación local entre servicios, que se completarán con las estructuras. La inspección previa de disponibilidad queda como evidencia histórica, no como condición para detener el trabajo actual.

Contratos: [identidad, cuentas y catálogo](CONTRATOS_SERVICIOS.md), [secciones](HU06_REVISION.md), [propuestas IA](CONTRATO_PROPUESTAS_IA.md).

## Pendientes separados del código

El diseño final de ingreso, paneles y móvil sigue reservado a Luis; Rive y el cuy quedan fuera. La revisión humana del compañero, su fecha/referencia al commit y la aceptación académica del mecanismo de revisión en main siguen pendientes. No se asumieron las historias restantes de Jesús ni se inició el bloque del lunes.

Por instrucción actualizada se preparó [AVISO_JESUS_DOMINGO.md](AVISO_JESUS_DOMINGO.md), sin enviarlo. Incluye lo disponible, la IA aplazada, las cuatro historias de Jesús (HU05/HU07/HU15/HU08), contratos y dependencias reales. El aviso no afirma que HU11/HU06/HU18/HU16 estén terminadas ni que existan aún secciones/asignaciones persistidas. La ausencia de API key no impide preparar ese aviso ni avanzar en pruebas aisladas.
