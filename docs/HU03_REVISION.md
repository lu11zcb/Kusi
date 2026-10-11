# HU03 · Mantener el catálogo

Implementada y comprobada el 11 de octubre de 2026; pendiente de revisión humana.

Django conserva el catálogo en el esquema administrativo. Una migración crea los siete cursos exigidos con UUID publicados y estables. El administrador consulta y renombra desde React; no hay eliminación ni recreación de cursos al reiniciar. Spring deberá referenciar el UUID, nunca el nombre.

Comprobaciones: cinco pruebas nuevas (44 Django al completar HU03; 50 tras incorporar HU04), catálogo inicial, duplicados sin distinguir mayúsculas, UUID conservado, permisos en API directa y CSRF. Build y lint aprobados. En Chrome con PostgreSQL desechable se consultaron los siete cursos, se rechazó `comunicación` duplicado y se guardó `Matemática QA`. Los vínculos con actividades Spring no pudieron probarse porque `edu-api` sigue pendiente; el identificador sí se comprueba por API y persistencia.

Después de comprobarlas en las bases aisladas se aplicaron las migraciones 0002–0004 en la base de trabajo `kusi`: las tres finalizaron correctamente, se conservó la cuenta existente y el catálogo quedó con siete cursos. Diseño final y revisión del compañero pendientes.
