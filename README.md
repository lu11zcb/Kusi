# Kusi

Proyecto integrador de experiencias educativas de juego para primero de primaria en Perú.

Actualización de diseño: **lui11zcb · luiscb.once@gmail.com**. Se conserva la autoría histórica de cada contribución y las licencias de los recursos.

## Ver el proyecto

Los paneles de **administración y docente** comparten `web/`. Con Django en 8000, Spring en 8080 y Vite en 5173, abrir `http://127.0.0.1:5173/` e ingresar con una cuenta del rol correspondiente. Si la cuenta tiene ambos roles, elegir el panel. El nuevo administrador ya está integrado; no requiere la maqueta antigua.

1. Preparar el `.env` local a partir de `.env.example`, con PostgreSQL y la misma clave interna para Django/Spring. No subir secretos.
2. Django: desde `admin-api`, entorno virtual con `requirements.txt`; ejecutar `python manage.py runserver 127.0.0.1:8000`.
3. Spring: Java 21; desde `edu-api`, `mvnw.cmd spring-boot:run` en Windows. [Configuración y contratos](edu-api/README.md).
4. Web: desde `web`, `npm ci` y `npm run dev`.
5. Android: abrir `movil/` en Android Studio o compilar con `gradlew.bat assembleDebug`. [Instrucciones y límites](movil/README.md).

La base existente y sus migraciones se conservan; revisar la configuración antes de iniciar sobre una instalación nueva. El proveedor de propuestas usa la clave local Groq; sin clave se mantiene la solicitud pendiente.

## Aplicación Android y laberinto

El APK de desarrollo se genera en `movil/app/build/outputs/apk/debug/app-debug.apk`. Abre Kusi con acceso real del estudiante, biblioteca de juegos enviados por su docente, laberinto en WebView y cierre de la partida. La actividad de presentación con cuentas de ejemplo fue retirada. [Configuración y recorrido](movil/README.md).

El juego está en `juego/`, servido en <http://127.0.0.1:5174/>. Reutiliza los personajes y el kit de adobe, con fondo cenital, vegetación animada por sprites, Kusi a la derecha y joystick a la izquierda. La barra representa los alimentos reales y los zorros exploran desde que aparece el nivel. [Guía del juego](juego/README.md).

## Estado y diseño

- [Diseño vigente de administración, docente y Android](DESIGN.md).
- [Alcance de producto](PRODUCT.md) y [autoría](AUTORIA.md).

La propuesta aprobada puede generar un guion de laberinto mediante IA, pasar las comprobaciones técnicas y enviarse a los estudiantes desde el panel docente. Android integra biblioteca, juego y avisos de partida.

## Instalar en macOS

Todo el proyecto corre en macOS (Apple Silicon o Intel). Los comandos son para la Terminal (zsh) y casi todo se instala con [Homebrew](https://brew.sh). Estas son las versiones con las que se desarrolló:

| Herramienta | Versión | Se usa en | Instalación |
| --- | --- | --- | --- |
| Git | cualquiera reciente | todo | `brew install git` |
| Node.js | 22.12 o más (se probó con 24.19; Vite 8 pide 20.19 o más, o 22.12 o más) | `juego/` (Phaser, Playwright) y `web/` (React) | `brew install node@24` |
| Python | 3.12 o más (se probó con 3.14) | `admin-api/` (Django 6.1) y las herramientas de `juego/kit/herramientas` | `brew install python@3.14` |
| Java | 21 (Temurin) | `edu-api/` (Spring Boot 3.5.6) y `movil/` | `brew install --cask temurin@21` |
| PostgreSQL | 16 | base compartida: Django usa el esquema `admin` y Spring, el `edu` | `brew install postgresql@16` |
| Android Studio y adb | SDK de Android 37 (`minSdk` 26) | `movil/` y probar en un celular | `brew install --cask android-studio`; adb sale de Platform-Tools (`brew install --cask android-platform-tools`) |

Maven y Gradle no se instalan: el repositorio trae `./mvnw` (Maven 3.9.16) y `./gradlew` (Gradle 9.8.0), ya con permiso de ejecución. Si Homebrew avisa que una fórmula no queda en el `PATH` (le pasa a `node@24` y a `postgresql@16`), copia la línea `export PATH=...` que muestra a `~/.zshrc`.

1. **Clonar y preparar el `.env`:** `git clone https://github.com/lu11zcb/Kusi.git && cd Kusi && cp .env.example .env`. Pon tu clave de IA en el `.env` (`GROQ_API_KEY`, o `IA_CLAVE` con `IA_URL` e `IA_MODELO`); ese archivo no se sube.
2. **PostgreSQL 16:** el usuario inicial de Homebrew es el de tu Mac, no `postgres`, así que se crea el que usa el `.env.example`:
   ```bash
   brew services start postgresql@16
   createuser -s postgres
   psql -d postgres -c "ALTER USER postgres PASSWORD 'postgres'"
   createdb -U postgres kusi
   psql -U postgres -d kusi -c "CREATE SCHEMA IF NOT EXISTS admin; CREATE SCHEMA IF NOT EXISTS edu;"
   ```
3. **Django (puerto 8000):**
   ```bash
   cd admin-api
   python3 -m venv .venv && source .venv/bin/activate
   pip install -r requirements.txt
   python manage.py migrate
   python manage.py runserver 127.0.0.1:8000
   ```
4. **Spring (puerto 8080),** en otra terminal: `cd edu-api && ./mvnw spring-boot:run`. Sus pruebas: `./mvnw test`.
5. **Paneles web (puerto 5173):** `cd web && npm ci && npm run dev`.
6. **Juego (puerto 5174):** `cd juego && npm ci && npm run dev`. Sus pruebas: `npm run build`, `npm run prueba:logica` y, tras `npx playwright install chromium`, `npm run prueba`.
7. **Android:** abre `movil/` en Android Studio (crea solo `local.properties`, con la ruta del SDK; no se sube) o compila con `cd movil && ./gradlew assembleDebug`. Con un celular por USB, `adb devices` debe mostrarlo; el emulador ve tu Mac en `10.0.2.2`, que el `.env.example` ya permite.

Diferencias con los comandos de Windows de este README y de los documentos: `./mvnw` y `./gradlew` en vez de `mvnw.cmd` y `gradlew.bat`; `.venv/bin/python` en vez de `.venv/Scripts/python.exe`; `cp` en vez de `copy`; `export VARIABLE=valor` en vez de `$env:VARIABLE="valor"`; y rutas con `/`.

El repositorio guarda los archivos con saltos de línea LF, así que en la Mac no hace falta configurar nada. Nueve íconos de `movil/app/src/main/res/drawable/ic_*.xml` se guardan con CRLF a propósito, para conservar sus bytes (lo fija `.gitattributes`): no los reformatees ni los normalices.
