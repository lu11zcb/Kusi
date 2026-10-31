# Panel docente · HU27, HU33 y HU30

Implementación preparada para revisión, exclusivamente dentro de `web/`. No se hizo commit ni push, no se añadieron dependencias y no se modificaron `edu-api/` ni `juego/`.

## Recorrido del docente

1. La revisión muestra la regla elegida: **Seguir el orden (patrones)** o **Solo una clase (clasificar)**. También se muestra al consultar versiones anteriores.
2. Una propuesta aprobada ofrece el botón grande **Generar juego**. Primero registra la generación de esa versión y después inicia su procesamiento. Solo se impide repetir el envío; el docente puede seguir leyendo, consultar el historial y salir de la pantalla.
3. Debajo aparece una línea vertical de pasos con icono, estado, mensaje y reloj en segundos:
   - Solicitud registrada.
   - La IA escribe el juego.
   - Kusi revisa que se pueda jugar.
   - La IA corrige lo que faltaba, cuando hay correcciones.
   - Se usan los caminos de respaldo, si corresponde.
4. El seguimiento consulta el GET cada dos segundos, después de terminar la consulta anterior para evitar solapamientos. Se detiene cuando la generación queda `lista` o `fallida`, al cambiar de juego y al salir. Un fallo temporal de consulta muestra su mensaje y permite seguir consultando. La respuesta del POST largo no puede hacer retroceder un estado terminal confirmado.
5. Las comprobaciones fallidas conservan su lista de problemas en **Lo que Kusi encontró y se corrigió**. Mientras el resultado no esté listo, se aclara que la corrección todavía no está confirmada. Se conservan los problemas de cada intento y los avisos de problemas adicionales truncados por Spring.
6. Si termina fallida, se muestra `ultimo_error` y el botón **Intentar de nuevo**, que crea otra generación desde la propuesta vigente aprobada. Si una operación interrumpida dejó una generación pendiente, **Continuar generación guardada** permite procesar ese mismo registro, sin crear otro ni repetir automáticamente el POST.
7. Si está lista, **Cómo se hizo este juego** muestra proveedor, modelo, intentos y si se usaron mapas de respaldo. Si Spring no registró procedencia, se indica sin inventar datos.
8. Aparece el iframe grande de proporción 16:9. Tras el saludo `listo` del juego se envía el paquete original como texto JSON; el aviso `cargado` muestra **Listo para jugar: N niveles**. Un aviso `error` muestra su motivo. **Volver a empezar** envía `reiniciar`.
9. Al volver a abrir la solicitud se consulta su historial, se selecciona la última generación y se recupera el detalle con sus etapas. Se muestran los cinco juegos más recientes y una opción para ver todos los anteriores, incluidos los que necesitaron correcciones.

## Integración y accesibilidad

- El servicio nuevo usa las cuatro rutas de generación existentes. Valida identificadores, versiones, estados, etapas, fechas, procedencia, correspondencia de la respuesta y el sobre JSON del paquete listo. HU31 sigue siendo responsable de comprobar el juego.
- Se admite la etapa `solicitud`, que `GeneracionesService` guarda al crear el registro, además de las cuatro etapas del proceso de IA.
- `enviar()` usa `/api/edu/acceso/csrf/` y `X-XSRF-TOKEN` para Spring. Las rutas de Django conservan `/api/acceso/sesion/` y `X-CSRFToken`. No se reintentan POST automáticamente ni se establece un timeout corto para el procesamiento.
- La vista previa usa `import.meta.env.VITE_URL_JUEGO` o `http://127.0.0.1:5174/`. Conserva la ruta y otros parámetros configurados y fija `paquete=mensaje`.
- Los mensajes entrantes requieren tanto el origen exacto del juego como `event.source === iframe.contentWindow`. El paquete y el reinicio se envían al origen exacto, sin `*`.
- Las etapas viven en una región `aria-live="polite"`. Los relojes no producen anuncios cada segundo. Se reutilizan `IconoDocente`, `MensajeDocente`, los estilos de botones y el foco visible del panel. El historial indica el juego seleccionado con `aria-pressed`.
- El ejemplo del tema ahora dice **Por ejemplo: patrones con frutas**.

## Archivos nuevos

