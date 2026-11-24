# Demostración personal de Kusi: juegos cartoon y trabajador local

Actualizado el **23 de octubre de 2026** · **lui11zcb <luiscb.once@gmail.com>**.

Este es el plan de continuidad para la aclaración más reciente de Luis. Su solicitud actual autoriza **actualizar documentación**. El trabajador, los juegos nuevos y su integración no se consideran implementados por describirlos aquí. [Estado general](CONTEXTO_ACTUAL.md), [arte vigente](ARTE_CARTOON.md), [investigación y fuentes](ANALISIS_TALLER_LOCAL_Y_DEMO_SPRINT2.md).

## Intención y decisiones

Luis propone una **demostración personal y temporal para la exposición**, preparada con su propia computadora y su sesión de Codex o Claude Code antes de ir a clase. Quiere evitar una nueva API de pago para la construcción durante las pruebas. No está solicitando en esta fase un servicio permanente para múltiples profesores mediante su suscripción.

- El público se conserva: **6–7 años, primero de primaria en Perú**.
- La nueva dirección visual es **cartoon 2D**, dejando atrás la producción pixel art para esta propuesta. Se conserva el cuy original aprobado; no se vuelve a generar su diseño por este cambio.
- El cuy aprobado es el **avatar del niño**. **Kusi guía es otro personaje**. No intercambiar sus funciones.
- Luis expresa que le gustan las referencias de **patrones y clasificación**. Los nombres, composición, dificultad y primer diseño concreto de Kusi siguen para revisión.
- El nuevo juego de demostración será distinto del mercado. El prototipo anterior y sus fuentes se conservan; no se borran ni se presentan como una versión nueva aceptada.
- Mantener **Phaser/Vite**, Android nativo Kotlin/Compose, React, Django, Spring y PostgreSQL. No se acordó migrar de motor.
- La preparación del diseño y los recursos se revisa **paso por paso con Luis**. El objetivo posterior es que, una vez preparados esos recursos y herramientas, la construcción durante la exposición no requiera que Luis responda cada comando.
- No regenerar el cuy ni enviar imágenes por el chat por iniciativa propia. No usar Impeccable. El encargo documental no inicia producción de arte.

## Recorrido que Luis quiere demostrar

1. **Preparación antes de clase:** dejar la PC encendida, el proyecto disponible, los recursos organizados, la sesión válida del agente y un trabajador local activo. Preparar instrucciones y comandos comprobados de construcción y pruebas.
2. **Entrada compartida:** disponer de una bandeja para propuestas. Drive/documento compartido es el ejemplo de Luis; una cola en el backend de Kusi es otra implementación de la misma idea, aún por elegir y probar.
3. **Tema y propuesta:** en clase, una cuenta de prueba representa al docente, escribe el tema y recibe la propuesta por el flujo que ya existe.
4. **Primera aprobación:** el docente aprueba una versión concreta. Kusi entrega su contenido al puente con identificador, versión y señal de que está listo.
5. **Inicio automático:** el trabajador detecta y reserva la solicitud completa, evitando procesar dos veces el mismo trabajo. Entrega la tarea al CLI oficial de Codex o Claude Code con el proyecto y las capacidades autorizadas.
6. **Construcción:** el agente utiliza catálogo, código y herramientas preparados para producir un candidato Phaser compatible con Kusi. No se recompila otra APK por cada actividad compatible.
7. **Comprobaciones y corrección:** construir y ejecutar las pruebas; devolver fallos concretos al agente para un intento limitado de corrección. Conservar resultados y versiones.
8. **Devolución al panel:** subir o registrar el candidato y sus recursos en una ubicación accesible al backend. El panel muestra estado, errores o una vista previa jugable de esa versión.
9. **Segunda aprobación:** el docente juega y aprueba la versión exacta. La revisión y aprobación de la idea no sustituyen esta revisión del resultado.
10. **Aplicación infantil:** la versión autorizada llega a la cuenta infantil correspondiente. La partida usa ese mismo artefacto y registra las acciones, ayudas, avance y cierre previstos.

La espera puede realizarla un programa pequeño; **no necesita mantener una IA consultando si llegó algo**. La copia mediante coordenadas en una ventana de chat no es necesaria: `codex exec` y `claude -p` proporcionan entrada programática. Esa interfaz debe conectarse al proyecto; su existencia no acredita que Kusi ya la use.

