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
laberinto su altura se calcula desde el anclaje del manifiesto y es 1,3 veces
la del cuy. Los márgenes transparentes no cuentan como altura visible.

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
abajo usaban inicialmente `0,1,2,1` de frente; con la quinta fila, arriba usa
`caminar_espalda` y abajo conserva el frente. Todos los ciclos caminan a
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

## Asustado del cuy

```powershell
juego/.venv/Scripts/python juego/herramientas/animaciones/armar_hoja.py juego/arte/cuy/origen/cuy-asustado-3-cuadros.png --celda 256x256 --hoja-base juego/public/dibujos/cuy-nino-cuadros-v1.png --salida juego/public/dibujos/cuy-nino-cuadros-v2.png --reporte juego/arte/cuy/vista-previa/armado-asustado.json
juego/.venv/Scripts/python juego/herramientas/animaciones/verificar_hoja.py juego/public/dibujos/cuy-nino-cuadros-v2.png --celda 256x256 --cuadros 6,7,8 --tolerancia 2 --reporte juego/arte/cuy/vista-previa/alineacion-asustado.json
juego/.venv/Scripts/python juego/herramientas/animaciones/crear_vista_previa.py juego/public/dibujos/cuy-nino-animado-v1.json juego/arte/cuy/vista-previa/asustado.gif --estado asustado
```

La tercera fila añade los cuadros `6,7,8` y conserva las dos primeras sin
remuestrearlas. La secuencia local `0,1,2,1,2` equivale a `6,7,8,7,8` en el
atlas: 10 fps, `repetir: 0` y `siguiente: "quieto"`. La expresión usa el dibujo
frontal sin voltear en cualquier dirección; al terminar recupera quieto en la
dirección que tenía el personaje. El GIF dura 500 ms y no incluye bucle.

En estos tres cuadros las cabezas miden `127,5; 128; 128 px` en x y
`12; 11; 11 px` en su cima; los pies quedan en `243; 244; 243 px`. La hoja
completa de nueve cuadros varía 0,5 px, 2 px y 1 px respectivamente, también
dentro de la tolerancia de 2 px.

## Feliz del cuy: salto respecto al piso original

```powershell
juego/.venv/Scripts/python juego/herramientas/animaciones/armar_hoja.py juego/arte/cuy/origen/cuy-feliz-3-cuadros.png --celda 256x256 --conservar-alturas --fraccion-cabeza 0.3 --hoja-base juego/public/dibujos/cuy-nino-cuadros-v2.png --salida juego/public/dibujos/cuy-nino-cuadros-v3.png --reporte juego/arte/cuy/vista-previa/armado-feliz.json
juego/.venv/Scripts/python juego/herramientas/animaciones/verificar_hoja.py juego/public/dibujos/cuy-nino-cuadros-v3.png --celda 256x256 --cuadros 9,10,11 --cuadros-pies 9,11 --altura-variable --fraccion-cabeza 0.3 --tolerancia 2 --reporte juego/arte/cuy/vista-previa/alineacion-feliz.json
juego/.venv/Scripts/python juego/herramientas/animaciones/crear_vista_previa.py juego/public/dibujos/cuy-nino-animado-v1.json juego/arte/cuy/vista-previa/feliz.gif --estado feliz
```

La cuarta fila conserva el eje y de la tira respecto al piso original en
`y=861`: se usa una misma referencia vertical y una escala uniforme que deja
entrar la trayectoria completa. No se bajan los pies del cuadro central para
alinearlos con los apoyos. La cabeza se centra en la banda superior del 30 %,
porque en esta pose los brazos levantados invaden la banda habitual del 42 %.

Los cuadros locales `0,1,2` son `9,10,11` del atlas de este paso, de 768 × 1024 px:
8 fps, una vez y regreso a quieto. Phaser reproduce 375 ms; el GIF redondea a
centésimas (`120,130,130 ms`, 380 ms en total), sin bucle. La vista frontal no
se voltea aunque la expresión empiece mirando a la izquierda.

La verificación mide x en los tres cuadros (`128,128,128 px`, variación 0 px)
y los pies únicamente en los apoyos 0 y 2 (`244,244 px`, variación 0 px).
Los pies del cuadro 1 quedan en `225 px`: conserva 19 px de elevación. La
cima pasa por `39,11,31 px`; sus 28 px de variación se informan como movimiento
del salto, sin exigir altura constante ni modificar el dibujo para corregirla.

Para verificar un solo ciclo se usa `--cuadros`. `--cuadros-pies` restringe los
apoyos y `--altura-variable` excluye únicamente la cima de las referencias que
deben cumplir 2 px. El informe enumera esas referencias y mantiene todas las
medidas. Sin esas opciones, el verificador conserva la comprobación completa.

```powershell
juego/.venv/Scripts/python -m unittest discover -s juego/herramientas/animaciones -p "test_*.py" -v
```

## Caminar de espaldas del cuy

