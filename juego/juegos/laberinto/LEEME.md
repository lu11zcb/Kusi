# El laberinto de Kusi

El cuy recorre un laberinto visto desde arriba, recoge alimentos y abre el
portal mientras evita al zorro. Kusi da la consigna con voz y dos ayudas.

- **Reglas:** `orden` (seguir un patrón, como fresa, plátano, fresa, plátano) y
  `solo_clase` (recoger solo frutas o solo verduras).
- **Guion de ejemplo:** [`kit/recursos/paquete-laberinto-ejemplo.json`](../../kit/recursos/paquete-laberinto-ejemplo.json),
  con tres niveles.
- **Comprobaciones:** `ValidadorLaberinto` en `edu-api`, antes de que el juego
  llegue al docente.
- **Guía completa:** [GUIA.md](GUIA.md).

## Código de este juego

| Carpeta | Qué tiene |
| --- | --- |
| `escenas/` | `EscenaLaberinto.js`, la escena que arma el mapa y la partida. |
| `logica/` | Reglas, movimiento por casillas, zorros, joystick, disposición en pantalla, parámetros y avisos de la partida. |
| `interfaz/` | Barra de objetivos, joystick y mano que enseña. |
| `dibujos/` | El patio y el fondo del laberinto. |
| `efectos/` | Captura, portal y vegetación que se mueve. |
| `datos/` | `validarLaberinto.js`, lo mínimo para cargar un guion. |

Lo demás (personajes, voz, puente con la app, dibujos y sonidos) lo toma del
[kit](../../kit/LEEME.md).

Para un tema nuevo, la IA escribe solo el guion: el mapa, la regla, los
alimentos, el zorro, la consigna y las ayudas. El código del juego no cambia.
