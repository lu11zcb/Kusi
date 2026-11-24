# Continuar Kusi en otro chat

Actualizado: **23 de octubre de 2026** · Luis · **lui11zcb · luiscb.once@gmail.com**.

## Decisiones vigentes del 23 de octubre

- **Demostración personal temporal:** preparar la PC y la sesión propia de Codex o Claude Code antes de ir a clase; recibir una propuesta docente aprobada mediante un archivo/documento compartido o cola; construir y comprobar un candidato; devolverlo al panel; revisar y aprobar esa versión antes de la app. Drive es un ejemplo de transporte, todavía no una integración elegida. No interpretar esta fase como un servicio permanente para varios docentes.
- **Dirección cartoon 2D:** Luis quiere dejar atrás la producción pixel art para esta propuesta, conservando el cuy original aprobado. El cuy del niño es el avatar; Kusi guía sigue siendo otro personaje. No regenerar el diseño ni enviar imágenes por el chat por iniciativa propia. No usar Impeccable.
- **Juegos nuevos:** Luis expresa que le gustan patrones y clasificación, inspirados en Yummy! What’s Next? y Toy Tidy-Up. La escena de taller, las reglas y la primera pantalla concreta siguen para revisar. El mercado se conserva como prototipo anterior.
- **Autonomía posterior a la preparación:** un trabajador local puede esperar sin llamadas al modelo y entregar tareas al CLI. La construcción/revisión consume cuota. El puente, los agentes de Kusi y el circuito de devolución aún no están implementados. No se autorizaron nuevos gastos API.
- **Historia del arte:** v1 fue rechazada por ojos, brazos y deformaciones; el paso 02 fue rechazado por brazo separado y cuello abierto. La corrección queda suspendida. No retomar poses, animación o integración al leer sus registros técnicos. Los cuatro borrados de Luis en la base se conservan.
- **Calendario:** Sprint 2 del martes 27 mantiene generación real N1 y dos comportamientos. Corrección automática HU34 y aprobación/publicación formal pertenecen a Sprint 3. Esta consulta no cambió HU, puntos ni responsabilidades.

El [plan de demostración personal cartoon](PLAN_DEMO_PERSONAL_CARTOON.md) reúne recorrido, recursos, audio, programas, etapas y criterios. La [guía cartoon](ARTE_CARTOON.md) es la referencia visual vigente. El [análisis del taller](ANALISIS_TALLER_LOCAL_Y_DEMO_SPRINT2.md) conserva fuentes y la aclaración de alcance. La petición actual es **guardar y actualizar Markdown**, sin producir un juego, instalar programas o iniciar una automatización.

El [paso 02 archivado](../juego/arte/revision-por-pasos/cuy-nino-paso-02-reposo.pxo) tiene 112 × 128, un fotograma y tres capas; su construcción está documentada en el [registro de revisión](../juego/arte/revision-por-pasos/LEEME.md). Es historial rechazado, no un trabajo pendiente de aprobación que deba reanudarse automáticamente.

Este es el punto de entrada actual del proyecto. Resume decisiones y evidencia; las indicaciones nuevas de Luis prevalecen. Los informes fechados conservan su valor histórico, pero no deben usarse como si describieran todos el estado de hoy. Leer este relevo no constituye por sí solo una orden de implementar, instalar o publicar.

## Lectura y ubicaciones

1. Este archivo: producto, estado, decisiones y pendientes.
2. [Plan de la demostración personal](PLAN_DEMO_PERSONAL_CARTOON.md) y [guía cartoon vigente](ARTE_CARTOON.md): intención, recursos, herramientas, pendientes y próximo paso.
3. Solo para antecedentes: [exploración pixel art](ARTE_PIXEL_ART.md), [plan de animación](PLAN_ANIMACION_CUY_NINO.md) y [producción v1 rechazada](PRODUCCION_CUY_NINO.md). Conservar sus resultados técnicos sin tratarlos como aceptación visual ni instrucciones actuales.
4. [Pendientes de Sprint 2 por responsable](SPRINT2_PENDIENTES.md): las 4 HU de Luis y las 8 de Jesús, base existente y tareas por completar.
5. [Juego actual](../juego/README.md), [producto](../PRODUCT.md) y [diseño de los paneles y Android](../DESIGN.md).
6. [Avance del 20](AVANCE_20_OCTUBRE.md) y [verificación del 20](VERIFICACION_20_OCTUBRE.md) si se necesita comprobar qué se entregó o probó.

