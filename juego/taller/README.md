# Taller

En el taller se crea un juego nuevo cuando ningún juego de la
[biblioteca](../juegos/README.md) sirve para la propuesta que aprobó el docente.
Lo hace un equipo de cuatro roles que solo usa las piezas del
[kit](../kit/README.md) y sigue la [guía de estilo](../kit/estilo/README.md).

| Archivo | Qué dice |
| --- | --- |
| Este archivo | Qué es el taller y cómo funciona. |
| [reglas.md](reglas.md) | Las reglas que cumple todo juego nuevo: qué puede usar del kit, el protagonista, los niños, la seguridad y los límites. |
| [entrega.md](entrega.md) | Qué archivos entrega cada juego nuevo, cómo se registra y qué evidencia se guarda. |
| [revision.md](revision.md) | Cómo se revisa un juego y cada pieza nueva antes de que llegue al docente. |
| [agentes/](agentes/) | Las instrucciones de cada rol: [proponedor](agentes/proponedor.md), [supervisor](agentes/supervisor.md), [programador](agentes/programador.md), [dibujante](agentes/dibujante.md) y [revisor](agentes/revisor.md). |

## La propuesta también pasa por el taller

Antes del juego está la **propuesta**: lo que el docente lee y aprueba. La escribe el
**proponedor**, un rol más del taller, y no la IA directa de Spring:

1. El docente escribe un tema (o pide cambios, o rechaza y pide otra alternativa).
   Spring deja la solicitud en «generando» y un trabajo `proponer` en el buzón.
2. El trabajador lo toma, crea su carpeta (`trabajos/<id>/` con `trabajo.json`) y lanza
   al proponedor. Este lee los [contenidos por grado](../kit/curriculo/README.md) del
   grado de la sección (primero o segundo), busca fuera solo si le falta algo (primero
   fuentes oficiales) y escribe `propuesta.json`: la `propuesta` y sus `fuentes`
   (documento y página o enlace de cada contenido). Así el contenido se contrasta con
   una referencia independiente del juego (HU32).
3. El trabajador la entrega a Spring (`POST …/{id}/propuesta`). Spring revisa cada
   campo; si algo no pasa, devuelve los motivos y el proponedor corrige, hasta 2
   veces. Las fuentes quedan guardadas por dentro: el docente no las ve.
4. **El respaldo.** Si el proponedor no puede (sin tokens, un error, se acaba el
   tiempo de 5 minutos, `TALLER_LIMITE_PROPUESTA_MS`) o si nadie toma el trabajo en
   60 segundos (el taller está apagado), Spring usa la IA directa (Groq o la de
   Tecsup) para que el docente no espere. Esa propuesta queda sin fuentes. Sin IA de
   respaldo configurada, la solicitud queda «fallida» y el docente puede reintentar.
   Con `PROPUESTAS_POR=ia` en el `.env`, Spring usa siempre la IA directa.

## Cómo funciona el juego

1. **El docente aprueba una propuesta** que no es del laberinto. La propuesta
   y el guion del laberinto siguen yendo directo de Spring a la IA; el taller
   es para los juegos nuevos.
2. **Spring deja un trabajo en el buzón**, una tabla de trabajos con cuatro
   estados: `pendiente`, `en proceso`, `listo` y `falló`.
3. **El trabajador**, un programa que corre en esta Mac, pregunta al buzón cada
   pocos segundos. Cuando hay un trabajo pendiente, lo toma (`en proceso`),
   le prepara una carpeta de trabajo y pone a trabajar al supervisor.
4. **El supervisor** lee la propuesta, revisa la biblioteca, decide qué falta y
   reparte el trabajo:
   - el **programador** escribe el juego con el kit;
   - el **dibujante** dibuja lo que falte para que el juego no se vea plano (objetos, fondos y, si
     el juego lo pide, personajes secundarios, enemigos y criaturas animadas de 3 cuadros);
   - el **revisor** juega el juego, mira capturas y revisa cada pieza.
