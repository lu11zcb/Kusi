# HU06 · Crear secciones · parcial

El 11 de octubre de 2026 se prepararon el formulario React y el adaptador Django → Spring. Django comprueba administrador, sesión, contraseña definitiva, CSRF, grado primero, nombre y año. No crea tablas ni guarda secciones. Sin `EDU_API_URL` y `CLAVE_INTERNA` falla cerrado con 503. El formulario conserva nombre y año ante un fallo.

Contrato para Spring: `POST /interno/secciones/`, JSON `{grado: 1, nombre: texto, anio_escolar: entero de cuatro cifras}`. Encabezados internos `X-Clave-Interna` y `X-Sesion-Kusi`; Spring debe validar ambos y el rol mediante Django. 201 `{seccion: {id: UUID, grado, nombre, anio_escolar}}`; 409 si el nombre normalizado ya existe en ese año. Normalización: quitar espacios exteriores, compactar espacios interiores y comparar sin distinguir mayúsculas. La restricción debe estar en PostgreSQL edu, incluida la concurrencia. El mismo nombre en otro año está permitido.

El adaptador no sigue redirecciones, limita tamaño de respuesta, usa timeout y no expone respuestas internas ni credenciales. Un fallo ambiguo avisa que se compruebe lo guardado antes de reintentar. El 503 sin configuración no significa que exista una sección.

Seis pruebas de contrato con transporte simulado aprobadas dentro de las 56 pruebas Django. Build y lint de React aprobados. **Pendiente:** Luis crea y confirma `edu-api`; implementar migraciones y servicio Spring, configurar comunicación, comprobar persistencia, duplicados y permisos de extremo a extremo. No se considera terminada HU06. No se implementan vinculaciones de estudiantes ni asignaciones docentes de Jesús.

Chrome con la base desechable `test_kusi_navegador_2a120bdfcb`: se envió el formulario sin servicio configurado, se mostró el 503 con mensaje legible y se conservaron nombre y año escolar. No se mostró una confirmación ficticia de creación.
