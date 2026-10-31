# El laberinto de Kusi

El cuy recorre un laberinto visto desde arriba, recoge alimentos y abre el
portal mientras evita al zorro. Kusi da la consigna con voz y dos ayudas.

- **Reglas:** `orden` (seguir un patrón, como fresa, plátano, fresa, plátano) y
  `solo_clase` (recoger solo frutas o solo verduras).
- **Guion de ejemplo:** [`public/paquete-laberinto-ejemplo.json`](../../public/paquete-laberinto-ejemplo.json),
  con tres niveles.
- **Código:** `src/escenas/EscenaLaberinto.js` y los archivos `src/logica/*Laberinto.js`.
- **Comprobaciones:** `ValidadorLaberinto` en `edu-api`, antes de que el juego
  llegue al docente.
- **Guía completa:** [HU46-LABERINTO.md](../../HU46-LABERINTO.md).

Para un tema nuevo, la IA escribe solo el guion: el mapa, la regla, los
alimentos, el zorro, la consigna y las ayudas. El código del juego no cambia.
