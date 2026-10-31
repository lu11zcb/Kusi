# Pelaje liso y cola centrada · 28 de octubre de 2026

Corrección vigente de las caminatas de espalda. Arte editado con la herramienta
integrada `image_gen`; prompts exactos en `prompts.txt`, fuentes transparentes
en `origen/` y referencias de las vistas aprobadas en `referencias/`.

## Cuy

La espalda mantiene pelaje corto, contornos redondeados y manchas con bordes
lisos, como el frente y los laterales. Se retiraron el borde dentado de la
mancha de la nuca, los mechones de los costados y el mechón claro que colgaba
bajo el pañuelo. Se conserva el pequeño remate del pelo sobre la cabeza que
forma parte del diseño frontal. El pañuelo muestra su cinta trasera, sin nudo.

El atlas activo es `kit/recursos/dibujos/cuy-nino-cuadros-v9.png`. Solo cambia la
quinta fila (12–14); las vistas de frente, laterales y expresiones son idénticas
píxel por píxel respecto de las poses aprobadas. La vista izquierda sigue reflejando el lateral derecho,
como declara el manifiesto. `cuy-cuatro-vistas.png` reúne los apoyos de las
cuatro direcciones para comprobar la coherencia del estilo.

## Zorro

La cola se dibujó en el centro de la pelvis. El cuerpo de la cola y su punta
clara caen sobre el mismo eje, entre las patas; no se conserva el barrido
lateral de la versión anterior. Hay un pequeño balanceo alrededor del centro,
manteniendo el volumen y el punto de unión.

El atlas activo es `kit/recursos/dibujos/zorro-cuadros-v4.png`. Solo cambia la tercera
fila (6–8); las otras filas conservan sus píxeles aprobados. El criterio anterior que exigía
la punta a la izquierda se sustituyó por la comprobación de su posición central.

## Preparación y comprobación

Desde `juego/`:

```sh
node kit/herramientas/animaciones/preparar_espaldas.mjs
npm run prueba:logica
npm run build
```

La receta vigente usa los atlas actuales como bases y sustituye solo la fila de
espalda desde sus fuentes aprobadas. No requiere las hojas intermedias retiradas.
Reduce cada pose con escala
isotrópica y alinea cima (y=23), apoyo (y=244) y centro de cabeza (x=128, ±0,5 px).
`alineacion.json` registra las medidas y la conservación de las otras filas.
Las fuentes actuales y las imágenes del laberinto anterior se conservan.

Abrir [revision.html](revision.html) para comparar el pelaje en las distintas
vistas y la cola anterior con la centrada. Incluye pausa, velocidad normal o
reducida y una guía opcional del eje del zorro. El ciclo sigue siendo `0,1,2,1`
a ocho cuadros por segundo; no se modificaron los controles ni el movimiento.

Las pruebas de `espaldasCorregidas.test.js` verifican los píxeles preservados
mediante huellas SHA-256 de las filas aprobadas, además de los
contornos de la mancha de la nuca, ausencia del mechón bajo el cuello y posición,
volumen y desplazamiento de la punta de la cola. Se complementan con inspección
visual de las tiras a su tamaño real.
