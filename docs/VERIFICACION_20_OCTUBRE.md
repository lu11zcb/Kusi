# Verificación del avance · 20 de octubre de 2026

lui11zcb · luiscb.once@gmail.com.

## Resultado técnico

| Componente | Comprobación | Resultado y límite |
|---|---|---|
| Django | Runner con `kusi_admin.settings_pruebas`, PostgreSQL de pruebas creado y eliminado. | 88/88, sin problemas del sistema. No modifica las cuentas de la base local del proyecto. |
| Spring | Maven/JUnit, incluida la entrega `64f765b` y la corrección del formato de IA. | 66/66, sin fallos ni omisiones. H2 y transportes simulados donde corresponde; no sustituye PostgreSQL/Django reales. |
| Web | Pruebas Node, compilación y lint. | 48/48, build/lint correctos. |
| Administrador | Navegador aislado, APIs interceptadas con datos sintéticos. | 15 capturas en 390/1440/1840 px. Registro por rol, DNI, fichas, vínculo/asignación, edición, contraseña temporal, cursos y secciones; sin errores de página/desbordamiento. |
| Docente | Navegador aislado, APIs interceptadas con datos sintéticos. | 17 capturas en 390/1440/1840 px. Creación, objetivo exacto, borrador/filtros, revisión, versiones, decisiones, errores/vacíos, CSRF y bloqueo de navegación; sin errores de página/desbordamiento. |
| Android | APK debug, APK de pruebas, unitarias y Kotlin de producción. | Compilación correcta. 4 unitarias aprobadas y 2 integraciones reales omitidas por configuración. |
| Interfaz Android | Comprobación nativa previa de este mismo código: claro, oscuro, letra 1,3/animaciones desactivadas, horizontal y tablet. | 14 casos aprobados, 39 capturas; además 7 capturas del recorrido debug real hasta WebView/cierre y giro. Se conserva evidencia porque el código móvil no cambió durante esta publicación. |
| Juego existente | Playwright y compilación. | 6/6 y build correcto. No acredita HU46 terminada ni arregla la validación completa pendiente. |
| Groq real | Adaptador compilado `GeneradorGroq`, tema ficticio «Sumas hasta diez», modelo configurado y validador de Kusi. | Respuesta válida después de la corrección. Sin nombres de niños, cuenta ni escritura en base. No prueba aprobación persistida ni paquete jugable. |

## Fallo real encontrado y corregido

La prueba real de Groq entregó `historia` como lista de frases. El contrato y `ValidadorPropuesta` exigen un texto; la generación podía fallar aunque el JSON fuera sintácticamente correcto. Se conserva el caso de diagnóstico en la evidencia local.

El adaptador solicita ahora un esquema estricto con historia/objetivo de texto y las listas de acciones/reglas/retos/ayudas/recursos para los modelos GPT-OSS compatibles. Otros modelos conservan el modo JSON anterior. El prompt aclara el tipo de historia y el validador local sigue siendo obligatorio. Se agregan dos regresiones: contrato HTTP esperado y rechazo local de una historia con tipo incorrecto. No se convierte silenciosamente una respuesta inválida ni se añade un éxito ficticio. Referencia: [salidas estructuradas de Groq](https://console.groq.com/docs/structured-outputs).

La llamada real repetida produjo una propuesta válida para el tema de prueba. [Evidencia de respaldo](evidencias/20-octubre/propuesta-ia-real.json). Es una comprobación del proveedor y formato, no una evaluación educativa. El servidor local se recarga para usar la corrección.

## Entrega y límites

El diseño está integrado en `web/` y `movil/`, con guías vigentes y recursos/licencias incluidos. Se conserva la autoría histórica; los commits nuevos usan `lui11zcb <luiscb.once@gmail.com>`. No se publican claves, bases, entornos, cachés ni resultados de compilación. El APK se genera desde el código; sus rutas de descarga local se indican en `movil/README.md`.

El procesamiento nuevo de Jesús usa un paquete estático y una validación mínima. El catálogo completo, procedencia educativa, verificadores completos y biblioteca/eventos móviles siguen pendientes. También permanecen los casos ya detectados del reproductor con opciones/productos no disponibles y cantidades monetarias no compatibles; las pruebas habituales no cubren su aceptación. HU46 conserva el viernes 23. El burndown se omite por instrucción de Luis.

No se certifican accesibilidad completa, usabilidad con personas, rendimiento/voz/háptica en un teléfono físico, eficacia educativa ni cierre de Sprint 2. El [avance](AVANCE_20_OCTUBRE.md) distingue lo implementado, las simulaciones y la prueba real del proveedor.
