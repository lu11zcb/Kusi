# Revisión automática de la interfaz provisional

Fecha: 11 de octubre de 2026.

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
