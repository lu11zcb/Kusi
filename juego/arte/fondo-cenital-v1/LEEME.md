# Fondo cenital y vegetación v1

Arte creado con la herramienta integrada `image_gen`, tomando la propuesta
`../propuestas/laberinto-vista-superior-v2.png` como referencia de estilo y cámara.
Las instrucciones exactas de ambas generaciones están en `prompts.txt`.

Los originales permanecen en `origen/`. Los recursos que consume Phaser están
en `../../public/dibujos/cenital-v1/`:

- `fondo.png`: suelo continuo y tejados vistos desde arriba.
- `pasto.png`, `arbusto.png`, `margaritas.png`, `flores.png`: tiras RGBA
  de 1280 × 320, cuatro cuadros ilustrados de 320 × 320 por tira.

Para volver a separar el atlas, desde `juego/`:

```sh
node herramientas/preparar_fondo_cenital.mjs
```

La herramienta normaliza el atlas a 1280 × 1280 con `sips`, recorta sus cuatro
filas y centra el alfa de cada pose. No sintetiza animaciones ni estira las
plantas: el juego reproduce los cuadros en el ciclo `0,1,2,3,2,1`, con tiempos
distintos para cada especie y desfases por planta. El pasto comparte un ancla
de raíz; arbustos y flores comparten el centro de su copa.

La distribución evita el rectángulo del laberinto. `?vida=0` mantiene todos
estos sprites en el cuadro 0 y no cambia la inteligencia del zorro.
Los recursos anteriores de `estilo-final/`, los personajes y el kit del mapa
se conservan en sus rutas originales.

Verificación del 27 de octubre de 2026: compilación Vite correcta, 182 pruebas
de lógica correctas y ocho comprobaciones sobre el juego real en Chrome.
Estas últimas cubren el inicio autónomo del zorro, los cuadros y anclas del
jardín, la recogida de mango antes de la primera ficha, las verduras reales
y el encuadre de 800 × 360 con Canvas y AUTO. El comprobador local permanece
en `../../evidencias/cenital-v1/verificacion.html` (carpeta de evidencias ignorada
por Git). La suite Playwright no pudo iniciar su servidor por la restricción
`listen EPERM 127.0.0.1:5174` del entorno; su listado de 128 pruebas sí se pudo
cargar sin errores.
