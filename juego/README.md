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

## La plaza

Mide 2560 × 1080 (2 pantallas de ancho por 1,5 de alto) y la cámara sigue al cuy. Kusi espera abajo al centro, en la entrada, y el cuy empieza a su lado. Kusi mira de espaldas cuando el cuy está más arriba que ella (hacia los puestos) y de frente cuando no.

Los puestos van en el orden del paquete: los dos primeros cerca de la entrada y los demás contra las casas, alrededor de la pileta. Hay lugar para 7. El cuy no atraviesa los mostradores ni la pileta; puede pasar por detrás de los puestos de abajo, y entonces el puesto se vuelve medio transparente. Todas las medidas están en `src/medidas.js`.

## El paquete

El juego se arma con `public/paquete-ejemplo.json` (formato `kusi-paquete/0`): puestos, vendedores, productos, precios, la lista de Kusi y la plata. Esos datos no están escritos en el código.

## Dibujos

Cada cosa se busca en `public/dibujos/<clave>.png`. Si el archivo no está, el juego dibuja una figura simple con esa clave. Para usar los dibujos de verdad, basta con copiarlos a esa carpeta con su clave como nombre.

| Clave | Qué es |
| --- | --- |
| `kusi-frente`, `kusi-espaldas` | Kusi de frente y de espaldas. `kusi-frente` también es la cara del globo de Kusi y del cartel |
| `cuy-nino-frente`, `cuy-nino-espaldas` | El cuy del niño de frente (cuando baja) y de espaldas (cuando sube o mira un puesto). Caminando de lado se queda con el último |
| `puesto-pan`, `puesto-frutas`, … | El puesto, de frente. El hueco entre el toldo y el mostrador debe ser transparente: por ahí se ve al vendedor |
| `vizcacha`, `zorro`, `llama`, … | Los vendedores, de frente |
| `harina`, `fresa`, … | Los productos |
| `icono-pan`, `icono-frutas`, `icono-verduras`, `icono-granja`, `icono-granos`, `icono-dulces` | El dibujito del letrero de cada puesto |
| `billete-10`, `moneda-5`, `moneda-2`, `moneda-1` | La plata |
| `cartera`, `choclito` | La cartera y el choclito del cartel |
| `fondo-plaza` | El piso de toda la plaza visto desde arriba, en 2560 × 1080 (o la misma proporción). Ver abajo qué debe tener |

Cada dibujo se escala para ocupar el mismo lugar que su figura simple, sin deformarse.

### Qué debe tener `fondo-plaza`

Los puestos, Kusi y el cuy se ponen encima, así que el fondo es solo el piso y lo que rodea la plaza. Para que coincida con lo que el cuy no puede pisar (medidas en px de la plaza de 2560 × 1080):

- Arriba, de y = 0 a 290: las casas con sus techos y la vereda.
- A los lados, de x = 0 a 76 y de x = 2484 a 2560: jardineras.
- Abajo, desde y = 1036: un muro bajito con la entrada al centro (de x = 1130 a 1430), donde espera Kusi.
- La pileta centrada en (1280, 650), de unos 340 × 160 px y baja (el chorrito no debe pasar de y = 580), porque el cuy puede caminar por detrás.
- El resto, piso de la plaza donde camina el cuy.

## Avisos

Lo que pasa en el juego (`compra`, `pago_insuficiente` y `lista_completa`) se guarda en la lista `avisos` (`src/logica/avisos.js`) y aparece en la consola con `[Kusi]`. Más adelante se mandarán a la app por KusiPuente.

## Prueba automática

```bash
npx playwright install chromium   # solo la primera vez
npm run prueba
```

La prueba abre el juego y toca el puesto de pan: el cuy camina solo hasta quedar frente a él. Luego toca «Hablar», compra la harina pagando con la moneda de 5 y revisa el vuelto (2), la plata (12 soles) y el cartel («harina 1/1»). Otra prueba paga sin marcar plata y revisa que salga «¡Te falta plata!» sin perder nada.
