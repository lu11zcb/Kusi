# HU18 / HU16 · Cliente y backend Spring implementados; prueba real de IA pendiente

**Actualización 13 de octubre de 2026.** El backend Spring de este contrato ya está implementado en `edu-api`: migración `V2__solicitudes_propuestas.sql` (tablas `solicitudes_propuesta` y `propuestas` en `edu`), `PropuestasController` (`/api/edu/...`), `PropuestasService`, CSRF propio `CsrfEducativo` (cookie `kusi_edu_csrf` SameSite=Strict + cabecera `X-XSRF-TOKEN`), `ValidadorPropuesta` y la interfaz `GeneradorPropuestas`. Sin proveedor configurado se usa `GeneradorNoConfigurado`: la solicitud queda `pendiente`, sin contenido ficticio, y `/reintentar/` responde 503. Pruebas: `PropuestasSimuladasTest`, 9 casos **SIMULADOS** (Django e IA dobles de prueba; persistencia H2/Flyway) que cubren CSRF, pendiente sin IA, idempotencia/409, entradas inválidas, rol y recurso ajeno, objetivo docente exacto, objetivo sugerido por IA, respuesta incompleta → fallida → reintento, timeout 504, propiedad y asignación retirada. Falta: adaptador real del proveedor (Luis elige proveedor/modelo y configura la clave), prueba real de IA y recorrido conjunto con PostgreSQL. Lo que sigue conserva el contrato original; sus frases sobre «Spring pendiente» quedan superadas por esta nota.

Fecha: 11 de octubre de 2026. Spring es propietario de solicitudes y propuestas en `edu`. Este documento no acredita generación real ni implementa HU19–HU25. Las carpetas `edu-api` y `movil` siguen reservadas a Luis.

**Prueba real de IA aplazada por Luis hasta configurar su API key**. No se solicita la clave ni se hacen llamadas al proveedor en este bloque. Su ausencia no bloquea implementación ni pruebas simuladas. El proveedor, modelo y protocolo no están elegidos; no se fija ninguno por defecto. La dependencia que impide implementar ahora el backend es la estructura inicial de `edu-api`, todavía vacía y sin confirmación de Luis.

El cliente React y sus 15 pruebas nuevas están implementados. Todas las respuestas educativas/IA de esas pruebas son simuladas, identificadas en el archivo y en cada nombre de prueba. No existe una respuesta ficticia de IA en producto. La persistencia descrita a continuación pertenece a Spring y sigue pendiente.

## Solicitud · HU18 y HU16

Ruta propuesta para Spring: `POST /api/edu/propuestas/solicitudes/` desde el panel docente, mismo origen, cookie opaca y protección CSRF equivalente. Spring valida sesión con Django y después rol docente y asignación vigente al recurso. Nunca aceptar `docente_id`, roles o pertenencias afirmadas por el cliente. Un administrador sin rol docente no puede generar propuestas. Conocer el UUID de un curso o sección no concede acceso.

Datos: `{id_solicitud: UUID generado por cliente, curso_id: UUID, seccion_id: UUID o null, tema: texto obligatorio de hasta 2000 caracteres, objetivo: texto de hasta 4000 caracteres o null}`. El tema se guarda sin espacios exteriores; el objetivo docente conserva exactamente su texto, incluidos espacios/saltos de línea. Un objetivo solo de espacios se considera ausente. El contexto disponible proviene del servidor: curso, primero de primaria, año/sección y asignación docente. El catálogo Django se referencia por UUID. La consulta del catálogo no acredita la selección de cursos asignados HU17 ni permite el acceso a recursos ajenos.

El identificador de solicitud permite reintentar sin duplicar ni cobrar dos llamadas por una respuesta perdida. Misma cuenta/identificador y mismo contenido devuelve la solicitud existente; contenido diferente con el mismo identificador devuelve 409. Persistir entrada y estado antes de llamar al proveedor. Evitar mantener una transacción PostgreSQL abierta durante la llamada HTTP. La condición concurrente se resuelve con unicidad y una transición de estado atómica, no solo en React.

Tema vacío se rechaza con 400; objetivo vacío o ausente se guarda como ausente. Si se aportó un objetivo, conservar exactamente su origen docente. Si falta, una IA real debe sugerir uno y marcar `origen_objetivo: "ia"`; mostrarlo como «Objetivo sugerido por IA, pendiente de revisión». No presentar una sugerencia como texto escrito o aprobado por el docente. Cuando se aporta, usar `origen_objetivo: "docente"`.

## Rutas consumidas por React y pendientes en Spring

Vite remite `/api/edu` a Spring local en 8080, antes de la regla general `/api` hacia Django. No se ha desplegado ese servicio. Todas las rutas de solicitudes/contexto requieren sesión vigente, contraseña definitiva, rol docente y autorización actual del recurso y propietario. Las escrituras exigen CSRF propio de Spring, sin desactivar la protección de navegador.

