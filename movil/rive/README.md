# Animaciones de Kusi con Rive

Las escenas de Rive de Android se editan en `scene.rml` con el
[CLI de Rive](https://rive.app/docs/cli/getting-started). La bienvenida vigente anima los
dibujos desde Compose. La escena Rive de `bienvenida/` es un prototipo.

## `ingreso/` · pantalla «¡Vamos a entrar!»

Usa `kusi_poses_ingreso.png` para el personaje, `kusi_hojas_ingreso.png` para la base fija
y `kusi_ramas_ingreso.png` para las ramas articuladas y las hojas sueltas. El modelo
`KusiIngreso` recibe dos números. `pose` selecciona reposo (0), apoyo frontal en el panel (1), ojos tapados
(2), un ojo (3), risa (4), saludo (5) o sonrisa de frente (6). `movimiento` selecciona
reposo (0), arbusto inquieto (1), aparición (2), cosquillas (3), reacción al DNI (4) o
saludo (5). Android activa la aparición a los cinco segundos o al tocar el arbusto, y
encadena la sonrisa con la mirada hacia el campo del DNI.
Para revisar la escena desde `movil/rive/ingreso/`:

```powershell
rive . --verify
New-Item -ItemType Directory -Force build
rive . --screenshot=build/asomando.png --data=pose=6 --data=movimiento=2 --advance=17
rive . --screenshot=build/espiar.png --data=pose=3 --data=movimiento=0 --advance=10
```

El login reproduce el archivo `app/src/main/res/raw/kusi_ingreso.riv` cuando está disponible.
`rive . --publish` lo exporta a esa ruta y requiere una sesión de Rive. Mientras no esté
exportado, Android muestra las mismas poses con Compose. El modo de movimiento reducido
también usa las poses de Compose.

## `vestidor/` · pantalla «Crea tu cuy»

El niño elige cada accesorio por separado al crear y al editar su cuy. En
`app/src/main/assets/vestidor` hay 1680 hojas WebP transparentes de 896 × 448
(8 opciones de cabeza × 7 de lentes × 6 de ropa × 5 de mochila, incluida
la opción sin pieza en cada categoría). Cada hoja contiene los cuatro pelajes en
columnas (café, crema, gris, caramelo) y las dos poses en filas (reposo y saludo).
Android pasa la hoja elegida a `ilustracion`. El modelo
`MiCuy` usa `pelajeX` para la columna y `poseY` para reposo o saludo.
`reaccion` controla el movimiento de reposo (0), saludo (1) y celebración (2).
Los PNG de `diseno/avatar/cuy-vestido` tienen cuatro columnas de origen por ropa
(sin mochila, miel, fresa y lunar). Cada archivo `<ROPA>-MOCHILA_MENTA.png` aporta
la quinta columna, con las dos poses. `PrepararMochilaMenta.java` copia la columna
miel y aplica la paleta de `cuy_mochila_menta.png` mediante máscaras del cuerpo,
tirantes, bolsillo y broche. Los 6 PNG originales se conservan.
La vista previa del chaleco coral está en `app/src/main/assets/vestidor_vistas/chaleco.webp`.

Desde `movil/rive/vestidor/` en macOS:

```sh
rive . --verify
mkdir -p build
rive . --screenshot=build/ejemplo.png --data=pelajeX=-560 --data=poseY=-434 --data=reaccion=1 --advance=12
```

`rive . --publish` exporta a `app/src/main/res/raw/kusi_vestidor.riv` con una sesión de Rive.
Compose usa las mismas ilustraciones si el archivo no está disponible o si se desactiva el movimiento.

Desde `movil/` en macOS, prepara las 840 hojas que llevan alguna prenda de la
tienda. El primer comando Java vuelve a generar las seis variantes menta a
partir de los originales. Los PNG intermedios se guardan en `app/build/`.

```sh
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
mkdir -p app/build
salida_vestidor=$(mktemp -d app/build/vestidor.XXXXXX)
"$JAVA_HOME/bin/java" -Djava.awt.headless=true -Xmx512m \
  diseno/avatar/PrepararMochilaMenta.java diseno/avatar/cuy-vestido
"$JAVA_HOME/bin/java" -Djava.awt.headless=true -Xmx512m \
  diseno/avatar/PrepararVestidor.java app/src/main/res/drawable-nodpi \
  diseno/avatar/cuy-vestido "$salida_vestidor/png" --tienda
```

Puedes reemplazar `--tienda` por nombres de combinaciones sin extensión para
generar una muestra. Para comprimir las hojas de la tienda se usó `cwebp` con
calidad 90 y el canal alfa al 100. `cp -n` conserva las hojas que ya existen.

```sh
mkdir -p "$salida_vestidor/webp"
for hoja in "$salida_vestidor"/png/*.png; do
  nombre=$(basename "$hoja" .png)
  /opt/homebrew/bin/cwebp -quiet -q 90 -alpha_q 100 "$hoja" \
    -o "$salida_vestidor/webp/$nombre.webp" || break
done
```

Si Chrome puede ejecutarse en el entorno, el compresor del proyecto también
admite esta ruta de macOS.

```sh
node diseno/avatar/ComprimirVestidor.mjs \
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' \
  "$salida_vestidor/png" "$salida_vestidor/webp" "$salida_vestidor"
```

Para incorporar las 840 hojas a la app después de comprimirlas:

```sh
cp -n "$salida_vestidor"/webp/*.webp app/src/main/assets/vestidor/
```

## `jardin/` · Inicio sin aventuras

`KusiJardin` muestra las poses completas de `kusi_jardin_poses.png`. El modelo `Jardin`
recibe `cuadroX` según el gesto elegido en Android. Los toques de los objetos, las trayectorias
y el movimiento reducido se resuelven en Android. Desde `movil/rive/jardin/`:

```powershell
rive . --verify
New-Item -ItemType Directory -Force build
rive . --screenshot=build/saludo.png --data=cuadroX=-512 --advance=1
```

`rive . --publish` escribe `app/src/main/res/raw/kusi_jardin.riv` con una sesión de Rive.
El visor nativo reproduce las mismas poses mientras se prepara la exportación.

## `bienvenida/` · pantalla «Ven, vamos a la aventura»

- **Kusi** es la misma hoja de cuadros del juego: `juego/kit/recursos/dibujos/personajes/kusi.png`
  (3 × 4 cuadros de 256 px; filas hablar, saludar, parpadear y respirar). La escena la lee desde
  ahí, no hay copia. Si esa hoja cambia, hay que volver a exportar.
- Alrededor: bloques 1-2-3, un libro, el camino de puntos, la loma y el pasto, dibujados en la
  escena. La fuente de los números es Baloo 2 de la app (`app/src/main/res/font/baloo2.ttf`, OFL).
- Modelo de datos `Kusi` del prototipo:

  | Propiedad | Tipo | Qué hace |
  | --- | --- | --- |
  | `hablando` | booleano | Mientras suena la voz, Kusi mueve la boca (fila 0). |
  | `quieto` | booleano | Animaciones del sistema desactivadas: todo queda en reposo. Tocar a Kusi todavía lo hace saludar. |
  | `saludar` | disparo | El niño tocó a Kusi: saluda (fila 1 y parpadeo) y brinca. |

- Comportamiento: entra subiendo y saluda; los bloques y el libro aparecen detrás (100 y 170 ms);
  después respira y, cada ~6,5 s, saluda solo para invitar a tocarlo. A Kusi nunca se le gira ni
  se le inclina: solo se mueve, se escala desde los pies y cambia de cuadro.

## Editar y volver a exportar

Desde `movil/rive/bienvenida/`:

```powershell
rive .                    # vista previa en una ventana; se actualiza al guardar scene.rml
rive . --verify           # comprueba que compila (no escribe nada, no pide cuenta)
rive . --screenshot=build/captura.png --advance=40   # captura un cuadro (40/60 s después de empezar)
rive . --screenshot=build/toque.png --advance=150 --data=saludar=1 --advance=9
```

Exportar el `.riv` para la app pide una cuenta de Rive (`rive login`, una sola vez) y cuenta
como una de las 50 publicaciones al mes del plan gratuito. En ese plan el archivo lleva una
breve pantalla de presentación de Rive; los planes de pago no.

```powershell
rive . --publish          # escribe app/src/main/res/raw/kusi_bienvenida.riv
```

Reglas del CLI que conviene recordar: editar `scene.rml` a mano (no generarlo con scripts),
revisar siempre con una captura además de `--verify`, y cambiar cuadros con claves `hold` y
transiciones sin mezcla. `build/` y los `AGENTS.md`/`CLAUDE.md` que crea `rive create` no se suben.
