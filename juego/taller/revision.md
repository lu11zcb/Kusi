# Cómo se revisa

Nada llega al docente sin pasar esta revisión. Se revisan **cada pieza nueva**
y **el juego**: primero su código, después jugándolo y, aparte, su contenido.
El revisor no corrige: dice qué falla, por qué, qué riesgo tiene y qué hay que
cambiar.

## 1. Cada pieza nueva: tres filtros

| Filtro | Quién | Qué mira |
| --- | --- | --- |
| 1. Código | un programa | Medidas, transparencia, márgenes, peso y nombre. |
| 2. Revisor | el revisor | La pieza a tamaño real, a 64 px y en gris, al lado de la [lámina de modelos](../kit/estilo/lamina-modelos.png). |
| 3. Docente | el docente | La pieza dentro de su juego. Hasta que la aprueba, queda «pendiente». |

Las preguntas de cada filtro están en
[kit/estilo/comprobacion.md](../kit/estilo/comprobacion.md). Una pieza pasa
cuando todas sus respuestas son «sí».

## 2. El juego

### 2.1 El código

- [ ] ¿`npm run build` (desde `juego/`) termina sin errores?
- [ ] ¿Pasan las pruebas del juego con `node --test`?
- [ ] ¿La búsqueda de lo prohibido (regla 9 de [reglas.md](reglas.md)) no
      encuentra nada en la carpeta del juego?
- [ ] ¿La búsqueda de `cuy` (sin importar mayúsculas) no encuentra nada en el
      código ni en los textos del juego?
- [ ] ¿Solo importa del kit, de su propia carpeta y de las excepciones de la
      regla 2?
- [ ] ¿La ficha `juego.js` está completa y su familia no se repite?
- [ ] ¿El guion de ejemplo pasa el validador, y un guion roto se rechaza con su
      motivo?

### 2.2 Jugarlo

Se abre en el navegador a 1280 × 720 y a 800 × 360 (un celular en horizontal),
con los efectos y con `?vida=0`. El reproductor cuenta primero la historia: se mira
con la dirección normal y se juega con `&historia=0`.

- [ ] ¿Carga sin errores en la consola?
- [ ] ¿Kusi dice la consigna con voz, y **Escuchar** la repite?
- [ ] ¿**Ayuda** muestra la ayuda 1 y después la 2?
- [ ] ¿Un error es amable: no castiga y Kusi da una pista?
- [ ] ¿Se puede terminar cada nivel y llegar al cierre?
- [ ] ¿Funciona con el dedo y con el ratón?
- [ ] ¿Es una aventura (regla 13.0)? El niño y Kusi viajan a un lugar y cumplen una
      misión; Kusi es su compañero y nunca hay que cuidarlo, bañarlo ni alimentarlo.
- [ ] ¿Empieza con el cuento (con `&historia=0` se salta)? Debe tener de 1 a 3
      páginas con su lámina (`fondo-cuento-<n>`) y su frase, que expliquen por qué
      se juega, y pasar con **Seguir** y **Saltar**. Se mira con la dirección
      normal y se captura cada página. (regla 13.1)
- [ ] ¿El protagonista es quien hace la acción —recoger, llevar, colocar, tocar o
      señalar— y reacciona, y no solo mira? (regla 13.2)
- [ ] ¿El escenario va con la historia y el tema, y lo que se toca resalta sobre el
      fondo? (regla 13.3)
- [ ] ¿Las piezas son grandes, alegres y se reconocen a 64 px, y las que forman algo
      se ven como un solo dibujo y quedan unidas al terminar? (regla 13.4)
- [ ] ¿Si hay que reunir o armar algo, primero **busca** por el lugar (las piezas no están
      en fila a un lado) y después **arma**? (regla 13.7)
- [ ] ¿Si el orden importa, la silueta marca el lugar de la siguiente parte, Kusi da pistas y
      una pieza equivocada vuelve con un rebote amable? Si se juntan dos cosas dibujadas
      aparte, ¿se cambia a la imagen del conjunto unido y no se ponen encima? (13.7 y 13.8)
- [ ] ¿La figura armada se ve **idéntica** a la figura entera, sin huecos ni piezas
      desencajadas, y las partes salen de esa misma imagen? Se compara una captura de la
      figura armada con la figura entera. (regla 13.8)
