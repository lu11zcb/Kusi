# Taller local de IA y demostración del Sprint 2

23 de octubre de 2026 · lui11zcb · luiscb.once@gmail.com.

**Estado: investigación conservada, con aclaración posterior de Luis.** El [plan de demostración personal cartoon](PLAN_DEMO_PERSONAL_CARTOON.md) reúne la continuidad actual y la [guía cartoon](ARTE_CARTOON.md) fija la dirección visual nueva. Este análisis no acredita implementación, aprobación de arquitectura ni replanificación de historias. No se instalaron programas, ejecutaron generaciones ni cambiaron cuentas, arte o código por investigarlo. La corrección del cuy pixel art permanece suspendida.

## Aclaración posterior de Luis: ensayo personal para la exposición

Luis precisa que imagina una demostración temporal, preparada con su computadora y su propia sesión de Codex o Claude Code antes de ir a clase. Una cuenta docente de prueba propone el tema, recibe la propuesta existente y la aprueba. Esa versión viaja mediante un documento o archivo compartido —Drive es un ejemplo— a la computadora; el agente, preparado con instrucciones, catálogo y herramientas, construye y comprueba el juego y devuelve el candidato al panel. El docente prueba y aprueba esa versión antes de ofrecerla a la app infantil. La intención es no intervenir en la PC durante la exposición, después de preparar y ensayar ese entorno. No está solicitando en esta fase un servicio permanente para múltiples docentes mediante su suscripción. Las consideraciones sobre un eventual producto alojado que aparecen más abajo no deben confundirse con esta intención concreta.

La simulación corresponde a las identidades de exposición y a la integración provisional; si el agente recibe la solicitud, construye un candidato nuevo y lo devuelve realmente, esa construcción puede ser real y debe conservar evidencia. Un resultado ya preparado solo se muestra como guardado, sin atribuirle generación en directo. No se afirma que el puente esté implementado.

