# Revisión automática de la interfaz provisional

Fecha: 11 de octubre de 2026.

El bloque inicial conserva la revisión previa de HU01 y HU11. La actualización del panel docente se documenta por separado al final; en esa extensión sí se añaden estilos para `textarea`.

La revisión corresponde a una extensión del frontend web existente con pantallas sencillas y **provisionales**, según lo solicitado. No sustituye el diseño final del usuario ni constituye aprobación visual o revisión humana. No se cambia el mundo visual, no se modifica CSS y no se generan `DESIGN.md`, tokens ni otros archivos de diseño.

## Correcciones verificadas

- **HU01:** la navegación administrativa, el cierre de sesión y el cambio de panel quedan bloqueados durante el envío del registro y mientras permanece abierta su confirmación. El bloqueo se libera ante un error o al cerrar expresamente la confirmación.
- **HU11:** un fallo al cerrar sesión durante el cambio obligatorio de contraseña se muestra mediante un mensaje visible de `App` con `role="alert"`.

El revisor automático de cierre emitió disposición `ship` únicamente para estas dos correcciones. La evaluación estática previa del resto de la interfaz no señaló problemas materiales; no se realizó una nueva revisión integral.

## Evidencia y validación

- [Escritorio](../.impeccable/review/desktop.png): formulario provisional de secciones completo.
- [Móvil](../.impeccable/review/mobile.png): parte superior del mismo formulario. En un viewport de 390 px, `clientWidth` y `scrollWidth` fueron 375 px, sin desbordamiento horizontal en esa comprobación. La captura no demuestra la revisión de toda la página móvil.
- [Error de cierre de sesión](../.impeccable/review/salida-temporal.png): mensaje durante el cambio obligatorio de contraseña.
- Una ejecución de `detect --json` devolvió `[]`. Validaciones registradas: 56 pruebas de backend, 15 de cliente, build y lint aprobados; no se repitieron para este informe.

Se conserva el sistema CSS existente: tipografía `system-ui`, acento verde, foco visible y controles de formulario nativos. Este informe no acredita integración con Spring.

Quedan pendientes el diseño final y la revisión humana. Resultado: las dos correcciones funcionales revisadas quedan documentadas para continuar con la interfaz provisional.

## Actualización del panel docente: HU18 y cliente HU16

Fecha: 11 de octubre de 2026. Esta actualización amplía el panel docente existente con tema, objetivo opcional y un cliente de solicitudes educativas. El diseño final de la interfaz sigue reservado a Luis. El alcance es provisional y exclusivamente de frontend: las estructuras Spring/Kotlin permanecen vacías y reservadas a Luis; su persistencia e integración siguen pendientes. Este informe no acredita historias de backend terminadas, diseño final ni revisión humana.

**Prueba real de IA aplazada por Luis hasta configurar su API key**. Nunca se llamó al proveedor. La interfaz no contiene respuestas simuladas; las respuestas ficticias se limitan a las pruebas automatizadas identificadas como `SIMULADO`.

### Continuidad con el sistema existente

La extensión conserva la tipografía `system-ui`, el acento verde, el fondo claro, los controles nativos y la jerarquía sencilla del panel incumbente. El formulario mantiene el ancho máximo existente (36 rem), los controles de al menos 44 px de alto y el foco visible definido por CSS. No se introduce una dirección visual nueva ni se generan `PRODUCT.md`, `DESIGN.md`, tokens o archivos de diseño.

La ampliación de CSS incorpora `textarea` a la tipografía y al tratamiento compartido de los campos: ancho completo, borde, fondo, color y cursor de texto. Permite redimensionar verticalmente los campos y conserva los saltos de línea del objetivo al mostrarlo. Estos cambios pertenecen a esta actualización; la indicación anterior de CSS sin cambios corresponde solo a la revisión previa.

Fuentes inspeccionadas: [formulario docente](../web/src/docente/SolicitarPropuesta.tsx), [panel docente](../web/src/docente/PanelDocente.tsx), [cliente de solicitudes](../web/src/servicios/propuestas.ts), [estilos de componentes](../web/src/App.css), [estilos globales](../web/src/index.css) y [pruebas de propuestas](../web/tests/propuestas.test.mjs).