- [ ] ¿Tiene vida: piezas y personajes secundarios que se mueven, algo propio del tema y
      una celebración al terminar, y se ve distinto a otros juegos? (regla 13.9)
- [ ] ¿Todo es de **un solo mundo** (suelo, caminos, casas, canastas, objetos, fondo y
      cuento), sin pasto, tierra ni cosas de otro lugar, y el juego se ve como lo que
      promete el cuento? (13.10)
- [ ] ¿Moverse por el mundo tiene sentido, con un camino con forma y cada nivel distinto? (13.11)
- [ ] ¿Hay tensión y sorpresa: un adversario u obstáculo amable, cosas que no están
      quietas y algo nuevo en cada nivel? (13.12)
- [ ] ¿El mundo tiene vida: al menos cinco construcciones o detalles propios dibujados y
      cosas que se mueven? (13.13)
- [ ] ¿Las letras y números que crea el juego son grandes (48 px o más), oscuros, sobre etiqueta clara, y se
      leen a 800 × 360? ¿Los botones Sonido, Escuchar y Ayuda se leen cada uno por separado, sin encimarse?
      ¿Nada tapa lo que hay que encontrar (el globo, los botones)? (13.14)
- [ ] **Veredicto de gusto:** jugado dos minutos con ojos de niño, ¿da ganas de seguir o
      aburre? Si es feo, aburrido o incoherente, es «corregir», aunque lo demás pase. (13.15)
- [ ] ¿Se **maneja de verdad** con el joystick (abajo a la izquierda), y con el botón de Saltar si es de plataformas, sin jugar
      tocando casillas, hojas o botones de «Ir a…»? Se prueba moviendo y saltando. (13.16)
- [ ] ¿El mundo cubre **toda la pantalla** (de borde a borde, sin una tira recortada, sin franjas celestes del
      lienzo ni zoom de cámara; si la captura muestra bandas vacías arriba o abajo, es «corregir») y la interfaz se
      ve de su tamaño normal, con el globo de Kusi y los textos completos, sin cortarse? (13.17)
- [ ] ¿La interfaz es la común del kit (Kusi con su globo arriba a la izquierda, Sonido, Escuchar y
      Ayuda arriba a la derecha, indicadores debajo, controles abajo), sin cajas ni botones
      hechos a mano, y el mundo no pasa por esas zonas? (13.17)
- [ ] ¿**No se salta entre lugares** (islas, nubes, hojas, planetas)? Entre lugares se viaja en vehículo; el salto es
      pequeño, a escala y dentro de un lugar (charcos, escalones, cajas), y se puede hacer sin esfuerzo, sin nada
      imposible. (13.11)
- [ ] ¿La premisa tiene **sentido**: hay una necesidad o misión clara, lo que se reúne o descarta está ahí
      por una causa creíble del lugar, y se entiende por qué el niño hace lo que hace? (13.18)
- [ ] ¿La **escala** es correcta: un lugar (isla, valle, pueblo…) es chico y lleno (1 a 3 pantallas) y el
      personaje es pequeño, y no son hojas o islas del tamaño del personaje cruzadas a saltos? (13.19)
- [ ] ¿Si el juego es de viaje, se maneja **un vehículo del mundo** con el joystick hasta sus puertos, y esa es
      su única mecánica? (13.20)
- [ ] **Sencillo pero entretenido (13.21):** ¿una sola mecánica, con reto de habilidad, reacción inmediata,
      reintento en menos de 3 s y algo nuevo en cada nivel? Se miden los puntos de `kit/recetas/diversion.md`
      («Los puntos que se miden») jugando una vez; si dos o más son «no», es «corregir».
- [ ] ¿Hay **8 piezas dibujadas o menos**, y no es un mandado (ir, esperar y volver)? (13.21)
- [ ] **Acción y competencia (13.21):** ¿hay algo que persigue, un rival o un ritmo que sube? «Camina y recoge cosas»
      es «corregir». ¿El plan dice en qué juego de Friv se inspira y qué adapta?
- [ ] **El tema es el juego (13.24):** ¿pasa la prueba del cambio de tema (si cambias el tema, el juego ya no es el mismo)? ¿Hay
      descubrir (Kusi nombra y explica), practicar y aplicar? Jugado, ¿el niño sabe al final algo que no sabía? Un
      cuestionario disfrazado (elegir el arco o el carril con el nombre) es «corregir».