## Puente de archivos o cola

La propuesta aprobada debe viajar como contenido completo e identificado. Una pausa de uno o dos minutos al escribir no constituye una aprobación ni garantiza que la sincronización terminó. Usar una señal explícita de envío/listo y comprobar contenido, versión y huella antes de iniciar.

| Opción | Preparación necesaria |
|---|---|
| Archivo ordinario en Drive | Sincronización o transferencia autorizada de `.json` o `.txt`, archivo/marcador de listo, detección de sincronización completa y devolución del candidato al backend. No se comprobó instalación de Drive para escritorio. |
| Google Docs | Exportación autorizada del texto. Un `.gdoc` local es una referencia al documento, no su contenido completo. Añade integración de Google, aunque no sea una API del modelo de IA. |
| Cola de Kusi | Spring conserva la solicitud; un trabajador Node.js consulta pendientes, reserva uno y devuelve estado/archivos. Aprovecha los servicios existentes, pero el contrato y el trabajador siguen pendientes. |

En todas las opciones, la devolución al panel y la entrega móvil son trabajos propios. Vigilar un archivo solo resuelve la entrada. No se definieron nuevos endpoints ni contratos aprobados por esta documentación.

Si Luis expone en clase mientras la PC permanece en casa, el panel, backend, trabajador y teléfono necesitan comunicación de ida y vuelta. `localhost` y `10.0.2.2` no cubren esa conexión entre redes. Ensayar con la red prevista, comprobar sesión y cuota, mantener la PC sin suspensión durante el ensayo y conservar estados si hay interrupciones. No abrir una consola remota al docente: el acceso corresponde al flujo de trabajos autorizado.

## Qué es real y qué se representa en la exposición

| Parte | Criterio de honestidad |
|---|---|
| Docente, alumno y escuela ficticios | Identificarlos como cuentas/datos de prueba. |
| Transporte provisional por archivos | Puede ser una transferencia real que sustituye temporalmente un conector directo. No acredita una integración de producción. |
| Generación | Es real solo si el agente recibe la solicitud identificada y produce el candidato que se ejecuta. Un JSON fijo o un juego escrito previamente durante el desarrollo se identifica como ejemplo/prototipo. |
| Resultado generado antes de la clase | Puede mostrarse como versión guardada, con su procedencia. No presentarlo como generación en directo. |
| Comprobaciones | Registrar las que realmente se ejecutaron y sus límites. Una aprobación de otro agente no equivale a una prueba independiente. |
| Android | La app debe abrir la misma versión y guardar acontecimientos para acreditar integración. El modo debug con HTML fijo sigue siendo una presentación identificada. |

El experimento puede aportar evidencia de la idea sin demostrar generación universal, disponibilidad permanente o eficacia educativa.

## Juegos y adaptación a 6–7 años