```powershell
juego/.venv/Scripts/python juego/herramientas/animaciones/armar_hoja.py juego/arte/cuy/origen/cuy-espalda-3-cuadros-v2.png --celda 256x256 --margen 7 --referencia juego/arte/cuy/vista-previa/armado.json --hoja-base juego/public/dibujos/cuy-nino-cuadros-v3.png --salida juego/public/dibujos/cuy-nino-cuadros-v5.png --reporte juego/arte/cuy/vista-previa/armado-caminar-espalda.json
juego/.venv/Scripts/python juego/herramientas/animaciones/verificar_hoja.py juego/public/dibujos/cuy-nino-cuadros-v5.png --celda 256x256 --cuadros 0,1,2,3,4,5,12,13,14 --tolerancia 2 --reporte juego/arte/cuy/vista-previa/alineacion-caminar-espalda.json
juego/.venv/Scripts/python juego/herramientas/animaciones/crear_vista_previa.py juego/public/dibujos/cuy-nino-animado-v1.json juego/arte/cuy/vista-previa/caminar-espalda.gif --direccion espaldas --estado caminar_espalda
```

La fila de espalda incorporada en `cuy-nino-cuadros-v5.png` usa la fuente corregida
`cuy-espalda-3-cuadros-v2.png`: talones apoyados sin líneas de dedos, orejas
vistas por detrás en crema y marrón, mayor balanceo de brazos y nuca sobre la
tira roja. El juego utiliza el atlas v6, que conserva esta fila. La fuente
anterior de espalda y el atlas v4 fueron reemplazados y se retiraron.
Los atlas intermedios que nombran los reportes y herramientas se conservan.

La quinta fila contiene los índices `12,13,14` en el atlas de 768 × 1280 px.
Las cuatro filas anteriores se copian del atlas v3 sin remuestrear ni cambiar
sus píxeles.
`--referencia` reutiliza exactamente la escala frontal
`0.34970238095238093`, el centro objetivo `x=128` y el apoyo objetivo
`y=243.95089285714286`. Cada cuadro se alinea en x por la cabeza y en y por
el pie apoyado; las diferencias de posición del original se corrigen al armar.

Se mantiene `--margen 7` en la receta de espalda. Este margen comprueba que el
borde suave cabe dentro de la celda; con `--referencia` no vuelve a calcular
la escala ni modifica el apoyo. La comprobación pasa conservando todos los
bordes sin recortar ni redibujar. Los tres cuadros tienen 9 px transparentes
arriba y `10,9,9 px` abajo.

Arriba selecciona `espaldas/caminar_espalda`: la secuencia local `0,1,2,1`
corresponde a `12,13,14,13` en el atlas, a 8 fps y con repetición infinita.
Abajo usa `frente/caminar` (`0,1,2,1`). Derecha e izquierda usan
`caminar_lado` (`3,4,5,4`), reflejando solo la izquierda. Frente y espaldas
nunca se voltean, tanto en Phaser como en las vistas previas. Al detenerse se
conserva la última dirección con el cuadro del medio: 13 de espalda, 1 de
frente y 4 de lado (reflejado únicamente al mirar a la izquierda).

La verificación independiente de los píxeles de espalda obtiene:

| Cuadro local (atlas) | Centro cabeza x | Cima cabeza y | Pies y |
| --- | --- | --- | --- |
| 0 (12) | 127,5 | 11 | 243 |
| 1 (13) | 127,5 | 11 | 244 |
| 2 (14) | 127,5 | 11 | 243 |

La variación dentro de espalda es 0 px en x, 0 px en la cima y 1 px en los
pies. Comparando los nueve cuadros de caminar de frente, de lado y de espaldas,
las variaciones son 0,5 px, 1 px y 1 px respectivamente: todas dentro de 2 px.
El GIF `juego/arte/cuy/vista-previa/caminar-espalda.gif` usa el pasto real
`#5aa04a`, cuatro cuadros de 256 × 256 y bucle infinito. GIF representa los
125 ms por paso con `120,130,130,120 ms`: un ciclo de 500 ms, equivalente a 8 fps.

Las pruebas `test_espalda.py` reconstruyen la quinta fila desde la fuente v2,
comprueban igualdad exacta de escala y píxeles anteriores, verifican los 2 px
y comprueban el GIF, su secuencia y la protección contra reflejos.

## Parpadeo del cuy

La fuente `juego/arte/cuy/origen/cuy-parpadeo-3-cuadros.png` trae tres cuadros
frontales: ojos abiertos, entornados y cerrados. No se modifica. Se procesa con
el informe `referencia-parpadeo.json`, que fija una escala única de
`0.33910533910533913` y el apoyo `x=128`, `y=244`. Esa escala no es la del
caminar frontal (`0.3497`): la fuente de parpadeo es un 3 % más alta, y con la
escala de `armado.json` el cuy saldría un 3 % más grande que en el cuadro
quieto, con un salto visible al parpadear. Con esta referencia la cabeza y los
pies coinciden con ese cuadro quieto de frente.

