# Juego 1 de 5: «El traje de Inti» (terminado)

Este documento deja el contexto y el guion para retomarlos en otro chat. Es del 19 de noviembre de 2026. Antes de seguir, leer también
`correcciones.md` (las correcciones del equipo).

**Estado (23 nov, 12.ª ronda): terminado por ahora (el equipo: «con eso terminamos»).** Corrección 78: el guion ya no promete aprendizaje
y hay un repaso de tres preguntas antes del baile, que el docente ve en los avisos (13w). Las 78 correcciones ya pasaron a
`taller/reglas.md` (sección 14), `revision.md` (2.4) y las comprobaciones por código. Antes (11.ª ronda): Correcciones 76 y 77: el cuento sin botón Escuchar (kit) y un
halo dorado con destellos en lo que se busca, también en los escondites (13v). Antes (10.ª ronda): Correcciones 74 y 75: lo que se suelta cae a los pies del niño y
lo que se puede llevar tiene un contorno dorado que late (13u). Antes (9.ª ronda): Corrección 73: Kusi habla menos y corto (13t) y lo que enseña se
oye completo (tipos de frase en la voz del kit). Antes (8.ª ronda): Correcciones 62 a 72: gestos dibujados (12 tiras, 13r),
Kusi en primera persona (13p), Lana esconde lo que suelta el viento y empieza sin nada (13q), globo de Inti a la izquierda, botones dibujados
(`boton-empezar`, `boton-soltar`, `boton-escuchar`), cuento narrado solo y voz sincronizada con el globo (kit), sin «refugio» (13s).
Antes (7.ª ronda): Correcciones 54 a 61: Inti se dibuja entero según su ropa (7 dibujos
`inti-p` … `inti-pmgtb`, 13m), antebrazos con gestos (13n), botón «Soltar» y viento que le quita una prenda una vez por nivel (13l),
indicadores chicos y voz robusta en el kit (Paulina local, cola en orden, reintento). Atajos de revisión: `window.__traje_inti.darAInti(id)`
y `sentirFrio()` (13o). Antes (6.ª ronda): Correcciones 50 a 53: poncho redibujado como se lleva,
Inti come la manzana y toca la flauta (13i, 13j), la fuente con agua de verdad (13i), saltos con cuerpo y baile en 3 cuadros dibujados
(`inti-baila`, 13k). Antes (5.ª ronda): Correcciones 48 y 49: el sombrero se rehízo a la medida de
la cabeza y cada prenda entra con su movimiento (13e, 13h); la voz de Kusi ya se puede grabar (`taller/grabar_voz.mjs`) pero la voz está por
elegir: hoy habla con la mejor voz del navegador. Antes (4.ª ronda): Trabajo `taller/trabajos/32982efd-9127-45a8-b857-dd6e1cd9a260/`
(no se sube). El equipo jugó la 3.ª versión y dio 3 correcciones (`correcciones.md`, 44 a 46). **Cambio de diseño decidido por el equipo el 22:
el nivel termina apenas Inti tiene puesta la ropa del nivel** (ya no hay «practicar» ni «aplicar»: el viento ya no desviste a Inti).
Tareas del programador: 13a (una sola vuelta por nivel; Kusi dice la función al encontrar la prenda y al abrir el probador; aviso
`accion` en cada toque), 13b (la ropa se coloca con giro y tamaño medidos sobre la figura, en un orden fijo; el globo de Inti mide lo
que su texto y apunta a su cabeza o a su mejilla; la última prenda se ve antes de pasar de nivel) y 13c (una frase de Inti no borra a
otra). El equipo vio la ropa «sobrepuesta» (`correcciones.md`, 47): el dibujante editó la figura de Inti con cada prenda puesta y sacó 6
capas `puesta-<prenda>.png` con el mismo marco que `figura-inti.png` (en `piezas/vestir/`, con su informe), y la tarea 13d las dibuja
encima de la figura. Partida completa del supervisor: nivel 1 en 46 s, nivel 2 en 137 s y nivel 3 en 71 s, `fin` llega y la consola no muestra errores.
Antes (20 nov): tareas 11 y 12 (la 12 la programó el supervisor porque el programador había llegado a su límite de uso).

## Regla para el supervisor: anotar cada corrección (lo más importante)

