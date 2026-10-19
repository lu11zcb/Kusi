# Juego del mercado (HU46)

Juego de Kusi hecho con Phaser 4.2.1 y Vite. Mide 1280 × 720, va en horizontal y se ajusta a la pantalla.

## Abrirlo

```bash
cd juego
npm install
npm run dev
```

Después abre http://127.0.0.1:5174/ (el panel web usa el 5173).

- En la computadora: las flechas izquierda y derecha caminan y la barra espaciadora salta.
- En el celular o la tableta: joystick abajo a la izquierda y «Saltar» abajo a la derecha (se pueden usar los dos a la vez).
- Con `?rapido=1` el cuy camina 4 veces más rápido (lo usan las pruebas).

## El paquete

El juego se arma con `public/paquete-ejemplo.json` (formato `kusi-paquete/0`): puestos, vendedores, productos, precios, la lista de Kusi y la plata. Esos datos no están escritos en el código.

## Dibujos

Cada cosa se busca en `public/dibujos/<clave>.png`. Si el archivo no está, el juego dibuja una figura simple con esa clave. Para usar los dibujos de verdad, basta con copiarlos a esa carpeta con su clave como nombre.

| Clave | Qué es |
| --- | --- |
| `kusi`, `cuy-nino` | Kusi y el cuy del niño (de lado, mirando a la derecha) |
| `puesto-pan`, `puesto-frutas`, … | El puesto. El hueco entre el toldo y el mostrador debe ser transparente: por ahí se ve al vendedor |
| `vizcacha`, `zorro`, `llama`, … | Los vendedores, de frente |
| `harina`, `fresa`, … | Los productos |
| `icono-pan`, `icono-frutas`, `icono-verduras`, `icono-granja`, `icono-granos`, `icono-dulces` | El dibujito del letrero de cada puesto |
| `billete-10`, `moneda-5`, `moneda-2`, `moneda-1` | La plata |
| `cartera`, `choclito` | La cartera y el choclito del cartel |
| `fondo-cerros`, `fondo-casas`, `fondo-piso` | Las tres capas del fondo; se repiten de lado a lado, así que el borde izquierdo debe empatar con el derecho |

Cada dibujo se escala para ocupar el mismo lugar que su figura simple, sin deformarse.

## Avisos

Lo que pasa en el juego (`compra`, `pago_insuficiente` y `lista_completa`) se guarda en la lista `avisos` (`src/logica/avisos.js`) y aparece en la consola con `[Kusi]`. Más adelante se mandarán a la app por KusiPuente.

## Prueba automática

```bash
npx playwright install chromium   # solo la primera vez
npm run prueba
```

La prueba abre el juego, camina con las flechas hasta el puesto de pan, compra la harina pagando con la moneda de 5 y revisa el vuelto (2), la plata (12 soles) y el cartel («harina 1/1»).
