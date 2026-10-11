# HU02 · Asignar roles

Implementada en Django y React el 11 de octubre de 2026, pendiente de revisión humana.

- El administrador busca cuentas y asigna administrador, docente, ambos o estudiante solo.
- Django exige sesión activa, rol administrador, contraseña definitiva y CSRF; una llamada directa sin permiso se rechaza. Nunca se modifican `is_staff`, `is_superuser` ni grupos técnicos al asignar roles escolares.
- Los cambios se guardan en una transacción junto con actor, fecha y roles anteriores/nuevos. Repetir el mismo conjunto no duplica el historial.
- 39 pruebas Django aprobadas con `settings_pruebas` (33 anteriores y 6 nuevas). Build aprobado y lint completo con salida 0, después de corregir una actualización de estado dentro de un efecto.
- Chrome, base desechable `test_kusi_navegador_52a05563bc`: búsqueda de cuenta docente, asignación administrador/docente, confirmación e historial comprobados. No se modificaron cuentas de la base `kusi`.

Spring debe usar los roles validados y verificar recursos propios; su integración sigue pendiente de la estructura reservada a Luis. Diseño final y revisión del compañero pendientes.
