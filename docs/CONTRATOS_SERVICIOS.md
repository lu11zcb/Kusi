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

Spring debe respetar el TTL devuelto, nunca superar 60 segundos ni la expiración de la sesión y volver a validar al vencer. Después debe comprobar el rol para cada operación y la pertenencia del usuario a cada recurso: conocer un UUID no autoriza a consultar o modificar cursos, grupos o actividades ajenos. No escribir en tablas del otro esquema. La caché puede retrasar hasta ese límite la observación de una revocación.

## Configuración local

`DJANGO_SECRET_KEY` debe ser un secreto estable configurado en el entorno del servicio. Sin él se genera una clave efímera para desarrollo: reiniciar el proceso invalida las sesiones. `CLAVE_INTERNA` se configura en los servicios, nunca con prefijo `VITE_` ni en archivos versionados. No se imprime ni se añade un valor real al repositorio.

## Dependencias pendientes

El lado Django y las pruebas del contrato están implementados. La validación desde Spring y el ingreso desde Kotlin se comprobarán después de que Luis cree y confirme sus estructuras. No se presenta una simulación de estas integraciones como un recorrido real.
