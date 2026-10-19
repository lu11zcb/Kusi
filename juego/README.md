# Juego del mercado (HU46)

Juego de Kusi hecho con Phaser 4.2.1 y Vite. Mide 1280 × 720, va en horizontal y se ajusta a la pantalla.

## Abrirlo

```bash
cd juego
npm install
npm run dev
```

Después abre http://127.0.0.1:5174/ (el panel web usa el 5173).

La plaza se ve desde arriba, un poco inclinada (como en Pokémon o Stardew Valley), y el cuy camina en todas las direcciones:

- Tocar el piso: el cuy camina solo hasta ahí, rodeando los puestos y la pileta. Un circulito marca a dónde va.
- Tocar un puesto: el cuy camina hasta quedar frente a él y aparece «Hablar».
- En el celular o la tableta también hay un joystick redondo abajo a la izquierda.
- En la computadora: las flechas caminan en 8 direcciones y el mouse sirve para tocar.
- Con `?rapido=1` el cuy camina 4 veces más rápido (lo usan las pruebas).
- Con `?depurar=1` se ve encima de la plaza lo que no se pisa (ver «La plaza»).

## La plaza

La plaza mide lo mismo que `fondo-plaza.png` (2048 × 1152) y el dibujo va a su tamaño, sin estirarlo ni recortarlo. La cámara sigue al cuy. Kusi espera en la entrada de abajo y el cuy empieza a su lado. Kusi mira de espaldas cuando el cuy está más arriba que ella (hacia los puestos) y de frente cuando no.

Todo lo que depende del dibujo está en un solo archivo, `src/datos/plaza.json`, en píxeles del dibujo:

- `noSePisa`: la base sobre el piso de cada cosa que el cuy no puede pisar (las casas, la iglesia, los techos, el muro de la entrada, la pileta, las bancas, las macetas y los faroles). Cada una es una caja, una elipse o un polígono, con su `tipo` y, si hace falta, una `nota`. El juego les suma el tamaño de las patitas del cuy.
- `puestos`: el lugar de cada puesto, en el orden del paquete (x del centro e y del piso, donde se apoya el mostrador). Caben 5 del tamaño de la pantalla aprobada sin tapar la iglesia, la pileta ni las bancas. Si el paquete trae más, los que sobran no aparecen y sale un aviso en la consola.
- `kusi` y `cuyInicio`: dónde espera Kusi y dónde empieza el cuy.

Si cambia el dibujo, se ajusta ese archivo y se revisa con `?depurar=1`: cada cosa que no se pisa se pinta encima de la plaza con un color transparente según su tipo, con su nota. En morado salen los puestos y Kusi; en blanco, dónde se para el cuy para hablar con cada puesto; en celeste, sus patitas. La tecla Z muestra toda la plaza de una vez.

El cuy no atraviesa los mostradores ni lo que no se pisa. Si pasa por detrás de un puesto, el puesto se vuelve medio transparente.

## El paquete

El juego se arma con `public/paquete-ejemplo.json` (formato `kusi-paquete/0`): puestos, vendedores, productos, precios, la lista de Kusi y la plata. Esos datos no están escritos en el código.

## Dibujos

Cada cosa se busca en `public/dibujos/<clave>.png`. Si el archivo no está, el juego dibuja una figura simple con esa clave. Para usar los dibujos de verdad, basta con copiarlos a esa carpeta con su clave como nombre.

| Clave | Qué es |
| --- | --- |
| `kusi-frente`, `kusi-espaldas` | Kusi de frente y de espaldas. `kusi-frente` también es la cara del globo de Kusi y del cartel |
| `cuy-nino-frente`, `cuy-nino-espaldas` | El cuy del niño de frente (cuando baja) y de espaldas (cuando sube o mira un puesto) |
| `cuy-nino` | El cuy del niño de lado, mirando a la derecha; para ir a la izquierda se voltea. Se usa cuando camina más hacia los costados que hacia arriba o abajo. Solo cambia de vista cuando una dirección domina claramente, para que no parpadee en las diagonales |
| `puesto-pan`, `puesto-frutas`, … | El puesto, de frente. El hueco entre el toldo y el mostrador debe ser transparente: por ahí se ve al vendedor. El letrero va en el frente del mostrador |
| `vizcacha`, `zorro`, `llama`, … | Los vendedores, de frente |
| `harina`, `fresa`, … | Los productos |
| `icono-pan`, `icono-frutas`, `icono-verduras`, `icono-granja`, `icono-granos`, `icono-dulces` | El dibujito del letrero de cada puesto |
| `billete-10`, `moneda-5`, `moneda-2`, `moneda-1` | La plata |
| `cartera`, `choclito` | La cartera y el choclito del cartel |
| `fondo-plaza` | Toda la plaza vista desde arriba. Va a su tamaño y debe medir lo que dice `plaza.json` (si no, sale un aviso en la consola). Su figura simple se arma con `plaza.json` |

Cada dibujo, menos `fondo-plaza`, se escala para ocupar el mismo lugar que su figura simple, sin deformarse.

## Avisos

Lo que pasa en el juego (`compra`, `pago_insuficiente` y `lista_completa`) se guarda en la lista `avisos` (`src/logica/avisos.js`) y aparece en la consola con `[Kusi]`. Más adelante se mandarán a la app por KusiPuente.

## Prueba automática

```bash
npx playwright install chromium   # solo la primera vez
npm run prueba
```

La prueba abre el juego y toca el puesto de pan: el cuy camina solo hasta quedar frente a él. Luego toca «Hablar», compra la harina pagando con la moneda de 5 y revisa el vuelto (2), la plata (12 soles) y el cartel («harina 1/1»). Otra prueba paga sin marcar plata y revisa que salga «¡Te falta plata!» sin perder nada. La tercera toca el centro de la pileta: el cuy camina hasta el borde y, aunque se lo empuje con la flecha, no entra al agua.
