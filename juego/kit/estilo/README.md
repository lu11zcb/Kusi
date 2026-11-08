# Guía de estilo de Kusi

Esta guía dice cómo se ven las piezas del kit, para que cualquier pieza nueva
parezca del mismo juego. Está escrita midiendo las piezas reales: si una pieza
aprobada del kit contradice la guía, manda la pieza y se corrige la guía.

| Archivo | Para qué sirve |
| --- | --- |
| Esta guía | Cómo se ve Kusi y cómo se dibuja una pieza nueva. |
| [comprobacion.md](comprobacion.md) | La lista de sí o no que pasa cada pieza nueva. |
| [modelos.md](modelos.md) y [lamina-modelos.png](lamina-modelos.png) | Las piezas modelo del kit, para comparar lado a lado. |
| [molde-personaje.md](molde-personaje.md) | Cómo está hecho un personaje y qué necesita el reproductor. |

**En este sprint solo se dibujan piezas quietas:** objetos y, si el tema lo
pide, un fondo. Los personajes (el protagonista, el zorro y Kusi) no se
dibujan ni se cambian.

## 1. Para qué sirve

- **El dibujante** la lee antes de pedir una pieza y la sigue al prepararla.
- **El revisor** compara cada pieza nueva con esta guía y con las piezas modelo.
- **El docente** nunca la lee: solo ve el juego y aprueba o rechaza las piezas
  nuevas de su juego.

## 2. La vista: el mundo desde arriba, lo demás de frente

- **El mundo se ve desde arriba**, con la cámara en vertical: el pasto, el
  suelo, las piedras, los arbustos y las flores. No hay horizonte, cielo ni
  fachadas: de las casas solo se ven los tejados.
- **Lo que está sobre el suelo se ve de frente**, apenas desde arriba: los
  personajes, los objetos y el portal. Los muros son cubos: se ve su cara de
  arriba y su cara de frente.
- **Un objeto nuevo se dibuja de frente**, como las frutas: entero, sin
  recortar y sin perspectiva fuerte.

## 3. Proporciones

- **Personajes (chibi):** la cabeza ocupa más o menos la mitad de la altura
  (cuy 57 %, zorro 46 %, Kusi 58 %). Tienen ojos grandes con brillo, cuerpo y
  patas cortos y formas redondas.
- **Objetos:** formas simples y redondeadas, que se reconocen por su silueta.
  Un niño de 6 años debe poder nombrar el objeto aunque lo vea pintado en gris.
- **Tamaño en pantalla:** en el laberinto, una casilla mide de 64 a 90 px y un
  objeto se muestra a 1,05 casillas (de 67 a 95 px). El protagonista mide
  1,2 casillas y el zorro, 1,3 veces el protagonista. **Una pieza nueva debe
  entenderse a 64 px**: un detalle de menos de 16 px en el lienzo de 256 se
  pierde.

## 4. Contorno

Cada pieza nueva lleva el contorno de su tipo:

| Tipo | Color | Grosor en un lienzo de 256 | Ejemplos |
| --- | --- | --- | --- |
| Objetos e interfaz | café cálido `#4b210e` (la «tinta» del juego) | 8 px (entre 6 y 11) | frutas, verduras, portal, botones |
| Personajes | café casi negro `#2f0b01` | 4 a 5 px | cuy, zorro, Kusi |
| Plantas del fondo | verde muy oscuro | 6 a 10 px | pasto, arbusto, flores |
| Muro | café rojizo `#732f15` | 8 px | cubos de adobe |

- El contorno es **cerrado**, de grosor parejo y sin cortes. Rodea toda la
  silueta.
- Las líneas de adentro (semillas, granos, nervios) son del mismo color y **más
  finas** que el contorno.
- Los fondos usan contornos café cálido en tejados y piedras, y verde oscuro en
  las plantas, como el fondo actual.

## 5. Colores

Son colores vivos y cálidos, saturados pero no fluorescentes. Los valores son
aproximados (medidos en las piezas reales).