La espera debería realizarla un programa local, que no necesita tokens. El botón de aprobar/enviar crea una solicitud con identificador, versión y señal de lista. Una pausa de uno o dos minutos al escribir no basta como aprobación. El programa entrega una tarea al CLI oficial; no necesita pegarla mediante coordenadas en una ventana. Para Drive se usaría `.json` o `.txt` completo y una huella de contenido; un enlace `.gdoc` no contiene localmente el texto de Google Docs. El transporte Drive y la devolución al backend requieren conexiones propias. Usar la cola del backend existente es otra implementación de la misma idea. [Drive para escritorio](https://support.google.com/drive/answer/10838124?hl=en), [documentos nativos y archivos locales](https://support.google.com/drive/answer/2565956?hl=en), [exportación de Google Docs](https://developers.google.com/workspace/drive/api/reference/rest/v3/files/export).

El objetivo de presupuesto es evitar nueva facturación de la API del modelo constructor durante el ensayo, usando acceso personal admitido por el proveedor y dentro de su cuota. La construcción, revisión y corrección siguen consumiendo uso del plan. La etapa actual de propuestas con Groq y las APIs propias de Kusi se distinguen de esa nueva conexión de construcción.

Luis expresa que quiere dejar atrás el pixel art para esta dirección y trabajar en cartoon, conservando el cuy aprobado. Le gustan las referencias de patrones y clasificación. Se propone preparar primero un kit visual pequeño y una experiencia revisable; después la segunda interacción, el puente y el ensayo integrado. El cuy del niño y Kusi guía conservan roles distintos. Esto no autoriza fabricar de una vez todas las poses ni reemplazar el arte aprobado.

Para adaptar los casos a primero se propone comenzar con un criterio visible y ajustar la progresión con el docente. Como antecedente oficial, las Rutas del Aprendizaje de MINEDU, versión 2015, incluyen agrupaciones y patrones en primer grado: [guía de Matemática, ciclo III](https://minedu.gob.pe/DeInteres/pdf/documentos-primaria-matematica-iii.pdf). No se presenta como certificación del currículo vigente ni evidencia de eficacia de Kusi. AB/AAB describen la longitud del núcleo repetido, no el número de atributos perceptuales.

El recorrido desde una clase mientras la PC permanece en casa requiere conexión de ida y vuelta entre panel, backend, trabajador y app; `localhost` no cubre ese recorrido. Debe ensayarse con la red y el teléfono previstos. La aprobación/publicación formal completa permanece en Sprint 3; el plan vigente conserva generación real N1 y dos comportamientos en Sprint 2, sin trasladar historias automáticamente por esta aclaración.

## Conclusión

Una computadora personal puede funcionar como trabajador de construcción de juegos: recoger solicitudes, acceder al catálogo, ejecutar herramientas, construir candidatos y comprobarlos. Es una opción razonable para un laboratorio y una demostración local. Su rendimiento y continuidad deben medirse; no se comprobó hardware ni funcionamiento de ese trabajador.

La mejora procede de las herramientas, recursos y verificaciones que rodean al modelo. Ese mismo entorno también puede utilizar un modelo mediante API. Usar Codex o Claude Code con una suscripción no significa ejecutar sus modelos dentro de esta computadora ni garantiza generación correcta. Sigue haciendo falta conexión con el proveedor cuando se usan esos modelos remotos.

La automatización personal y un servicio que atiende solicitudes de terceros tienen condiciones diferentes. No se debe diseñar Kusi suponiendo que un único Plus o Pro autoriza servir a todos los docentes mediante las credenciales de Luis.

## Suscripciones y ejecución automática

| Ruta | Evidencia oficial y alcance |
|---|---|
| Codex CLI | `codex exec` permite ejecución no interactiva y reutiliza autenticación guardada. La documentación contempla autenticación de cuenta en automatización confiable con límites y precauciones; no convierte esa cuenta en una API general. La ayuda del CLI instalado confirma `exec`, entrada por stdin, JSON de eventos y salida por esquema. No se ejecutó un trabajo de IA. |
| Codex integrado en un producto | La documentación de app-server distingue aplicaciones locales de servicios alojados/comerciales. La ruta Sign in with ChatGPT permite usos de plan autorizados por usuario, pero solicitar un client ID está limitado actualmente a socios seleccionados. No se verificó acceso de Kusi a esa ruta. |
| Claude Code personal | `claude -p` y Agent SDK permiten automatización. El soporte oficial actualizado el 7 de octubre de 2026 confirma que esos usos aún pueden consumir límites de suscripción. Pro no debe describirse como incompatible con toda automatización. |
| Claude como servicio para docentes | La documentación de autenticación prohíbe enrutar solicitudes en nombre de usuarios mediante credenciales Free/Pro/Max del desarrollador. Indica API/Cloud para productos y describe por separado el alojamiento del binario sin modificar donde cada usuario inicia sesión con sus propias credenciales, bajo las condiciones correspondientes. |

Para un experimento personal se puede evaluar el CLI con la cuenta de Luis. Para atender docentes desde Kusi se debe elegir acceso autorizado de producto: API, proveedor institucional autorizado o una integración expresamente permitida. No se investigaron límites ni condiciones de la IA del instituto porque no se dispone de documentación de ese servicio. Podría incorporarse como proveedor alternativo después de verificar su interfaz, modelo, permisos y capacidad.

Los agentes comparten los límites de la cuenta que los ejecuta. La existencia de varios roles no aporta cuota ilimitada ni garantiza independencia de sus errores. El acceso a imagen, audio o programas concretos se comprueba por herramienta; instalar un programa o tener un plan de texto no acredita una integración automática de todos ellos.

Fuentes oficiales consultadas el 23 de octubre:

- [OpenAI: modo no interactivo](https://learn.chatgpt.com/docs/non-interactive-mode).
- [OpenAI: autenticación](https://learn.chatgpt.com/docs/auth).
- [OpenAI: app-server, autenticación y alcance](https://learn.chatgpt.com/docs/app-server).
- [OpenAI: solicitar client ID](https://developers.openai.com/siwc/request-client-id).
- [Claude: ejecución programática](https://code.claude.com/docs/en/headless).
- [Claude: Agent SDK con planes](https://support.claude.com/en/articles/15036540-use-the-claude-agent-sdk-with-your-claude-plan).
- [Claude: uso de credenciales e integración en productos](https://code.claude.com/docs/en/legal-and-compliance).
- [Claude: subagentes](https://code.claude.com/docs/en/sub-agents).

## Flujo técnico propuesto

1. El docente aprueba una versión de la propuesta. Spring registra un trabajo identificado, sin enviar credenciales de alumnos al constructor.
2. Un trabajador Node.js en la PC consulta la cola mediante un canal autenticado y toma inicialmente un solo trabajo. No necesita pegar texto en una ventana de chat ni exponer el escritorio a los profesores.
3. Prepara una carpeta por intento y un catálogo de recursos admitidos. Invoca un proveedor por su interfaz oficial: CLI/SDK para el experimento personal o el acceso de producto autorizado que se haya elegido.
4. El constructor produce el candidato compatible con Phaser. En N1, la salida expresa escena, contenido y comportamiento dentro del kit; no se limita a escoger un juego fijo y cambiar números. Generar y ejecutar código nuevo corresponde a otro nivel y exige comprobar el mecanismo de aislamiento.
5. Se ejecutan verificadores ajenos a la salida del constructor: estructura, recursos, reglas, solución alcanzable, interacción, ayuda y cierre. Playwright recorre la experiencia; la comprobación en Android se realiza aparte.
6. Si hay fallos, se devuelve el informe al constructor para un intento de corrección. Se propone un límite de dos correcciones; agotarlo deja estado pendiente con motivo, sin publicar. Ese mecanismo es parte del diseño candidato para HU34, no una historia ya cerrada.
7. Se guardan propuesta, salida original, recursos/versiones, intentos, correcciones humanas, informe y candidato. La revisión docente final y la publicación conservan su lugar en Sprint 3.

Roles mínimos: un constructor; un revisor de correspondencia con la propuesta; y un comprobador técnico que consume resultados de pruebas. El corrector puede ser el mismo constructor recibiendo el informe. Solo un proceso escribe cada candidato; los revisores leen. Las pruebas y las referencias educativas aportan comprobación independiente de las opiniones de otros agentes.

El trabajador se limita a carpetas y herramientas autorizadas. Las pruebas de un candidato no reciben las credenciales del trabajador, del proveedor o de la base. Un fallo de cuota o una PC apagada debe conservar la solicitud pendiente. Esta arquitectura aún debe implementarse y probarse; no habilita autonomía infalible ni sustituye revisión pedagógica.

## Qué exige realmente el martes 27

La planificación vigente ya incluye en Sprint 2:

- **HU26:** generación real desde propuesta vigente aprobada.
- **HU27:** estados, etapas y errores conectados al generador real y mostrados en el panel.
- **HU28:** dos experiencias con diferencias efectivas en acciones o reglas.
- **HU31/HU33:** comprobaciones de carga, interacción, reglas y cierre, con sus resultados.
- **HU29/HU30:** catálogo mínimo y procedencia.
- **HU46–HU50:** controles, orientación/audio, ayuda, avance, cierre y registros reales en Android de ensayo.

Sprint 3 añade HU32, verificación independiente de contenido; HU34, corrección automática; prueba/aprobación formal de la versión jugable; publicación/asignación/avisos e informes. El prototipo no puede admitir contenido incorrecto conocido aunque HU32 esté después.

Fuentes: [pendientes vigentes](SPRINT2_PENDIENTES.md), [separación S2/S3](D:/Documentos/ChatGPT/Kusi/docs/PLANIFICACION_SPRINT2.md) y backlog de 75 HU en `D:/Escritorio/a/contexto.md`. Las referencias antiguas a 3D están sustituidas por la elección posterior de 2D/Phaser.

No se encontró exigencia de generar en vivo durante la exposición. Puede mostrarse un resultado realmente generado antes, identificándolo como guardado y conservando su procedencia. Un juego programado con ayuda de Codex durante el desarrollo puede servir como prototipo, pero no acredita por sí solo HU26. Trasladar la generación a Sprint 3 sería un cambio del alcance vigente que debe registrarse, no una lectura de que siempre estuvo fuera de Sprint 2.

El código local todavía procesa un paquete estático de ejemplo; Groq genera propuestas textuales y la app Android normal conserva el juego sin conectar. El trabajador y la integración completa no existen por haberlos descrito. No se hicieron pruebas funcionales nuevas en esta revisión.

## Juego candidato: El taller de patrones

Referencia móvil concreta: [Yummy! What’s Next?, de Thinkrolls](https://www.avokiddo.com/understand-patterns-with-our-new-math-game-yummy-whats-next/), publicado por Avokiddo el 7 de febrero de 2023. Presenta filas de alimentos que se completan siguiendo patrones. Se tomaría la interacción y se usarían recursos propios. La colección de Thinkrolls incluye a niños de 6–7; eso no demuestra la adecuación o eficacia de Kusi.

Primera experiencia: una fila de fichas con posiciones vacías y opciones grandes. El niño toca una pieza y su destino, o la arrastra. El candidato generado expresa la regla del patrón, las piezas, huecos, opciones, ayudas y condiciones de avance. El comprobador contrasta el resultado y rechaza propuestas sin solución o ambiguas respecto a la regla y consigna declaradas. La dificultad inicial la delimita el objetivo docente.

Para HU28 se propone una segunda experiencia de **clasificación**, inspirada en [Toy Tidy-Up: Match & Sort](https://www.avokiddo.com/new-math-shape-sorting-game/): distribuir piezas en recipientes según un atributo visible. Aquí importa pertenecer a una categoría y el orden de las colocaciones es libre; en patrones importa la posición. Cada pieza debe tener destino válido y la consigna debe aclarar el criterio. Los dos casos se comparan funcionando; sus nombres no acreditan diferencia por sí solos.

Recursos mínimos: una escena, tres formas distinguibles, colores y símbolos de apoyo, fichas, espacios y recipientes. Se pueden comenzar con gráficos de Phaser y el arte existente, sin preparar nuevas poses del cuy. El cuy del niño conserva su identidad; Kusi guía sigue siendo otro personaje. La elección de estos casos no cierra el catálogo definitivo de mecánicas ni promete cubrir todos los cursos.

## Sonido, voz y música

| Elemento | Propuesta para la prueba |
|---|---|
| Instrucciones y ayudas | Reutilizar TextToSpeech de Android, ya presente en `ComponentesKusi.kt`, conectado al texto real del paquete. Mantener botón de repetir y texto visible; comprobar voz española en el teléfono. La función actual no acredita todavía un puente con el juego real. |
| Efectos | Tres sonidos breves de colocar, revisar y terminar, sintetizados mediante Web Audio o preparados como archivos locales. Como alternativa, Kenney Interface Sounds declara CC0; conservar licencia/origen del recurso elegido. |
| Música | Una pista breve y suave, opcional en la primera prueba. Si se incorpora, permitir silencio y bajar o pausar al hablar. No necesita generarse nuevamente para cada actividad. |

Fuentes: [Android TextToSpeech](https://developer.android.com/reference/android/speech/tts/TextToSpeech), [Web Audio](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API), [Kenney Interface Sounds y licencia](https://kenney.nl/assets/interface-sounds). El sonido web se inicia tras una interacción del usuario. No se descargaron audios ni se contrataron servicios de voz.

## Orden recomendado hasta la demostración

Esta secuencia es una propuesta de prioridades, no una promesa de completar las HU por fecha ni una nueva estimación de puntos:

1. **Viernes 23:** acordar un primer caso, formato y comprobador; ensayar generación real con el acceso ya autorizado. Resolver esa incertidumbre antes de ampliar arte.
2. **Sábado 24:** completar la primera experiencia, controles, ayudas y audio; conservar procedencia y resultados.
3. **Domingo 25:** generar la segunda experiencia y probar una solicitud no usada al preparar los ejemplos, dentro del alcance declarado.
4. **Lunes 26:** conectar y comprobar Android, autorización, eventos, guardado y cierre; ensayar la exposición y registrar límites.
5. **Martes 27:** mostrar lo que realmente pasó desde la propuesta hasta la partida y sus registros, identificando los resultados preparados previamente y las HU pendientes.

La recomendación es conservar Phaser y los servicios existentes para este ensayo. La infraestructura completa de construcción autónoma se evaluaría con la experiencia obtenida, sin añadir Unity o un flujo 3D como dependencia del martes. La nueva arquitectura no cambia por sí sola responsabilidades de Luis/Jesús, fechas ni criterios de aceptación.
