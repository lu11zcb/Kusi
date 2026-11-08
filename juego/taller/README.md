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
| [agentes/](agentes/) | Las instrucciones de cada rol: [supervisor](agentes/supervisor.md), [programador](agentes/programador.md), [dibujante](agentes/dibujante.md) y [revisor](agentes/revisor.md). |

## Cómo funciona

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
   - el **dibujante** dibuja solo las piezas quietas que falten (objetos y, si el
     tema lo pide, un fondo);
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
| Dibujante | Dibuja las piezas quietas que faltan y las prepara. | No dibuja personajes ni cambia piezas del kit. |
| Revisor | Juega el juego, mira capturas, revisa el código, el contenido y cada pieza. | No corrige: dice qué está mal y por qué. |

Cada rol es un programa distinto. El trabajador les pasa las instrucciones de
[agentes/](agentes/) al arrancar. Las instrucciones son neutrales: sirven
igual con las suscripciones de la demo o con claves de API en producción,
porque todo lo que hay que saber vive en el proyecto.

## Lo que falta definir después de este sprint

- Cómo se sirven los juegos del taller fuera de esta Mac. En la demo, el
  reproductor corre con Vite aquí mismo.
- Un aislamiento más fuerte del código que escribe el programador. Hoy lo
  protegen las reglas de [reglas.md](reglas.md) y la revisión del código.
- Cómo elige el niño su personaje (Sprint 4, HU61 a HU65).
