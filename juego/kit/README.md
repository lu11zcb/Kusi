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

El reproductor arranca, carga el guion y abre el juego. Un guion sin `trabajo` es
de la biblioteca: el laberinto (`familia: laberinto`), que está en
[`../juegos/laberinto/`](../juegos/laberinto/README.md). Un guion con `trabajo`
es un juego del [taller](../taller/README.md): `reproductor/escenas/EscenaCarga.js`
trae su ficha de `taller/trabajos/<trabajo>/juego/juego.js` al abrirlo, con el
registro de `reproductor/datos/registroJuegos.js`. Los detalles están en
[`../taller/entrega.md`](../taller/entrega.md), sección 6.

Las piezas nuevas que dibuja el taller quedan «pendientes» en su trabajo hasta
que el docente las aprueba; solo entonces pueden pasar a la biblioteca de
piezas.

## Tutorial jugable

Usa `crearTutorial` antes del primer reto para enseñar el gesto que el niño va a
hacer. Cada paso apunta a un objetivo, Kusi dice la frase y la repite cada seis
segundos de juego, y el niño practica con los controles reales. Mientras practica,
el juego puede dejar en pausa los retos y mantener activos sus controles.

```js
import { crearTutorial } from '#kit/reproductor/interfaz/tutorial.js'

// Dentro de create, con el HUD, los controles y la campana en pantalla.
const centro = () => this.controles.estado().joystick
this.tutorial = crearTutorial(this, this.hud, {
  partida: this.datos.partida,
  pasos: [
    {
      frase: 'Mueve el joystick para caminar.',
      gesto: 'joystick',
      objetivo: centro,
      hacia: () => ({ x: centro().x + 60, y: centro().y }),
      hecho: () => this.yaCamino,
    },
    {
      frase: 'Toca la campana.',
      gesto: 'tocar',
      objetivo: () => ({ x: this.campana.x, y: this.campana.y }),
      hecho: () => this.yaTocoCampana,
    },
  ],
  alTerminar: () => this.empezarReto(),
})
```

El juego pone `yaCamino` y `yaTocoCampana` en `true` al registrar cada acción.
En `update`, después de procesar los controles, llama a
`this.tutorial.actualizar(delta / 1000)`. `objetivo` y `hacia` devuelven
coordenadas de pantalla, como las de la interfaz fija. Para `arrastrar`, usa
`hacia` para señalar dónde soltar el objeto. Para `joystick`, el tutorial usa
`this.controles` para mover el dibujo de la perilla y acepta `controles` en las
opciones si el juego lo guarda en otro lugar.

Pasa la misma `partida` entre escenas y una nueva al reiniciar el juego. El kit
recuerda en memoria que mostró el tutorial. Si ya se vio o la dirección lleva
`?tutorial=0`, `terminado` vale `true` y `alTerminar` se ejecuta de inmediato.
Con `?vida=0` la mano conserva el movimiento y se apagan el anillo, la estela y
el cambio de tamaño. La escena limpia el tutorial al cerrarse. También puedes
llamar a `destruir()` si necesitas retirarlo antes.

El [ejemplo de exploración](ejemplos/exploracion/EscenaExploracion.js) enseña a
caminar antes de que empiece a patrullar el adversario.

## Voces que cantan

Usa `crearCanto` para que un personaje sostenga una vocal. Las voces `grave`,
`media` y `aguda` tienen resonancias propias. Puedes elegir una nota o dejar que
la voz use su tono base. Crea el canto en la escena y reprodúcelo cuando el audio
ya esté habilitado, por ejemplo después del toque que inicia la partida.

```js
import { crearCanto } from '#kit/reproductor/efectos/canto.js'

const canto = crearCanto(this)
canto.cantar('a', { voz: 'grave', nota: 'sol3', duracion: 0.9 })
```

En `cantar`, la duración se mide en segundos. En `coro(lista, { tempo })`,
cada entrada usa la duración en pulsos (uno por defecto) y el tempo se mide
en pulsos por minuto (120 por defecto). El canto respeta el botón Sonido y se
apaga al cerrar la escena. Usa `callar()` para interrumpirlo antes.

## Escuchar al niño

Agrega `usaMicrofono: true` a la ficha `juego.js`. El reproductor pide permiso
en el primer toque de la portada, antes del cuento o del nivel. Si la familia
lo rechaza, el equipo carece de micrófono o la dirección lleva `?microfono=0`,
la actividad sigue y la escucha devuelve `oyo: false`.

- El equipo analiza cada cuadro mientras suena. El audio del niño no se graba,
  no se guarda y no se envía a ningún servicio. La escucha usa energía, tono y
  resonancias de voz. Al terminar o al salir de la escena, libera el micrófono.
- El juego nunca castiga por lo que oye. En un aula con ruido, puede confundir
  una vocal. La escucha acompaña el reto y el niño puede continuar en silencio.
- El permiso se solicita una vez al principio. Si la familia dice que no,
  el reproductor recuerda esa decisión durante la sesión.

Llama a `escucharVocal({ segundos: 2.5 })` cuando Kusi termine de hablar, por
ejemplo desde `alTerminar` de `decir`. Si la frase sigue sonando o queda otra en
cola, la escucha espera. Usa `alSinVoz` para que el mismo paso funcione cuando
falla la voz de Kusi, y llama a la escucha una sola vez por consigna.

```js
import { decir } from '#kit/reproductor/logica/voz.js'
import { escucharVocal } from '#kit/reproductor/interfaz/microfono.js'

let yaEscucho = false
async function escuchar() {
  if (yaEscucho) return
  yaEscucho = true
  const { oyo, vocal, seguro } = await escucharVocal()
  if (!oyo) return
  decir(seguro ? '¡Te oí! Eso es ' + vocal.repeat(3) + '.' : '¡Muy bien, te escuché!')
}

decir('Dilo conmigo: ¡aaa!', {
  alTerminar: ({ interrumpida }) => { if (!interrumpida) void escuchar() },
  alSinVoz: escuchar,
})
```

Pasa `alNivel` para mover las ondas con cada lectura. Recibe un número de `0` a
`1` y vuelve a recibir `0` al terminar.

```js
const alNivel = nivel => ondas.setScale(1 + 0.35 * nivel)
await escucharVocal({ segundos: 2.5, alNivel })
```

Si el juego se abre dentro de una página de otro origen, esa página tiene
que delegar el permiso de micrófono al marco para que pueda escuchar.
