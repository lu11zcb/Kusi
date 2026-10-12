# Mensaje preparado para Jesús · no enviado

Jesús, en `main` están disponibles el único frontend `web`, el registro HU01, roles HU02, catálogo HU03 y edición de usuarios HU04. Django tiene el ingreso común, cambio obligatorio de contraseña temporal, cierre de sesión y el contrato de validación interna para Spring. También están el formulario administrativo de secciones y el cliente docente de tema/objetivo y solicitudes con reintentos seguros.

Se repitieron 58 pruebas Django y 30 del cliente, build, lint y comprobación de migraciones. Quince pruebas nuevas del cliente simulan Spring/IA expresamente; no acreditan persistencia educativa. **Prueba real de IA aplazada por Luis hasta configurar su API key**. Ese aplazamiento no impide avanzar en código y pruebas aisladas.

Te corresponde completar **HU05 Activar/desactivar cuentas, HU07 Vincular estudiantes a una sección, HU15 Mensajes de error claros y HU08 Asignar docentes a cursos**. No se han implementado esas historias en este bloque.

Contratos y dependencias que necesitas:

- [CONTRATOS_SERVICIOS.md](CONTRATOS_SERVICIOS.md): Django es autoridad de cuentas, roles y catálogo, con UUID estables. Spring valida la sesión opaca con `POST /api/interno/sesiones/validar/`, clave solo de servidor, y después comprueba rol y recurso. Cuenta inactiva, contraseña temporal, caducidad y salida deben impedir operaciones protegidas. El administrador escolar no equivale a privilegios técnicos Django.
- [HU06_REVISION.md](HU06_REVISION.md): el formulario pasa por Django hacia `POST /interno/secciones/`. **La persistencia real de secciones sigue pendiente de Spring**, de modo que HU07 necesita esa integración antes de probar su recorrido completo. Nombre normalizado único dentro del año, UUID y primero de primaria.
- [CONTRATO_PROPUESTAS_IA.md](CONTRATO_PROPUESTAS_IA.md): la consulta de contexto solo devuelve asignaciones vigentes del docente; HU08 debe conservar los UUID Django y permitir que Spring compruebe esos vínculos por recurso. Las asignaciones ficticias están autorizadas exclusivamente para pruebas, sin conceder acceso general ni dar por implementada HU08. No se ha dado por terminada HU17.
- [PREPARAR_EDU_Y_MOVIL.md](PREPARAR_EDU_Y_MOVIL.md): Luis sigue creando las estructuras iniciales de Spring y Kotlin; actualmente siguen vacías. HU11 Spring/Kotlin, persistencia HU06 y backend HU18/HU16 esperan esa confirmación. No generes otra estructura sin coordinarlo con Luis. La falta de API key no es ese bloqueo.

Puedes avanzar en las tareas independientes de cuentas y errores sobre lo disponible, conservando el trabajo de ambos y coordinando los archivos compartidos. Para secciones/asignaciones necesitamos primero las estructuras e integración indicadas. El diseño final y la revisión humana siguen pendientes; no se afirma que las ocho historias del domingo estén terminadas. No inicies las historias del lunes por este aviso.
