# Historial del plan de animación pixel art del cuy del niño

Confirmado por Luis el **22 de octubre de 2026** · lui11zcb · luiscb.once@gmail.com.

**Aviso vigente, 23 de octubre de 2026:** la dirección actual es **cartoon 2D**, según [ARTE_CARTOON.md](ARTE_CARTOON.md) y el [plan de demostración personal](PLAN_DEMO_PERSONAL_CARTOON.md). Este plan pixel art queda archivado; cuatro vistas y caminar no son requisitos del kit propuesto de patrones y clasificación. Phaser sigue siendo el motor.

La versión pixel art **v1 fue rechazada por Luis** por ojos, brazos y deformaciones. El **paso 02 también fue rechazado por el brazo y el cuello**. La corrección está **suspendida**; no está esperando aprobación ni debe retomarse por las instrucciones que se conservan abajo. Las pruebas técnicas no acreditan aceptación visual. Conservar el original cartoon aprobado sin regenerarlo ni enviar imágenes en el chat.

**Último intento por pasos, archivado:** Luis retocó el paso 01 borrando cuatro puntos y autorizó entonces continuar; la base guardada conserva esos borrados. Se guardó en Pixelorama [cuy-nino-paso-02-reposo.pxo](../juego/arte/revision-por-pasos/cuy-nino-paso-02-reposo.pxo): **112 × 128, un fotograma y tres capas**. Solo se bajó el brazo que saludaba reutilizando la mano y el brazo con giro de 90° sin remuestreo, y se limpiaron siete restos beige. El rechazo posterior de esa pose prevalece sobre la revisión técnica registrada.

## Identidad y primer resultado histórico

**El cuy que acabamos de crear es el avatar que controla el niño.** Kusi es la guía y sigue siendo un personaje distinto. Esta confirmación resuelve la duda que dejó el relevo anterior sobre a quién aplicar la referencia nueva; también prevalece sobre perfiles históricos que describían al jugador sin accesorios. Conservar el pañuelo del diseño aceptado.

El primer intento se implementó como **el cuy del niño en reposo y caminando dentro del mercado**. Se conservan el editable de 7 capas, 32 fotogramas y 8 tags, la hoja PNG indexada y el manifiesto integrado en Phaser. Sus vistas y movimiento fueron rechazados; no se continúa con interacción, celebración ni nuevas poses por este historial. Consultar la [producción realizada, parámetros y evidencia](PRODUCCION_CUY_NINO.md).

Referencias de identidad: [cuy cartoon aprobado](arte/referencias/cuy-cartoon-aprobado.png), [exploración pixel art original](arte/referencias/cuy-pixel-original.png) y [resultado nativo de la prueba](arte/referencias/cuy-pixel-native.png). El archivo de 111 × 107 de la prueba no fija la resolución final del personaje. Consultar [ARTE_PIXEL_ART.md](ARTE_PIXEL_ART.md) para anatomía, paleta, contornos y procedencia.

## Herramientas del intento histórico

| Etapa | Herramienta / recurso | Resultado histórico |
|---|---|---|
| Mantener identidad y preparar vistas | Referencias aprobadas; reglas generales de `diseno-cartoon` y las específicas de Kusi | Referencias y skill conservadas. Cuatro vistas producidas mediante receta de píxeles en Pixelorama y rechazadas por Luis. No se generó una base nueva. |
| Reconstruir cuadrícula si hace falta | Pixel Art Fixer por su API Python local | Reproducido con resultado idéntico a la referencia procesada. No genera movimiento, no indexa la paleta final y no se ejecutó con detección independiente por fotograma. |
| Limpiar y dibujar fotogramas | **Pixelorama 1.2.3 para Windows x64** | Base y animación producidas con comandos nativos por el cliente MCP local; editables guardados. Es dibujo programático por receta, no trabajo manual acreditado. [Configuración y evidencia](PIXELORAMA_CODEX.md). |
| Reproducir y controlar el personaje | Phaser 4.2.1 en `juego/` | Nueva hoja y manifiesto integrados; ocho pruebas del juego, build y una prueba táctil adicional correctos. Táctil comprobado en Chromium móvil emulado; Android real pendiente. |
| Posible ruta alternativa de producción | Blender | Luis informó que está instalado. Es opcional; el procedimiento inicial descrito aquí es 2D por fotogramas, no un modelado/rig 3D ya acordado o hecho. |

