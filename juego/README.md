# Kusi · El laberinto (HU46)

Juego de Kusi hecho con Phaser 4.2.1 y Vite. El cuy recorre tres niveles,
recoge alimentos siguiendo patrones o clasificándolos, abre la puerta y evita
al zorro. Kusi acompaña con consignas, dos ayudas y voz del navegador.

## Abrirlo

```bash
cd juego
npm install
npm run dev
```

Abre <http://localhost:5174/> (el panel web usa el puerto 5173). El laberinto
se abre directamente con `public/paquete-laberinto-ejemplo.json`.
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
Consulta [HU46-LABERINTO.md](HU46-LABERINTO.md) para el protocolo y los niveles.

## Dibujos, animaciones y sonidos

Los alimentos, los personajes y el kit están en `public/dibujos/`. El paisaje
de `public/dibujos/cenital-v1/` comparte la vista desde arriba del mapa y anima
pasto, arbustos y flores con cuatro cuadros ilustrados por hoja. Los recursos
anteriores se conservan. Kusi y su globo están a la derecha y el joystick a la
izquierda. El origen del nuevo arte y su preparación están documentados en
[arte/fondo-cenital-v1/LEEME.md](arte/fondo-cenital-v1/LEEME.md).

La barra muestra los alimentos reales: en patrones conserva el orden y señala
el siguiente; en clasificación muestra las frutas o verduras disponibles,
marca la que se recogió y permite elegir en cualquier orden. El contador indica
cuántas faltan para la meta, incluso si hay más opciones que las necesarias.
Los zorros exploran los pasillos desde que aparece el nivel, sin esperar al
primer movimiento del niño; priorizan las casillas menos visitadas.

El manifiesto `cuy-nino-animado-v1.json` usa `cuy-nino-cuadros-v9.png`, y
`zorro-animado-v1.json` usa `zorro-cuadros-v4.png`. El cuy mantiene pelaje liso
en todas sus vistas y el zorro lleva la cola centrada de espalda. Las otras
poses conservan sus píxeles originales. Los originales,
reportes y versiones anteriores permanecen en `arte/` y `public/dibujos/`.
La [comparación animada](arte/espaldas-v3/revision.html) muestra las vistas del
cuy y la cola corregida; [origen y preparación](arte/espaldas-v3/LEEME.md).
Las herramientas están documentadas en
[herramientas/animaciones/LEEME.md](herramientas/animaciones/LEEME.md).
El nuevo paisaje se prepara con `herramientas/preparar_fondo_cenital.mjs`.

Los siete sonidos del laberinto y sus licencias están en `public/sonidos/`;
los originales se conservan en `arte/sonidos/`. El botón de sonido recuerda el silencio.

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
Las herramientas de captura y rendimiento del laberinto permanecen en `herramientas/`.
