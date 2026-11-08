# Kusi · Juegos

Reproductor de juegos de Kusi, hecho con Phaser 4.2.1 y Vite. Hoy tiene un
juego: el laberinto, donde el cuy recoge alimentos siguiendo patrones o
clasificándolos, abre el portal y evita al zorro, con Kusi dando consignas,
dos ayudas y voz.

## Carpetas

- [`kit/`](kit/README.md): lo que la IA usa para armar un juego: el reproductor
  común, los dibujos y sonidos, la guía de estilo, los originales, las
  herramientas y el catálogo.
- [`juegos/`](juegos/README.md): la biblioteca de juegos de ejemplo; hoy, el
  [laberinto](juegos/laberinto/README.md).
- [`taller/`](taller/README.md): cómo la IA crea un juego nuevo (Sprint 3).
- `pruebas/`: `logica/` (con `node --test`), `navegador/` (con Playwright),
  `ayudas/` (lo que comparten las pruebas de navegador) y `fixtures/` (guiones y
  huellas de ejemplo).

## Abrirlo

```bash
cd juego
npm install
npm run dev
```

Abre <http://localhost:5174/> (el panel web usa el puerto 5173). El laberinto
se abre directamente con `kit/recursos/paquete-laberinto-ejemplo.json`.
El alias `?paquete=laberinto` sigue funcionando para los enlaces existentes.

- Mantén y arrastra el joystick para elegir un rumbo. Al soltar, el cuy termina
  la casilla y se detiene. Los toques sobre el mapa no eligen un destino.
- Las flechas mantienen el avance hasta el muro y recogen alimentos al pasar.
- **Ayuda** muestra las pistas y **Escuchar** repite la consigna.
- `?nivel=2` y `?nivel=3` abren directamente esos niveles.
- `?vida=0` desactiva los efectos y evita descargar sonidos.
- `?rapido=1` multiplica la velocidad por cuatro para revisar recorridos.
- `?renderizador=auto` permite comparar la elección de Phaser con Canvas,
  que es el renderizador predeterminado.

El lienzo usa `Scale.EXPAND`, con base de 1280 × 720 y columnas para el
joystick, el mapa y Kusi. El tamaño de las casillas y los controles se
ajusta a la ventana.

## Guiones y mensajes

`?paquete=mensaje` abre sin guion y espera un `postMessage` de la página que
contiene el juego. El mensaje tiene la forma `{ tipo: 'paquete', paquete: guion }`,
con el guion como objeto o texto JSON; `{ tipo: 'reiniciar' }` inicia otra partida.
El modo normal y el alias también aceptan guiones nuevos por este puente.

El contrato es `kusi-paquete/0`, familia `laberinto`. Las reglas disponibles son
`orden` y `solo_clase`. El catálogo admite fresa, platano, mango, mandarina, pina,
zanahoria, papa y choclo, incluidos los tipos que solo aparezcan en una secuencia.
Los ejemplos enviados por mensaje están en `pruebas/fixtures/`.
Consulta [juegos/laberinto/README.md](juegos/laberinto/README.md) para el protocolo y los niveles.

## Dibujos, animaciones y sonidos

Los dibujos que usa el juego están en `kit/recursos/dibujos/`, ordenados por tipo:

- `personajes/`: el cuy (`cuy.png`, con su manifiesto `cuy.json`), el zorro
  (`zorro.png` y `zorro.json`) y Kusi (`kusi.png`).
- `objetos/`: los ocho alimentos.
- `mundo/`: el fondo del patio visto desde arriba, las plantas que se mueven
  (cuatro cuadros por tira), el suelo, el borde de pasto, los dos cubos de adobe
  y el portal.
- `interfaz/`: la barra, los globos, los botones, el joystick, la mano que
  enseña y los destellos.

Kusi y su globo están a la derecha y el joystick a la izquierda.

La barra muestra los alimentos reales: en patrones conserva el orden y señala
el siguiente; en clasificación muestra las frutas o verduras disponibles,
marca la que se recogió y permite elegir en cualquier orden. El contador indica
cuántas faltan para la meta, incluso si hay más opciones que las necesarias.
Los zorros exploran los pasillos desde que aparece el nivel, sin esperar al
primer movimiento del niño; priorizan las casillas menos visitadas.

El cuy mantiene pelaje liso en todas sus vistas y el zorro lleva la cola
centrada de espalda. Lo que entregó la herramienta de imágenes, sus pedidos y
los paquetes de sonidos están en [`kit/originales/`](kit/originales/README.md);
los programas que los preparan, en [`kit/herramientas/`](kit/herramientas/README.md).
La [guía de estilo](kit/estilo/README.md) dice cómo se dibuja una pieza nueva.

Los ocho sonidos del laberinto y sus licencias están en `kit/recursos/sonidos/`.
El botón de sonido recuerda el silencio.

## Comprobaciones

```bash
npm run prueba:logica
npm run build
npx playwright install chromium  # solo si falta el navegador
npx playwright test
```

Las pruebas cubren reglas, movimiento, rutas, zorros, efectos, animaciones,
teclado, ratón, tacto, niveles y guiones recibidos por mensaje. Los avisos de
partida se guardan en `window.kusi.avisos` y se muestran en consola con `[Kusi]`.
Las herramientas de captura y rendimiento del laberinto permanecen en `kit/herramientas/`.
