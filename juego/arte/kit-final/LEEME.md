# Kit de adobe y controles del laberinto

Las piezas que usa el reproductor están en `public/dibujos/kit-final/`:
32 bloques de adobe (16 códigos de vecinos y dos variantes), suelo, borde de
pasto, portal abierto/cerrado, barra, globos, botones, joystick y marcas.

`src/dibujos/kitFinal.js` carga el kit y selecciona los bloques según los vecinos
arriba, derecha, abajo e izquierda. `patioChacra.js` coloca suelo y borde.
`EscenaLaberinto.js` monta el mapa y los controles; la lógica de disposición
reserva el joystick a la izquierda y Kusi con su globo a la derecha.

La barra y el globo son ilustraciones separadas de sus textos. El globo se mide
con el texto real de Phaser. Las ocho siluetas de alimentos siguen guardadas,
aunque los objetivos actuales se muestran a color.

El kit fue preparado a partir de las ilustraciones aprobadas de la entrega
anterior. El paisaje
vigente y sus hojas de animación están documentados por separado en
[../fondo-cenital-v1/LEEME.md](../fondo-cenital-v1/LEEME.md).

Las pruebas de `arteDemo.test.js`, `kitFinal.test.js` y `estiloFinal.test.js`
comprueban las piezas, los perfiles RGBA, las anclas y las imágenes de personajes.