| Archivo | Contenido |
| --- | --- |
| `src/servicios/generaciones.ts` | Tipos, validación, etiquetas docentes, generar, procesar, consultar, listar y seguimiento cancelable. |
| `src/docente/GeneracionPropuesta.tsx` | Inicio del proceso, recuperación de la última generación, consultas, historial, reintentos y continuación de pendientes. |
| `src/docente/DetalleGeneracion.tsx` | Línea de pasos, relojes, problemas, error final y procedencia. |
| `src/docente/VistaPreviaJuego.tsx` | Iframe, escucha temprana de mensajes, entrega del paquete, estado del juego y reinicio. |
| `src/docente/utilidadesGeneracion.ts` | Agrupación de eventos por intento, extracción de problemas, etiquetas de regla, tiempos y protocolo del iframe. |
| `tests/fixtures-generaciones.mjs` | Respuestas simuladas de generaciones y etapas. |
| `tests/generaciones.test.mjs` | Validación del servicio, rutas, CSRF, etiquetas, POST largo, consultas periódicas, cancelación y errores transitorios. |
| `tests/vista-generacion.test.mjs` | Marcado renderizado, pasos, problemas, procedencia, tiempos, dirección y rechazo de mensajes de ventanas u orígenes ajenos. |
| `INFORME-HU27-HU33-HU30.md` | Este informe y el recorrido de revisión manual. |

## Archivos modificados

| Archivo | Cambio |
| --- | --- |
| `src/docente/PanelDocente.tsx` | Comunica si la sección Crear propuesta está visible para detener el seguimiento al salir. |
| `src/docente/MisPropuestas.tsx` | Comunica la visibilidad de Mis propuestas a la revisión, conservando su estado. |
| `src/docente/RevisionPropuesta.tsx` | Desmonta el seguimiento y el iframe al ocultarse la sección y los recupera al volver. Integra la generación y muestra la regla en la revisión y sus versiones anteriores. Actualiza la nota de la propuesta aprobada. |
| `src/docente/SolicitarPropuesta.tsx` | Sustituye el ejemplo antiguo del tema por patrones con frutas. |
| `src/docente/docente.css` | Añade estilos para el bloque de generación, línea de pasos, historial, procedencia e iframe; ajustes para pantallas pequeñas. |
| `src/servicios/http.ts` | Selecciona y valida el CSRF correspondiente a Spring o Django dentro de `enviar()`. |
| `src/servicios/propuestas.ts` | Añade y valida `regla_juego`, conservando compatibilidad con propuestas anteriores sin esa propiedad. |
| `tests/revision-propuesta.test.mjs` | Comprueba las etiquetas de la regla y que Generar juego solo se ofrece a propuestas aprobadas. |

## Comprobaciones

| Comprobación | Resultado |
| --- | --- |
| `git status` y `git log -5` iniciales | Revisados. Rama `main`; último commit `25a595e`. Solo estaba sin seguimiento el archivo de Gradle ajeno a esta tarea. |
| `npm test` | **75 pruebas pasan**, cero fallos y cero omitidas; 27 pruebas añadidas a las 48 existentes. |
| `npm run lint` | **Pasa**, sin errores. |
| `npm run build` | **Pasa**, incluye TypeScript y compilación Vite. |
| `git diff --check` | **Pasa**, sin errores de espacios. |
| Revisión visual en navegador | Chrome accede al servidor activo en 5173. Se diagnosticó una pantalla vacía por `504 Outdated Optimize Dep` de Rive; al recargar la configuración de Vite se regeneró su caché y apareció el ingreso. Con la cuenta docente autorizada se probaron generación real, correcciones, fallo, reintento, historial, procedencia, vista previa y reinicio. Una recarga completa recuperó el juego listo y sus etapas. |
| Cambios en backend y juego | Ninguno. Solo se leyeron sus contratos existentes. |
| Índice de Git | Preparados únicamente los 17 archivos de `web/` enumerados arriba. El archivo de Gradle permanece sin seguimiento y fuera del índice. |
| Commit y push | No realizados, conforme a la instrucción de revisión previa. |

Las pruebas automatizadas de servicio y protocolo usan respuestas simuladas y renderizado de componentes. La comprobación adicional en Chrome sí usó Django, Spring, la IA configurada y el juego reales. Se crearon dos generaciones en la solicitud aprobada existente, sin modificar la propuesta, el backend ni los archivos del juego. No se guardaron credenciales en archivos.

## Revisión adicional · 26 de octubre de 2026

- Se volvieron a ejecutar las pruebas, lint y build. Tras el ajuste de navegación pasan **75 pruebas**, lint y build.
- La revisión de la navegación detectó que las secciones ocultas con `hidden` conservaban el seguimiento montado y seguían consultando. Se corrigió en ambas entradas a la revisión: Crear propuesta y Mis propuestas. Al salir se desmonta únicamente el bloque de generación, que cancela los GET y libera el iframe. Al volver se consulta de nuevo el historial y el último detalle. Los borradores de la propuesta se conservan.
- Se añadió una prueba de regresión que comprueba que una revisión oculta conserva su contenido sin montar el bloque de seguimiento. La prueba existente de cancelación verifica que se abortan y descartan los GET tardíos.
- Chrome inicialmente mostraba la pantalla vacía. Su consola permitió localizar un error de caché de dependencias de Vite (`504 Outdated Optimize Dep` al cargar Rive). Se actualizó solo la fecha de modificación de `vite.config.ts`, sin cambiar su contenido; Vite recargó la configuración y el ingreso volvió a mostrarse.
- El ingreso inicial con la cuenta administrativa no permitía probar las funciones docentes. Con la cuenta docente facilitada después por el usuario se continuó y completó el recorrido descrito abajo.

