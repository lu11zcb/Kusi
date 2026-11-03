# Kusi · producto y alcance vigente

20 de octubre de 2026 · lui11zcb · luiscb.once@gmail.com.

Kusi prepara experiencias educativas de juego para primero de primaria en Perú. La intervención real de IA en su creación es un objetivo central; no se reduce a dibujar pantallas. Los beneficios educativos son objetivos que requieren evaluación, no resultados demostrados por el diseño.

## Usuarios y arquitectura

- Administración: cuentas/roles, estudiantes/docentes, secciones, cursos y relaciones escolares; React y Django, con operaciones educativas en Spring.
- Docentes: cursos/grupos autorizados; tema, propósito, instrucciones y objetivo opcional; revisión completa de propuestas, edición y versiones.
- Niños: aplicación nativa Kotlin/Compose, acceso por DNI, cuy guía y aventuras autorizadas. No se permite elegir una identidad ni un juego ajeno desde datos del navegador.
- PostgreSQL compartido, esquemas separados. Contratos y permisos vigentes se conservan.

## IA y juego

El adaptador Groq crea propuestas textuales. El equipo programa el reproductor, controles y validadores. El nivel garantizado previsto para Sprint 2 es N1: IA produce contenido y paquetes dentro del kit del equipo. N3, programación del juego por IA mediante un kit, sigue como objetivo/experimento posterior; no se presenta N1 como N3.

Procesar el JSON de ejemplo en Spring es una simulación identificada, no una llamada al generador de paquetes. Las cuatro ilustraciones móviles son recursos de diseño con procedencia. Biblioteca autorizada, WebView de juego y registro real de eventos todavía deben conectarse; las dos aventuras de la actividad debug no se muestran como datos del alumno en la app normal.

## Incremento actual

Administración y docencia rediseñadas e integradas. Android implementa el recorrido visual de Sprint 2 con estados, iconos, letra local y botones táctiles; cuenta con un modo de presentación claramente identificado. Para el avance de hoy se muestran estas partes y las correcciones de Sprint 1, con los límites registrados. HU46 queda fuera del avance por indicación de Luis y se retoma el viernes 23; el burndown se omite en esta revisión por su indicación posterior.

El avance del 20 no acredita cierre del Sprint 2 del 27. [Diseño](DESIGN.md), [avance](docs/AVANCE_20_OCTUBRE.md), [verificación](docs/VERIFICACION_20_OCTUBRE.md).
