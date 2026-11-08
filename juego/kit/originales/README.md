# Originales

Aquí está lo que entregaron la herramienta de imágenes y los paquetes de
sonidos, antes de prepararlo para el juego. El juego **no usa** estos archivos:
usa las piezas ya preparadas de [`../recursos/`](../recursos/). Se guardan para
saber de dónde salió cada pieza, con qué pedido, y para poder rehacerla.

Las carpetas tienen el mismo orden que `recursos/dibujos/`: personajes, mundo y
sonidos. Cada nombre dice qué es el archivo:

- `-original`: lo que entregó la herramienta de imágenes, sin cambios.
- `-referencia`: una pieza aprobada que se le dio a la herramienta como modelo.
- `-pedidos.txt`: los pedidos exactos que se usaron.
- `-receta.json`: lo que necesita la herramienta para preparar la pieza.

Los pasos intermedios (recortes, hojas reducidas y medidas) los escriben las
herramientas en `preparacion/`, dentro de cada carpeta. Esa carpeta no se sube a
GitHub: se rehace cada vez.

## personajes/

La corrección de las caminatas de espalda (28 de octubre de 2026). Solo cambió
la fila de espalda del cuy (fila 4) y del zorro (fila 2); las otras filas
conservan sus píxeles aprobados.

| Archivo | Qué es |
| --- | --- |
| `cuy-espalda-original.png` y `zorro-espalda-original.png` | Las espaldas que entregó la herramienta de imágenes: tres pasos en una tira. |
| `zorro-frente-referencia.png` | El zorro de frente aprobado, usado como modelo del pedido. |
| `espaldas-pedidos.txt` | Los dos pedidos: el pelaje liso del cuy y la cola centrada del zorro. |
| `espaldas-receta.json` | Qué fila de qué hoja reemplaza la herramienta. |

Para rehacerlas, desde `juego/`:

```sh
node kit/herramientas/animaciones/preparar_espaldas.mjs
```

## mundo/

El patio andino visto desde arriba (27 de octubre de 2026). El fondo se usó tal
como lo entregó la herramienta, así que está solo una vez, en
`recursos/dibujos/mundo/fondo-patio.png`.

| Archivo | Qué es |
| --- | --- |
| `plantas-original.png` | La hoja de plantas: 4 filas (pasto, arbusto, margaritas y flores) con 4 cuadros cada una. |
| `patio-pedidos.txt` | Los pedidos del fondo y de la hoja de plantas. |

Para volver a separar las plantas en sus cuatro tiras, desde `juego/`:

```sh
node kit/herramientas/preparar_fondo_cenital.mjs
```

## sonidos/

Los paquetes **Impact Sounds** e **Interface Sounds** de Kenney (CC0), tal como
se descargaron. Qué archivo de cada paquete usa el juego está en
[`../recursos/sonidos/ORIGEN.md`](../recursos/sonidos/ORIGEN.md).

## Lo que ya no está

Los originales de los alimentos, los cubos de adobe, la interfaz y las vistas
de frente y de lado de los personajes se retiraron el 30 de octubre de 2026,
junto con los dibujos del laberinto anterior. Siguen disponibles en el
historial de Git.
