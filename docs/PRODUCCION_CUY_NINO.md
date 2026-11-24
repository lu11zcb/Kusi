# Historial del cuy del niño: versión pixel art v1 rechazada

22 de octubre de 2026 · lui11zcb · luiscb.once@gmail.com.

**Aviso vigente, 23 de octubre de 2026:** Luis eligió **cartoon 2D**. La guía actual es [ARTE_CARTOON.md](ARTE_CARTOON.md), junto con el [plan de demostración personal](PLAN_DEMO_PERSONAL_CARTOON.md). Este documento conserva la producción pixel art como historial, incluidas rutas, parámetros, métricas y comprobaciones; no es el plan para los recursos siguientes.

La versión **v1 fue rechazada visualmente por Luis** por ojos, brazos y deformaciones. El build, las pruebas y las métricas no equivalen a aceptación. El **paso 02 de reposo también fue rechazado por el brazo y el cuello**. La corrección está **suspendida**, no esperando aprobación. No retomar poses, animación ni integración por este historial. Conservar el original cartoon aprobado, sin regenerarlo ni enviar imágenes en el chat.

**Último intento por pasos, archivado:** Luis retocó el paso 01 borrando cuatro puntos y autorizó entonces continuar; esos borrados se preservan en la base guardada. Se guardó [cuy-nino-paso-02-reposo.pxo](../juego/arte/revision-por-pasos/cuy-nino-paso-02-reposo.pxo): **112 × 128, un fotograma y tres capas**. Se bajó el brazo que saludaba, reutilizando la mano y el brazo con giro de 90° sin remuestreo, y se limpiaron siete restos beige. El rechazo posterior de esa pose prevalece sobre la revisión técnica registrada.

El código del prototipo del mercado conserva la integración de la primera versión pixel art del **cuy del niño**, con reposo y caminar en cuatro direcciones. **Kusi guía sigue siendo otro personaje.** Esa integración documenta el intento rechazado; no significa que su arte esté aprobado ni que se haya sustituido ya por recursos cartoon nuevos.

## Fuente y procedimiento histórico realizado

Se conservó el [cuy cartoon aprobado](arte/referencias/cuy-cartoon-aprobado.png) como referencia de identidad y se trabajó desde la [exploración pixel art original conservada](arte/referencias/cuy-pixel-original.png), sin generar una base nueva. Se repitió Pixel Art Fixer por su API Python local con el commit `ef376e57e1c272633ca2dbf5f29ec3fcf6596465`. El resultado de **111 × 107** coincide byte por byte con la referencia procesada anterior; el [informe de reproducción](arte/produccion/cuy-fixer-reproducido-v1.json) conserva los hashes. Esa resolución detectada no se usó como tamaño final del lienzo.

La [receta de producción](../scripts/arte/receta_cuy_pixelorama.py) prepara coordenadas y colores a partir de esa referencia: separa el fondo conectado a los bordes, restringe los colores, conserva el componente del personaje y construye las vistas y poses faltantes en capas anatómicas. La receta se ejecutó como comandos nativos del puente MCP de **Pixelorama 1.2.3**: crear lienzo y paleta, añadir fotogramas y capas, dibujar lotes de píxeles, asignar duración y crear tags. **Es producción programática mediante comandos del editor; no se afirma dibujo manual por un artista.** El [registro de ejecución](arte/produccion/pixelorama-produccion-v1.json) recoge 283 comandos completados.

Pixelorama guardó el editable y exportó las cels. El [empaquetado](../scripts/arte/empaquetar_cuy.py) convirtió la hoja RGBA a un PNG indexado con transparencia y verificó igualdad exacta de los píxeles RGBA antes y después. También produjo el manifiesto del juego y las vistas de revisión. El [script de reconstrucción](../scripts/arte/reconstruir_cuy.py) conserva la repetición de Fixer. Estos scripts contienen rutas del laboratorio de esta computadora; antes de repetirlos en otra máquina hay que preparar las dependencias y adaptar esas rutas.

## Parámetros y archivos

| Parámetro | Primera versión |
|---|---|
| Lienzo por fotograma | 112 × 128 píxeles |
| Punto de apoyo común | x = 56, y = 117, en coordenadas del lienzo |
| Escala en el mundo del juego | 1 |
| Direcciones | Frente de juego con rostro en tres cuartos, espaldas, derecha e izquierda; ambas vistas laterales tienen sus propios fotogramas |
| Ciclos por dirección | 2 fotogramas de reposo a 2 fps; 6 de caminar a 10 fps de referencia |
| Editable | 32 fotogramas, 7 capas anatómicas y 8 tags |
| Capas | Pata lejana, brazo lejano, cuerpo, cabeza, pañuelo, brazo cercano y pata cercana |
| Hoja jugable | 896 × 512, cuadrícula de 8 columnas × 4 filas |
| Color del editable | RGBA con paleta de trabajo de 8 muestras RGB |
| Color de la hoja final | PNG indexado, 7 colores RGB efectivamente visibles más transparencia; alfa 0 o 255 |

