# Sprint 2: trabajo pendiente de Luis y Jesús

Actualizado: **23 de octubre de 2026** · lui11zcb · luiscb.once@gmail.com.

## Aclaración actual del 23: demo personal y juegos cartoon por escenas

Leer el [plan de demostración personal](PLAN_DEMO_PERSONAL_CARTOON.md) y la [dirección cartoon vigente](ARTE_CARTOON.md). Luis plantea una **demostración temporal en su propia computadora, iniciada por él antes de ir a clase y con su propia sesión de CLI**, no un servicio permanente que comparta una suscripción entre docentes. El recorrido propuesto es: propuesta aprobada → archivo de intercambio o cola → trabajador local Node que detecta trabajos sin consumir tokens de IA → CLI oficial de Codex o Claude que utiliza recursos existentes → candidato con pruebas y correcciones limitadas → previsualización en el panel. La aprobación de la versión jugable y su entrega autorizada a la app siguen como objetivo del recorrido completo, con el alcance de cada sprint conservado. Drive es una opción de transporte, no una integración ya construida; la herramienta y el puente concretos siguen por comprobar.

La dirección actual es **cartoon 2D por escenas**, conservando el cuy del niño aprobado y a Kusi guía como personajes distintos. A Luis le gustan las referencias de patrones y clasificación; todavía no se ha producido la primera pantalla ni elegido por ello una mecánica definitiva. El rechazo de la anatomía del paso 02 deja suspendidas las correcciones, vistas y animaciones de Pixelorama; las menciones inferiores al siguiente bloque de animación describen el acuerdo anterior.

Esta actualización es documental: **puente, generador real y conexión Android completa siguen pendientes**. No se instalaron herramientas, crearon agentes operativos ni contrataron API pagadas. Se mantiene HU26 con generación real N1 y HU28 con diferencias efectivas en acciones/reglas; no bastan textos, dibujos o cantidades distintos. HU32/HU34 y la revisión, publicación y asignación formal conservan Sprint 3. No se replanifican HU, responsables o puntos, no se acredita N3 y no se declara cerrado Sprint 2. La demo personal tampoco sustituye el objetivo final de intervención real de IA en la creación del juego.

Periodo formal: 14–27 de octubre; revisión prevista el 27. **12 HU / 25 puntos**: Luis **4 HU / 12 puntos** y Jesús **8 HU / 13 puntos**. Este reparto corresponde a la actualización documental del 19 y prevalece sobre las secciones del plan del 16 que todavía dicen 6 HU para cada uno. No se han reestimado puntos.

Este estado se apoya en el código local y en [la evidencia del avance del 20](AVANCE_20_OCTUBRE.md), con sus [verificaciones y límites](VERIFICACION_20_OCTUBRE.md). La lectura del 22 contrasta archivos; no incluye nuevas pruebas ni un pull, y no acredita cambios que puedan existir solo en la computadora o rama de Jesús. **Una base implementada no significa que la HU esté cerrada; tampoco significa que haya que volver a hacerla desde cero.**

## Luis — 4 HU / 12 puntos

| HU | Puntos | Base que existe | Lo que falta completar o demostrar |
|---|---:|---|---|
| HU26 · Generar juego desde propuesta aprobada | 3 | Propuesta textual real con Groq; reproductor y contrato de paquete de ejemplo; servicio que procesa un JSON estático. | Generador real del paquete compatible con el kit desde la propuesta vigente aprobada; guardar candidato/versión u error real y entregar sus datos de origen a Jesús. La imagen generada y el JSON estático no sustituyen esto. |
| HU28 · Dos comportamientos distintos | 3 | Prototipo del mercado y un caso de paquete. | Generar y ejecutar dos experiencias con diferencias efectivas en acciones/reglas dentro del kit, comprobadas en el reproductor. No basta cambiar título, dibujos o números; no se exige N3 para este sprint. |
| HU31 · Comprobaciones del juego | 3 | Validación mínima en Spring y validaciones/pruebas del reproductor. | Completar y ejecutar comprobaciones de carga, interacción, reglas y cierre, bloquear fallos críticos y emitir resultados con motivo/versión para HU33. Corregir los casos conocidos de productos/opciones inexistentes e importes que no permiten las denominaciones admitidas. No atribuir a esta HU toda la revisión independiente de contenido de HU32, prevista para Sprint 3. |
| HU46 · Controles y respuestas | 3 | Movimiento por toque/teclado, interacción y compra/vuelto en el mercado; seis pruebas de juego documentadas el 20. | Completar respuestas de aciertos/errores y controles según los casos reales, emitir los eventos acordados y comprobar el juego en computadora y Android. Integrar la nueva animación como parte del trabajo del personaje; no confundir un ciclo visual con toda la aceptación de HU46. Se había acordado retomar HU46 el viernes 23. |

Luis conserva además la producción del **diseño y código visual**, recursos, reproductor y significado de las reglas, ayudas y eventos. No se suman puntos nuevos por dibujos o animaciones. El acuerdo anterior de preparar y animar el cuy se conserva en el [plan histórico](PLAN_ANIMACION_CUY_NINO.md); quedó suspendido tras el rechazo visual. El siguiente trabajo propuesto es una primera pantalla cartoon de patrones con el cuy aprobado y pocas fichas, revisable antes de ampliar el kit. [Plan actual](PLAN_DEMO_PERSONAL_CARTOON.md). Esto actualiza el siguiente paso visual, sin cambiar los criterios funcionales ni los puntos de las HU.

