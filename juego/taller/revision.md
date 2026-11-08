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
con los efectos y con `?vida=0`.

- [ ] ¿Carga sin errores en la consola?
- [ ] ¿Kusi dice la consigna con voz, y **Escuchar** la repite?
- [ ] ¿**Ayuda** muestra la ayuda 1 y después la 2?
- [ ] ¿Un error es amable: no castiga y Kusi da una pista?
- [ ] ¿Se puede terminar cada nivel y llegar al cierre?
- [ ] ¿Funciona con el dedo y con el ratón?
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
- [ ] ¿La consigna y las ayudas tienen 90 caracteres como máximo, en español
      sencillo y de tú?
- [ ] ¿Las ayudas ayudan de verdad, sin decir la respuesta de golpe?
- [ ] ¿Los textos no nombran al cuy, a niños ni a personas reales?
- [ ] ¿Respeta la cultura y la regla de las figuras sagradas?
- [ ] ¿No tiene nada que dé miedo, se burle o castigue?

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
