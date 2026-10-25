# Hojas de animación de personajes

Estas herramientas procesan los PNG existentes; no redibujan personajes. Requieren
Python 3 y Pillow. El entorno `juego/.venv/` ya está excluido del repositorio.
Desde la raíz del proyecto, en PowerShell:

```powershell
python -m venv juego/.venv
juego/.venv/Scripts/python -m pip install -r juego/herramientas/animaciones/requirements.txt
juego/.venv/Scripts/python juego/herramientas/animaciones/armar_hoja.py juego/arte/cuy/origen/cuy-caminar-3-cuadros.png --celda 256x256 --salida juego/public/dibujos/cuy-nino-caminar-v1.png --reporte juego/arte/cuy/vista-previa/armado.json
juego/.venv/Scripts/python juego/herramientas/animaciones/verificar_hoja.py juego/public/dibujos/cuy-nino-caminar-v1.png --celda 256x256 --reporte juego/arte/cuy/vista-previa/alineacion.json
juego/.venv/Scripts/python juego/herramientas/animaciones/crear_vista_previa.py juego/public/dibujos/cuy-nino-animado-v1.json juego/arte/cuy/vista-previa/caminar.gif
```

En macOS/Linux se reemplaza `juego/.venv/Scripts/python` por
`juego/.venv/bin/python`. El primer argumento de `armar_hoja.py` también puede
ser una carpeta con cuadros PNG finales numerados. Usa nombres como
`cuadro-0001.png`, `cuadro-0002.png`; la ordenación también reconoce los números
sin ceros de relleno. La tira resultante conserva ese orden y deja todas las
celdas en una sola fila. La herramienta no borra ni mueve los originales.
La salida debe quedar fuera de la carpeta de cuadros para proteger los PNG de
entrada y evitar que una hoja previa se vuelva a leer como otro fotograma.

La limpieza descarta islas de alfa desconectadas y conserva el borde suave del
personaje. En una tira mantiene las islas cuyo tamaño sea al menos el 1 % de la
mayor; en un PNG individual conserva su componente principal. Esta regla está
pensada para cuadros con cuerpo, brazos y pies unidos. El flujo de arte usa
imágenes de tres cuadros dibujadas por ChatGPT; no necesita un piloto de Blender
ni una hoja de piezas.

El centro se mide en la cabeza (42 % superior de la silueta, antes de los
hombros), no en la caja completa de los brazos. El suelo es la última fila con
alfa de al menos 32. Se aplica la misma escala horizontal y vertical a todos los
cuadros; el tamaño disponible se calcula con los extremos de toda la secuencia.
El margen de 8 px incluye una reserva para suavizar el borde al reducir.

`verificar_hoja.py` lee los píxeles finales y no usa los offsets ni el informe
del armado. Mide el centro de la cabeza, su altura y la línea de apoyo; falla
si alguna variación supera 2 px. `alineacion.json` permite revisar cada cuadro.

Cada personaje tiene una única definición de animaciones: el cuy en
`juego/public/dibujos/cuy-nino-animado-v1.json` y el zorro en
`juego/public/dibujos/zorro-animado-v1.json`. Ambos usan el código compartido de
`juego/src/dibujos/personajeAnimado.js`; `cuyAnimado.js` conserva un adaptador
para las llamadas existentes. La herramienta de armado no crea otra lista de
estados, velocidades o secuencias. La vista previa consulta el JSON del
personaje y el color del pasto del juego. También respeta el volteo de las
vistas laterales y la repetición declarada; frente y espaldas no se voltean.

## Caminar del zorro

```powershell
juego/.venv/Scripts/python juego/herramientas/animaciones/armar_hoja.py juego/arte/zorro/origen/zorro-caminar-3-cuadros.png --celda 256x256 --salida juego/public/dibujos/zorro-caminar-v1.png --reporte juego/arte/zorro/vista-previa/armado-caminar.json
juego/.venv/Scripts/python juego/herramientas/animaciones/verificar_hoja.py juego/public/dibujos/zorro-caminar-v1.png --celda 256x256 --tolerancia 2 --reporte juego/arte/zorro/vista-previa/alineacion-caminar.json
juego/.venv/Scripts/python juego/herramientas/animaciones/crear_vista_previa.py juego/public/dibujos/zorro-animado-v1.json juego/arte/zorro/vista-previa/caminar.gif
```

El ciclo es `0,1,2,1` a 8 fps siempre; quieto utiliza el cuadro 1. En el
mercado el vendedor permanece quieto. Su altura visible es 232 px × 0,6556 =
152,10 px, frente a 234 px × 0,5 = 117 px del cuy: aproximadamente 1,3 veces.
La escala del manifiesto mide el dibujo visible, sin contar sus márgenes.

## Caminar de lado del cuy

```powershell
juego/.venv/Scripts/python juego/herramientas/animaciones/armar_hoja.py juego/arte/cuy/origen/cuy-lado-3-cuadros.png --celda 256x256 --referencia juego/arte/cuy/vista-previa/armado.json --hoja-base juego/public/dibujos/cuy-nino-caminar-v1.png --salida juego/public/dibujos/cuy-nino-cuadros-v1.png --reporte juego/arte/cuy/vista-previa/armado-caminar-lado.json
juego/.venv/Scripts/python juego/herramientas/animaciones/verificar_hoja.py juego/public/dibujos/cuy-nino-cuadros-v1.png --celda 256x256 --tolerancia 2 --reporte juego/arte/cuy/vista-previa/alineacion-caminar-lado.json
juego/.venv/Scripts/python juego/herramientas/animaciones/crear_vista_previa.py juego/public/dibujos/cuy-nino-animado-v1.json juego/arte/cuy/vista-previa/caminar-lado-derecha.gif --direccion derecha --estado caminar_lado
juego/.venv/Scripts/python juego/herramientas/animaciones/crear_vista_previa.py juego/public/dibujos/cuy-nino-animado-v1.json juego/arte/cuy/vista-previa/caminar-lado-izquierda.gif --direccion izquierda --estado caminar_lado
```

`--referencia` conserva exactamente la escala `0.34970238095238093` y el apoyo
`y=243.95089285714286` del armado frontal. No vuelve a calcular el tamaño para
llenar la celda. Si una referencia no cabe con margen, el armado falla sin
reducirla ni recortarla. `--hoja-base` conserva los píxeles frontales sin filtrar
y añade los tres cuadros laterales en la segunda fila: índices `3,4,5` del atlas
de 768 × 512 px. La secuencia local `0,1,2,1` corresponde a `3,4,5,4` en el JSON.

Derecha usa esos cuadros sin voltear; izquierda declara `voltear: true` para
caminar y quieto. Quieto lateral utiliza el cuadro local 1 (índice 4). Arriba y
abajo conservan `0,1,2,1` de frente, sin voltear. Todos los ciclos caminan a
8 fps siempre y la escala de visualización del cuy sigue siendo `0.5`.

La verificación se hace sobre las dos filas juntas: también comprueba que el
apoyo no cambia más de 2 px entre frente y lado. En este atlas las variaciones
son 0,5 px en el centro horizontal de la cabeza, 1 px en su cima y 1 px en los
pies. En el zorro son 0,5 px, 1 px y 0 px respectivamente.

Las regresiones del procesado comprueban la reconstrucción desde el original,
la igualdad de escala, los píxeles frontales, el rechazo de recortes y los GIF:

```powershell
juego/.venv/Scripts/python -m unittest discover -s juego/herramientas/animaciones -p test_animaciones.py -v
```
