# Hojas de animación del cuy

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
`juego/.venv/bin/python`. Para cuadros de Blender, el primer argumento de
`armar_hoja.py` puede ser una carpeta con los PNG numerados. Usa nombres como
`cuadro-0001.png`, `cuadro-0002.png`; la ordenación también reconoce los números
sin ceros de relleno. La tira resultante conserva ese orden y deja todas las
celdas en una sola fila. La herramienta no borra ni mueve los originales.
La salida debe quedar fuera de la carpeta de cuadros para proteger los PNG de
entrada y evitar que una hoja previa se vuelva a leer como otro fotograma.

La limpieza descarta islas de alfa desconectadas y conserva el borde suave del
personaje. En una tira mantiene las islas cuyo tamaño sea al menos el 1 % de la
mayor; en un PNG individual conserva su componente principal. Esta regla está
pensada para los cuadros del cuy con cuerpo, brazos y pies unidos. Si Blender
exporta piezas separadas para un esqueleto, primero se renderiza el personaje
completo: esta herramienta recibe cuadros finales, no una hoja de piezas.

El centro se mide en la cabeza (42 % superior de la silueta, antes de los
hombros), no en la caja completa de los brazos. El suelo es la última fila con
alfa de al menos 32. Se aplica la misma escala horizontal y vertical a todos los
cuadros; el tamaño disponible se calcula con los extremos de toda la secuencia.
El margen de 8 px incluye una reserva para suavizar el borde al reducir.

`verificar_hoja.py` lee los píxeles finales y no usa los offsets ni el informe
del armado. Mide el centro de la cabeza, su altura y la línea de apoyo; falla
si alguna variación supera 2 px. `alineacion.json` permite revisar cada cuadro.

El único contrato de animaciones del juego continúa en
`juego/public/dibujos/cuy-nino-animado-v1.json`, consumido por
`juego/src/dibujos/cuyAnimado.js`. La herramienta de armado no crea otra lista
de estados, velocidades o secuencias. La vista previa consulta ese mismo JSON
y el color del pasto del juego.