**Cada vez que el equipo corrija algo, en el mismo momento se agrega una fila a `correcciones.md`**: lo que dijo (casi con sus palabras), la **regla
general** que sale de eso (que sirva para cualquier juego, no solo para este) y dónde quedó («pendiente» si todavía no es regla). No se espera al final ni se
resume después. **Al cerrar cada juego**, las filas «pendiente» se convierten en reglas de `taller/reglas.md`, en la lista de `taller/revision.md` y en
comprobaciones por código (`taller/trabajador/comprobar.js`). Para qué: cuando nadie supervise, la IA tiene que hacer bien el juego sola, solo con un tema.
Si el equipo dice algo que parece una corrección y no se anotó, anotarlo y avisarle.

## 1. Qué estamos haciendo y por qué

- La meta de Kusi: el docente escribe un tema y la IA propone el guion y crea el juego, sola y sin supervisión.
- Para que la IA lo haga bien, **primero se hacen 5 juegos entre el equipo y el supervisor**, uno por tipo de juego, y **cada corrección del equipo
  se anota** en `correcciones.md`. Al terminar, esas correcciones pasan a `taller/reglas.md`, `taller/revision.md` y a las comprobaciones por
  código, y se prueba el taller solo con un tema nuevo.
- **Los 5 juegos no son plantillas.** El juego que cree la IA para un docente es original (objetivo, reglas, historia, mundo y niveles propios); solo se
  repite la **forma de jugar** de un juego conocido. Si hace falta, crea objetos, personajes, enemigos, mundos y fondos nuevos.
- Flujo de cada juego: el equipo da **tema y curso** → el supervisor escribe **el guion** → si gusta, el equipo dice «genera el juego»; si no, pide
  correcciones y se repite → se hace el juego, el equipo lo juega y corrige, y **cada corrección se anota**.

## 2. Quién hace qué (esto se confundió una vez: respétenlo)

- **El supervisor** (el asistente que conversa con el equipo): escribe el guion, `plan.md` del trabajo, las **tareas del programador** (archivos
  `programador/tarea-N.md`) y los pedidos de dibujo; revisa cada pieza y cada entrega **jugando el juego** con capturas; anota las correcciones del
  equipo. **No programa ni dibuja.**
- **El programador** (en esta Mac lo ejecuta `taller/roles.local.json`): escribe **todo el código del juego**, en tareas de unos 8 minutos, con
  `node taller/programar.mjs --carpeta taller/trabajos/<id> --tarea-archivo programador/tarea-N.md [--correccion-archivo programador/correccion-N.md]`.
- **El dibujante**: hace **todas las piezas de arte** con `node taller/dibujar_varias.mjs --carpeta … --piezas '<JSON>' --mundo "<el mundo>"` y las correcciones
  de una en una con `node taller/dibujar.mjs … --correccion "<texto en inglés>"` (hasta 2 por pieza).
- El equipo decide el diseño y juega. No se lanza el taller solo (`npm run taller`) ni se crea ningún juego sin que el equipo lo pida.

## 3. Lo que salió mal en el primer intento («Armemos a Pachi», un muñeco de trapo, descartado) y no debe repetirse

- Se le mostró al equipo **un juego a medias**: el viento y el perro llegaban en una tarea posterior, así que el juego se veía como «encontrar piezas y
  armar», sin la historia. **No se muestra un juego hasta que tiene todo lo que su historia promete.**
- El suelo salió **naranja liso** y se aprobó «para llenarlo después por código»: parecía un desierto. **Se rechaza un suelo plano**; se pide un lugar
  con pasto, caminos, plantas y flores.
- Lo que se arma era **demasiado grande** (420 px de alto sobre una manta de 520 × 600) y tapaba la interfaz.
- Todo se veía **plano y quieto**: el árbol no se movía, las rocas y flores eran sprites de un solo tono. Todo lo del mundo tiene vida y volumen.
- El equipo prefirió **buscar piezas escondidas y armarlas** (no un muñeco) y que la historia **se juegue**, no solo se cuente.

## 4. Lecciones técnicas para el supervisor

- **El programador no puede abrir el navegador ni correr `npm run build`.** Por eso se le escapan errores de Phaser 4 (`setTintFill` ya no existe: es
  `setTint(color).setTintMode(Phaser.TintModes.FILL)`). El supervisor abre el juego, mira la consola y lo juega.
- Para correr las pruebas, que **use la ruta completa** (`cd <carpeta del trabajo>/juego && node --test pruebas/*.test.js`): desde su carpeta temporal da
  «error de ruta» y reporta «FALLÓ» aunque pasen (cuenta como un encargo gastado).
