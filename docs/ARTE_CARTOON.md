# Arte vigente de Kusi: cartoon 2D

Actualizado el **23 de octubre de 2026** · lui11zcb · luiscb.once@gmail.com.

**Dirección actual confirmada por Luis: cartoon 2D.** La ruta de pixel art queda como historial. Esta guía sustituye sus exigencias de cuadrícula, paleta indexada, cuatro vistas y ciclos de caminar para la demostración propuesta. El motor sigue siendo **Phaser**. Consultar el [plan de demostración personal](PLAN_DEMO_PERSONAL_CARTOON.md) y el [contexto vigente](CONTEXTO_ACTUAL.md).

Este documento registra decisiones y criterios. No acredita recursos nuevos, una pantalla implementada ni un trabajador de IA funcionando. No autoriza reanudar la corrección suspendida del cuy.

## Referencia e identidad que se conservan

La referencia aprobada es el [cuy cartoon original](arte/referencias/cuy-cartoon-aprobado.png). **Conservar esa imagen; no regenerarla ni reinterpretarla por iniciativa del agente.** La aprobación de su identidad no se extiende a adaptaciones, poses o animaciones posteriores.

- El cuy es **el avatar del niño**. **Kusi guía es otro personaje**; no intercambiar sus nombres, imágenes ni funciones.
- Mantener cuerpo y silueta amables, marrón natural, beige piel claro y pañuelo coral. No aclarar la piel mediante brillo o exposición global.
- Conservar manchas, orejas, mechón unido a la cabeza, ojos y pupilas legibles, brazos completos y las manos de tres dedos redondeados del diseño aprobado.
- Separar nudo y puntas del pañuelo de mandíbula, hombro y brazo. Evitar que el codo se confunda con el pecho o que se deforme el cuello al modificar una extremidad.
- Usar masas de color claras y contornos coherentes. Mantener la petición de Luis de no añadir sombras al cuerpo, cuello ni axilas; evitar reflejos, volumen plástico, pelaje minucioso y efectos que oculten las formas.

La referencia puede servir como retrato o pose fija. El juego propuesto no exige un avatar que camine, cuatro direcciones ni una animación nueva para comenzar. La imagen original se conserva como fuente; cualquier recorte, transparencia o adaptación necesaria se prepara en una copia y se revisa con Luis.

## Resultado de los intentos anteriores

La animación pixel art **v1 fue rechazada por Luis** por ojos, brazos y deformaciones. Sus pruebas técnicas no cambiaron esa decisión. El **paso 02 de reposo también fue rechazado por el brazo y el cuello**. La corrección está **suspendida**; ese paso no está esperando aprobación ni es la base aceptada de la nueva dirección.

Se conservan los editables, exportaciones, rutas, registros y hashes como evidencia histórica. No retomar las poses, animaciones o integraciones por encontrar instrucciones antiguas en [el plan de animación](PLAN_ANIMACION_CUY_NINO.md), [la producción v1](PRODUCCION_CUY_NINO.md), [la guía pixel art](ARTE_PIXEL_ART.md) o [la revisión por pasos](../juego/arte/revision-por-pasos/LEEME.md).

## Kit visual mínimo para la demostración propuesta

El alcance candidato es una experiencia de **patrones** y otra de **clasificación**, con acciones y reglas distintas. El [plan de demostración](PLAN_DEMO_PERSONAL_CARTOON.md) concreta su preparación. Una escena de **taller** es una propuesta para revisar primero la pantalla principal; todavía no es una escena aprobada ni construida.

| Recurso | Preparación propuesta |
|---|---|
| Cuy del niño y Kusi guía | Retratos o poses fijas existentes cuando su función lo requiera. Conservar sus identidades y revisar cualquier adaptación. |
| Piezas de patrones | Objetos o formas grandes y distinguibles; cada pieza en un PNG separado con transparencia real. El orden de la fila debe leerse con facilidad. |
| Piezas de clasificación | Objetos separados y categorías visibles; formas o símbolos de apoyo para que el criterio no dependa solo del color. |
| Espacios y recipientes | Destinos amplios, con estados claros al seleccionar, colocar, acertar o pedir ayuda. |
| Escena y elementos de apoyo | Fondo sencillo y piezas independientes cuando deban moverse, seleccionarse u ocultarse. No aplanar los objetos interactivos dentro del escenario. |

Puede utilizarse dibujo simple de Phaser para probar composición y zonas táctiles antes de preparar todo el arte. Esa prueba no aprueba automáticamente el estilo de los recursos definitivos. Mantener texto corto, objetos reconocibles al tamaño real de uso, contraste suficiente y espacio para tocar sin precisión fina. La adecuación a niños de 6–7 años se debe comprobar; no se declara validada por elegir cartoon.

## Proceso visual, una decisión por vez

1. **Revisar la primera pantalla propuesta con Luis.** Concretar qué ve el niño, qué debe hacer y qué objetos necesita. No producir un lote de personajes, vistas o animaciones antes de resolver esa composición.
2. **Preparar un solo recurso o ajuste autorizado.** Trabajar desde las referencias conservadas, con una copia editable. Luis revisa ese resultado en el editor antes de avanzar al siguiente paso. No enviar imágenes en el chat ni generar una referencia nueva del cuy.
3. **Guardar lo aceptado y distinguir los rechazos.** Registrar el archivo fuente, el editable, la exportación, las decisiones de Luis y qué se reutilizó o modificó. Preservar sus retoques y borrados.
4. **Exportar las piezas aceptadas.** Usar PNG separados, transparencia real, dimensiones y nombres documentados. Elegir tamaño y escala según su lectura dentro de la pantalla; los 112 × 128 píxeles, el anclaje y la paleta de v1 no son parámetros del nuevo kit.
5. **Comprobar la integración del kit en Phaser.** Revisar tamaño visible, bordes, transparencia, orden de capas y área táctil. Preparar animación solo si una acción la necesita y Luis la autoriza; no hacer caminar al cuy como requisito previo de estas dos experiencias.

Las decisiones visuales se revisan paso por paso. El ensayo de autonomía del agente viene **después de contar con los recursos aprobados y un kit acotado**: podrá probar generación de paquetes dentro de ese catálogo y ejecutar verificadores según el acceso personal autorizado. No obtiene aprobación para alterar las identidades, inventar recursos aceptados ni publicar resultados por sí mismo.

## Herramientas y estado

- **Phaser** continúa como motor. Elegir cartoon no implica migrar a Unity, Godot ni un flujo 3D.
- **Krita es una opción** de edición para esta dirección; su instalación y conexión no están confirmadas. No afirmar que ya se instaló o probó.
- **Pixelorama y Pixel Art Fixer** conservan su historial de uso y pruebas. No son pasos necesarios de la ruta cartoon vigente ni motivo para reanudar la corrección pixel art.
- No cambiar filtros, escalado o código del juego solo por actualizar esta guía; la implementación se acuerda y verifica en su tarea correspondiente. No usar Impeccable.

El arte del kit y la generación real de juegos tienen comprobaciones distintas. Un PNG, un retrato o una pantalla preparada no cierran HU26/HU28 ni los pendientes funcionales de [Sprint 2](SPRINT2_PENDIENTES.md).