## Comprobación real en Chrome · 26 de octubre de 2026

Solicitud existente: `2801bd97-8fe3-474d-8bad-6380eee19bf6`, tema «patron de colores», versión 1 aprobada, regla «Seguir el orden (patrones)».

| Caso | Resultado observado |
| --- | --- |
| Generar desde una propuesta aprobada | La creación respondió correctamente y comenzó el POST largo sin bloquear el menú. Las etapas y los relojes se actualizaron. |
| Comprobaciones y correcciones HU33 | Se mostraron los problemas reales de HU31 y los dos intentos de corrección de la IA, con sus mensajes y tiempos. |
| Salir durante el procesamiento | Se cambió a Inicio y se limpió el registro de red. Tras siete segundos no hubo consultas nuevas. El procesamiento de Spring continuó. |
| Volver a la revisión | Se recuperaron historial y detalle mediante GET; no se repitió el POST de procesamiento. |
| Primera generación fallida | `fa6d43f3-b2e0-46a8-9001-2eb722f49d85`, finalizó en 44 segundos. Spring rechazó los tres guiones y después los mapas de respaldo por `SECUENCIA_LARGO` y `SECUENCIA_NO_PATRON`. El panel mostró `ultimo_error` y **Intentar de nuevo**. |
| Reintento | Creó otra generación (`201 Created`), distinta de la primera, e inició un solo POST `procesar/`, cuya respuesta final fue `200 OK`. |
| Historial durante el nuevo procesamiento | Se abrió la primera generación para leer sus errores mientras seguía la segunda. El panel señaló que había una generación en curso. |
| Segunda generación lista | `9771fa90-e43b-4352-9ae1-0f96ad791136`, terminó en 54 segundos, tras tres pedidos a la IA, dos correcciones y mapas de respaldo. HU31 confirmó que el resultado final pasaba las comprobaciones. |
| Procedencia HU30 | Se mostraron el proveedor configurado, modelo `Qwen/Qwen3.6-35B-A3B-FP8`, **3 intentos** y **Sí, se usaron los caminos de respaldo**. |
| Vista previa del resultado real | El iframe cargó el paquete guardado y mostró **Listo para jugar: 3 niveles**. Se comprobó movimiento del cuy con la flecha derecha dentro del iframe. |
| Reiniciar el resultado real | **Volver a empezar** volvió a cargar el primer nivel y se recibió de nuevo el aviso de juego listo. |
| Recuperación tras recargar toda la página | El ingreso se conservó. Al abrir la solicitud se seleccionó automáticamente la segunda generación lista y siguió disponible la primera fallida. Al mostrar el iframe volvió a aparecer **Listo para jugar: 3 niveles**. |
| Error del iframe | En una página temporal de QA con el mismo componente real se envió un paquete incompatible: el panel mostró el motivo devuelto por el juego y deshabilitó el reinicio. |
| Paquete de ejemplo y reinicio | La misma página temporal cargó los tres niveles del ejemplo local; se recogieron dos alimentos con el teclado y el reinicio restauró el inicio y los alimentos. La página y su módulo temporal se eliminaron al terminar y quedaron fuera del índice. |
| Presentación y foco | Se inspeccionaron visualmente etapas, mensajes, procedencia e iframe; el botón de reinicio mostró contorno visible al recibir foco. |

El primer fallo provino de los guiones y las comprobaciones de Spring; se conserva para revisión en el historial. La segunda generación terminó lista y permitió comprobar el recorrido completo del panel. No se cambiaron prompts, validadores ni mapas del backend.

## Límites de esta revisión

- No se completaron las partidas de los tres niveles ni se hizo una auditoría pedagógica de sus consignas.
- No se probó con un lector de pantalla ni con un dispositivo móvil físico; las regiones accesibles y la validación de origen y ventana de los mensajes están cubiertas por las pruebas automatizadas.
- No se provocaron fallos artificiales de la IA ni se modificó el almacenamiento de Spring para fabricar estados. Los estados fallido, corrección, respaldo y listo fueron resultados reales.
- La generación guardada pendiente y el caso sin mapas de respaldo conservan su cobertura automatizada; no se observaron en este recorrido real.
