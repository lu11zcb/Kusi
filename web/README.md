# Kusi · Web

Único frontend React con Vite y TypeScript, reutilizado desde `admin-web`.
El diseño final sigue pendiente y corresponde a Luis. HU01 aporta un formulario provisional.

## Organización

- `src/acceso`: entrada común; HU01 usa la sesión existente de Django. El login común corresponde a HU11.
- `src/administracion`: pantallas y navegación administrativas.
- `src/docente`: espacio reservado para las pantallas y navegación propias del docente.
- `src/componentes`: piezas compartidas cuando convenga.
- `src/servicios`: llamadas a los servicios; HU01 solo consume Django. Spring conserva las funciones educativas.

Los servidores comprueban los permisos. Compartir React no obliga a compartir la distribución de ambos paneles.

## Desarrollo local (CMD, ejecutado por Luis)

Con Django iniciado en `127.0.0.1:8000`, desde `D:\Escritorio\Kusi\web`:

```cmd
npm run dev
```

Abrir `http://127.0.0.1:5173/`. El acceso de prueba pasa por `/admin/login/?next=/` en ese mismo origen. Requiere la cuenta administradora técnica existente con grupo `administrador`; el formulario no concede acceso técnico a las cuentas que registra.

Vite remite `/api`, `/admin` y `/static` a Django conservando el host y las cookies. React obtiene CSRF del contexto y lo envía en `X-CSRFToken`, siguiendo la [protección CSRF de Django](https://docs.djangoproject.com/en/dev/howto/csrf/). Se utiliza el [proxy de desarrollo de Vite](https://vite.dev/config/server-options#server-proxy). El despliegue no forma parte de esta entrega.

## Comprobaciones

```cmd
npm run build
npm run lint
npm test
```

Las pruebas usan Node y TypeScript ya presentes, sin añadir dependencias. Comprueban sesión/CSRF, datos enviados, errores, respuestas inválidas y ausencia de reintentos del POST. El recorrido visual y de teclado se comprueba aparte.

Contrato HTTP, pruebas PostgreSQL aisladas, comandos y estado real: [HU01_REVISION.md](../docs/HU01_REVISION.md).