### Comportamiento y fidelidad de los datos

- El formulario agrupa los campos bajo la leyenda «Tema y objetivo», vincula cada etiqueta con su control y exige curso autorizado y tema. El objetivo es opcional y tiene ayuda asociada. Los errores usan `role="alert"`; carga, ausencia de cursos, configuración de IA y confirmaciones usan `role="status"`. El foco visible está definido en CSS; no se acredita una prueba interactiva de teclado.
- El cliente conserva exactamente el objetivo aportado por el docente, incluidos espacios y saltos de línea. Si solo contiene espacios, lo envía como ausente. Rechaza una respuesta que lo sustituya o atribuya su origen a la IA. El tema se valida y se envía sin espacios exteriores.
- Ante el servicio educativo ausente, se muestra el error real, se permite escribir tema y objetivo y se deshabilita el envío sin un curso autorizado. Recargar cursos conserva lo escrito mientras se permanece en el panel. Salir o cambiar de panel elimina los datos aún no guardados; esta retención en memoria no demuestra persistencia de servidor.
- Tras un resultado incierto, otra acción explícita consulta primero mediante `GET` con el mismo UUID. Un resultado ya generado o en generación evita otra escritura; un `404` permite reenviar con ese UUID. Si la consulta falla, no vuelve a escribir. No hay reintento automático y se bloquean envíos simultáneos. Cambiar los datos crea otra solicitud sin sustituir la anterior.
- La visualización provisional muestra identificador, estado y, si llega una propuesta válida, objetivo y su origen docente o IA. La visualización completa de HU20 no se implementa en esta actualización. Ninguna propuesta se aprueba, publica ni convierte automáticamente en juego.

### Evidencia comprobada y límites

El revisor fresco comprobó los siguientes pares de capturas del caso real de servicio educativo no disponible, con tema y objetivo retenidos después de volver a cargar cursos:

| Superficie | Capturas | Comprobación registrada |
| --- | --- | --- |
| Escritorio (1440 × 900) | [Superior](../.impeccable/review/desktop-propuestas.png) · [Inferior](../.impeccable/review/desktop-propuestas-inferior.png) | `clientWidth` y `scrollWidth`: 1425 px, sin desbordamiento horizontal. |
| Móvil (390 × 844) | [Superior](../.impeccable/review/mobile-propuestas.png) · [Inferior](../.impeccable/review/mobile-propuestas-inferior.png) | `clientWidth` y `scrollWidth`: 375 px, sin desbordamiento horizontal. |

Son capturas superiores e inferiores de cada superficie: la captura `fullPage` falló mediante CDP y ninguna imagen individual representa la página completa. Permiten revisar el estado visible de indisponibilidad y la retención de campos; no acreditan interacción por teclado, envío educativo exitoso, persistencia Spring ni generación real de IA.

Validaciones registradas al cierre de esta extensión, sin repetirlas para redactar el informe:

- Build y lint del frontend: código de salida 0.
- Pruebas Node: 30/30, compuestas por las 15 originales y 15 nuevas con respuestas de Spring e IA expresamente `SIMULADAS`. Validan el cliente y su recuperación ante fallos; no prueban un servicio educativo real.
- Django: 58/58 pruebas, `check` con código de salida 0 y sin migraciones nuevas. Estos resultados corresponden al backend administrativo existente.
- Una ejecución final de `detect --json` devolvió `[]`.

El revisor fresco emitió disposición `ship` en su cierre de cinco secciones (`persistence`, `fidelity`, `ceiling`, `material_fixes`, `keep`), sin arreglos materiales pendientes dentro de este alcance. La disposición cubre exclusivamente el cliente provisional y el estado real de disponibilidad ausente. Se conservan el sistema visual incumbente, el objetivo docente exacto, la recuperación explícita de solicitudes inciertas y las limitaciones de evidencia descritas. Permanecen pendientes la implementación e integración de Spring/Kotlin, su persistencia, la prueba real de IA, la visualización completa de HU20, el diseño final de Luis y la revisión humana.
