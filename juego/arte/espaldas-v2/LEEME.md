# Caminatas de espalda corregidas · 28 de octubre de 2026

Versión anterior conservada como referencia. La corrección vigente alisa el
pelaje del cuy y centra la cola del zorro: [espaldas-v3](../espaldas-v3/LEEME.md).
El criterio lateral de la cola descrito abajo pertenece a esta versión antigua.

Las tiras nuevas se dibujaron con `image_gen`, usando los personajes actuales
como referencia. Los prompts exactos están en `prompts.txt`; las fuentes
transparentes están en `origen/` y los recortes de referencia en `referencias/`.

Cambios de dibujo:

- Cuy: nuca y caras exteriores de las orejas, pelaje dorsal marrón, brazos
  vistos por detrás y cinta roja del pañuelo sin el nudo frontal.
- Zorro: parte posterior del overol, brazos y talones de espalda. La cola
  conserva su unión a la cadera y permanece a la izquierda del observador en
  los tres cuadros, con un balanceo pequeño en vez de saltar de lado.

Los manifiestos activos usan `public/dibujos/cuy-nino-cuadros-v8.png` y
`public/dibujos/zorro-cuadros-v3.png`. Se reemplaza únicamente la quinta fila
del cuy (índices 12–14) y la tercera del zorro (6–8). Las otras filas conservan
exactamente los píxeles de v7 y v2. Esas hojas anteriores permanecen en sus rutas.
No cambia la selección de direcciones, el ciclo `0,1,2,1` ni sus ocho cuadros
por segundo.

Desde `juego/`, para preparar de nuevo los atlas:

```sh
node herramientas/animaciones/preparar_espaldas.mjs
```

El script recorta las tres poses, las reduce con escala isotrópica y alinea
cabeza y apoyo con los personajes aprobados: cima en y=23, pies en y=244 y
cabeza centrada en x=128 con tolerancia de medio píxel. No redibuja ni refleja
ninguna pose. `alineacion.json` registra las medidas; `preparacion/` contiene
intermedios reproducibles y no se versiona.

Abrir [revision.html](revision.html) para comparar ambas caminatas en bucle a
la velocidad del juego o a la mitad. Las tiras finales de 768 × 256 también
se conservan como `cuy-espalda-256.png` y `zorro-espalda-256.png`.

Las pruebas `espaldasCorregidas.test.js` verifican la conservación de las otras
filas, el dorso y el pañuelo del cuy, y el lado, volumen y desplazamiento de la
punta de la cola del zorro. La alineación general sigue cubierta por
`estiloFinal.test.js`. La anatomía y continuidad se revisan también visualmente.
