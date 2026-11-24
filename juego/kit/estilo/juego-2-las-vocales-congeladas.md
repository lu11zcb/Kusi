# Juego 2 de 5: «Las vocales congeladas» (en revisión del equipo)

Contexto y guion para retomarlos en otro chat. Es del 23 de noviembre de 2026. Antes de seguir, leer también `correcciones.md`.

**Estado (23 nov):** primera versión completa. Trabajo `taller/trabajos/764bce40-9f31-4592-99c7-818886b65cc4/` (no se sube). El
supervisor jugó la partida completa (cuento, 3 niveles, ayudas, Escuchar, repaso, concierto y `fin`) sin errores en la consola. Falta
que el equipo lo juegue y lo corrija; cada corrección va a `correcciones.md` desde la 79.

**2.ª ronda (23 nov, correcciones 79 a 83):** el personaje ya no vuela: **lanza bolas de nieve** a la letra que toca el niño, con su gesto `lanzar` (nuevo en el molde del protagonista, opcional); el hielo se rompe con grietas y trozos dibujados; la foca se redibujó (no parecía foca); el coro baila con sus tiras y las focas aplauden; el pollito se zambulle y sale del agua de un salto. Tareas 6a a 6d.

## 1. El guion aprobado

**Curso:** Comunicación, 1.º. **Tema:** las vocales y las vocales fuertes y débiles. **Tipo:** cortar lo que sale volando (se parece a
los de cortar frutas en el aire y al corte de hielo de *Ice Breaker*, `kit/friv/seleccion.md`, ficha 062).

**Qué presenta, practica y comprueba (regla 14.2):** presenta el sonido y la forma de cada vocal y la boca de las fuertes (A, E, O: bien
abierta) y las débiles (I, U: casi cerrada); practica reconocer la vocal al oírla, por la primera vocal de una cosa y por fuerte o débil;
comprueba **en parte** con un repaso final de 3 pedidos sin ayudas, que el docente ve en los avisos. Se puede acertar probando (la
letra equivocada rebota): conviene conversarlo en clase. Fuertes y débiles no aparecen en los documentos de 1.º revisados.

**Historia (3 láminas):** «Kusi y tú viajan en barco a la Antártida, el lugar más frío del mundo. ¡Esta noche cantan los pingüinos!
Pero hace tanto frío que su canto se congela: cada vocal sale volando hecha una letra de hielo. Rompe el hielo de la vocal que canta el
director y su sonido volverá al coro. ¡Que empiece el concierto!»

**Cómo se juega:** una sola pantalla vista de lado. El coro de pingüinos canta y de sus picos salen letras de hielo que vuelan en arco
y caen al mar. El niño traza una raya con el dedo y **su personaje sale disparado por la raya** y corta: la letra pedida se parte y
suena; otra letra es hielo duro y el personaje rebota. Sin joystick (decisión del equipo). Meta: «Notas del coro: 6 / 6» por nivel.

| Nivel | Vocales | Cómo se pide | Lo nuevo |
| --- | --- | --- | --- |
| 1 | A, E, I | Descubre las 3; después por su sonido | Aprender a cortar |
| 2 | O, U y las cinco | Por su sonido y por la primera vocal de una cosa (ancla, estrella, isla, ola; la ballena canta «uuu») | Lobito, la cría de lobo marino que muerde letras |
| 3 | Fuertes y débiles | «Suelta una fuerte / débil»; al final «de boca bien abierta / casi cerrada» | La ventisca; repaso y concierto con auroras |

**Decisiones del equipo:** sin joystick; fuertes y débiles por la boca; solo mayúsculas; nombres Lobito y «el director del coro».

## 2. Lecciones técnicas para el supervisor (de esta ronda)

- **El dibujante no tiene fondo visto de lado:** `dibujar.mjs --fondo` siempre pide la vista desde arriba. El fondo `fondo-antartida` se
  pidió con un pedido propio y el mismo filtro de piezas. Pendiente del taller: un tipo de fondo de lado.
- **Dibujar primero las tiras y no la figura suelta:** `figura-director` salió con otro diseño que sus tiras; se usó el de las tiras.
  Describir el personaje igual en cada pedido, o pedir primero la tira y usar su cuadro de reposo.