| Ruta | Método / resultado |
|---|---|
| `/api/edu/acceso/csrf/` | GET `{csrf_token}`; token Spring actual, cookie y `X-XSRF-TOKEN` en la escritura siguiente. No reutilizar el token Django. |
| `/api/edu/contexto/propuestas/` | GET `{contextos, ia_configurada: boolean}`; solo contextos autorizados. La falta de credencial IA no impide consultar contexto. |
| `/api/edu/propuestas/solicitudes/` | POST con la entrada anterior. Persistirla antes de generar; 201 `{solicitud}` cuando se guarda. Sin configuración IA, devolver una solicitud `pendiente`, sin propuesta ni contenido ficticio. |
| `/api/edu/propuestas/solicitudes/{id}/` | GET `{solicitud}` por propietario; 404 si no existe. Debe comprobar el recurso actual además de la propiedad. |
| `/api/edu/propuestas/solicitudes/{id}/reintentar/` | POST `{}` por acción explícita; revalida permisos y reutiliza la entrada persistida. No toma otra entrada ni crea otra solicitud. Una pendiente sin configuración sigue guardada y comunica 503 IA pendiente. |

Contexto: `{curso_id, curso_nombre, grado: 1, seccion_id: UUID o null, seccion_nombre: texto o null, anio_escolar: entero de cuatro cifras o null}`. Si no hay sección, ambos datos asociados son null. La lista vacía no concede permisos. HU08 de Jesús es la administración de asignaciones; las pruebas pueden insertar asignaciones ficticias sin implementar ese flujo ni dar acceso general en producto.

Solicitud: `{id_solicitud, curso_id, seccion_id, tema, objetivo_docente: texto o null, estado, propuesta: objeto o null}`. Propuesta: `{id, objetivo, origen_objetivo, historia, acciones: texto[], reglas: texto[], retos: texto[], ayudas: texto[]}`. Objetivo hasta 4000 caracteres; historia hasta 10000; listas de 1 a 20 elementos no vacíos de hasta 2000 caracteres. Spring valida también estos límites; un objetivo docente no se sustituye por el del proveedor. `generada` exige resultado completo; los otros estados llevan propuesta null.

Un fallo de generación puede responder 502/504 después de persistir la solicitud fallida. El cliente conserva la entrada y el UUID; al siguiente intento humano primero hace GET. Si ya está generada o generando, muestra ese estado sin otro POST. Si está pendiente/fallida, usa `/reintentar/`. Solo un 404 permite reenviar el POST inicial con el mismo UUID. Un error de consulta, 401/403 o respuesta incompatible nunca provoca otra escritura automática. Cambiar los datos crea otro UUID; no sustituye una solicitud guardada. La unicidad/transición atómica del servidor sigue siendo imprescindible aunque el cliente bloquee envíos simultáneos.

## Resultado y trazabilidad

Una respuesta de generación válida conserva: UUID de solicitud y propuesta, docente autenticado, UUID de curso/contexto, entrada original, fechas, proveedor/modelo realmente usado, resultado validado, objetivo y su origen. El resultado contiene `historia`, `acciones`, `reglas`, `retos` y `ayudas`, además del objetivo. Validar estructura, tipos, contenido requerido y límites antes de marcarla generada. Un texto vacío, JSON inválido o respuesta truncada no cuenta como generación correcta.

Estado de generación: `pendiente`, `generando`, `generada` o `fallida`. La propuesta generada queda pendiente de revisión, sin aprobación ni publicación automática. No implementar aprobación, rechazo, versiones de observaciones/edición ni juegos 3D en este bloque. Una respuesta estructuralmente válida requiere igualmente revisión pedagógica.

## Fallos y comprobaciones pendientes

- 401 sesión inválida; 403 rol o recurso ajeno; 400 entrada inválida; 409 solicitud incompatible; 502 respuesta inválida del proveedor; 503 integración no configurada; 504 timeout.
- Conservar entrada y solicitud fallida; React conserva curso/contexto, tema y objetivo para reintentar. No reintentar automáticamente una llamada que pueda haber generado un resultado. Consultar primero la solicitud por su identificador, validando propietario.
- No enviar datos personales de estudiantes al proveedor. No incluir la clave en React, respuestas, historial, logs ni commits. Registrar metadatos y resultado necesarios para revisión, sin cabeceras de autorización.
- Pruebas simuladas se identificarán como tales. La prueba real debe registrar proveedor/modelo, solicitud ficticia, respuesta validada, objetivo docente conservado y objetivo omitido sugerido; además fallos, persistencia, reintento e intentos de otro docente.

La inspección previa no encontró una configuración utilizable de proveedor/modelo/credencial. Después del aplazamiento no se repitieron consultas a proveedores, ni siquiera de disponibilidad. La conexión futura debe quedar deshabilitada por defecto y separar configuración (proveedor/modelo/URL/credencial), transporte y validación del resultado; la ausencia de configuración conserva la solicitud pendiente. No se ha implementado todavía ese adaptador Spring: falta confirmar su estructura. La configuración inicial está reunida en [PREPARAR_EDU_Y_MOVIL.md](PREPARAR_EDU_Y_MOVIL.md).

Pruebas Node ejecutadas: 15 nuevas simuladas (30 totales) aprobadas, incluyendo entradas inválidas, objetivo docente/IA, resultados incompletos, estados incompatibles, permisos, CSRF, fallo de red, recuperación sin duplicar, consulta fallida sin escritura, reenvío tras 404, UUID nuevo por cambio y envíos simultáneos. No prueban PostgreSQL educativo ni un proveedor real. Las comprobaciones de persistencia, concurrencia real, asignaciones y permisos Spring se harán tras confirmar la estructura. No se contrataron servicios, activaron gastos ni ejecutaron generaciones. HU18/HU16 no están completamente implementadas ni comprobadas.