| Grupo | Colores |
| --- | --- |
| Tinta y papel (`kit/reproductor/medidas.js`) | tinta `#4b211b`, tinta suave `#805340`, crema `#fff7e8`, papel `#fffcf4`, arena `#ffe8bf` |
| Cuy | crema `#fff0d8`, café `#c07848`, pañuelo rojo |
| Zorro | naranja `#f07818`, crema, overol azul con botones amarillos |
| Kusi | naranja `#f09030`, crema, poncho rojo, morado y amarillo, sombrero con pluma |
| Alimentos | fresa `#f03030` (sombra `#c03030`), plátano `#ffd830` y `#f0a818`, mango `#ffc030` y `#f09030`, mandarina `#ffa848` y `#f07830`, piña `#ffc030` y `#f09018`, zanahoria `#ff7818` y `#f04818`, papa `#f0a848` y `#c07830`, choclo `#ffd878` y `#f0c048`, hojas `#48a848` y `#609048` |
| Mundo | pasto lima y oliva (`#60c018`, `#90d818`, `#30a818`), muro terracota `#f07848` y `#a84830`, suelo arena, piedras grises redondeadas, tejas terracota |
| Interfaz | botones amarillos `#ffd878` con contorno de tinta |

Reglas de color:

- Cada objeto tiene **un color principal, una sombra y un brillo**, y si hace
  falta un detalle de otro color (como las hojas verdes).
- **Lo que se toca resalta más que lo que adorna.** El fondo es más suave y
  tiene menos contraste que los objetos; el centro del fondo no lleva rojos ni
  amarillos fuertes.
- Un objeto nuevo **no se parece** por color y forma a un alimento del kit, para
  que el niño no los confunda.

## 6. Sombreado y brillo

- El sombreado es plano, como un dibujo animado: el color base, una sombra del
  mismo tono más oscura y un brillo.
- **La luz viene de arriba a la izquierda:** el brillo va arriba a la izquierda y
  la sombra, a la derecha y abajo (mira la fresa, el mango y la mandarina).
- No lleva degradados largos, texturas, brillo de plástico, 3D realista ni
  pixel art.
- **No lleva sombra en el suelo:** si el juego necesita una sombra, la dibuja él.

## 7. Lienzos, márgenes y línea de apoyo

| Pieza | Lienzo | Transparencia | Cómo se coloca |
| --- | --- | --- | --- |
| Objeto | 256 × 256, PNG | sí | Centrado a lo ancho. El lado mayor de la silueta mide de 180 a 215 px. Deja al menos 8 px libres en cada borde. Si el objeto se apoya en algo (como la fresa, la piña o el choclo), su punto más bajo queda en y = 244, igual que los pies de los personajes. Si no se apoya (como el plátano o el mango), va centrado. |
| Fondo | 1672 × 941, PNG (16:9) | no | Cubre toda la pantalla. |
| Personaje | celdas de 256 × 256 | sí | Ver [molde-personaje.md](molde-personaje.md). |

Ya existen y el dibujante no los hace en este sprint: los muros (256, opacos),
el suelo (1024), el borde de pasto, el portal (256), los botones (128), los
globos (322 de ancho), el joystick y las tiras de plantas (4 cuadros de 320).

Peso: un objeto pesa menos de 100 KB (los actuales, de 15 a 41 KB) y un fondo,
menos de 2,5 MB (el actual, 1,9 MB).

## 8. Nombres de archivos

- Van en minúsculas, sin tildes y con guiones entre palabras. La «ñ» se
  escribe «n»: `pina.png`, `olla-de-barro.png`.
- **El nombre del archivo es el id de la pieza:** `olla-de-barro.png` es la
  pieza `olla-de-barro` del catálogo.
- Un objeto se llama `<id>.png` y un fondo, `fondo-<lugar>.png`.
- Una pieza aprobada no se sobreescribe: su corrección se llama
  `<id>-v2.png`.
- Cada pieza va en la carpeta de su tipo dentro de `kit/recursos/dibujos/`:
  `objetos/`, `mundo/` o `interfaz/`.
- El original (lo que dio la herramienta de imágenes) se guarda aparte, en la
  carpeta de su tipo dentro de `kit/originales/`, como `<id>-original.png`, con
  sus pedidos en `<tema>-pedidos.txt`.

## 9. Objetos nuevos

1. **Un solo objeto por imagen**, entero y de frente.
2. **Sin cara:** los alimentos y las cosas no llevan ojos ni boca, como las
   frutas del kit. **Un animal quieto cuenta como objeto:** lleva ojos simples
   (dos puntos oscuros con un brillo), sin boca ni expresión. No camina ni
   cambia de pose: si el tema necesita un animal que se mueva, es un personaje
   y no se dibuja en este sprint.