La skill sirve para mantener el lenguaje visual; no es una herramienta que anime automáticamente al personaje. Se mantiene Phaser y no se usa Impeccable. La prueba inicial del puente y la producción posterior del cuy tienen evidencias separadas.

## Procedimiento original, archivado tras el rechazo

Se realizó la preparación, producción de fotogramas, exportación e integración de este procedimiento. La primera versión usó **112 × 128**, anclaje **(56, 117)**, escala **1**, cuatro direcciones, reposo de **2 fotogramas a 2 fps** y caminar de **6 fotogramas a 10 fps de referencia**. El editable es RGBA con 8 muestras de trabajo; la hoja final usa 7 RGB visibles más transparencia y está indexada sin pérdida. Estos parámetros documentan la versión rechazada; no fijan el nuevo arte cartoon. Los pasos siguientes son el procedimiento anterior, **sin autorización para ejecutarlo de nuevo**.

1. **Preparar una base limpia del cuy del niño.** Conservar marrón, beige piel, pañuelo coral, orejas, mechón, ojos y manos aprobados. Eliminar el fondo blanco para tener transparencia real. Si se usa Pixel Art Fixer, tratar su resultado como punto de partida y limpiar después los bordes y colores en el editor.
2. **Probar escala y fijar el modelo.** Colocar una muestra a su tamaño de uso en la plaza antes de fijar dimensiones. Elegir resolución nativa, paleta pequeña, lienzo y punto de apoyo de los pies. Registrar esos valores y mantenerlos en todas las vistas; no confundir ampliar píxeles con añadir detalle.
3. **Preparar frente, espalda y perfiles.** Mantener las mismas proporciones, manchas, pañuelo y volumen. La primera versión conserva el rostro en tres cuartos para la vista `frente` de juego y utiliza fotogramas propios para derecha e izquierda, sin volteo en ejecución. Revisar con Luis la coherencia de ambas vistas y de los rasgos asimétricos. La vista del mercado es elevada e inclinada: las vistas deben corresponder a ella, no cambiar el juego a lateral.
4. **Animar reposo y caminar.** Dibujar los fotogramas conservando cuadrícula, paleta, lienzo y anclaje. Comprobar alternancia de patas, apoyo, paso y unión del final con el principio del ciclo. Probar cantidad de fotogramas y velocidad dentro del juego; todavía no son valores definitivos aprobados. No simular el ciclo terminado únicamente balanceando una imagen estática.
5. **Exportar sin perder el original editable.** Guardar el archivo de trabajo y una hoja de sprites o conjunto de fotogramas PNG transparentes, con orden de vistas/estados, tamaño de celda y anclaje documentados. Los fotogramas de un mismo ciclo deben compartir dimensiones y alineación. Ampliar con nearest neighbor para revisión y evitar suavizado al presentar el pixel art.
6. **Integrar y comprobar en Phaser.** Cargar los fotogramas y reproducir el ciclo adecuado según dirección/estado. Mantener los controles táctiles y de teclado, movimiento, cámara, interacciones y colisiones existentes. La caja de colisión debe representar la zona de apoyo; no cambiar por los brazos o por cada pose.
7. **Validar el primer resultado.** Revisar a tamaño real que se entiende hacia dónde mira, que el cuy no cambia de tamaño/color, que los pies no flotan o resbalan y que no hay saltos al repetir el ciclo o cambiar dirección. Comprobar computadora y el entorno Android al integrarlo; registrar lo probado y lo que falte. La conexión educativa pendiente en Android no se da por terminada por una prueba visual del sprite.

## Criterio histórico y cierre del intento

Se obtuvieron el editable, la exportación y la reproducción en el prototipo, con pruebas automáticas de movimiento, obstáculos y joystick con dos dedos en Chromium móvil emulado. La revisión visual de Luis terminó en rechazo. La existencia de archivos y pruebas no satisface ese criterio de aceptación ni convierte las poses en recursos aprobados. No se reanuda este intento ni se pasa a interacción/celebración.

**Continuidad actual:** preparar y revisar paso por paso la primera pantalla y los recursos mínimos cartoon según [ARTE_CARTOON.md](ARTE_CARTOON.md). La corrección pixel art está suspendida. La comprobación del juego real conectado a Android sigue siendo un pendiente funcional independiente; este intento no cierra [Sprint 2](SPRINT2_PENDIENTES.md).
