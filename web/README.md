# Kusi · Web

Único frontend React con Vite y TypeScript, reutilizado desde `admin-web`.
El diseño sigue el login del cuy hecho por Luis (Rive) y su referencia de panel con estilo de juego.

## Organización

- `src/acceso`: ingreso común y cambio de contraseña temporal mediante Django.
- `src/administracion`: pantallas y navegación administrativas.
- `src/docente`: interior propio y formulario de tema/objetivo y solicitudes; persistencia educativa pendiente de Spring.
- `src/componentes`: piezas compartidas cuando convenga.
- `src/servicios`: clientes de acceso, registro, cuentas, catálogo, adaptador de secciones y solicitudes educativas. Spring conserva la persistencia educativa.

Los servidores comprueban los permisos. Compartir React no obliga a compartir la distribución de ambos paneles.

## Desarrollo local (CMD)

Con Django iniciado en `127.0.0.1:8000`, desde `D:\Escritorio\Kusi\web`:

```cmd
npm run dev
```

Abrir `http://127.0.0.1:5173/` e ingresar con correo y contraseña. El servidor devuelve los roles; con administrador y docente se puede elegir panel. La contraseña temporal debe cambiarse antes de usar funciones protegidas. El rol escolar no concede acceso técnico a `/admin/`.

Vite remite `/api/edu` a Spring en `127.0.0.1:8080`, y el resto de `/api`, `/admin` y `/static` a Django conservando el host y las cookies. Para Django se obtiene CSRF de la sesión y se envía `X-CSRFToken`. Para las solicitudes educativas, Spring debe emitir su propio token en `/api/edu/acceso/csrf/`; el cliente envía `X-XSRF-TOKEN`. La creación de secciones pasa por Django hacia Spring; si el servicio no está configurado se muestra el error y se conserva el formulario.

El formulario docente conserva tema/objetivo ante errores mientras permanece abierto. No permite enviar sin un contexto autorizado. El cliente mantiene un UUID por entrada, consulta una respuesta incierta antes de reintentar y nunca duplica automáticamente una generación. Sin Spring se muestra su indisponibilidad; sin IA configurada el contrato exige guardar la solicitud pendiente, sin contenido ficticio. Las estructuras Spring/Kotlin todavía dependen de Luis.

**Prueba real de IA aplazada por Luis hasta configurar su API key**. No se seleccionó proveedor/modelo ni se hicieron llamadas. Los resultados educativos de las pruebas Node son simulados y están identificados como tales.

Configurar `DJANGO_SECRET_KEY` estable en el proceso Django para conservar sesiones entre reinicios. `CLAVE_INTERNA` y `EDU_API_URL` son configuración del servidor; nunca se incluyen en React. Sin clave estable el desarrollo usa una efímera. El despliegue queda fuera de esta entrega.

## Comprobaciones

```cmd
npm run build
npm run lint
npm test
```

Las pruebas usan Node y TypeScript ya presentes, sin añadir dependencias. Las 15 pruebas originales cubren acceso/registro; las 15 de `tests/propuestas.test.mjs` simulan Spring e IA para comprobar validación, origen del objetivo, CSRF, errores y reintentos seguros. No acreditan persistencia Spring ni generación real. El recorrido visual se comprueba aparte.

Estado por historia y comprobaciones: [ESTADO_SPRINT1.md](../docs/ESTADO_SPRINT1.md). Identidad/sesión: [CONTRATOS_SERVICIOS.md](../docs/CONTRATOS_SERVICIOS.md). Secciones: [HU06_REVISION.md](../docs/HU06_REVISION.md). IA pendiente: [CONTRATO_PROPUESTAS_IA.md](../docs/CONTRATO_PROPUESTAS_IA.md).

## Login con el cuy (Rive) y paneles

- El login (`src/acceso/LoginCuy.tsx`) usa el archivo de Rive **`public/login-cuy.riv`** (artboard y máquina `Login`, ViewModel `Cuy`; contrato en la carpeta `kusi-login-cuarto` del diseño). Copia ese archivo a `web/public/login-cuy.riv`. Si falta o no carga, se muestra la ilustración fija del mismo cuarto y el login funciona igual.
- El motor de Rive (`rive.wasm`) se sirve desde el propio proyecto, no desde un CDN.
- Paleta y fuentes salen del diseño del login: crema `#fdf7ee`, vino `#5a1c15`, dorado `#f8b73e`, terracota `#c6441d`; Fredoka para títulos y Nunito para texto (`src/index.css`).
- Los paneles de administrador y docente comparten `src/componentes/Tablero.tsx` (menú lateral, perfil y barra superior). Las imágenes están en `src/assets/kusi/`.
