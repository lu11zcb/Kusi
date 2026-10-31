# Kusi · producto y alcance vigente

Actualizado el 27 de octubre de 2026 · lu11zcb · luiscb.once@gmail.com.

Kusi prepara experiencias educativas de juego para primero de primaria en Perú. La intervención real de IA en su creación es un objetivo central; no se reduce a dibujar pantallas. Los beneficios educativos son objetivos que requieren evaluación, no resultados demostrados por el diseño.

## Usuarios y arquitectura

- Administración: cuentas/roles, estudiantes/docentes, secciones, cursos y relaciones escolares; React y Django, con operaciones educativas en Spring.
- Docentes: cursos/grupos autorizados; tema, propósito, instrucciones y objetivo opcional; revisión completa de propuestas, edición y versiones.
- Niños: aplicación nativa Kotlin/Compose, acceso por DNI, cuy guía y aventuras autorizadas. No se permite elegir una identidad ni un juego ajeno desde datos del navegador.
- PostgreSQL compartido, esquemas separados. Contratos y permisos vigentes se conservan.

## IA y juego

El adaptador configurable de IA crea propuestas y guiones de laberinto. El equipo programa el reproductor, los controles y los validadores. La IA produce contenido y paquetes dentro del kit del equipo (N1). La programación del juego por IA mediante un kit (N3) sigue como objetivo posterior.

El docente revisa y aprueba la propuesta antes de generar el guion. Spring comprueba el paquete y puede pedir correcciones o aplicar mapas de respaldo; el panel conserva la procedencia y los problemas encontrados. El docente prueba y envía el juego. Android consulta la biblioteca autorizada, abre el laberinto en WebView y registra los avisos de partida. El JSON de demostración y las pruebas simuladas se mantienen para desarrollo; la actividad Android de presentación fue retirada.

## Incremento actual

Administración, docencia y el recorrido del estudiante están integrados. El laberinto admite patrones y clasificación de frutas o verduras, ayudas, voz, enemigos y cierre. El fondo comparte la vista desde arriba del mapa y anima vegetación mediante sprites. Los controles, la barra de objetivos y la exploración del zorro se describen en la [guía del juego](juego/README.md).

El [informe de cierre del Sprint 2](docs/historial/sprint-2/INFORME-CIERRE-SPRINT2.md) reúne las comprobaciones de integración. El [avance del 20](docs/historial/sprint-2/AVANCE_20_OCTUBRE.md) y su [verificación](docs/historial/sprint-2/VERIFICACION_20_OCTUBRE.md) se conservan como documentos históricos.
