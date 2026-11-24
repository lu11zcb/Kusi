# Kusi Flutter

Versión Flutter de Kusi con la interfaz empaquetada en una WebView para Android y una vista HTML de plataforma para web. Incluye bienvenida, ingreso con DNI, cambio de contraseña, personalización del pelaje, inicio, siete cursos, actividades, estados vacíos, logros pendientes, perfil y salida protegida de tres segundos.

La interfaz compartida está en `assets/app/index.html`. `lib/game_native.dart` sirve los recursos incluidos y conecta las API locales desde Android; `lib/game_web.dart` integra esa interfaz dentro de Flutter para web. Los recursos del laberinto están en `assets/juego`.

## Ejecutar en Chrome

Requiere Flutter con Dart 3.14 o posterior y Node.js. Desde esta carpeta:

```sh
flutter pub get
flutter build web --no-wasm-dry-run --no-web-resources-cdn
node tool/serve.mjs
```

Abrir http://127.0.0.1:5190/. El servidor sirve la compilación y reenvía las API a Django en 8000 y Spring en 8080, que deben iniciarse siguiendo el README raíz.

También puede abrirse esta carpeta en VS Code y elegir «Kusi Flutter en Chrome» (puerto 5191). Para usar las API durante la depuración, mantener activo el servidor de `tool/serve.mjs` en 5190.

«Explorar el diseño sin una cuenta» utiliza datos de ejemplo identificados en pantalla. El ingreso con DNI usa las cuentas reales del entorno local. El laberinto incluido es de práctica: no registra puntos. Ropa, accesorios, música y el panel de logros pendientes siguen marcados como próximos. La aplicación Android original de `../movil` conserva su integración de biblioteca, partidas y avance con el servidor.

## Ejecutar en Android

Con el SDK de Android y un dispositivo o emulador configurado:

```sh
flutter run
```

El emulador debe tener aceleración de virtualización disponible. La app accede a los servidores de la PC mediante `10.0.2.2`; están configurados en `lib/game_native.dart` para desarrollo local.

## Cuentas y clase de prueba

Desde la raíz del repositorio, preparar `.env` con las credenciales de PostgreSQL, instalar las dependencias de `admin-api/requirements.txt` y ejecutar:

```sh
python scripts/crear_entorno_demo_local.py
```

Este comando crea la base independiente `kusi_flutter_local`, aplica las migraciones Django, prepara un administrador, dos docentes y dos estudiantes ficticios, y guarda una contraseña aleatoria en `.local/accesos-locales.md`. No publicar esa carpeta.

Después de iniciar Spring para aplicar sus migraciones:

```sh
python scripts/preparar_clase_demo_local.py
```

Prepara una sección, las asignaciones docentes y un laberinto de ejemplo enviado a los dos estudiantes. El script solo actúa sobre la base de demostración.

## Ilustraciones

Las imágenes nuevas de Kusi se generaron a partir de la referencia visual aportada por el usuario. Su procedencia se documenta en `../movil/app/src/main/assets/licencias/interfaz-referencia.json`. Los tipos de letra y los recursos del juego conservan las licencias del proyecto original.
