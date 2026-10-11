# HU04 · Editar datos de usuarios

Implementada y comprobada el 11 de octubre de 2026; pendiente de revisión humana.

El administrador edita nombre y correo desde Usuarios y roles. Django valida formato, longitud y unicidad del correo sin distinguir mayúsculas; conserva UUID, roles, contraseña e historial. Datos y registro del cambio se guardan juntos: un fallo del historial revierte toda la edición. No se aceptan contraseña, estado ni privilegios técnicos en esta operación.

Comprobaciones: seis pruebas nuevas, 50 Django aprobadas con `settings_pruebas`; `check` correcto y `makemigrations --check --dry-run` sin cambios. Build y lint con salida 0; 15 pruebas del cliente aprobadas. En Chrome, base desechable `test_kusi_navegador_2c440df67b`: correo duplicado en mayúsculas rechazado junto al campo; edición válida guardada, correo normalizado, nueva búsqueda con los datos actualizados e historial anterior/nuevo visibles. No se editaron cuentas de `kusi`.

El historial completo permanece en PostgreSQL. La pantalla muestra los últimos 50 cambios de la cuenta. No se expone el hash ni se ofrece recuperar contraseñas. Diseño final y revisión del compañero pendientes.
