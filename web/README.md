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

## Login con el cuy (Rive) y paneles

- El login (`src/acceso/LoginCuy.tsx`) usa el archivo de Rive **`public/login-cuy.riv`** (artboard y máquina `Login`, ViewModel `Cuy`; contrato en la carpeta `kusi-login-cuarto` del diseño). Copia ese archivo a `web/public/login-cuy.riv`. Si falta o no carga, se muestra la ilustración fija del mismo cuarto y el login funciona igual.
- El motor de Rive (`rive.wasm`) se sirve desde el propio proyecto, no desde un CDN.
- Paleta y fuentes salen del diseño del login: crema `#fdf7ee`, vino `#5a1c15`, dorado `#f8b73e`, terracota `#c6441d`; Fredoka para títulos y Nunito para texto (`src/index.css`).
- Los paneles de administrador y docente comparten `src/componentes/Tablero.tsx` (menú lateral, perfil y barra superior). Las imágenes están en `src/assets/kusi/`.

## Resultados de la clase

En `http://127.0.0.1:5173/`, entrar como docente y abrir **Resultados**. Elegir una actividad enviada para consultar a sus estudiantes: **Sin iniciar**, **En curso** o **Completada**. Se puede buscar por nombre y filtrar por estado. **Ver respuestas** abre las partidas, los retos, la primera respuesta y las correcciones. Cada respuesta muestra **Sin ayuda**, **Ayuda 1** o **Ayuda 2**; las ayudas no se convierten en puntos. El juego jugado se reconoce por su envío y su fecha, sin mostrar identificadores técnicos ni segundos.

El panel consulta las rutas de Spring `/api/edu/resultados/actividades/`, `.../{actividad}/estudiantes/` y `.../{actividad}/estudiantes/{estudiante}/`. El servidor exige el rol docente, la propiedad de la actividad y la asignación vigente al curso, sección y año. El rol administrador también se rechaza cuando la cuenta tiene ambos roles. Todas estas respuestas usan `Cache-Control: no-store`.

**Integración del registro:** al guardar los avisos de una actividad, el anfitrión debe añadir `juego_id` con el identificador del juego que abrió. Spring comprueba que esté publicado y asignado al estudiante, conserva ese vínculo en los avisos de la partida y rechaza cambiarlo. `reto` permite identificar un reto de cualquier familia; si falta, se utiliza `nivel`. Las respuestas usan `respuesta` y `correcto`; se admite `objeto` para los avisos anteriores del laberinto. El orden del emisor conserva la secuencia de respuestas y ayudas aunque lleguen tarde. Reenviar el mismo aviso no lo cuenta dos veces.

Los avisos antiguos sin juego asociado y las pruebas docentes se conservan y quedan fuera del informe. Los estudiantes vinculados después del envío no se incorporan a ese envío; un envío posterior puede incluirlos. La app debe adjuntar `juego_id` para que sus partidas nuevas aparezcan aquí: el panel no puede deducirlo de los avisos anteriores.

Para las capturas: tomar la lista con los tres estados y el detalle de un estudiante con una primera respuesta incorrecta, una corrección y ambas ayudas. La evidencia automática se encuentra en `tests/resultados.test.mjs` y en `edu-api` (`ResultadosTest`, `RespuestasPartidaTest` y `CorreccionesJuegoTest`). Estas pruebas usan datos ficticios; las capturas del recorrido real se toman por separado.

## Juegos nuevos del taller

Una propuesta que no es un laberinto la crea el taller (ver `juego/taller/README.md`). Para el panel cambia poco:

- `src/servicios/generaciones.ts` acepta el guion de un juego del taller: otra familia (minúsculas, sin tildes, con guion bajo) con el `trabajo` del que salió, su procedencia `{ origen: 'taller', trabajo, intentos, segundos }`, la etapa `taller` y el campo `taller` de la generación. El laberinto sigue igual y nunca trae `trabajo`.
- Si la generación es del taller, el panel no llama a «procesar»: consulta su estado cada 5 segundos (`INTERVALO_TALLER_MS`) y muestra «Kusi está creando tu juego», sin pasos, errores ni nombres de IA. Cuando está lista, la vista previa la abre como a un laberinto.
- Si no sale, el docente ve «Tu juego quedó por terminar» con el botón «Intentarlo de nuevo», que prepara otra generación (también en el laberinto).
- Pruebas: las de «Los juegos del taller» en `tests/generaciones.test.mjs` y `tests/vista-generacion.test.mjs`.

> **Para revisar (responsable del panel):** este cambio lo hizo Luis el 10 de noviembre, fuera del rediseño del panel. Falta su revisión.
