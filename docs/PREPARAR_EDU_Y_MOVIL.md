# Estructuras iniciales reservadas a Luis

Comprobación del 11 de octubre de 2026: `edu-api` y `movil` siguen vacías. Este documento describe lo que debe crear Luis; no se han generado estructuras alternativas. Después de crearlas, Luis confirma que están listas y se retoma la implementación dentro de ellas.

## edu-api · Spring Initializr

En [Spring Initializr](https://start.spring.io/):

| Campo | Configuración |
|---|---|
| Project / Language | Maven / Java |
| Spring Boot | Versión estable ofrecida por Initializr, sin SNAPSHOT ni RC |
| Group | `pe.kusi` |
| Artifact / Name | `edu-api` |
| Package name | `pe.kusi.edu` |
| Packaging / Java | Jar / 21 |
| Dependencies | Spring Web, Validation, Spring Security, Spring Data JPA, PostgreSQL Driver, Flyway Migration |
| Destino | `D:\Escritorio\Kusi\edu-api` |

Extraer el proyecto directamente en ese destino, sin una segunda carpeta `edu-api` anidada. Deben quedar allí `pom.xml`, `mvnw.cmd`, `.mvn` y `src`. Java 21 ya está instalado; no hace falta instalar Maven global para usar el wrapper.

Después de la confirmación se configurarán puerto 8080, conexión PostgreSQL compartida, esquema `edu`, migraciones Flyway y validación del esquema por JPA, sin escribir tablas de Django. Se revisará la dependencia específica de Flyway para PostgreSQL conforme a la [documentación de Spring Boot](https://docs.spring.io/spring-boot/how-to/data-initialization.html). No hace falta que Luis cree manualmente entidades, controladores o migraciones.

## movil · Android Studio

Crear un proyecto con la plantilla **Empty Activity de Jetpack Compose**, conforme a la [configuración oficial de Compose](https://developer.android.com/develop/ui/compose/setup):

| Campo | Configuración |
|---|---|
| Name | `Kusi` |
| Package name | `pe.kusi.movil` |
| Language | Kotlin |
| Build configuration language | Kotlin DSL |
| Minimum SDK | API 26 |
| Save location | `D:\Escritorio\Kusi\movil` |

Conservar las versiones compatibles generadas por Android Studio. Deben existir `settings.gradle.kts`, `gradlew.bat`, `gradle/wrapper` y el módulo `app` dentro de `movil`, sin otra carpeta de proyecto intermedia. Android Studio y el SDK ya están instalados. `local.properties`, claves y archivos de firma permanecen locales.

Después de la confirmación se implementará el acceso de estudiante de HU11 contra Django, con cookies, CSRF, contraseña temporal y cierre de sesión. La comunicación hacia Spring usará la misma identidad validada por el servidor. El diseño será provisional; no se añaden HU12/HU13 ni otras historias de Jesús.

## Configuración entre servicios e IA

La configuración de conexión se completará después de disponer de las estructuras, sin añadir secretos a los manifiestos:

- Django: `EDU_API_URL=http://127.0.0.1:8080` y una `CLAVE_INTERNA` local.
- Spring: dirección del Django local, la misma clave interna y conexión PostgreSQL; los nombres finales se documentarán junto con la implementación real.
- IA: Luis configurará su credencial el lunes 12 o martes 13. Hoy se prepara el código y se comprueba con simulaciones exclusivamente en pruebas, sin pedir la clave ni llamar al proveedor. El proveedor/modelo aún no están confirmados: no se elige uno ni se activa una conexión por defecto.

La inspección previa no detectó una configuración utilizable de IA. No se repitieron consultas a proveedores después del cambio de instrucción. **Prueba real de IA aplazada por Luis hasta configurar su API key**.

No se descargaron modelos, contrataron servicios ni realizaron llamadas de generación. Las credenciales solo pertenecen al backend y quedan fuera de Git y de React. Al confirmar las estructuras se implementarán HU11/HU06 y la persistencia, validaciones y adaptador configurable HU18/HU16 con pruebas simuladas. La API key no es requisito para ese trabajo. La prueba real seguirá pendiente hasta que Luis configure su integración; este documento no declara terminadas las historias.