```powershell
juego/.venv/Scripts/python juego/herramientas/animaciones/armar_hoja.py juego/arte/cuy/origen/cuy-parpadeo-3-cuadros.png --celda 256x256 --referencia juego/arte/cuy/vista-previa/referencia-parpadeo.json --salida juego/public/dibujos/cuy-parpadeo-v1.png --reporte juego/arte/cuy/vista-previa/armado-parpadeo.json
juego/.venv/Scripts/python juego/herramientas/animaciones/verificar_hoja.py juego/public/dibujos/cuy-parpadeo-v1.png --celda 256x256 --tolerancia 2 --reporte juego/arte/cuy/vista-previa/alineacion-parpadeo.json
juego/.venv/Scripts/python juego/herramientas/animaciones/crear_vista_previa.py juego/public/dibujos/cuy-parpadeo-v1.json juego/arte/cuy/vista-previa/parpadeo.gif --direccion frente --estado parpadeo
juego/.venv/Scripts/python juego/herramientas/animaciones/armar_hoja.py juego/arte/cuy/origen/cuy-parpadeo-3-cuadros.png --celda 256x256 --referencia juego/arte/cuy/vista-previa/referencia-parpadeo.json --hoja-base juego/public/dibujos/cuy-nino-cuadros-v5.png --salida juego/public/dibujos/cuy-nino-cuadros-v6.png --reporte juego/arte/cuy/vista-previa/armado-parpadeo-atlas.json
juego/.venv/Scripts/python juego/herramientas/animaciones/verificar_hoja.py juego/public/dibujos/cuy-nino-cuadros-v6.png --celda 256x256 --cuadros 0,1,2,3,4,5,12,13,14,15,16,17 --tolerancia 2 --reporte juego/arte/cuy/vista-previa/alineacion-parpadeo-atlas.json
```

Los tres primeros comandos producen la hoja suplementaria `cuy-parpadeo-v1.png`
(768 × 256, con su manifiesto `cuy-parpadeo-v1.json`) y el GIF de revisión. Los dos
últimos añaden esos mismos tres cuadros como **sexta fila** del atlas activo
`cuy-nino-cuadros-v6.png` (768 × 1536). Las cinco filas anteriores se copian de
la v5 sin remuestrear ni cambiar un píxel, y la fila nueva es idéntica, píxel por
píxel, a la hoja suplementaria. La v5 se conserva como versión anterior.

El manifiesto `cuy-nino-animado-v1.json` apunta ahora a la v6, declara 6 filas y
añade solo en `frente` el estado `parpadeo`: cuadros `15,16,17,16,15` a 16 fps
(312,5 ms), una sola repetición y `siguiente: quieto`. Arriba, izquierda y
derecha no tienen parpadeo porque no existe esa vista dibujada. El juego lo pide
con `mostrarEstado('parpadeo', 'frente')`, igual que feliz y asustado; las reglas
de cuándo parpadear están en `juego/src/efectos/ParpadeoCuy.js`.

La regla de las demás animaciones pide la escala del caminar frontal y una
verificación de 2 px. Con esta fuente no se pueden cumplir las dos a la vez, y
se comprobó armando el parpadeo con `--referencia armado.json` (escala
`0.34970238095238093`): con los márgenes 8 a 2 la herramienta rechaza la hoja
porque el dibujo no cabe sin recortar, y con margen 1 cabe, pero la cabeza queda
en y=4 en vez de y=11 (7 px más arriba que el cuadro quieto, a 1 px del borde de
la celda), lejos de los 2 px de tolerancia. Se mantiene la escala compensada: es
la que deja el cuy del parpadeo exactamente del mismo tamaño en pantalla que el
quieto, que es lo que protege la regla.

La verificación independiente de los píxeles de la sexta fila obtiene:

| Cuadro local (atlas) | Centro cabeza x | Cima cabeza y | Pies y |
| --- | --- | --- | --- |
| 0 (15) | 127,5 | 11 | 244 |
| 1 (16) | 127,5 | 11 | 244 |
| 2 (17) | 127,5 | 11 | 244 |

La variación dentro del parpadeo es 0 px en x, en la cima y en los pies; los
cuadros de caminar y de parpadeo juntos, los doce de la comprobación, varían
0,5 px, 1 px y 1 px: todo dentro de 2 px. El GIF `parpadeo.gif` usa el pasto
`#5aa04a`, cinco cuadros de 256 × 256 y no lleva extensión de bucle: se reproduce
una sola vez, con `60,60,70,60,60 ms` (312 ms en total, 16 fps).

Las pruebas `test_parpadeo.py` reconstruyen ambas hojas desde la fuente, comprueban
que las cinco filas anteriores y la hoja suplementaria no cambian, miden la altura
de la cabeza y los pies contra el cuadro quieto de frente, y comprueban el
manifiesto principal y el GIF. En el navegador, `pruebas/parpadeo.spec.js`
comprueba el estado en Phaser y `pruebas/vida.spec.js` el parpadeo dentro del laberinto.