3. **Sin texto, letras, números, logos ni marcas** dentro del dibujo.
4. **Sin suelo, sombra ni escenario** alrededor.
5. **Del mundo del niño peruano** cuando el tema lo permite: un objeto que un
   niño de primer grado de Perú reconoce.
6. **Se entiende a 64 px y en gris.**

## 10. Fondos nuevos

Solo se dibujan si el tema lo pide; si no, se usa el patio andino del kit.

- La misma cámara: **desde arriba**, sin horizonte, cielo ni fachadas.
- **El centro queda libre** (75 % del ancho y 80 % del alto) para el juego y
  los controles. Los adornos van en el borde y son pequeños. Las cosas grandes,
  como los tejados, van recortadas en las esquinas y ocupan como máximo el 12 %
  del ancho y el 20 % del alto cada una.
- **Nada que parezca algo que se toca:** el fondo no lleva alimentos ni objetos
  del juego.
- Sin personas, animales, texto ni marcas.
- Colores más suaves que los de los objetos.

## 11. Lo que no se dibuja

- **Personajes nuevos** o cambios a los personajes del kit (en este sprint).
  Un animal quieto sí se dibuja, como objeto (sección 9).
- **Figuras sagradas como personaje:** deidades, santos, vírgenes, ni apus,
  Pachamama o Inti con cara o cuerpo. Se proponen símbolos (una luz, rayos) o
  la voz de Kusi, y decide el docente.
- Personas reales, fotos o niños reconocibles.
- Armas, sangre, miedo, burla o estereotipos.
- Copias de personajes, marcas o estilos de otros juegos o películas.

## 12. Cultura andina con respeto

- Kusi vive en un pueblito andino: adobe, tejas, campo y cultivos. Se dibuja con
  cariño, sin caricatura ni estereotipo.
- La ropa, los tejidos y los objetos tradicionales se dibujan con respeto y sin
  mezclar culturas: un poncho andino no lleva adornos de otro país.
- Cuando el tema toca una fiesta, una creencia o un símbolo religioso, se
  proponen opciones y **decide el docente**.

## 13. Cómo se pide un dibujo

El pedido a la herramienta de imágenes dice siempre:

- **qué es:** un solo objeto, con su id y su nombre;
- **la vista:** de frente (objeto) o desde arriba (fondo);
- **el estilo:** dibujo animado para niños, contorno café cálido grueso y
  cerrado, sombreado plano con una sombra y un brillo, luz de arriba a la
  izquierda, colores vivos y cálidos, sin texturas, sin 3D, sin pixel art;
- **el fondo:** blanco liso, sin sombras ni suelo (la transparencia se hace
  después);
- **lo que no lleva:** cara, texto, letras, marcas, otros objetos ni escenario;
- **la referencia:** la lámina [lamina-modelos.png](lamina-modelos.png), solo
  como referencia de estilo, sin copiar sus piezas.

Las piezas aprobadas del kit salieron de pedidos escritos en inglés, y estas
frases ya funcionaron: *hand-painted cartoon style*, *warm dark brown
outlines*, *simple cel-like soft shading*, *not pixel art, not realistic 3D*,
*no words, labels, ground or shadows*. Los pedidos completos están en
`kit/originales/personajes/espaldas-pedidos.txt` y
`kit/originales/mundo/patio-pedidos.txt`.

## 14. Cómo se prepara y se comprueba

1. La herramienta de imágenes entrega la pieza sobre **fondo blanco liso**.
2. Una herramienta que quita el fondo deja la pieza transparente. En esta Mac
   será BiRefNet, que todavía no está instalado. El contorno oscuro y cerrado
   protege los blancos de adentro: si la herramienta se come una parte blanca
   de la pieza, se repite.
3. La pieza se recorta, se reduce a 256 × 256 sin deformarla y se centra según
   la sección 7.
4. Pasa los **tres filtros**: el código (medidas y transparencia), el revisor
   (comparando con esta guía y con los modelos) y el docente (queda
   «pendiente» hasta que la apruebe). Todo está en
   [comprobacion.md](comprobacion.md).
5. Tiene **hasta 2 correcciones**. Si no sale, se usa una pieza que ya existe o
   una figura simple.
