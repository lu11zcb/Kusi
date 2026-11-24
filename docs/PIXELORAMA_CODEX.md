# Pixelorama y Codex: instalación local comprobada

22 de octubre de 2026 · lui11zcb · luiscb.once@gmail.com.

**Actualización de continuidad, 23 de octubre:** esta integración se conserva como herramienta y evidencia histórica. Luis pasa a [cartoon 2D](ARTE_CARTOON.md) y propone una [demostración personal con trabajador local](PLAN_DEMO_PERSONAL_CARTOON.md); Pixelorama/Fixer no son pasos obligatorios de esa ruta. V1 y paso 02 fueron rechazados visualmente; su corrección está suspendida. No retomar poses por este procedimiento técnico ni por la disponibilidad del puente. No se operó el editor en esta actualización documental.

Pixelorama **1.2.3 para Windows x64** está instalado y el puente MCP fue compilado, instalado y probado con un cliente MCP real. Se registró el servidor global `pixelorama` en Codex. **La conexión ya se puede utilizar desde este chat mediante el cliente MCP local**, sin exigir al usuario una recarga manual. Después de que Luis abrió Pixelorama, se consultaron correctamente `get_canvas_info` y `list_canvases`: inicialmente un lienzo «sin título» de 64 × 64, una capa, un fotograma y sin guardar. Esas consultas fueron de lectura. Posteriormente se produjeron la base y las animaciones del avatar en proyectos separados; ver la [producción del cuy](PRODUCCION_CUY_NINO.md).

El inventario del chat del 23 ya expone herramientas `mcp__pixelorama`, comprobado mediante sus metadatos. El cliente local descrito abajo conserva el procedimiento anterior. La disponibilidad en inventario no es una nueva prueba de conexión con el editor ni una autorización de edición; comprobar el estado por lectura cuando exista un encargo concreto, sin pedir una recarga rutinaria al usuario.

## Componentes y rutas de esta computadora

| Componente | Ruta |
|---|---|
| Pixelorama | `D:/Escritorio/Pixelorama-Windows-64bit/Pixelorama-Windows-64bit/Pixelorama.exe` |
| Datos del editor | `C:/Users/luis/AppData/Roaming/pixelorama/` |
| Extensión habilitada | `C:/Users/luis/AppData/Roaming/pixelorama/extensions/PixMcpBridge.zip` |
| Laboratorio y servidor | `C:/Users/luis/.codex/visualizations/2026/10/22/01a16598-c7d1-7310-8edd-1052663828ab/pixelorama-mcp/` |
| Entrada MCP | `source/mcp-server/dist/index.js`, dentro del laboratorio |
| Node usado | `C:/Program Files/nodejs/node.exe`, versión 24.19.0 |
| Configuración de Codex | `C:/Users/luis/.codex/config.toml`, servidor `pixelorama` |

El servidor comunica por stdio con Codex y por HTTP autenticado con la extensión, que escucha en `127.0.0.1:7373`. La variable `PIX_MCP_TOKEN_FILE` apunta al archivo local `pix_mcp_token.txt` dentro de los datos de Pixelorama. El valor del token no está en el repositorio ni en las evidencias.

La carpeta `pixelorama_data` junto al ejecutable contiene recursos; el directorio de usuario observado es el de AppData de la tabla. No mover el ejecutable o el laboratorio sin actualizar las rutas correspondientes de configuración.

## Procedencia y adaptación

