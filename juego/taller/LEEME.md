# Taller

En el taller la IA crea un juego nuevo cuando ningún juego de la
[biblioteca](../juegos/LEEME.md) sirve para el tema que pidió el docente.
Es el trabajo del Sprint 3.

## Cómo va a funcionar

1. Entra la propuesta aprobada por el docente. Se le pasa a la IA como datos,
   no como órdenes.
2. Un agente de programación con IA (por ejemplo, OpenCode con la IA de
   Tecsup) arma el juego en una carpeta cerrada, solo con las piezas del
   [kit](../kit/LEEME.md), con un tiempo máximo.
3. Kusi revisa el juego antes de mostrárselo al docente. Si falla, la IA lo
   corrige hasta dos veces; si no alcanza, queda un juego de respaldo.
4. El docente lo prueba en el panel y lo aprueba antes de enviarlo a sus
   estudiantes.
5. A la IA nunca se le mandan nombres, credenciales ni datos de los niños.

Cada juego nuevo va en su propia carpeta dentro de `juegos/`, igual que el
laberinto, y usa el reproductor del kit.

## Lo que falta definir

- Qué archivos entrega la IA por cada juego nuevo.
- Cómo se ejecuta su código de forma segura, sin acceso a la red ni a los
  datos de Kusi.
- Dónde guarda el servidor los juegos con código propio.
