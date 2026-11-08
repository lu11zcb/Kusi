# Kit de Kusi

El kit es todo lo que la IA puede usar para armar un juego. La IA usa el kit,
pero no lo cambia: si falta una pieza, la pide en lugar de inventarla.

## Carpetas

| Carpeta | Qué tiene |
| --- | --- |
| `reproductor/` | El código común, hecho con Phaser 4.2.1: el arranque (`main.js`), la carga y revisión del guion (`escenas/EscenaCarga.js`), los personajes animados, la voz y el habla de Kusi, el puente con el panel y la app (`mensajes/puenteGuion.js` y `KusiPuente`), los avisos de partida, los efectos de vida, los sonidos y la interfaz común. |
| `recursos/` | Lo que usa el juego: los dibujos ordenados por tipo (`dibujos/personajes/`, `objetos/`, `mundo/` e `interfaz/`), los sonidos (`sonidos/`) y el guion de ejemplo del laberinto. Vite los sirve desde la raíz del juego, por ejemplo `dibujos/objetos/fresa.png`. |
| [`originales/`](originales/README.md) | Lo que entregaron la herramienta de imágenes y los paquetes de sonidos, con sus pedidos. El juego no los usa: sirven para saber de dónde salió cada pieza y para rehacerla. |
| [`herramientas/`](herramientas/README.md) | Armar la lámina de la guía, preparar las hojas de animación y las plantas, sacar capturas y medir los fps. |
| [`catalogo.json`](catalogo.json) | La lista de piezas con su nombre y su archivo, para que la IA sepa qué existe sin abrir las imágenes. La prueba `pruebas/logica/catalogoKit.test.js` revisa que cada archivo exista. |
| [`estilo/`](estilo/README.md) | La guía de estilo: cómo se ven las piezas, la lista de comprobación de una pieza nueva, las piezas modelo con su lámina y el molde de un personaje. |

## Piezas

| Pieza | Qué tiene |
| --- | --- |
| Personajes | El cuy del niño y el zorro, cada uno en cuatro vistas con sus estados, y Kusi, el guía, que habla, saluda, parpadea y respira. |
| Objetos | Ocho alimentos: cinco frutas (fresa, plátano, mango, mandarina y piña) y tres verduras (zanahoria, papa y choclo). |
| Mundos | Patio andino visto desde arriba, con pasto y flores que se mueven, dos cubos de adobe, suelo, borde de pasto y portal. |
| Interfaz | Barra de objetivos, globos de diálogo, botones de voz, ayuda y sonido, joystick, la mano que enseña y los destellos. |
| Sonidos | Pasos, comer, error, captura, puerta, nivel y alerta del zorro (Kenney, CC0). |

## Cómo se conecta con los juegos

El reproductor arranca, carga el guion y abre el juego. Hoy conoce un solo
juego, el laberinto (`familia: laberinto`), que está en
[`../juegos/laberinto/`](../juegos/laberinto/README.md): `reproductor/main.js` y
`reproductor/escenas/EscenaCarga.js` lo abren siempre a él. Cómo se registrará
un juego nuevo del [taller](../taller/README.md) según su familia está en
[`../taller/entrega.md`](../taller/entrega.md).

Las piezas nuevas que dibuja el taller quedan «pendientes» en su trabajo hasta
que el docente las aprueba; solo entonces pueden pasar a la biblioteca de
piezas.
