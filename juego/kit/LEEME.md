# Kit de Kusi

El kit es todo lo que la IA puede usar para armar un juego: el reproductor,
los personajes, los objetos, los mundos, la interfaz y los sonidos. La IA usa
el kit, pero no lo cambia: si falta una pieza, la pide en lugar de inventarla.

[`catalogo.json`](catalogo.json) lista cada pieza con su nombre y su archivo,
para que la IA sepa qué existe sin abrir las imágenes. La prueba
`pruebas/logica/catalogoKit.test.js` revisa que cada archivo del catálogo exista.

## Qué hay hoy y dónde está

| Pieza | Dónde está hoy | Qué tiene |
| --- | --- | --- |
| Reproductor | `src/` | Phaser 4.2.1: carga y revisión del guion, escenas, voz de Kusi, puente con el panel y la app (`KusiPuente`), avisos de partida, joystick y flechas, efectos de vida. |
| Personajes | `public/dibujos/` | El cuy del niño y el zorro, cada uno en cuatro vistas con sus estados, y Kusi, el guía, que habla, saluda, parpadea y respira. |
| Objetos | `public/dibujos/` | Ocho alimentos: cinco frutas (fresa, plátano, mango, mandarina y piña) y tres verduras (zanahoria, papa y choclo). |
| Mundos | `public/dibujos/cenital-v1/` y `public/dibujos/kit-final/` | Patio andino visto desde arriba, con pasto y flores que se mueven, bloques de adobe, suelo, borde de pasto y portal. |
| Interfaz | `public/dibujos/kit-final/` y `public/dibujos/estilo-final/` | Barra de objetivos, globos de diálogo, botones de voz, ayuda y sonido, joystick, la mano que enseña y los destellos. |
| Sonidos | `public/sonidos/` | Pasos, comer, error, captura, puerta, nivel y alerta del zorro (Kenney, CC0). |
| Originales | `arte/` | De dónde salen los dibujos, con sus pedidos y sus licencias. |
| Herramientas | `herramientas/` | Armar y revisar hojas de animación, preparar el fondo, capturas y medición de fps. |

Las piezas todavía viven en `src/`, `public/` y `arte/`. Pasarlas a esta
carpeta cambia las rutas del juego y de sus pruebas, así que se hace en el
Sprint 3, con las pruebas de navegador corriendo.
