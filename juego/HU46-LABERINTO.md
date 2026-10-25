# HU46 · Laberinto, pasos 1 a 4

Esta entrega se detiene cuando el mapa se ve y el cuy se mueve. Los tres niveles
están escritos en el paquete de ejemplo; por ahora se juega el recorrido del nivel 1.

Para abrirlo desde PowerShell:

```powershell
cd D:\Escritorio\Kusi\juego
npm run dev
```

Visita <http://127.0.0.1:5174/?paquete=laberinto>. Sin el parámetro `paquete`,
<http://127.0.0.1:5174/> sigue abriendo el mercado.

## Qué probar

1. Pulsa y suelta una flecha. El cuy sigue solo hasta el muro, sin atravesarlo.
2. Desde el inicio, pulsa derecha. Después de pasar la primera casilla y antes
   del pasillo central, pulsa abajo: guarda la vuelta y baja por la columna 5.
3. Al llegar al muro inferior, pulsa arriba: camina de espaldas y queda quieto
   mirando hacia arriba al detenerse.
4. Desliza un dedo o arrastra el ratón en cualquier parte del lienzo. Se necesitan
   al menos 30 píxeles de pantalla; en diagonal manda el eje más largo.
5. Toca **Ayuda** para ver las pistas y **Escuchar** para oír el texto de Kusi,
   cuando el navegador disponga de voz. Los botones no hacen caminar al cuy.

La velocidad normal es de 3 casillas por segundo. Para las pruebas rápidas usa
<http://127.0.0.1:5174/?paquete=laberinto&rapido=1>, que multiplica esa velocidad por cuatro.

Los dibujos que falten se reemplazan con figuras simples bajo las mismas claves:
`muro-adobe`, `camino-tierra`, `pasto`, `puerta-cerrada` y `puerta-abierta`.
El cuy utiliza las animaciones compartidas existentes; Kusi permanece fuera del mapa.

## Límite de esta revisión

Todavía no se recogen frutas, no se abre la puerta, no se pasa de nivel y los
zorros no se mueven ni atrapan. Las reglas, la persecución, el tutorial inicial,
la voz automática al entrar y sus pruebas de recorrido completo corresponden
a los pasos siguientes, después de revisar este movimiento.

La carga rechaza los mapas incompatibles con un mensaje amable y permite volver
a intentarlo. Los avisos disponibles son `listo`, `inicio`, `ayuda` y `fallo`;
comparten `partida` y un `orden` consecutivo. La comprobación completa HU31 sigue
perteneciendo a Spring.

## Verificación

```powershell
npm run prueba:logica
npm run prueba -- --workers=1
npm run build
```

La lógica y la validación se prueban con `node --test`, sin instalar paquetes
adicionales. Playwright comprueba teclado, vuelta guardada, animación, ratón,
tacto, distribución de pantalla y fallo de carga, además de las pruebas del mercado.
