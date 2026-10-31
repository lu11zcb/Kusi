# Kit de Kusi

El kit es todo lo que la IA puede usar para armar un juego. La IA usa el kit,
pero no lo cambia: si falta una pieza, la pide en lugar de inventarla.

## Carpetas

| Carpeta | Qué tiene |
| --- | --- |
| `reproductor/` | El código común, hecho con Phaser 4.2.1: el arranque (`main.js`), la carga y revisión del guion (`escenas/EscenaCarga.js`), los personajes animados, la voz y el habla de Kusi, el puente con el panel y la app (`mensajes/puenteGuion.js` y `KusiPuente`), los avisos de partida, los efectos de vida, los sonidos y la interfaz común. |
| `recursos/` | Los dibujos (`dibujos/`), los sonidos (`sonidos/`) y el guion de ejemplo del laberinto. Vite los sirve desde la raíz del juego, por ejemplo `dibujos/fresa.png`. |
| `arte/` | Los originales de los dibujos, con sus pedidos y sus licencias. |
| `herramientas/` | Armar y revisar hojas de animación, preparar el fondo, sacar capturas y medir los fps. |
| [`catalogo.json`](catalogo.json) | La lista de piezas con su nombre y su archivo, para que la IA sepa qué existe sin abrir las imágenes. La prueba `pruebas/logica/catalogoKit.test.js` revisa que cada archivo exista. |

## Piezas

| Pieza | Qué tiene |
| --- | --- |
| Personajes | El cuy del niño y el zorro, cada uno en cuatro vistas con sus estados, y Kusi, el guía, que habla, saluda, parpadea y respira. |
| Objetos | Ocho alimentos: cinco frutas (fresa, plátano, mango, mandarina y piña) y tres verduras (zanahoria, papa y choclo). |
| Mundos | Patio andino visto desde arriba, con pasto y flores que se mueven, bloques de adobe, suelo, borde de pasto y portal. |
| Interfaz | Barra de objetivos, globos de diálogo, botones de voz, ayuda y sonido, joystick, la mano que enseña y los destellos. |
| Sonidos | Pasos, comer, error, captura, puerta, nivel y alerta del zorro (Kenney, CC0). |

## Cómo se conecta con los juegos

El reproductor arranca, carga el guion y abre el juego que corresponde a su
familia. Hoy conoce un solo juego, el laberinto (`familia: laberinto`), que
está en [`../juegos/laberinto/`](../juegos/laberinto/LEEME.md). Un juego nuevo
del [taller](../taller/LEEME.md) va en su propia carpeta dentro de `juegos/` y
se registra en `reproductor/main.js` y `reproductor/escenas/EscenaCarga.js`.