- **Tope de 6 encargos por trabajo** (`MAX_ENCARGOS` en `taller/programar.mjs`). Pachi lo agotó, con 3 «FALLÓ» por errores del entorno del programador.
  Pendiente (con el OK del equipo): leerlo de una variable de entorno `TALLER_MAX_ENCARGOS` (por defecto 6).
- **La herramienta de imágenes entrega PNG RGB sin transparencia**; `kit/herramientas/preparar_criatura.mjs` esperaba RGBA y falló con Canelo. Ya está
  corregido (con su prueba en `pruebas/logica/criatura.test.js`), **pendiente de commit**.
- Un fondo o lámina pesa menos de 2,5 MB (el filtro lo rechaza); se corrige pidiendo texturas más planas, sin ruido fino, y conservando la composición.
- Al corregir una lámina, hay que **describir el personaje con precisión** (ropa, pelo, colores) para que coincida con su figura; si no, cambia de aspecto.
- **(19 nov) El dibujante no entregaba nada** (8 s y 0 tokens por pieza): la configuración global de su programa pedía un modelo que esa
  cuenta no admite. Se fijó el modelo en el rol dibujante de `taller/roles.local.json`. El programador no lo sufre porque no lee la
  configuración global. Si vuelve a pasar: una llamada corta al rol («Responde solo: OK») muestra el error.
- **(19 nov) El suelo liso venía de la herramienta**: el pedido fijo de `--fondo` en `taller/dibujar.mjs` decía «central 75%… calm and empty» y
  «decorations only near the edges». Ahora pide el suelo trabajado en toda la imagen y solo deja libre lo alto (prueba en `dibujante.test.js`).
- **(20 nov) El programador se queda callado en las tareas largas**: una llamada al modelo no vuelve, el taller lo corta por silencio y
  el reintento inmediato también se cuelga (como si esperara detrás de la llamada trabada); 4 encargos se perdieron así, sin cambiar nada o a
  medias. Una llamada corta con los mismos ajustes responde en 8 s. Lo que ayuda: `silencio_seg` del programador en 600 (en
  `roles.local.json`), tareas cortas y código nuevo en archivos chicos (no reescribir la escena entera de una vez). Lo que falta en el
  taller: esperar unos minutos antes de reintentar y un plan B cuando el programador no responde. Hecho: `programar.mjs` espera 3 minutos
  antes de relanzar (`TALLER_ESPERA_REINTENTO_MS`) y el programador quedó con un modelo fijo en `roles.local.json` (con él, 4b1, 4b2 y 5 salieron en 2 a 3
  minutos cada una, sin cortes).
- **(20 nov) Cargar una sola cosa puede trabar el juego**: si se pide una de dos prendas y el niño carga la otra, no puede entregarla ni
  soltarla. Siempre tiene que haber una salida: tocar otra cosa suelta cambia lo que se carga (`cambiarCarga`, tarea 9).
- **(20 nov) En Phaser, lo interactivo dentro de un `Container` fijo a la pantalla** necesita su propio `setScrollFactor(0)`: el toque de
  cada hijo usa su factor, no el del contenedor, y queda corrido lo que se movió la cámara (el probador no recibía los toques).
- **(20 nov) Un vaivén con frecuencia que cambia** no se escribe `sin(tiempo × frecuencia)`: con el tiempo grande, la fase salta y la cosa
  tiembla de golpe. Se acumula la fase cuadro a cuadro (`fase += segundos × frecuencia`).
- **(20 nov) Las piezas de 256 × 256 traen margen transparente** (abajo ~4 %, arriba de 18 a 40 %): para que no floten se pone el origen en
  la base visible y una sombra de contacto pegada a ella (`datos/margenes.js`, medido con un script; tarea 7).
- **(20 nov) En Phaser 4, un botón hecho con contenedor (`crearBoton` del kit) no recibió el toque con la cámara movida**, aunque se le
  puso `setScrollFactor(0, 0, true)`; un objeto suelto (círculo o `zone`) con `setScrollFactor(0)` sí. Revisar `crearBoton` en el kit.
- **(22 nov) Un modelo nuevo puede pedir la versión más nueva del programa del rol**: con una versión vieja, el servidor respondía que
  el modelo no se admite con esa cuenta, y se arregla actualizando el programa. Desde el 22, programador y dibujante usan el mismo
  modelo (esfuerzo muy alto y alto) en `roles.local.json`. **La versión nueva se queda esperando la entrada estándar** («Reading
  additional input from stdin…») si se la lanza a mano en segundo plano: se lanza con `< /dev/null`.
