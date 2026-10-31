# Hojas de animación de personajes

## Arte vigente

El juego carga `kit/recursos/dibujos/cuy-nino-cuadros-v9.png` y
`kit/recursos/dibujos/zorro-cuadros-v4.png` mediante sus manifiestos
`cuy-nino-animado-v1.json` y `zorro-animado-v1.json`.
Las fuentes aprobadas, referencias y vistas previas actuales están en
[../../arte/espaldas-v3/](../../arte/espaldas-v3/LEEME.md).

Desde `juego/`, en macOS:

```sh
node kit/herramientas/animaciones/preparar_espaldas.mjs
npm run prueba:logica
npm run build
```

La preparación usa Node y `sips`. Lee la receta vigente
`kit/arte/espaldas-v3/preparacion.json`, reutiliza los atlas actuales y sustituye
únicamente la fila de espalda a partir de sus fuentes aprobadas. Conserva sin
remuestrear el frente, los laterales y las expresiones. No necesita atlas
intermedios. Un argumento opcional permite seleccionar otra receta JSON,
con rutas relativas a `juego/`.

Las pruebas de `pruebas/logica/espaldasCorregidas.test.js` conservan las
comprobaciones del pelaje liso, el pañuelo trasero y la cola centrada. Las
filas restantes se contrastan con huellas SHA-256 de sus píxeles aprobados en
`pruebas/fixtures/filas-personajes-aprobadas.json`, sin guardar hojas antiguas.
Las pruebas de navegador cubren dirección, cadencia, expresiones y parpadeo.

## Herramientas generales

`armar_hoja.py`, `verificar_hoja.py` y `crear_vista_previa.py` siguen disponibles
para preparar futuras ilustraciones. Requieren Python 3 y Pillow:

```sh
python3 -m venv .venv
.venv/bin/python -m pip install -r kit/herramientas/animaciones/requirements.txt
.venv/bin/python kit/herramientas/animaciones/verificar_hoja.py kit/recursos/dibujos/cuy-nino-cuadros-v9.png --celda 256x256
.venv/bin/python kit/herramientas/animaciones/crear_vista_previa.py kit/recursos/dibujos/cuy-nino-animado-v1.json kit/arte/espaldas-v3/preparacion/caminar-espalda.gif --direccion espaldas --estado caminar_espalda
```

En Windows se utiliza `.venv/Scripts/python` en lugar de `.venv/bin/python`.
El entorno virtual y los resultados de `preparacion/` están excluidos del repo.

El armado admite una tira PNG o una carpeta de cuadros numerados, una escala
uniforme y una hoja base a la que añade una fila sin alterar los píxeles previos.
El verificador mide directamente los píxeles finales, sin utilizar los offsets
del informe. La vista previa consulta el mismo manifiesto que usa el juego:
respeta la secuencia, la cadencia y la repetición, y solo refleja los laterales.
Las opciones de cada herramienta se consultan con `--help`.

## Limpieza autorizada

Se retiraron los atlas intermedios, `kit/arte/espaldas-v2/` y la carpeta de muestras,
junto con las pruebas Python dedicadas a reconstruir esas versiones históricas.
Se mantienen las pruebas del arte actual y las herramientas generales. Las
imágenes del laberinto anterior también se retiraron.