Los ocho colores de trabajo están registrados en la verificación, pero solo siete aparecen en los píxeles visibles de esta hoja. **El proyecto nativo sigue en RGBA; crear una paleta en Pixelorama no lo convirtió a modo indexado.** La indexación comprobada corresponde al PNG final y no perdió información respecto de la exportación RGBA. El lienzo incluye margen transparente: el personaje visible mide alrededor de 100 píxeles de alto a escala 1 en la vista de 1280 × 720. Esa escala corresponde al mundo Phaser; `Scale.FIT` sigue ajustando el juego completo a cada pantalla y requiere revisión de nitidez a tamaño real.

Archivos de trabajo y entrega:

- [Editable de la base limpia](../juego/arte/cuy-nino-base-limpia-v1.pxo) y [editable de la animación](../juego/arte/cuy-nino-animado-v1.pxo).
- [Paleta GPL](../juego/arte/cuy-nino-paleta-v1.gpl) y [exportación RGBA conservada](../juego/arte/cuy-nino-animado-v1-export-pixelorama.png).
- [PNG indexado que carga el juego](../juego/public/dibujos/cuy-nino-animado-v1.png) y [manifiesto `kusi-sprite/1`](../juego/public/dibujos/cuy-nino-animado-v1.json).
- [Base limpia](arte/produccion/cuy-nino-base-limpia-v1.png), [cuatro vistas](arte/produccion/cuy-nino-vistas-v1.png), [reposo](arte/produccion/cuy-nino-reposo-v1.gif), [caminar](arte/produccion/cuy-nino-caminar-v1.gif) y [contacto del ciclo](arte/produccion/cuy-nino-ciclo-v1.png), conservados como evidencia histórica.
- Capturas en el mercado: [1280 × 720](arte/produccion/cuy-nino-mercado-v1.png) y [960 × 540 con entrada táctil emulada](arte/produccion/cuy-nino-mercado-tactil-v1.png).
- [Verificación de tamaños, color, transparencia, igualdad sin pérdida y fotogramas](arte/produccion/cuy-nino-verificacion-v1.json).

## Integración y comprobaciones

Phaser carga y valida el manifiesto, separa la hoja por celdas y reproduce el ciclo según dirección y desplazamiento real. Usa filtro nearest neighbor para esta textura y conserva el punto de apoyo. El avance de caminar se relaciona con la distancia recorrida; al quedar bloqueado contra un obstáculo no continúa caminando en el sitio. La dirección izquierda dispone de su propia secuencia, sin voltear la derecha en ejecución. Las colisiones y el recorrido del mercado continúan en el juego existente; el mapa y los vendedores de la ilustración nueva no se integraron en este bloque.

Pasaron **8 pruebas automáticas del juego y el build de Vite**, y después pasó **una prueba táctil adicional: 9 pruebas verificadas en total**, en esas dos ejecuciones. Las pruebas de animación comprueban reproducción en cuatro vistas, transición entre caminar y reposo, anclaje/escala, ausencia de volteo y reposo al empujar la pileta. La verificación del arte registra seis fotogramas de caminar distintos por dirección y un único componente visible con vecindad de ocho píxeles en cada uno de los 32 fotogramas, sin componentes sueltos. Estos controles técnicos no acreditan por sí solos anatomía perfecta, continuidad artística o aceptación infantil.

La [prueba táctil](../juego/pruebas/tactil.spec.js) usó Chromium móvil emulado, `hasTouch`/`isMobile`, a 960 × 540. Comprobó arrastrar el joystick, mantener el control con el primer dedo aunque un segundo tocara y arrastrara dentro de su zona, avance del cuy con el ciclo de espaldas y reposo al soltar, con posición estable durante 200 ms. Es una comprobación de entrada táctil en navegador emulado; no se ejecutó en un dispositivo Android físico ni en la WebView real del juego.

La revisión visual de las vistas y el movimiento terminó en **rechazo**, y la corrección posterior está suspendida. No se comprobó esta versión dentro del **juego real conectado a Android**, incluido un dispositivo físico. El puente de presentación Android sigue siendo una demostración distinta. Tampoco se produjeron en este bloque interacción y celebración, personalización, vendedores, puestos o un nuevo mapa. El kit cartoon propuesto parte de la [guía vigente](ARTE_CARTOON.md), sin exigir caminar ni cuatro vistas. **Sprint 2 continúa abierto** según el [contexto vigente](CONTEXTO_ACTUAL.md) y sus [pendientes por responsable](SPRINT2_PENDIENTES.md).