- **(22 nov) La ropa que se pone un personaje se dibuja para su cuerpo**: pegar la pieza suelta con giro y tamaño medidos se sigue viendo
  «sobrepuesta». El dibujante edita la figura con cada prenda puesta y saca la capa con el mismo marco de la figura (`piezas/vestir/`, con
  sus scripts e informe); el juego la dibuja con el mismo origen y tamaño que la figura. Y ponerse algo se anima (cae, sube, se pasa por la
  cabeza), nunca un dibujo que cambia de golpe por otro.
- **(22 nov) Mientras el programador edita el kit, Vite recarga la página** y una partida de revisión se corta a la mitad: se juega cuando termina.
- Revisar un juego: `cd juego && npm run dev` (puerto 5174) y abrir `http://127.0.0.1:5174/?juego=<id del trabajo>&historia=0`. Con un script de Playwright
  fuera del repositorio se juega con las flechas y se leen el estado (`window.__<familia>`) y la consola.

## 5. El guion aprobado

**Curso:** Ciencia y Tecnología, 1.º (falta confirmarlo). **Tema:** partes externas del cuerpo humano.
**Tipo:** aventura desde arriba. Forma de jugar: buscar cosas escondidas y llevarlas a su lugar mientras algo te persigue y te empuja (juegos de vestir).
Fuente: `kit/curriculo/1-ciencia-y-tecnologia.md` (CT1, pág. 163–168). La función de cada parte es interpretación del cuaderno.

**Objetivo de aprendizaje** (lo que el juego trabaja, no lo que asegura): que el niño practique nombrar y ubicar la cabeza, el tronco, los
brazos, las manos, las piernas y los pies, y escuche para qué sirve cada parte. El juego **presenta y practica**; solo el repaso de la fiesta
**comprueba en parte** (tres preguntas sin prendas, que el docente ve en los avisos), y se puede ganar el resto sin saber (por sentido común o
probando). No asegura que el niño entienda: conviene que el docente lo converse después de jugar.

**Historia (2 láminas):** «Hoy es la fiesta del pueblo y Inti quiere bailar. Pero Lana, la llama curiosa, sacó su traje del baúl y el viento de la puna lo
esparció por la plaza. ¡Ayudemos a Inti a vestirse!» **Se ve en el juego desde el segundo 1:** Inti espera junto a su baúl abierto y vacío, con ropa sencilla y
temblando de frío; Lana pasea con una manga en la boca; el viento mueve banderines, árboles y lonas; suena música lejana de fiesta. **Final:** Inti vestido baila
con música y confeti, Lana recibe un listón, y Kusi repite las 6 partes y para qué sirve cada una.

**El mundo:** una plaza andina vista desde arriba, **llena de vida y verde, sin suelo liso ni desierto**: caminos de piedra, pasto, tierra, manchas de sombra; flores y
arbustos del kit (ya animados); árboles que se mecen, banderines que ondean, agua de la pileta que corre, mariposas y aves, lonas que se inflan; piedras y objetos con
relieve y sombra. Inti mide ~300 px, las prendas 80 a 100 px, y la plaza son 2 pantallas.

**Cómo se juega:** con el joystick se recorre la plaza. Los escondites tienen una pista visible y **cada uno reacciona distinto al tocarlo** (un árbol que se sacude y
suelta el sombrero, una canasta que levanta su tapa, un barril que destapa una bota, una pileta que salpica y deja ver unos guantes, un arbusto que se agita, un puesto con
el poncho de mantel). Se carga **una prenda a la vez**, sobre la cabeza, y se lleva a Inti: el niño **se detiene sobre la parte del cuerpo donde va** (cruzar de paso no
cuenta); las zonas del nivel brillan y Inti recibe la prenda con un gesto. Hay cosas que no son ropa (una manzana, una flauta): Inti dice «gracias, pero eso no me lo pongo».
Marcador «Prendas puestas: 1 / 2».

**Lo que te empuja y te persigue**
- **El viento de la puna:** te empuja de lado en ráfagas y avisa antes (banderines y lonas se inflan, vuelan hojas); te cubres detrás de un puesto, un árbol o un muro; se
  lleva una prenda que Inti ya llevaba.
