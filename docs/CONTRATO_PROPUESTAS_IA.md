# HU18 / HU16 · Contrato preparado, implementación educativa pendiente

Fecha: 11 de octubre de 2026. Spring es propietario de solicitudes y propuestas en `edu`. Este documento no acredita generación real ni implementa HU19–HU25. Las carpetas `edu-api` y `movil` siguen reservadas a Luis.

## Solicitud · HU18 y HU16

Ruta propuesta para Spring: `POST /api/edu/propuestas/solicitudes/` desde el panel docente, mismo origen, cookie opaca y protección CSRF equivalente. Spring valida sesión con Django y después rol docente y asignación vigente al recurso. Nunca aceptar `docente_id`, roles o pertenencias afirmadas por el cliente. Un administrador sin rol docente no puede generar propuestas. Conocer el UUID de un curso o sección no concede acceso.

Datos: `{id_solicitud: UUID generado por cliente, curso_id: UUID, seccion_id: UUID del contexto autorizado si existe, tema: texto obligatorio, objetivo: texto opcional}`. El contexto disponible proviene del servidor: curso, primero de primaria, año/sección y asignación docente. El catálogo Django se referencia por UUID. La consulta del catálogo no acredita la selección de cursos asignados HU17 ni permite el acceso a recursos ajenos.

El identificador de solicitud permite reintentar sin duplicar ni cobrar dos llamadas por una respuesta perdida. Misma cuenta/identificador y mismo contenido devuelve la solicitud existente; contenido diferente con el mismo identificador devuelve 409. Persistir entrada y estado antes de llamar al proveedor. Evitar mantener una transacción PostgreSQL abierta durante la llamada HTTP. La condición concurrente se resuelve con unicidad y una transición de estado atómica, no solo en React.

Tema vacío se rechaza con 400; objetivo vacío o ausente se guarda como ausente. Si se aportó un objetivo, conservar exactamente su origen docente. Si falta, una IA real debe sugerir uno y marcar `origen_objetivo: "ia"`; mostrarlo como «Objetivo sugerido por IA, pendiente de revisión». No presentar una sugerencia como texto escrito o aprobado por el docente. Cuando se aporta, usar `origen_objetivo: "docente"`.

## Resultado y trazabilidad

Una respuesta de generación válida conserva: UUID de solicitud y propuesta, docente autenticado, UUID de curso/contexto, entrada original, fechas, proveedor/modelo realmente usado, resultado validado, objetivo y su origen. El resultado contiene `historia`, `acciones`, `reglas`, `retos` y `ayudas`, además del objetivo. Validar estructura, tipos, contenido requerido y límites antes de marcarla generada. Un texto vacío, JSON inválido o respuesta truncada no cuenta como generación correcta.

Estado de generación: `pendiente`, `generando`, `generada` o `fallida`. La propuesta generada queda pendiente de revisión, sin aprobación ni publicación automática. No implementar aprobación, rechazo, versiones de observaciones/edición ni juegos 3D en este bloque. Una respuesta estructuralmente válida requiere igualmente revisión pedagógica.

## Fallos y comprobaciones pendientes

- 401 sesión inválida; 403 rol o recurso ajeno; 400 entrada inválida; 409 solicitud incompatible; 502 respuesta inválida del proveedor; 503 integración no configurada; 504 timeout.
- Conservar entrada y solicitud fallida; React conserva curso/contexto, tema y objetivo para reintentar. No reintentar automáticamente una llamada que pueda haber generado un resultado. Consultar primero la solicitud por su identificador, validando propietario.
- No enviar datos personales de estudiantes al proveedor. No incluir la clave en React, respuestas, historial, logs ni commits. Registrar metadatos y resultado necesarios para revisión, sin cabeceras de autorización.
- Pruebas simuladas se identificarán como tales. La prueba real debe registrar proveedor/modelo, solicitud ficticia, respuesta validada, objetivo docente conservado y objetivo omitido sugerido; además fallos, persistencia, reintento e intentos de otro docente.

Se revisaron nombres de variables de entorno de proceso, usuario y máquina y archivos `.env` disponibles en el repositorio y documentación sin imprimir valores. No se encontró una configuración utilizable de proveedor/modelo/credencial. Tampoco se encontraron `ollama`/`lms` en PATH; las consultas a sus puertos locales habituales, repetidas fuera del aislamiento, recibieron conexión rechazada. No se concluye que no exista una configuración en otra ubicación. **Falta confirmar `edu-api`, indicar el proveedor/modelo disponible y configurar su credencial localmente.** La configuración solicitada está reunida en [PREPARAR_EDU_Y_MOVIL.md](PREPARAR_EDU_Y_MOVIL.md). No se contrató un servicio, no se activaron gastos y no se ejecutó generación IA. HU18 y HU16 permanecen bloqueadas.