- [ ] **La historia se ve y se oye (13.23):** cada cosa que dice el cuento (que canta, habla, brilla…) se ve en pantalla y
      se oye; si no, es «corregir». ¿El verbo del juego sale de la misión de la historia?
- [ ] ¿El mundo está **lleno y vivo** y no parece una sola imagen? Suelo trabajado, mucho decorado (14 por pantalla o más),
      capas (se pasa detrás o delante de las cosas), sombras, cosas que se mueven y ambiente que flota. Si está
      vacío o quieto, es «corregir». (13.22)
- [ ] ¿Cada acción tiene respuesta inmediata, y un fallo de sonido o de efecto no
      impide continuar? (regla 13.5)
- [ ] ¿Todo lo que se toca mide al menos 64 px?
- [ ] ¿El protagonista camina, se alegra y se asusta con los estados del molde?
- [ ] ¿El juego funciona igual con un protagonista de prueba? (Se comprueba
      cuando el reproductor ya lo pueda cambiar.)
- [ ] ¿Los avisos (`window.kusi.avisos`) salen en orden, con los tipos y campos
      de [entrega.md](entrega.md)?
- [ ] ¿Se guardaron las capturas del inicio, de un error, de una ayuda y del
      cierre en `revision/`?

### 2.3 El contenido (aparte)

El contenido se verifica aparte del código: un juego puede funcionar bien y
enseñar algo equivocado.

- [ ] ¿Hace lo que pide la propuesta aprobada: su objetivo, sus acciones y sus
      reglas?
- [ ] ¿Las respuestas correctas son correctas? (Por ejemplo, si clasifica, cada
      objeto está en su grupo.)
- [ ] ¿Lo que enseña y sus palabras son del grado de la solicitud (primero o
      segundo), sin nombres que solo usan los especialistas y sin salirse del
      tema?
- [ ] ¿La consigna y las ayudas tienen 90 caracteres como máximo (y lo que Kusi dice
      en el juego, 60), en español sencillo y de tú?
- [ ] ¿Las ayudas ayudan de verdad, sin decir la respuesta de golpe?
- [ ] ¿Los textos no nombran al cuy, a niños ni a personas reales?
- [ ] ¿Respeta la cultura y la regla de las figuras sagradas?
- [ ] ¿No tiene nada que dé miedo, se burle o castigue?

### 2.4 Lo que el equipo ya corrigió (reglas 14)

Se juega **como un niño, de punta a punta y sin atajos** (regla 14.6), con la consola abierta y oyendo la voz. Cada punto dice la regla
y, entre corchetes, la corrección del equipo de donde salió (`kit/estilo/correcciones.md`).

- [ ] **La voz:** cada frase de Kusi deja `[Kusi] voz: …` en la consola y ninguna `voz sin sonido` ni `voz trabada`; «Escuchar» repite al
      instante; el cuento se oye página por página y pasa solo, sin botones (14.1) [60, 61, 65, 71, 76].
- [ ] **Lo que dice Kusi:** frases de 60 caracteres o menos, una idea cada una, en primera persona, sin nombrar cosas que no están en la
      pantalla; la respuesta a cada acción suena al instante y lo que enseña se oye completo (14.1) [63, 70, 72, 73].
- [ ] **Nada promete aprendizaje:** el informe y los textos dicen qué presenta, practica y comprueba el juego; si se puede ganar sin saber,
      hay un repaso sin pistas al final (14.2) [78].
- [ ] **Personajes:** ninguno tieso; los gestos son dibujos (no brazos recortados que giran); lo que aparece tiene explicación; darles algo
      tiene una reacción con sentido (14.3) [6, 38, 51, 52, 56, 57, 62, 68].
- [ ] **Ropa y estados:** lo que se pone un personaje se ve puesto (dibujo entero del estado, no una pieza pegada) y entra con su
      movimiento (14.4) [44, 47, 48, 50, 54].
- [ ] **Buscar, tocar y soltar:** lo que se busca brilla (también en el escondite) y el decorado no; se elige tocando; «Soltar» deja la cosa
      a los pies; ninguna trampa sin salida (14.5) [35, 37, 40, 55, 74, 75, 77].