- **Lana, la cría de llama:** pasea; cuando cargas una prenda te ve, avisa y te persigue 5 s, y descansa 2 s (más lenta que tú); si te alcanza, te quita la prenda
  (le gusta mordisquear la tela) y la esconde en otro rincón, con una pista de Kusi; lo que Inti ya lleva no se pierde. Sin carga, solo te sigue de lejos.

**Cómo se enseña** (cambió el 22 nov, `correcciones.md` 46: ahora hay una sola vuelta por nivel. Al encontrar la prenda, Kusi dice
para qué sirve la parte que abriga; al abrir el probador pregunta «¿Dónde va…? Toca la parte que…»; al ponerla bien, nombra la parte y
su función. Lo de abajo es el diseño anterior): (1) **descubrir**, al encontrar una prenda Kusi nombra la parte y para qué sirve («Este sombrero va en la cabeza. La cabeza protege el cerebro»); (2)
**practicar**, el viento se lleva una prenda y Kusi pide por el nombre de la parte («¡Inti tiene frío en los pies! ¿Qué parte va a abrigar?»); (3) **aplicar**, el viento se lleva dos y
Kusi pide por la función («¡Inti quiere correr! Busca lo que lo ayuda a caminar y correr»).

| Nivel | Prendas y partes | Escondites | Lo nuevo |
| --- | --- | --- | --- |
| 1 | Sombrero (cabeza) y poncho (tronco) | Árbol y puesto | Viento suave, sin Lana |
| 2 | Mangas (brazos) y guantes (manos) | Canasta y pileta | Viento medio y entra Lana |
| 3 | Pantalón (piernas) y botas (pies) | Barril y arbusto, más lejos | Viento fuerte, Lana más atenta y repaso de partes anteriores |

Hasta 3 estrellas según las veces que Lana te quitó una prenda. Sin game over ni límite de tiempo. Cada nivel dura de 1 a 3 minutos.

**Lo que le llega al docente (los avisos que ya entienden Spring y el panel):** cada toque en el probador se manda como `accion` (desde el 22 nov, con `reto` «Nivel N · Vestir a Inti») con `reto`, `respuesta` (la prenda
elegida y la parte donde se puso) y `correcto`; la ayuda va aparte (`ayuda` 1 o 2). **No cuentan como error:** cruzar de paso por una zona, descubrir, Lana ni el viento. La tabla
de qué prenda va en qué parte, con su fuente, está en un solo archivo para poder corregirla.

**Piezas nuevas que haría el dibujante (unas 20; más que las 8 de antes porque el mundo tiene que estar lleno y vivo; se piden en tandas):** Inti (figura, de frente, brazos
abiertos); Lana (criatura animada de 3 cuadros); 6 prendas (sombrero, poncho, mangas, guantes, pantalón, botas); suelo de la plaza; árbol; puesto con toldo; pileta; canasta;
barril; arbusto; baúl vacío; manzana y flauta; 2 láminas del cuento. Se reusan del kit el protagonista, Kusi y las plantas y flores animadas.

## 6. Dudas contestadas por el equipo (19 de noviembre)

1. Grado: **1.º** («en este caso ese juego es para primer grado»).
2. Nombres: **Inti y Lana se quedan**.
3. Piezas: **sí, unas 20** para que el mundo se vea lleno (corrección 26; la regla de `taller/reglas.md`, línea 508, todavía dice 8).
4. Tope de encargos: **sí, a 10**. `taller/programar.mjs` ya lee `TALLER_MAX_ENCARGOS` (por defecto 6); para este juego se corre con
   `TALLER_MAX_ENCARGOS=10`.

## 7. Cómo seguir cuando el equipo diga «genera el juego»

1. Crear `taller/trabajos/<uuid>/` con `trabajo.json` (curso, grado, tema y la propuesta) y `plan.md` (este guion con decisiones del supervisor: piezas, tamaños, reglas del
   juego, niveles, evaluación y qué kit usar). La carpeta no se sube.
2. Pedir las piezas al dibujante **en tandas**, revisarlas una por una (estilo, tamaño, que el mundo se vea verde y con vida) y pedir correcciones.
3. Escribir las tareas del programador de a una (lógica y datos; escena; mundo vivo; viento y Lana; niveles y final), revisar cada una **jugándola** y devolver correcciones.
4. **No mostrar nada al equipo hasta tener todo lo que promete la historia.** Después, anotar cada corrección en `correcciones.md`.
5. Antes de empezar, subir el tope de encargos (ver las lecciones técnicas) y confirmar con el equipo el grado, los nombres y el número de piezas.
