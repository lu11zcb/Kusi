# Kusi · Web

Único frontend React con Vite y TypeScript, reutilizado desde `admin-web`.
El diseño final sigue pendiente y corresponde a Luis. Las pantallas actuales son provisionales y funcionales.

## Organización

- `src/acceso`: ingreso común y cambio de contraseña temporal mediante Django.
- `src/administracion`: pantallas y navegación administrativas.
- `src/docente`: interior propio del docente; funciones educativas pendientes de Spring.
- `src/componentes`: piezas compartidas cuando convenga.
- `src/servicios`: clientes de acceso, registro, cuentas, catálogo y adaptador de secciones. Spring conserva la persistencia educativa.

Los servidores comprueban los permisos. Compartir React no obliga a compartir la distribución de ambos paneles.

## Desarrollo local (CMD)

Con Django iniciado en `127.0.0.1:8000`, desde `D:\Escritorio\Kusi\web`:

```cmd
npm run dev
```

Abrir `http://127.0.0.1:5173/` e ingresar con correo y contraseña. El servidor devuelve los roles; con administrador y docente se puede elegir panel. La contraseña temporal debe cambiarse antes de usar funciones protegidas. El rol escolar no concede acceso técnico a `/admin/`.

Vite remite `/api`, `/admin` y `/static` a Django conservando el host y las cookies. React obtiene CSRF de la sesión y lo envía en `X-CSRFToken`. La creación de secciones pasa por Django hacia Spring; si el servicio no está configurado se muestra el error y se conserva el formulario.

Configurar `DJANGO_SECRET_KEY` estable en el proceso Django para conservar sesiones entre reinicios. `CLAVE_INTERNA` y `EDU_API_URL` son configuración del servidor; nunca se incluyen en React. Sin clave estable el desarrollo usa una efímera. El despliegue queda fuera de esta entrega.

## Comprobaciones

```cmd
npm run build
npm run lint
npm test
```

Las pruebas usan Node y TypeScript ya presentes, sin añadir dependencias. Comprueban sesión/CSRF, datos enviados, errores, respuestas inválidas y ausencia de reintentos del POST. El recorrido visual y de teclado se comprueba aparte.

Estado por historia y comprobaciones: [ESTADO_SPRINT1.md](../docs/ESTADO_SPRINT1.md). Identidad/sesión: [CONTRATOS_SERVICIOS.md](../docs/CONTRATOS_SERVICIOS.md). Secciones: [HU06_REVISION.md](../docs/HU06_REVISION.md). IA pendiente: [CONTRATO_PROPUESTAS_IA.md](../docs/CONTRATO_PROPUESTAS_IA.md).