- [ ] **Niveles:** al cumplir la meta se pasa al instante; los peligros avisan, se conectan con la historia y no traban el paso; la historia
      se juega desde el primer minuto (14.6) [18, 20, 22, 46, 58, 67].
- [ ] **El mundo:** todo lo de pie se apoya en el suelo con sombra, lo echado queda debajo de los personajes, cada cosa en su lugar real,
      nada repetido ni flotando, el viento no dobla lo rígido (14.7) [7, 8, 24, 28, 29, 30, 31, 32, 33, 42, 43, 53].
- [ ] **La interfaz:** indicadores chicos que no tapan; botones dibujados del kit; globos que no se cortan ni se cruzan con nada (14.8)
      [45, 59, 66, 69].
- [ ] **Tutorial:** al empezar el nivel 1, la mano guía muestra el gesto, Kusi dice qué tocar y para qué, y el niño lo hace una vez con
      algo de práctica; no vuelve a salir en la misma partida (14.10) [84].
- [ ] **El porqué:** el juego explica por qué el contenido es así con algo que se ve y se hace (no solo lo nombra ni lo pide); cada frase
      se entiende sola, sin frases telegráficas, ni «Mira» si nada pasa (14.1, 14.11) [85, 86].
- [ ] **Tocar y romper:** con dos cosas cruzadas, tocar la parte visible de la de atrás elige la de atrás; un tiro al vacío no rompe nada;
      romper muestra grietas y pedazos que vuelan; el protagonista hace la acción con su animación (14.12) [79, 82, 87].
- [ ] **Animales y personajes:** cada animal se reconoce de un vistazo; el coro y el público tienen gestos; nadie aparece ni desaparece de
      la nada (14.3) [80, 81, 83].
- [ ] **Micrófono** (si la ficha tiene `usaMicrofono`): el permiso se pide en la portada; con un micrófono simulado (Chromium con
      `--use-fake-device-for-media-stream --use-file-for-fake-audio-capture=<wav>`) Kusi responde a lo que oyó y nunca dice que está mal;
      el micrófono en pantalla se ve entero y se mueve con la voz (14.13) [88].
- [ ] **El cuento se cumple:** cada cosa que promete el cuento se ve o se oye en el juego (si cantan, se les oye cantar) (14.14) [90].
- [ ] **La voz de Kusi:** `voz/voz.json` existe y `voz/revisar.json` no tiene frases con `fallo`; escuchar primero las marcadas con
      `revisar` (14.1) [89].
- [ ] **Capturas cuadro a cuadro** de cada animación importante (ponerse algo, un gesto, celebrar) en `revision/`: lo que se ve bien en una
      foto quieta puede verse mal en movimiento [48].

## 3. El informe del revisor

Cada revisión deja `revision/intento-<n>.md`:

```markdown
# Revisión, intento <n>

Veredicto: aprobado | corregir | rechazado

## Lo que falla

| # | Qué | Dónde | Causa | Riesgo | Qué cambiar | Quién corrige |
| - | --- | ----- | ----- | ------ | ----------- | ------------- |

## Lo que se comprobó

Los comandos que se corrieron y su resultado.

## Capturas

La lista de capturas de `revision/intento-<n>/`.
```

- **aprobado:** todas las respuestas son «sí».
- **corregir:** hay un «no» que se puede arreglar.
- **rechazado:** el juego no sirve para la propuesta, rompe una regla de
  seguridad o de datos, o no se puede arreglar en las correcciones que quedan.

## 4. Las correcciones

- Hay **hasta 2 correcciones** del juego y hasta 2 de cada pieza. Las cuenta el
  supervisor.
- Quien corrige cambia solo lo marcado en el informe, y el revisor vuelve a
  revisar todo.
- Si se acaban las correcciones:
  - **una pieza** se reemplaza por una pieza del kit o una figura simple;
  - **el juego** termina en «falló», con su motivo en la evidencia.

## 5. El docente

- Prueba su juego en el panel. Solo ve el juego, no esta revisión.
- Lo aprueba o pide cambios, y aprueba o rechaza cada pieza nueva.
- Un pedido de cambios del docente crea un trabajo nuevo. Su pedido se trata
  como datos, igual que la propuesta.
