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

El atlas activo es `public/dibujos/cuy-nino-cuadros-v9.png`. Solo cambia la
quinta fila (12–14); las vistas de frente, laterales y expresiones son idénticas
píxel por píxel a v8. La vista izquierda sigue reflejando el lateral derecho,
como declara el manifiesto. `cuy-cuatro-vistas.png` reúne los apoyos de las
cuatro direcciones para comprobar la coherencia del estilo.

## Zorro

La cola se dibujó en el centro de la pelvis. El cuerpo de la cola y su punta
clara caen sobre el mismo eje, entre las patas; no se conserva el barrido
lateral de la versión anterior. Hay un pequeño balanceo alrededor del centro,
manteniendo el volumen y el punto de unión.

El atlas activo es `public/dibujos/zorro-cuadros-v4.png`. Solo cambia la tercera
fila (6–8); las otras filas son idénticas a v3. El criterio anterior que exigía
la punta a la izquierda se sustituyó por la comprobación de su posición central.

## Preparación y comprobación

Desde `juego/`:

```sh
node herramientas/animaciones/preparar_espaldas.mjs arte/espaldas-v3/preparacion.json
npm run prueba:logica
npm run build
```

La receta anterior sigue disponible sin argumentos y no cambia sus fuentes.
La receta nueva usa v8/v3 como bases y escribe v9/v4. Reduce cada pose con escala
isotrópica y alinea cima (y=23), apoyo (y=244) y centro de cabeza (x=128, ±0,5 px).
`alineacion.json` registra las medidas y la conservación de las otras filas.
Las hojas anteriores y todos los originales permanecen en sus rutas.

Abrir [revision.html](revision.html) para comparar el pelaje en las distintas
vistas y la cola anterior con la centrada. Incluye pausa, velocidad normal o
reducida y una guía opcional del eje del zorro. El ciclo sigue siendo `0,1,2,1`
a ocho cuadros por segundo; no se modificaron los controles ni el movimiento.

Las pruebas de `espaldasCorregidas.test.js` verifican píxeles preservados,
contornos de la mancha de la nuca, ausencia del mechón bajo el cuello y posición,
volumen y desplazamiento de la punta de la cola. Se complementan con inspección
visual de las tiras a su tamaño real.
