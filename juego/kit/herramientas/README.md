# Herramientas

Programas para preparar los dibujos del kit y revisar el juego. Todos se corren
desde la carpeta `juego/`.

| Herramienta | Para qué sirve | Necesita |
| --- | --- | --- |
| `armar_lamina.mjs` | Arma la [lámina de piezas modelo](../estilo/lamina-modelos.png) de la guía de estilo. | Node |
| `preparar_pieza.mjs` | Quita el fondo blanco de una pieza nueva con la visión de macOS y la deja en 256 × 256 (`--apoyado`: pies en y = 244) o como fondo de 1672 × 941 (`--fondo`). Compila `preparar_pieza.swift` la primera vez en `.compilado/`, que no se sube. | Node y macOS (Swift viene con las herramientas de línea de comandos) |
| `preparar_criatura.mjs` | Prepara una criatura animada: corta la imagen con 3 poses del personaje, quita el fondo de cada una con la visión de macOS y arma la tira de 768 × 256 (3 cuadros, misma escala, pies en y = 244). | Node y macOS |
| `comprobar_pieza.mjs` | Filtro de una pieza nueva (`--fondo`, `--figura` o `--criatura`). Reconoce las tiras de figura por sus medidas y devuelve las comprobaciones en JSON. | Node |
| `preparar_fondo_cenital.mjs` | Separa la hoja de plantas de `originales/mundo/` en sus cuatro tiras animadas. | Node y `sips` |
| `animaciones/preparar_espaldas.mjs` | Reemplaza la fila de espalda del cuy y del zorro a partir de `originales/personajes/`. | Node y `sips` |
| `animaciones/armar_hoja.py` | Arma una hoja de personaje desde una tira o una carpeta de cuadros. | Python 3 y Pillow |
| `animaciones/verificar_hoja.py` | Mide una hoja: pies, cima y centro de cada cuadro. | Python 3 y Pillow |
| `animaciones/crear_vista_previa.py` | Hace un GIF de una animación leyendo el manifiesto. | Python 3 y Pillow |
| `animaciones/png_rgba.mjs` | Lee, recorta y guarda PNG sin pérdida; la usan las otras herramientas y las pruebas. | Node |
| `capturar_laberinto.mjs` | Saca capturas de los tres niveles en escritorio y en celular. | Node, Playwright y el juego abierto |
| `comparar_efectos.mjs` | Pone lado a lado cada efecto con Canvas y con WebGL. | Node, Playwright y el juego abierto |
| `medir_fps_laberinto.mjs` | Mide los cuadros por segundo del laberinto. | Node, Playwright y el juego abierto |

Las tres últimas necesitan el juego abierto con `npm run dev` y escriben sus
resultados en `evidencias/`, una carpeta que no se sube a GitHub.

## Tiras de gestos

Pide de 2 a 4 poses dibujadas con `--tira`. Describe cada pose en `--que`.

```sh
node taller/dibujar.mjs --carpeta taller/trabajos/ID_DEL_TRABAJO --id comer-manzana \
  --tira 2 --que "Inti lifts the apple to his mouth, then takes a bite"
```

El dibujante quita el fondo de cada pose y arma un PNG transparente con
cuadros de 768 × 768, a la misma escala y con los pies en la fila 735.
En un pedido de varias piezas se indica `"tira": 2` en el JSON de la pieza.

```sh
node kit/herramientas/comprobar_pieza.mjs comer-manzana.png
```

El filtro reconoce el PNG de 1536, 2304 o 3072 px de ancho por 768 px de alto.
Revisa la figura de cada cuadro, sus esquinas transparentes, su tamaño y su
margen de 24 px. Los pies deben quedar en la misma fila en todos los cuadros.

## La lámina de piezas modelo

```sh
node kit/herramientas/armar_lamina.mjs
```

Junta, a tamaño real y sobre el papel crema del juego, las 8 frutas y verduras,
el portal, el botón de voz, el cuy, el zorro, Kusi, el muro y el suelo. Si
cambia una pieza modelo, se vuelve a correr.

## Las espaldas de los personajes

```sh
node kit/herramientas/animaciones/preparar_espaldas.mjs
npm run prueba:logica
```

Lee la receta `kit/originales/personajes/espaldas-receta.json`, reduce cada pose
sin deformarla, alinea la cima (y = 23), los pies (y = 244) y el centro de la
cabeza (x = 128) y reemplaza solo la fila de espalda de
`kit/recursos/dibujos/personajes/cuy.png` y `zorro.png`. Las demás filas no
cambian. Un argumento opcional permite usar otra receta, con rutas relativas a
`juego/`.

La prueba `pruebas/logica/espaldasCorregidas.test.js` revisa el pelaje liso, el
pañuelo trasero y la cola centrada, y compara las otras filas con las huellas
de `pruebas/fixtures/filas-personajes-aprobadas.json`.

## Las herramientas de Python

Necesitan Pillow, que no viene instalado. Se instala en un entorno propio:

```sh
python3 -m venv .venv
.venv/bin/python -m pip install -r kit/herramientas/animaciones/requirements.txt
.venv/bin/python kit/herramientas/animaciones/verificar_hoja.py kit/recursos/dibujos/personajes/cuy.png --celda 256x256
.venv/bin/python kit/herramientas/animaciones/crear_vista_previa.py kit/recursos/dibujos/personajes/cuy.json kit/originales/personajes/preparacion/caminar-espalda.gif --direccion espaldas --estado caminar_espalda
```

En Windows se usa `.venv/Scripts/python`. El entorno virtual no se sube a
GitHub. Las opciones de cada herramienta se ven con `--help`.