5. **Hay hasta 2 correcciones.** Si el juego no pasa, el trabajo termina en
   `falló`. Si una pieza no pasa, se usa una pieza que ya existe o una figura
   simple.
6. **El trabajador devuelve el juego** a Spring (`listo`) con su evidencia:
   tiempo, intentos y costo estimado. Kusi lo guarda y se lo muestra al
   docente.
7. **El docente prueba su juego** en el panel. Lo aprueba o pide cambios, y
   aprueba o rechaza las piezas nuevas, que hasta entonces están
   «pendientes».

## Cómo se arranca el trabajador

```bash
cd juego
npm run taller            # pregunta al buzón cada 5 segundos (Ctrl+C para salir)
npm run taller -- --una-vez
```

- Lee `EDU_API_URL` y `TALLER_CLAVE` del `.env` de la raíz y nunca los muestra.
  La clave la crea `python3 scripts/configurar_local.py`.
- Si el servidor de juegos (Vite, puerto 5174) no está encendido, lo enciende y
  lo apaga al salir.
- **Qué programa hace cada rol** está en `taller/roles.local.json`, que no se
  sube. Por cada rol dice `{ programa, argumentos, carpeta }`, y los argumentos
  llevan marcadores: `{pedido}`, `{instrucciones}` (el texto de `agentes/<rol>.md`),
  `{agentes}` (los subagentes del rol), `{carpeta}` (la del trabajo), `{juego}`,
  `{raiz}` y `{temporal}` (una carpeta vacía fuera del proyecto, desde donde
  trabaja el rol). Ese archivo fija también los permisos: leer `juego/`, escribir
  solo en la carpeta del trabajo y correr `node` y Playwright.
- Por cada trabajo (código en `trabajador/`): prepara la carpeta (en una
  corrección, con la copia del juego anterior), lanza al supervisor con el
  revisor como subagente, y comprueba con código lo que
  entregó. Revisa los archivos de entrega.md, lo prohibido de la regla 9, que no
  nombre al cuy, las importaciones y `node --test`, y abre el juego en un
  navegador sin pantalla con el `validar` de su ficha. Si algo falla, o si Spring
  responde 422, el supervisor recibe los motivos y corrige, hasta 2 veces; si no,
  o si se acaban los 75 minutos (`TALLER_LIMITE_MS`), informa el fallo. Spring da por
  perdido un trabajo a los 90.
- **El dibujante** también es un rol de `roles.local.json`. El supervisor le pide
  cada pieza con `node taller/dibujar.mjs --carpeta <carpeta> --id <id> --que "<qué es>"
  [--apoyado] [--fondo] [--correccion "<motivos>"]`. Cada llamada es un intento: el
  pedido de la guía de estilo con fondo blanco, el original en `piezas/origen/`, el
  recorte con la visión de macOS y el filtro del código. Hay 1 intento y hasta 2
  correcciones por pieza; si no pasa, la pieza no se entrega y el reproductor usa
  una figura simple. El trabajador exige también la aprobación del revisor en
  `revision/piezas.json`, con la huella SHA-256 del PNG final y su informe: cambiar
  el dibujo obliga a revisarlo otra vez. Los fallos sin imagen cuentan como
  intentos; el consumo de las correcciones se suma, también con piezas en paralelo.
  Sus pruebas están en `pruebas/logica/dibujante.test.js`.
- **La biblioteca crece sola.** Cuando el docente envía a su clase un juego del
  taller, Spring aprueba sus piezas. Antes de cada trabajo, el trabajador pide
  `GET /interno/taller/biblioteca` y escribe `biblioteca.json`: los ejemplos de
  `juegos/`, los juegos del taller ya enviados (con su carpeta en esta Mac) y
  `piezas_aprobadas`, cada una con su archivo y su huella SHA-256. El supervisor
  puede copiar una pieza aprobada tal cual: el trabajador la reconoce por la huella,
  no le pide otra revisión y no la reporta como nueva. Si al docente no le gusta un
  dibujo, lo pide por el chat y la corrección trae piezas nuevas, que vuelven a
  «pendiente».