- Código y estas referencias: `D:/Escritorio/Kusi`.
- Carpeta documental histórica: `D:/Documentos/ChatGPT/Kusi`; su `INICIO_NUEVO_CHAT.md` debe remitir aquí. Sus planes y relevos antiguos incluyen decisiones superadas.
- Repositorio: [lu11zcb/Kusi](https://github.com/lu11zcb/Kusi).
- Último commit local observado al preparar este relevo: `493bee6d5fbebdee7b123d8a009de6aefe14c8c5`. La coincidencia con GitHub se verificó el 20; no se hizo una nueva sincronización el 22.

Los archivos de arte de esta actualización están dentro del repositorio y no dependen de que el siguiente chat conserve las imágenes adjuntas ni las rutas temporales del anterior. Esta actualización documental y visual no implica un nuevo commit o push.

## Qué estamos construyendo

Kusi es un proyecto de juegos educativos para niños de **6 a 7 años, primero de primaria en Perú**, con revisión docente y referencias andinas. La intervención real de IA en la creación de experiencias es parte central del objetivo. Una ilustración generada, una propuesta textual y un juego educativo generado son entregables diferentes.

La arquitectura vigente conserva React para administración/docencia, Django para identidad y organización escolar, Spring para operaciones educativas e IA, PostgreSQL con esquemas separados y Android nativo Kotlin/Compose para el niño. El juego 2D usa **Phaser 4.2.1 y Vite**. No se acordó migrar a Unity, Godot o una app web que sustituya Android.

El docente prepara y revisa propuestas; el alumno debe recibir únicamente aventuras autorizadas para su identidad. El nivel previsto para Sprint 2 es IA que crea contenido/paquetes dentro del kit del equipo (N1); no debe presentarse como programación libre de un juego por IA (N3).

## Qué está implementado y qué es una demostración

- **Administración y docencia:** rediseño integrado en `web/`, con organización por personas/secciones y revisión de propuestas. Groq crea propuestas textuales; su comprobación real del 20 está documentada.
- **Android:** acceso real y recorrido visual de Sprint 2. Existe además **Kusi · presentación**, actividad exclusiva de debug con datos de ejemplo y WebView técnica local. No acredita biblioteca autorizada ni juego generado real.
- **Juego del mercado:** prototipo Phaser con plaza, movimiento, interacción y paquete de ejemplo. `juego/public/paquete-ejemplo.json` y el generador de prueba no demuestran generación educativa real. Los avisos actuales del juego se conservan en memoria/consola, sin conexión completa a Android/Spring.
- **Arte del 22, historial:** se conservaron cuy cartoon aprobado, exploración pixel art y mercado con animales. El avatar v1 se produjo con comandos nativos de Pixelorama MCP y se integró técnicamente en Phaser: cuatro direcciones, 7 capas, 32 fotogramas y 8 tags. [Parámetros y evidencia](PRODUCCION_CUY_NINO.md). Luis rechazó su apariencia y luego la pose del paso 02; las comprobaciones técnicas no validan anatomía ni aceptación. Táctil comprobado en Chromium móvil emulado; Android real pendiente. El mercado nuevo no fue reconstruido por esa producción.

Para abrir paneles, seguir el [README principal](../README.md): Django 8000, Spring 8080 y web 5173; entrar con el rol correspondiente. Para el prototipo del mercado, iniciar `npm run dev` en `juego/` y abrir `http://127.0.0.1:5174/`. Las instrucciones Android están en [movil/README.md](../movil/README.md). Estos son los puertos configurados; este relevo no confirma que los servicios estén encendidos.

## Acuerdos visuales nuevos

La dirección actual es **cartoon 2D**, conservando el cuy original aprobado y preparando escenas y objetos claros. Sustituye para esta propuesta la dirección pixel art del 22. Quiere una experiencia infantil llamativa, expresiva y comprensible; los paneles adultos conservan sus necesidades propias. [Guía vigente](ARTE_CARTOON.md).

El cuy debe verse como un personaje cartoon que se sostiene en dos patas: marrón natural, zonas claras beige piel, pañuelo coral y gestos exagerados. Evitar el acabado plástico, brillante, excesivamente detallado o con iluminación artificial que Luis rechazó. Las instrucciones específicas y la diferencia entre imagen de referencia y recurso terminado están en la [guía de arte vigente](ARTE_CARTOON.md).

**Confirmación posterior de Luis, 22 de octubre:** el cuy que acabamos de crear es **el cuy del niño, controlado por el jugador**. Su preparación y animación fueron el primer trabajo autorizado y ya tienen una primera versión integrada. **Kusi sigue siendo la guía y otro personaje**; esta referencia no la reemplaza. Queda resuelta la duda del relevo anterior sobre a quién aplicar el diseño. Conservar el pañuelo aceptado, aunque perfiles históricos del jugador dijeran que no llevaba accesorios. Los avatares infantiles siguen siendo cuyes; un ejemplo anterior con un niño humano no cambió ese canon. La personalización completa corresponde a trabajo posterior.

**Primer trabajo realizado, historial rechazado:** base del cuy, cuatro vistas y reposo/caminar se produjeron en Pixelorama y se integraron en Phaser. Fixer se reprodujo con resultado idéntico; las poses se construyeron por comandos programáticos, sin atribuir dibujo manual. V1: 112 × 128, anclaje (56, 117), escala 1, dos fotogramas de reposo y seis de caminar por dirección. Editable RGBA con ocho muestras; PNG con siete RGB visibles y transparencia, indexado sin pérdida. Esos parámetros no fijan la nueva producción cartoon. El [plan anterior](PLAN_ANIMACION_CUY_NINO.md) y la [producción](PRODUCCION_CUY_NINO.md) conservan evidencia, no una orden de corregir o repetir esa ruta.

La escena reciente muestra vendedores animales: una alpaca panadera, un oso de anteojos y un zorro. Son elecciones de esta exploración; no fijan todos los vendedores, productos o misiones de los juegos futuros. La ilustración tiene tres puestos y no sustituye automáticamente los cinco del mapa actual.

## Herramientas y skill

Luis informó haber instalado **Blender**, pero no es necesario para las escenas propuestas. **Pixelorama 1.2.3** y su puente MCP conservan pruebas de conexión y producción; el inventario del chat del 23 ya expone herramientas `mcp__pixelorama`. Eso no constituye una nueva prueba de conexión ni autoriza edición. [Rutas y evidencia](PIXELORAMA_CODEX.md). Pixelorama/Fixer son antecedentes disponibles, no pasos obligatorios del cartoon. Se verificaron ejecutables de Codex/Claude, Node y Android Studio; el trabajador sigue por escribir. **Krita es opcional y su instalación no está comprobada**. Unity no está adoptado.

Se creó e instaló la skill personal **`diseno-cartoon`**, reutilizable en cualquier proyecto:

`C:/Users/luis/.codex/skills/diseno-cartoon/SKILL.md`

Su configuración está en `agents/openai.yaml` dentro de esa carpeta. La [copia de consulta conservada](arte/skill-diseno-cartoon/SKILL.md) permite conocer sus reglas incluso en otra máquina; no la instala automáticamente. No es exclusiva de Kusi, no es un modelo entrenado y no convierte por sí sola una imagen en pixel art indexado. Todavía no se creó una skill específica de pixel art. **Luis indicó no usar Impeccable.**

Pixel Art Fixer se probó localmente con éxito mediante su API Python. La guía conserva el commit exacto, medidas, limitaciones y archivos. Es una herramienta auxiliar para reconstruir la cuadrícula, no un sustituto de dibujar y revisar sprites.

## Juego nuevo y trabajador aún por implementar

El caso propuesto para empezar es una pantalla cartoon de **patrones** con el cuy existente y pocas fichas; después, **clasificación** con los mismos recursos y reglas distintas. Preparar primero la pantalla y el kit revisables; construir un primer juego completo; ampliar a la segunda interacción; conectar el puente; ensayar panel y Android. Ninguno de los nuevos juegos o recursos se produjo por documentarlos.

La voz reutilizaría TextToSpeech de Android conectado a las instrucciones reales. Efectos breves locales y música suave opcional completarían la propuesta, con repetición/silencio y prioridad de la voz. Adecuar la dificultad con el docente: la referencia MINEDU consultada es de 2015, sin prueba de eficacia de Kusi. [Plan, recursos, programas y fuentes](PLAN_DEMO_PERSONAL_CARTOON.md).

La propuesta aprobada debe viajar identificada y completa. La espera del programa no necesita tokens; iniciar construcción y revisiones sí consume uso del plan. Drive requiere sincronización/exportación autorizada; la devolución al panel también debe implementarse. Si PC y aula están en redes distintas, probar la comunicación de ida y vuelta; `localhost` no la resuelve. El resultado puede ser generación real dentro de una exposición con cuentas ficticias; un archivo fijo o un prototipo preparado se identifica como tal. No hay autonomía infalible ni implementación nueva acreditada.

### Antecedente conservado: ampliar el mercado

Se analizó la [conversación compartida sobre mejorar el mercado](https://chatgpt.com/s/cx_6ad9888b26308191ae9f89bb39a916ac). Su propuesta incluye escena de compra con vendedor/productos/monedero, una misión de la panadera, reunir tablones para un puente y regresar con ingredientes para una preparación final; también recuperación de compras equivocadas y uso táctil.

Es una referencia de diseño pendiente de concretar con Luis. Lo que aquel chat informó haber hecho en una carpeta de Mac, incluidas sus pruebas, **no demuestra que esté incorporado en esta copia de Windows**. No mezclar ese informe con los resultados locales ni importar cambios sin comprobarlos. La dirección de arte nueva tampoco confirma todavía toda esa secuencia narrativa.

## Lo que falta para Sprint 2

El detalle actualizado de **qué falta hacer a Luis y a Jesús, por HU y con su base existente**, está en [SPRINT2_PENDIENTES.md](SPRINT2_PENDIENTES.md). Es el punto de consulta para responsabilidades; el plan histórico del 16 conserva un reparto anterior.

**No se ha acreditado su cierre.** El avance quedó preparado y publicado el 20 y la revisión del sprint está prevista para el 27. HU46 quedó fuera del avance del 20 y se acordó retomarla el viernes 23. Luis indicó omitir el burndown en esta revisión y verlo después; no inventar una serie diaria ni tratarla como bloqueo de este trabajo.

Los pendientes documentados incluyen:

1. Generar un paquete real desde la propuesta aprobada y conservar su procedencia; el procesamiento estático de ejemplo no lo sustituye.
2. Completar validaciones de contenido, estructura y reglas; comprobar productos/opciones y denominaciones monetarias admitidas.
3. Demostrar experiencias con comportamiento realmente distinto según su paquete, conservando separación entre datos y reproductor.
4. Conectar biblioteca autorizada, misión, WebView y juego real en Android; ayuda, eventos, progreso y cierre deben llegar a la persistencia prevista.
5. Completar e integrar HU46 y recorrer el ensayo de extremo a extremo, partiendo de una propuesta vigente aprobada y con permisos reales. La revisión y aprobación formal de la versión jugable corresponden a Sprint 3.

La implementación anterior del avatar y su prueba táctil siguen como evidencia técnica de una versión visualmente rechazada. No son implementación de la nueva dirección cartoon ni acreditan generación educativa, trabajador local o Android real. La preparación del kit nuevo está pendiente.

La actualización documental del 19 registra el reparto **Luis 4 HU / 12 puntos y Jesús 8 HU / 13 puntos**; la planificación del 16 todavía lo llama propuesta y conserva 6 HU para cada uno. Prevalece la actualización posterior, sin reasignar responsabilidades por este relevo. El catálogo mínimo versionado y la procedencia real (HU29/HU30) también siguen pendientes; guardar referencias visuales no acredita esas historias.

Las comprobaciones generales documentadas **del 20** fueron Django 88, Spring 66, web 48 y juego 6, con builds y comprobaciones Android según el informe enlazado. **El 22, tras integrar el cuy, pasaron 8 pruebas del juego y su build de Vite, más una prueba táctil adicional: 9 pruebas verificadas entre ambas ejecuciones.** El táctil se comprobó en Chromium móvil emulado a 960 × 540, con joystick y segundo dedo; no en Android real. No se repitieron por este bloque las suites de Django, Spring, web o Android. No hay prueba realizada con niños que demuestre preferencia por pixel art o eficacia educativa.

## Cómo retomar

El siguiente chat debe leer primero estas decisiones, abrir las referencias y revisar los archivos pertinentes al encargo actual antes de cambiar código. No sobrescribir trabajo local ajeno ni tratar maquetas, informes antiguos o archivos sin seguimiento como cambios que se pueden borrar. Mantener la autoría histórica; para nuevas aportaciones de Luis usar **lui11zcb <luiscb.once@gmail.com>**.

Para comenzar otro chat se puede pegar:

> Continuamos Kusi en D:\Escritorio\Kusi. Lee docs/CONTEXTO_ACTUAL.md, docs/PLAN_DEMO_PERSONAL_CARTOON.md y docs/ARTE_CARTOON.md. La dirección nueva es cartoon con el cuy original del niño aprobado; Kusi guía es otro personaje. Luis quiere una demostración personal temporal: propuesta aprobada → archivo/cola → trabajador en su PC con Codex/Claude y herramientas → candidato comprobado → panel docente → aprobación → app. Le gustan patrones y clasificación; la primera pantalla aún está por preparar y revisar. Pixel art v1 y paso 02 fueron rechazados; no retomes poses. El trabajador y la integración real siguen pendientes; no confundas ejemplos con generación ni cierres Sprint 2. Mi siguiente encargo es: [escribir aquí lo que quieres hacer].