Referencias aceptadas como inspiración: [Yummy! What’s Next?](https://www.avokiddo.com/understand-patterns-with-our-new-math-game-yummy-whats-next/) y [Toy Tidy-Up: Match & Sort](https://www.avokiddo.com/new-math-shape-sorting-game/), de Thinkrolls/Avokiddo. Usar recursos y personajes propios. La edad de una colección no prueba la adecuación de cada reto de Kusi.

### Primer caso: Completa el patrón

Una escena de taller/mesa cartoon, espacios para fichas y opciones grandes. El niño toca una pieza y su destino o la arrastra, puede corregir y escucha ayuda. Comenzar con un criterio visible, por ejemplo forma: círculo–triángulo y círculo–círculo–triángulo. AB/AAB describen el núcleo repetido, no el número de atributos. El número de huecos, opciones y ayudas se ajusta al punto de partida elegido con el docente.

El candidato debe expresar escena, acciones, regla, piezas, huecos, opciones, ayudas y condición de avance/cierre. Comprobar que existen recursos y opciones suficientes y que la consigna y las reglas admitidas determinan una respuesta evaluable. No aceptar una respuesta generada como su propia única comprobación.

### Segundo caso: Ordena el taller

Reutilizar las fichas y colocarlas en bandejas según una propiedad visible, comenzando por forma. El orden de las colocaciones es libre y cada pieza debe tener un destino válido. En patrones importa la posición en la secuencia; aquí, la pertenencia a una categoría. Se comprueba esa diferencia ejecutando los dos casos, sin limitarse a cambiar títulos, dibujos o cantidades.

Como antecedente oficial, las [Rutas del Aprendizaje de Matemática, III ciclo, MINEDU, versión 2015](https://minedu.gob.pe/DeInteres/pdf/documentos-primaria-matematica-iii.pdf), incluyen agrupaciones en primer grado (páginas impresas 34–35) y patrones con un criterio (44–47). No se presenta esta fuente histórica como certificación curricular vigente ni como evidencia de eficacia de Kusi. La adaptación requiere revisión docente; no se realizaron pruebas con niños.

## Kit visual y sonido que hay que preparar

Recursos mínimos candidatos, todavía por revisar y producir:

- Referencia del cuy del niño conservada y representación fija apropiada para esta escena; Kusi guía separado cuando corresponda. La referencia aprobada no demuestra que el recurso ya tenga transparencia o capas listas.
- Un fondo de taller/mesa, sin escenario transitable.
- Tres formas distinguibles, fichas, espacios, bandejas y controles. Separar cada elemento interactivo del fondo; pueden comenzar con gráficos simples del motor y mejorarse después.
- Texto corto, zonas táctiles amplias, botón de repetir instrucción y alternativa de toque al arrastre.
- Movimientos breves de piezas y respuesta visible al colocar, corregir y terminar. No se necesitan nuevas vistas de caminar para el primer caso.

La guía visual vigente es [ARTE_CARTOON.md](ARTE_CARTOON.md). La producción pixel art rechazada se conserva como historial, no como recurso aprobado de esta propuesta.

| Audio | Preparación |
|---|---|
| Consignas y ayudas | Reutilizar TextToSpeech de Android conectado al texto real del candidato. Comprobar voz española disponible, repetición y correspondencia texto/voz. Esa conexión todavía no está implementada. |
| Efectos | Sonidos breves de colocar, revisar y completar. Sintetizarlos localmente o escoger archivos autorizados con procedencia. |
| Música | Una pista suave reutilizable, opcional en el primer prototipo, con silencio y reducción o pausa durante la voz. No regenerarla por cada actividad. |

Fuentes técnicas: [Android TextToSpeech](https://developer.android.com/reference/android/speech/tts/TextToSpeech), [Web Audio](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API), [Kenney Interface Sounds, CC0](https://kenney.nl/assets/interface-sounds). No se descargaron ni generaron audios por este encargo documental.

## Programas y herramientas

| Herramienta | Función y estado |
|---|---|
| Phaser 4.2.1, JavaScript y Vite | Motor y proyecto existentes. Preparar el kit, cargar candidatos y ejecutar reglas; no migrar de motor por este plan. |
| Codex CLI o Claude Code | Ejecutables localizados. Elegir un constructor principal y verificar acceso/sesión antes de ensayar. CLI disponible no implica trabajador integrado. |
| Node.js | Disponible; escribir el trabajador de espera, reserva, ejecución y devolución. No está creado. |
| Playwright y verificadores | Herramientas existentes del juego; preparar casos específicos de ambos comportamientos. |
| Krita | Editor opcional para ilustraciones por capas. No se verificó instalación ni se decidió convertirlo en dependencia del trabajador. |
| Android Studio, Kotlin/Compose y TextToSpeech | Herramientas y código base presentes. Conexión del juego real, eventos y cierre pendientes. |
| React, Django, Spring y PostgreSQL | Base existente de paneles, identidad, operaciones educativas y datos. Reutilizar sus responsabilidades y permisos. |
| Pixelorama y Pixel Art Fixer | Conservar proyectos y evidencia. No son pasos obligatorios de la nueva dirección cartoon. |

Blender fue informado como instalado; Unity no está adoptado. Ninguno es necesario para este alcance de escenas 2D. La IA del instituto sería un proveedor opcional sujeto a documentación, autorización y pruebas; no se asume disponible ni capaz por este plan.

## Autonomía, presupuesto y límites

Preparar antes del ensayo instrucciones del constructor, catálogo versionado, formato del candidato y comandos comprobados. Los archivos de instrucciones para Codex/Claude que se decidan usar son trabajo pendiente. Roles propuestos: constructor, revisor de correspondencia y comprobador técnico. Los subagentes usados para analizar esta conversación no son agentes ya integrados en Kusi.

Las pruebas devuelven fallos concretos al constructor. Se propone un máximo de dos correcciones y un límite de tiempo; agotarlos deja el trabajo pendiente/fallido con motivo. Estos límites no están configurados y no acreditan HU34. La configuración inicial y la revisión docente final siguen existiendo aunque no haya intervención humana en cada comando de construcción.

Luis quiere evitar nuevos gastos por una API del modelo constructor. Una ejecución personal admitida por el proveedor puede usar la cuota de su plan; verificar el método de autenticación para evitar facturación API accidental. Construir, revisar y corregir sí consume uso del plan; vigilar la entrada y ejecutar pruebas locales sin llamadas al modelo no necesita tokens. No se prometen cantidades de juegos, cuota ilimitada, tiempos ni costo cero global. La etapa de propuestas existente con Groq se distingue de la nueva etapa de construcción.

Usar CLI no instala el modelo en la PC: las herramientas corren localmente y el modelo remoto requiere conexión. La documentación de producto y sus condiciones no se sustituyen con este experimento personal. Fuentes verificadas el 23: [Codex no interactivo](https://learn.chatgpt.com/docs/non-interactive-mode), [autenticación](https://learn.chatgpt.com/docs/auth), [Claude programático](https://code.claude.com/docs/en/headless), [Claude y planes](https://support.claude.com/en/articles/15036540-use-the-claude-agent-sdk-with-your-claude-plan). Detalle de integración de producto y fuentes adicionales en el [análisis del taller](ANALISIS_TALLER_LOCAL_Y_DEMO_SPRINT2.md).

## Etapas y aceptación

1. **Primera pantalla y kit:** preparar una pantalla cartoon de patrones con el cuy existente y pocas fichas; Luis revisa identidad, composición y acción antes de ampliar.
2. **Primer juego completo:** iniciar, interactuar, equivocarse/corregir, pedir ayuda y terminar con controles comprensibles.
3. **Segundo comportamiento:** clasificación con los recursos comunes y reglas diferentes comprobadas.
4. **Puente automático:** una propuesta aprobada llega al trabajador, produce un candidato identificable, ejecuta comprobaciones y vuelve al panel con resultado o error real. Probar también una solicitud no usada al preparar los ejemplos, dentro de las capacidades declaradas.
5. **Ensayo integrado:** comprobar versión, vista previa, autorización, app, audio, acontecimientos y guardado. Ensayar la red de clase y conservar un resultado guardado como respaldo identificado.

Guardar como evidencia: solicitud/propuesta y aprobación vigentes, identificador de trabajo, salida original del agente, recursos y versiones, intentos, intervenciones humanas, informes, candidato ejecutado y registros de partida. Un fallo no se reemplaza silenciosamente por un ejemplo exitoso.

## Sprint 2 y Sprint 3

El martes **27 de octubre** sigue siendo la revisión de Sprint 2, sin garantía de cierre por calendario. El plan vigente exige generación real N1 (HU26), estados/etapas (HU27), dos comportamientos (HU28), catálogo/procedencia (HU29/HU30), comprobaciones/resultados (HU31/HU33) y controles/audio/ayuda/avance/cierre en Android de ensayo (HU46–HU50).

Sprint 3 incluye HU32, verificación independiente del contenido; HU34, corrección automática; prueba y aprobación formal de la versión jugable, publicación/asignación/avisos e informes. El flujo completo que Luis describe tiene partes de ambos sprints. No se han cambiado HU, puntos ni reparto Luis/Jesús. Si una parte queda para después del martes, se registra como pendiente o cambio acordado, sin declararla terminada por ser una simulación.

N1 permite generar dentro de un kit; no equivale a programación libre N3. Dos juegos humanos fijos elegidos por IA tampoco cumplen el objetivo amplio. Que un agente escriba código durante el desarrollo no acredita por sí solo generación integrada: importa el recorrido real desde la propuesta. [Pendientes por responsable](SPRINT2_PENDIENTES.md).

## Siguiente trabajo

Tras esta actualización documental, el siguiente trabajo propuesto es la **primera pantalla cartoon de patrones**, revisada con Luis antes de producir todo el kit. No retomar el cuy pixel art, preparar poses por lotes ni iniciar el trabajador o una automatización por leer este archivo. La implementación se concreta con el siguiente encargo.
