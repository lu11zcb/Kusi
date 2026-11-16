# Receta: manejar un vehículo hasta las paradas

Inspirada en Extreme Car Parking y Friv Taxi. **Modelo:** `kit/ejemplos/viaje/` y
`kit/reproductor/logica/vehiculo.js`.

## Por qué se juega una y otra vez

Manejar da gusto por sí mismo: acelerar suave, girar, frenar justo. El reto es **llegar al lugar correcto y
detenerse bien**, sorteando lo que se cruza.

## Cómo se arma

- **Dos o tres lugares** unidos por un camino con curvas, charcos, cajas y animales que cruzan. Cada lugar tiene
  su puerto (una zona clara donde se detiene el vehículo).
- **El vehículo:** se maneja con el joystick, acelera y frena con suavidad. Tocar un obstáculo lo frena y rebota,
  sin dañar nada.
- **El reto de habilidad:** esquivar y **frenar dentro del puerto**. Detenerse bien se marca con una barra visible
  que se llena y se cancela si el vehículo se mueve; nunca cuenta atrás ni apura.
- **Qué se hace en cada parada:** se baja y se explora a pie el lugar un momento: recoger lo que toca, ayudar a
  alguien (una sola actividad corta, no una misión larga).
- **Cuál es la respuesta educativa:** a qué puerto se va (el de la sílaba, el número, el animal que Kusi pide) y
  qué se recoge allí. Los puertos equivocados se pueden visitar y no castigan: Kusi da una pista.
- **Se siente bien:** el vehículo se inclina en las curvas, levanta polvo, suena al frenar, y al llegar al puerto
  correcto pasa algo alegre.

## Los niveles (mismo verbo, otra vuelta)

1. Camino recto con un charco; un puerto correcto y uno equivocado; 3 cosas.
2. Curvas y cajas que esquivar; tres puertos; 4 cosas.
3. Un animal que cruza o un puente angosto; el puerto cambia de sitio; 5 cosas.

## Números para empezar

- Un viaje entre puertos: 20 a 40 segundos. Un nivel: 2 a 3 minutos en total.
- A pie, velocidad 340 px/s (la del modelo).

## Lo que no se hace

- Mezclar esto con perseguir a alguien o armar algo: una sola mecánica.
- Un camino largo y vacío. Cada tramo tiene algo que mirar, que esquivar o que decidir.
- Salir volando entre islas: el vehículo viaja por un camino o por el agua, no por el aire.