- **La voz antes de la acción:** jugando rápido, las letras salían apenas Kusi empezaba a hablar y la respuesta tapaba la frase que
  enseña y el pedido (nunca sonaban). Se arregló con un reloj de voz (`logica/ritmo.js`): las letras salen cuando terminó la frase.
  Probar siempre cortando **lo más rápido posible** y revisar que cada frase que enseña o pide haya sonado (`speechSynthesis.speak`).
- **Cortar tiene que perdonar:** con un radio de 54 px el personaje tocaba la letra con el cuerpo sin cortarla; con 85 px (medio bloque
  más medio cuerpo) se siente justo. Al soltar el dedo, el personaje termina la raya antes de volver.
- **Solo corta la raya del niño:** al apoyar el dedo, el personaje viajaba desde su témpano y cortaba lo que había en el camino; el
  docente recibía errores que el niño no cometió. Ahora el corte empieza cerca del primer punto que tocó el dedo.
- **Lo lejano, chico y aparte:** la estación quedó sobre el escenario detrás del coro y la ballena salía detrás de las focas. Revisar las
  capturas buscando cosas que se amontonan o que parecen de otro plano.
- **Encargos cortos:** una tarea con muchas partes se cortó a los 12 minutos y dejó archivos sin conectar. Las tareas 3 a 5 se dividieron
  en encargos de una sola cosa (3b, 3c, 4a, 4b, 5a, 5b, 5c) y todos terminaron en 3 a 7 minutos.
- **El programador cambió el texto aprobado de la historia** para que cupiera en 3 frases: decirle en cada tarea que el guion aprobado
  no se toca y revisar `guion-ejemplo.json` al final.
- **Después de cambiar el kit, las pruebas de navegador se corren con un Vite recién prendido** (otro puerto): el servidor que lleva días prendido sirve el módulo editado con otra dirección (`?t=…`) y una prueba que parcha su clase espera para siempre (`animacion.spec.js`, «la espalda real…»). Con un Vite nuevo pasan las 6.
- **El programador y el dibujante tienen un límite de uso**: el 23 nov se cortaron a las 16:30 hasta las 18:31. Los pedidos que fallan por eso no cuentan como intentos (se borra su reserva en `piezas/.intentos`).
- Revisar un juego de este tipo: `?juego=<id>&historia=0` (y `&nivel=2` o `3`); el juego expone `window.__vocales_hielo` con `cortar(v)`,
  `lobitoSalta()`, `ventiscaYa()` y `ganarNivel()`. Los scripts de revisión del supervisor trazan con el ratón y no van al repositorio.
- **El quitafondo borra lo blanco que está dentro de la figura:** los dientes blancos de las bocas de la A, la E y la I quedaron
  transparentes (se veía el cielo a través de la boca). Se pide marfil (`#f3e6c8`), nunca blanco puro, y cada pieza se revisa también
  sobre un fondo oscuro. Si ya pasó, se rellenan solo los huecos encerrados (sin tocar el borde de afuera).
- **Revisar una copia fija:** mientras el programador trabaja en el juego, el servidor recarga la página y corta la partida de revisión.
  Se copia el trabajo a otra carpeta de `taller/trabajos/` con otro id, se juega esa copia y se borra al terminar.
- **Un tutorial no dice «Mira» si nadie hace nada:** la mano guía solo muestra dónde tocar; la frase dice qué tocar y para qué.
- **Probar con voces reales, no solo con las que genera la prueba:** el reconocedor de vocales pasaba todas sus pruebas (audio sintético
  del canto) y con voces reales acertaba 9 de 90. El set de voces de la computadora también engaña: «Flo», «Sandy», «Shelley» y
  «Grandma» sin su nombre completo (`"Flo (Español (México))"`) hablan en inglés, y una voz que no está instalada cae en la voz por
  defecto (todas iguales). Comprobar con `md5` que no haya archivos repetidos. El set vive fuera del repositorio
  (`~/Desktop/Kusi/voces-prueba/`) y se mide con `node kit/herramientas/probar_escucha.mjs <carpeta>`.
- **Micrófono simulado en el navegador:** Chromium con `--use-fake-ui-for-media-stream --use-fake-device-for-media-stream
  --use-file-for-fake-audio-capture=<wav>` escucha ese archivo en bucle; así se prueba la escucha jugando.