Se utilizó [abidoo22/Pixelorama-MCP](https://github.com/abidoo22/Pixelorama-MCP), proyecto comunitario con licencia MIT, commit **`56fd8aa94c0905591bd2515fe9823eb70d4496d2`**. Su paquete y manifest declaran 0.2.1, aunque el endpoint de salud y el servidor MCP todavía informan 0.2.0. La extensión admite API 9, la utilizada por Pixelorama 1.2.3.

Se empaquetaron fuentes GDScript en un ZIP con la estructura admitida por Pixelorama; no se utilizó el `.pck` precompilado ni el script de empaquetado del autor. La copia local añade autenticación con un token, rechaza solicitudes con `Origin`, elimina CORS abierto y retira la herramienta de ejecución arbitraria `eval_gdscript` del registro. También limita encabezados y tamaño de solicitudes. Se conserva el [parche de esos cambios](arte/evidencias/pixelorama-mcp-local.patch).

Instalación de dependencias: `npm ci --ignore-scripts --no-audit --no-fund` con caché local; compilación explícita con `npm run build`. No se instalaron dependencias globales. Los respaldos previos de configuración de Pixelorama y Codex están en `backups/` dentro del laboratorio. Los scripts `prepare_install.py` y `source/mcp-server/test-connection.mjs` conservan el procedimiento local.

## Prueba realizada

Se ejecutó Pixelorama sin ventana y se usó el SDK MCP de Node para conectar con el servidor stdio. Resultados:

- Pixelorama respondió como `v1.2.3-stable`, API 9; MCP enumeró **105 herramientas**, sin `eval_gdscript`.
- Se creó un proyecto nuevo de **16 × 16**, se escribió un píxel coral y se comprobó su RGBA exacto al leerlo.
- Se añadió un segundo fotograma y se escribió otro píxel en él.
- Se guardó el proyecto editable `.pxo` y se exportaron un PNG de **16 × 16** y una hoja de sprites de **32 × 16** con dos fotogramas. Se comprobaron existencia, firma PNG, dimensiones y tamaño no vacío del editable.
- Las solicitudes sin autenticación respondieron **401**; las que incluían `Origin` de navegador respondieron **403**.
- Pixelorama terminó la prueba normalmente mediante `--quit-after`; el log registra el cierre del hilo y del servidor de la extensión.

El [informe de verificación](arte/evidencias/pixelorama-mcp-verificacion.json) conserva las respuestas. Los archivos de prueba están en `connection-test/` dentro del laboratorio. Son dos píxeles de prueba, no arte del cuy ni una animación aprobada. El arranque sin ventana emitió diagnósticos de shaders del renderizador dummy de Godot; las operaciones descritas funcionaron. Esta prueba no verifica la apariencia de la interfaz ni el renderizado interactivo.

## Producción posterior del avatar

La conexión ya se utilizó para producir el cuy mediante recetas ejecutadas como comandos nativos de Pixelorama: `create_canvas`, `create_palette`, `add_frame`, `add_layer`, `draw_pixels`, duraciones y tags. El [registro de producción](arte/produccion/pixelorama-produccion-v1.json) recoge 283 comandos completados. Se conservaron [base editable](../juego/arte/cuy-nino-base-limpia-v1.pxo) y [animación editable](../juego/arte/cuy-nino-animado-v1.pxo) de 112 × 128, 7 capas, 32 fotogramas y 8 tags, además de la hoja integrada en Phaser. Es producción programática por comandos del editor; no acredita dibujo manual ni aprobación de las nuevas vistas por Luis.

El proyecto nativo es RGBA con 8 muestras de trabajo. La exportación final PNG se indexó sin pérdida y utiliza 7 colores RGB visibles más transparencia; el [informe](arte/produccion/cuy-nino-verificacion-v1.json) conserva esas comprobaciones. Crear la paleta del proyecto no activa automáticamente un modo indexado. `import_image` del puente descarta el alfa parcial; para cels con alfa exacto usar la importación de spritesheet RGBA o lotes de píxeles con color `#rrggbbaa`, `blend: false` y destino explícito.

## Procedimiento técnico conservado, solo para un encargo explícito

1. Abrir Pixelorama con su ejecutable habitual.
2. Consultar el proyecto activo antes de editar. El asistente puede hacerlo desde este chat con `node call-tool.mjs get_canvas_info`, ejecutado en `source/mcp-server/` dentro del laboratorio. `node call-tool.mjs list_canvases` enumera las pestañas abiertas; `node call-tool.mjs --list` enumera las herramientas. Un tercer argumento puede ser la ruta a un archivo JSON con los parámetros de la herramienta. El cliente no imprime el token y guarda las imágenes recibidas en `bridge-output/`.
3. Para corregir el cuy, consultar la [producción y sus parámetros](PRODUCCION_CUY_NINO.md) y abrir su editable; inspeccionar la pestaña activa antes de modificarla. Para otro recurso, crear un proyecto separado de los existentes. Guardar editables y exportaciones con procedencia, manteniendo coherencia con la muestra dentro del mercado.
4. Opcionalmente, recargar/reiniciar el servidor `pixelorama` desde los ajustes MCP de Codex para incorporarlo al inventario nativo. La [documentación oficial de MCP](https://learn.chatgpt.com/docs/extend/mcp?surface=cli) describe la configuración y reinicio de servidores. No hace falta pedir ese paso para continuar por el cliente local ya comprobado.

La conexión no produce automáticamente un ciclo: el cuy requirió recetas específicas de vistas y fotogramas, ejecución en el editor, exportación y código de integración. Esa primera versión sigue como historial técnico en `juego/public/dibujos/` y pasó ocho pruebas del juego, el build y una prueba táctil adicional en Chromium móvil emulado. Luis rechazó su apariencia; esas comprobaciones no acreditan aceptación visual ni la conexión/prueba educativa real de Android. No iniciar correcciones de esa versión por leer este archivo.
