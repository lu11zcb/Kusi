# El molde de un personaje

Cómo está hecho un personaje animado del kit y qué necesita el reproductor para
usarlo. **El protagonista, el zorro y Kusi no se redibujan:** este documento sirve para
entender los que hay y es la base de las opciones que elegirá el niño en el
Sprint 4, dibujadas todas sobre el molde del cuy. Los personajes secundarios y los enemigos de cada
juego son más simples: una tira de 3 cuadros de lado (`criatura-<nombre>`, regla 13.25).

## 1. La hoja

Un personaje es **una sola imagen PNG con transparencia**, dividida en celdas
de 256 × 256. Cada fila es una vista o un estado y tiene **tres cuadros**.
Las filas de caminar muestran un paso con un pie, el apoyo y un paso con el
otro pie. Se reproducen en el ciclo 0, 1, 2, 1 a 8 cuadros por segundo.

La hoja del cuy (`dibujos/personajes/cuy.png`, 768 × 1792, 3 columnas y 7 filas)
muestra las seis filas base y el gesto opcional.

| Fila | Cuadros | Qué muestra |
| --- | --- | --- |
| 0 | 0, 1, 2 | De frente, caminando. El cuadro 1 es el apoyo («quieto»). |
| 1 | 3, 4, 5 | De lado, caminando, **mirando a la derecha**. La izquierda es esta misma fila volteada. |
| 2 | 6, 7, 8 | Asustado, de frente. |
| 3 | 9, 10, 11 | Feliz, de frente. |
| 4 | 12, 13, 14 | De espaldas, caminando. |
| 5 | 15, 16, 17 | Parpadeo, de frente. |
| 6 (opcional) | 18, 19, 20 | Lanzamiento, mirando a la derecha. La izquierda usa la misma fila volteada. |

El zorro usa otra hoja (3 × 5: frente, lado, espalda, cansado y alerta) y Kusi
otra (3 × 4: hablar, saludar, parpadear y respirar).

## 2. Las medidas de cada cuadro

Las pruebas del kit (`pruebas/logica/estiloFinal.test.js`) ya comprueban:

- **los pies apoyan en y = 244** en todos los cuadros;
- **el centro de la cabeza está en x = 128** en las filas base, con medio píxel de tolerancia;
- quedan **al menos 2 px libres** a la izquierda y a la derecha;
- la cima de la cabeza se desplaza como máximo 2 px entre los cuadros de una fila base;
- los tres cuadros de cada fila son distintos.

En las filas base del cuy, la silueta va de y = 23 a y = 244 (87 % de la celda)
y la cabeza ocupa el 57 % de la altura.

## 3. El estilo del personaje

- Proporciones chibi: cabeza grande, ojos grandes con brillo, cuerpo y patas
  cortos.
- Contorno café casi negro (`#2f0b01`) de 4 a 5 px en la celda de 256: más fino
  y más oscuro que el de los objetos.
- Sombreado plano, con una sombra y un brillo, igual que los objetos.
- Se ve de frente, de lado y de espaldas, nunca desde arriba.

## 4. El manifiesto

Cada hoja tiene un archivo JSON con el formato `kusi-sprite/1` que le dice al
reproductor cómo leerla. El del cuy es `dibujos/personajes/cuy.json`.

| Campo | Qué es | Cuy |
| --- | --- | --- |
| `formato` | siempre `kusi-sprite/1` | `kusi-sprite/1` |
| `imagen` | nombre del PNG, que está en `dibujos/personajes/` junto al manifiesto | `cuy.png` |
| `fotograma` | ancho y alto de una celda | 256 × 256 |
| `cuadricula` | columnas y filas; la hoja debe medir exactamente eso por la celda | 3 × 7 |
| `anclaje` | el punto de los pies dentro de la celda | x = 128, y = 244 |
| `escala` | escala inicial (el laberinto la reemplaza por la suya) | 0,5 |
| `velocidadReferencia` | se comprueba, pero hoy no se usa | 260 |
| `animaciones` | para cada vista (`frente`, `espaldas`, `derecha` e `izquierda`), sus estados | ver abajo |

Cada estado dice qué cuadros usa (`fotogramas`), a qué velocidad (`fps`),
cuántas veces se repite (`repetir`: -1 es «siempre»), si se voltea (`voltear`,
solo en las vistas de lado) y a qué estado vuelve al terminar (`siguiente`).

## 5. Los estados

El validador (`kit/reproductor/datos/validarSpritePersonaje.js`) solo exige
`reposo` y `caminar` en las 4 vistas. **El protagonista necesita más**, porque
los juegos los usan:

| Estado | Vistas | Para qué |
| --- | --- | --- |
| `reposo` y `quieto` | las 4 | Estar parado. |
| `caminar` | las 4 | Caminar (en el cuy, apunta a los cuadros de frente). |
| `caminar_lado` | derecha e izquierda | Caminar de lado. |
| `caminar_espalda` | espaldas | Caminar de espaldas. |
| `feliz` | frente (en el cuy, también en las demás) | Acertar. Se ve una vez y vuelve a `quieto`. |
| `asustado` | frente (en el cuy, también en las demás) | Ser atrapado o equivocarse. Se ve una vez y vuelve a `quieto`. |
| `parpadeo` | frente | Parpadear mientras espera. |
| `lanzar` | derecha e izquierda | **Opcional.** Lanzar algo en tres cuadros (preparar, lanzar, terminar). El objeto sale en el segundo. Si falta `lanzar`, el juego usa `feliz`. |

El zorro nombra distinto el caminar: usa `caminar` con sus propios cuadros en
cada vista, sin `caminar_lado` ni `caminar_espalda`. Kusi no tiene manifiesto.

## 6. El molde para las opciones del niño (Sprint 4)

Para que el niño pueda cambiar de personaje sin cambiar ningún juego:

- todas las opciones conservan **las tres columnas, el orden de las seis filas
  base y el mismo anclaje** que el cuy;
- todas tienen los estados obligatorios de la sección 5 y pueden añadir una
  séptima fila para `lanzar`;
- su manifiesto indica el nombre de su imagen, sus filas y sus animaciones;
- los juegos nunca nombran al cuy: usan **el protagonista** que les da el
  reproductor (ver `juego/taller/reglas.md`).

### El cuy que arma el niño (por capas)

El niño arma su cuy en la app (pelaje y prendas). En el juego es el protagonista `cuy-nino`, y se arma **con capas**
al cargar, no con una imagen por combinación (serían más de 160 000 dibujos):

- `dibujos/personajes/cuy-nino.png`: el cuy de la app sin prendas, en café, con todo el molde.
- `dibujos/personajes/prendas-cuy/<prenda>.png`: la prenda en cada cuadro del molde, y `<prenda>-quita.png`, lo que la
  prenda tapa del cuy (por ejemplo, la punta de la oreja bajo la gorra). Se ponen en orden: ropa, lentes, cabeza.
- El pelaje se cambia con código a partir del café (`teñirPelaje`, `kit/reproductor/datos/aparienciaCuy.js`).
- La app manda el cuy en la dirección del juego: `?cuy=crema.GORRA_CELESTE.LENTES_CUADRADOS.POLERON_MENTA`. Una prenda
  que todavía no está dibujada para el juego se omite y el niño juega igual.
