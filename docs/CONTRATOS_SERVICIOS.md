# Contratos Django, Spring y clientes

Implementación del 11 de octubre de 2026. Los contratos educativos no acreditan una implementación Spring: Luis conserva la creación de `edu-api` y `movil`.

## Identidad y sesión · HU11

Django es la autoridad de cuentas y roles. La sesión es opaca en cookie `sessionid`, HttpOnly; no hay JWT ni claves internas en React. Los correos se normalizan al ingresar. Credenciales incorrectas y cuentas inactivas reciben el mismo mensaje: `Correo o contraseña incorrectos`.

| Ruta Django | Método / datos | Resultado |
|---|---|---|
| `/api/acceso/sesion/` | GET | `{usuario: null o cuenta, csrf_token}`. Emite CSRF también sin sesión. |
| `/api/acceso/ingreso/` | POST `{correo, contrasena}` | Autentica y rota sesión/CSRF; devuelve cuenta y token actualizado. 401 para credenciales inválidas. |
| `/api/acceso/salida/` | POST `{}` | Invalida sesión y devuelve `{usuario: null, csrf_token}`. |
| `/api/acceso/contrasena/` | POST `{contrasena_actual, nueva_contrasena, confirmacion}` | Requiere sesión y contraseña actual, valida la nueva y elimina la obligación temporal. Conserva esta sesión y renueva su hash; las otras sesiones dejan de validarse. |

Cuenta: `{id: UUID, nombre, correo, roles: string[], debe_cambiar_contrasena: boolean}`. Los roles reconocidos son `administrador`, `docente`, `estudiante`. El cliente web elige panel solo después de autenticar; si tiene ambos roles adultos, permite elegir. Un estudiante autenticado no recibe un panel web. El acceso Kotlin está pendiente de la estructura móvil.

Todos los POST de navegador exigen CSRF. React obtiene un token actual del GET de sesión, envía cookies del mismo origen y `X-CSRFToken`. Las respuestas de acceso no se guardan en caché. Las operaciones protegidas rechazan cuentas con contraseña temporal pendiente. No se concede `is_staff` ni `is_superuser` por ser administrador escolar.

## Validación interna de sesión

Spring recibe la cookie de sesión del cliente y consulta exclusivamente desde su servidor:

`POST /api/interno/sesiones/validar/`

- Encabezado `X-Clave-Interna`: valor de `CLAVE_INTERNA` configurado en ambos procesos.
- JSON: `{sesion: valor opaco de sessionid}`.
- 200: `{usuario: cuenta, cache_maxima_segundos: número entre 0 y 60}`.
- 401: sesión inexistente, vencida, invalidada, cuenta inactiva o hash de contraseña ya cambiado.
- 403: clave interna incorrecta o cambio de contraseña temporal pendiente.
- 503: `CLAVE_INTERNA` no está configurada; el endpoint falla cerrado.

Solo este endpoint de servicio se excluye de CSRF: se autentica mediante clave interna y no autoriza por la cookie de la petición. La protección de los endpoints de navegador permanece activa. Nunca registrar la clave ni la sesión opaca. En producción, transportar por TLS y limitar el acceso a los servicios; no hay despliegue en este encargo.

Django calcula el TTL con la fecha de expiración de la fila persistida en PostgreSQL, redondeando hacia abajo y limitándolo a 60 segundos. Una fila vencida o eliminada produce 401; no se utiliza la duración predeterminada de una sesión para ampliar su vigencia. Las pruebas también comprueban los roles actuales y la invalidación de otras sesiones tras cambiar la contraseña.

Spring debe respetar el TTL devuelto, nunca superar 60 segundos ni la expiración de la sesión y volver a validar al vencer. Después debe comprobar el rol para cada operación y la pertenencia del usuario a cada recurso: conocer un UUID no autoriza a consultar o modificar cursos, grupos o actividades ajenos. No escribir en tablas del otro esquema. La caché puede retrasar hasta ese límite la observación de una revocación.

## Configuración local

`DJANGO_SECRET_KEY` debe ser un secreto estable configurado en el entorno del servicio. Sin él se genera una clave efímera para desarrollo: reiniciar el proceso invalida las sesiones. `CLAVE_INTERNA` se configura en los servicios, nunca con prefijo `VITE_` ni en archivos versionados. No se imprime ni se añade un valor real al repositorio.

## Estado de Spring y HU07/HU08

Se añadió el módulo `edu-api` con Spring Boot en este paquete. Implementa persistencia educativa para secciones, vínculos estudiante-sección y asignaciones docente-curso-sección-año, validación de sesión con Django y consultas internas de cuentas/cursos. Los adaptadores Django reenvían solicitudes con la clave interna y la sesión; React incorpora formularios administrativos y el panel docente consulta únicamente sus asignaciones. La integración debe ejecutarse y probarse de extremo a extremo en el entorno local antes de considerarse aceptada.

## Cuentas y catálogo · HU02/HU03/HU04

Todas estas rutas Django exigen administrador activo con contraseña definitiva. Las escrituras exigen CSRF. No basta con ocultar botones en React.

| Ruta | Método / datos | Resultado |
|---|---|---|
| `/api/cuentas/usuarios/listado/?buscar=texto&pagina=1` | GET | `{usuarios, pagina, paginas, total}`, hasta 25 cuentas por página. Sin contraseñas. |
| `/api/cuentas/usuarios/{uuid}/` | GET | `{usuario, historial}`; últimos 50 cambios con actor, fecha y valores anteriores/nuevos. El historial completo se conserva. |
| `/api/cuentas/usuarios/{uuid}/roles/` | POST `{roles: [...]}` | Administrador, docente, ambos o estudiante solo. No modifica privilegios técnicos. |
| `/api/cuentas/usuarios/{uuid}/datos/` | PATCH `{nombre, correo}` | Valida correo único sin distinguir mayúsculas; conserva UUID, contraseña, roles e historial. |
| `/api/cuentas/cursos/` | GET | `{cursos: [{id: UUID, nombre}]}`. Catálogo propiedad de Django. |
| `/api/cuentas/cursos/{uuid}/` | PATCH `{nombre}` | Renombra conservando UUID; rechaza nombre repetido. |

## Secciones e IA pendientes

El adaptador administrativo de secciones no persiste datos: [HU06_REVISION.md](HU06_REVISION.md) define rutas, permisos, duplicados y configuración pendiente. El cliente docente consume las rutas futuras Spring de contexto, CSRF y solicitudes definidas en [CONTRATO_PROPUESTAS_IA.md](CONTRATO_PROPUESTAS_IA.md). La propiedad y asignación vigente se comprueban en Spring para cada lectura/escritura, no por la opción seleccionada en React. Se autorizan contextos/asignaciones ficticios exclusivamente para pruebas de integración, sin implementar HU08 ni otorgar permisos generales.

**Prueba real de IA aplazada por Luis hasta configurar su API key**. Las simulaciones están solo en pruebas. El proveedor/modelo no está elegido y su ausencia no bloquea implementación ni simulación. Las estructuras Spring/Kotlin siguen reservadas a Luis y aún no se han generado: esta es la dependencia pendiente de sus implementaciones. El aviso para Jesús está preparado, sin enviar, en [AVISO_JESUS_DOMINGO.md](AVISO_JESUS_DOMINGO.md).