- **La propuesta** la atiende `trabajador/proponer.js`: `roles.local.json` necesita el
  rol `proponedor` (puede leer `juego/` y buscar en internet; escribe solo
  `propuesta.json` y notas en la carpeta del trabajo; sin Bash). Sin ese rol el
  trabajo falla y entra el respaldo. Sus pruebas están en `pruebas/logica/proponer.test.js`.
- **El taller mira la pantalla por el docente.** Además de las comprobaciones de código, `trabajador/pantalla.js`
  abre el juego, toma tres capturas (al empezar, un momento después y tras mover el joystick) y se las devuelve al
  supervisor como corrección si ve **franjas vacías del color del lienzo** (cámara recortada), un **mundo liso y vacío**
  o un **juego congelado**. Solo rechaza lo que ve con seguridad: una falsa alarma gastaría una de las 2 correcciones.
  Sus pruebas: `pruebas/logica/pantalla.test.js` y `pruebas/navegador/pantallaDelTaller.spec.js`.
- Pruebas: `pruebas/logica/trabajador.test.js` y, de punta a punta con un
  Spring falso y un supervisor de prueba sin IA,
  `pruebas/navegador/trabajador.spec.js`.

## Lo que ve cada uno

- **El docente** solo ve su juego. No ve comprobaciones, fallas, versiones ni
  qué hizo la IA.
- **Por dentro**, Kusi guarda todo: el plan, los intentos, las revisiones, las
  correcciones y la evidencia de cada trabajo.

## Quién hace qué

| Rol | Hace | No hace |
| --- | --- | --- |
| Supervisor | Lee la propuesta, revisa la biblioteca, decide qué falta, reparte, controla las correcciones y entrega. | No programa ni dibuja. |
| Programador | Escribe el juego con el kit, su guion de ejemplo y sus pruebas. | No dibuja ni cambia el kit. |
| Dibujante | Dibuja lo que falta (objetos, fondos, personajes secundarios, enemigos y criaturas animadas de 3 cuadros) y lo prepara. | No redibuja al protagonista, al zorro ni a Kusi, ni cambia piezas del kit. |
| Revisor | Juega el juego, mira capturas, revisa el código, el contenido y cada pieza. | No corrige: dice qué está mal y por qué. |

**Quién dirige y quién hace.** El trabajador lanza al supervisor, que trae al
revisor como subagente: los dos dirigen y comprueban, y no escriben el código del
juego ni dibujan (sus permisos les bloquean `juego/` y `piezas/` del trabajo). El
supervisor encarga el código al programador con `node taller/programar.mjs
--carpeta <carpeta> --tarea "<qué programar>" [--correccion "<motivos>"]` y cada
pieza al dibujante con `dibujar.mjs`; esos dos roles se lanzan aparte, cada uno
con su programa del archivo de roles. El programador escribe solo en `juego/`
del trabajo y deja `programador/pedidos.md` y `programador/registro.json`, que el
trabajador suma a la evidencia. El trabajador entiende tanto un
resumen JSON como eventos JSON por línea: conserva la respuesta final, el consumo
y los fallos del rol. El trabajador les pasa las instrucciones de
[agentes/](agentes/) al arrancar. Las instrucciones son neutrales: sirven
igual con las suscripciones de la demo o con claves de API en producción,
porque todo lo que hay que saber vive en el proyecto.

## Lo que falta definir después de este sprint

- Cómo se sirven los juegos del taller fuera de esta Mac. En la demo, el
  reproductor corre con Vite aquí mismo.
- Un aislamiento más fuerte del código que escribe el programador. Hoy lo
  protegen las reglas de [reglas.md](reglas.md) y la revisión del código.
- Cómo elige el niño su personaje (Sprint 4, HU61 a HU65).