## Jesús — 8 HU / 13 puntos

| HU | Puntos | Base que existe | Lo que falta completar o demostrar |
|---|---:|---|---|
| HU27 · Estados y etapas de generación | 2 | Solicitudes desde propuesta aprobada, guardado/consulta de estados y etapas, historial y permisos en Spring; procesamiento del paquete estático integrado. | Conectar estados y errores al panel y al generador real de HU26/verificadores, conservando consultas/permisos; ensayar el recorrido real. No mostrar «generado/comprobado» por haber procesado solo un ejemplo. |
| HU29 · Catálogo mínimo de recursos 2D | 2 | PNG y referencias disponibles; endpoint que procesa el paquete de ejemplo. | Registro, identificadores/versiones, consulta y entrega del catálogo mínimo compatible con los dos casos. El endpoint de procesamiento no demuestra un catálogo completo. Luis aporta dibujos/animaciones y compatibilidad. |
| HU30 · Procedencia | 1 | Referencias y manifiesto de la exploración visual; no equivalen al flujo persistido de generación educativa. | Guardar y consultar por generación/versión qué produjo la IA, qué se reutilizó y qué corrigió una persona, usando datos reales que entrega Luis. No inventar origen ni registrar recursos faltantes como disponibles. |
| HU33 · Resultados de comprobaciones | 1 | Infraestructura de consulta de solicitudes/etapas, error general y pantallas del docente. | Registrar, consultar y mostrar los resultados concretos de HU31, con estado, motivo y versión correspondientes. Un estado de procesamiento o validación mínima no es el informe completo de comprobación del juego. |
| HU47 · Orientación y consigna/audio | 2 | Pantallas Android de misión/orientación, TextToSpeech y recorrido de presentación debug. | Conectar meta, reto, siguiente acción y audio de la consigna con el paquete autorizado real y comprobarlos al abrir el juego. El ejemplo fijo del APK no cierra esta conexión. |
| HU48 · Ayuda | 2 | Reproductor e interfaz de presentación con acciones de ejemplo. | Conectar la ayuda definida por Luis al juego y registrar la ayuda que realmente se utilizó, con identidad/partida/juego/versión. Probarla en el recorrido real. |
| HU49 · Avance y acontecimientos | 2 | El juego emite avisos en memoria/consola; presentación local de prueba. | Transportar y persistir acciones y retos completados, reflejar avance autorizado y comprobar secuencia, identidad y duplicados. No sustituir guardado por un mensaje en consola. |
| HU50 · Cierre | 1 | Pantalla de cierre y aviso de fin en el recorrido debug. | Recibir el fin del juego real, confirmar el registro, mostrar resumen externo y permitir regreso/reinicio de prueba. Comprobar errores de guardado y no indicar éxito si no se guardó. El reinicio de ensayo no completa la pausa/continuación de HU53. |

Jesús conserva la **integración funcional**: datos, servicios, sesión, permisos, consultas, navegación Android, selector mínimo de versiones autorizadas para ensayo y contenedor que abre el juego. Las pantallas visuales y el significado de aciertos/ayudas/cierre los entrega Luis. Un `KusiPuente` de la actividad debug no acredita que esté conectado en la app normal.

## Cómo avanzar en paralelo

| Luis entrega | Jesús puede preparar/conectar |
|---|---|
| Recursos mínimos, claves y compatibilidad. No necesita estar acabado todo el arte. | Catálogo versionado y almacenamiento/consulta de procedencia. |
| Propuesta/paquete candidato real y datos de origen. | Solicitud, estados, guardado y acceso autorizado a su versión. |
| Resultado de verificadores con motivo y versión. | Consulta/pantalla de resultados de HU33. |
| Pantallas codificadas, reproductor y significado de sus mensajes. | Misión, carga, orientación/audio, ayuda, registro de avance y cierre en Android. |

Los contratos de entrada/salida y mensajes deben concretarse respetando los servicios existentes; una lista de nombres ilustrativos no crea por sí sola un contrato aprobado. Jesús puede preparar servicios, permisos y registros con ejemplos identificados mientras Luis anima el cuy. **El juego real será necesario para comprobar el conjunto.** Ambos revisarán el mismo recorrido y sus registros en computadora y Android.

## Alcance de la demostración y criterio de cierre

Ensayo de extremo a extremo: **propuesta vigente aprobada → generación real → comprobaciones → lista de juegos de prueba autorizados → misión/juego → ayuda/avance → cierre y registro**. Repetir con una segunda experiencia cuyo comportamiento sea distinto. Conservar evidencia y errores pendientes por HU; no descontar puntos por una imagen o servicio parcial.

En Sprint 2, el acceso autorizado es de **ensayo**. La aprobación formal de la versión jugable, publicación/asignación a alumnos reales e informes docentes completos siguen en Sprint 3. La personalización completa del avatar corresponde a Sprint 4; animar un cuy fijo no la adelanta ni la completa.

HU46 quedó fuera del avance del 20 por indicación de Luis; ese avance no acreditó cierre del sprint. El burndown se omite por su indicación y se revisará después. Este archivo organiza el trabajo pendiente; **no declara cerradas las 12 HU ni garantiza su cierre por la fecha del calendario**.
