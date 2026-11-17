# Qué motor necesita cada adaptación

Esta clasificación reúne **las mismas 66 referencias de [seleccion.md](seleccion.md)**, una sola vez cada una. Está pensada para Kusi, para niños de 1.º y 2.º de primaria en Perú (6 a 8 años): niveles cortos, una regla clara, reintentos rápidos y ausencia de violencia y miedo. Consulta: **16 de noviembre de 2026**.

La base disponible es esta: plataformas laterales con saltos pequeños, exploración cenital con un adversario amable y vehículo con paradas. No se inspeccionó el repositorio. **Joystick en todos; botón de salto solo en plataformas.** Las entradas de esta tabla son propuestas de adaptación y alcance, no afirmaciones de que una extensión ya esté implementada.

## Criterio de agrupación

Se asigna un motor existente cuando conserva el núcleo de la decisión y basta añadir reglas u objetos concretos. Se marca «sin motor» cuando el rasgo principal exige otro control, representación del estado o simulación. Que un juego muestre un vehículo no basta para usar el motor de paradas; una carrera, vuelo, carga inestable o equilibrio en el aire necesitan funciones diferentes. Tampoco una escena lateral de física equivale a plataformas con salto.

Las adaptaciones cenitales pueden cambiar la cámara conservando la decisión —por ejemplo, esperar fuera de una zona de vigilancia—; el cambio se declara. Los motores nuevos de tablero pueden usar cursor con joystick y confirmación por permanencia visible, cancelable al moverse. Los editores de líneas necesitan selección de puntos o tramos grandes; no se oculta esa necesidad añadiendo un salto o un arrastre táctil obligatorio.

| Base | Referencias |
|---|---:|
| Plataformas de lado con saltos pequeños | 11 |
| Exploración desde arriba | 6 |
| Vehículo con paradas | 3 |
| Sin motor adecuado todavía | 46 |
| **Total sin duplicados** | **66** |

## Plataformas de lado con saltos pequeños (11)

Se reutilizan desplazamiento lateral, colisión, gravedad y salto corto. Impulso, planeo, ondas, objetos transportables y cooperación son ampliaciones explícitas. Las acciones contextuales se activan al detenerse en zonas señaladas; el único botón sigue siendo saltar.

| ID | Juego y ficha | Mecánica propia | Qué se reutiliza y qué falta construir |
|---|---|---|---|
| 001 | [Fancy Pants Adventure](seleccion.md#juego-001) | Plataformas de impulso: la velocidad previa cambia el alcance del recorrido. | Base lateral y salto corto. Añadir impulso limitado y rampas; no asumir que ya existen ni copiar bucles de alta velocidad. |
| 002 | [Fireboy and Watergirl Forest](seleccion.md#juego-002) | Cooperación por compatibilidad y pulsadores sostenidos. | Base lateral y salto corto. Compañero con estados de cooperación, placas y puertas; no requiere multijugador. |
| 005 | [Cactus McCoy](seleccion.md#juego-005) | Transportar y apilar objetos como apoyos de exploración. | Base lateral y salto corto. Objetos transportables/apilables y comprobación de que toda estructura puede corregirse. |
| 006 | [Home Sheep Home](seleccion.md#juego-006) | Puzle físico por tamaño, peso y ocupación de espacio. | Base lateral y salto corto. Umbrales de peso/ocupación y cargas con datos explícitos; si se conserva control de tres agentes se necesita otro sistema. |
| 013 | [Icycle](seleccion.md#juego-013) | Recorrido de avance irreversible con decisión previa. | Base lateral y salto corto. Restricción de avance por tramos y reinicio cercano; adaptación a pie con saltos pequeños, no bicicleta realista. |
| 014 | [Dino Shift](seleccion.md#juego-014) | Recolección condicionada por estado elegido. | Base lateral y salto corto. Estados de compatibilidad seleccionables en estaciones y objetos con propiedades verificables. |
| 015 | [Hefty Shaman](seleccion.md#juego-015) | Onda de movimiento por impacto de aterrizaje. | Base lateral y salto corto. Propagación de onda y respuesta de objetos; alcance previsualizado, sin necesitar saltos grandes. |
| 016 | [Jelly Dad Hero](seleccion.md#juego-016) | Transporte por conductos conectados con objeto en custodia. | Base lateral y salto corto. Red de entradas/salidas, estado de objeto transportado y vista previa de conexiones. |
| 017 | [Lost Glider](seleccion.md#juego-017) | Caída controlada mediante planeo. | Base lateral y salto corto. Añadir estado de planeo, caída limitada y control horizontal; no exigir un segundo botón de acción. |
| 018 | [Cave Berries](seleccion.md#juego-018) | Abrir accesos en un recorrido de plataformas con una herramienta de línea recta; el protagonista debe llegar a la posición de uso. | Base lateral y salto corto. Trazado de línea, bloques con compatibilidad y activación contextual; navegación acuática del original no incluida. |
| 019 | [Jack Frost](seleccion.md#juego-019) | Cobertura persistente de superficies mediante recorrido. | Base lateral y salto corto. Marcas persistentes por superficie y comprobación de cobertura; no requiere mundo destructible. |

## Exploración desde arriba (6)

Se reutilizan movimiento desde arriba, colisiones y, cuando aporta al reto, adversario amable. No hay botón de salto. Se añaden estados de tarea, selección por proximidad y reglas educativas; el adversario puede omitirse cuando distrae de la mecánica.

| ID | Juego y ficha | Mecánica propia | Qué se reutiliza y qué falta construir |
|---|---|---|---|
| 003 | [Bad Ice Cream](seleccion.md#juego-003) | Laberinto con construcción y retirada de barreras en casillas. | Base cenital, sin salto. Edición de casillas, rutas siempre terminables y adversario que recalcula el camino. |
| 004 | [Bob the Robber](seleccion.md#juego-004) | Exploración sigilosa basada en zonas de detección y escondites. | Base cenital, sin salto. Adaptación cenital explícita: añadir visión por zonas, escondites y ciclos; no conservar pisos laterales. |
| 021 | [Just One Boss](seleccion.md#juego-021) | Arena de patrones anunciados y refugios temporales. | Base cenital, sin salto. Tablero/casillas, avisos previos y máquina de patrones; no necesita salto ni ataque. |
| 030 | [Tasty Planet Dino Time / Dinotime](seleccion.md#juego-030) | Umbral de tamaño que cambia durante la recogida. | Base cenital, sin salto. Propiedad de capacidad/tamaño, escalas de objetos y umbral de recogida; colisiones estables para no volver confuso el mapa. |
| 056 | [Hot Dog Bush](seleccion.md#juego-056) | Gestionar una cola de encargos con procesos simultáneos. | Base cenital, sin salto. Extensión de colas, estaciones, inventario mínimo y estados de pedido. |
| 059 | [Find Objects](seleccion.md#juego-059) | Búsqueda visual de un objetivo entre distractores. | Base cenital, sin salto. Zonas de selección por proximidad y pistas; reutiliza recorrido cenital. |

## Vehículo con paradas (3)

Se reutilizan conducción lenta y paradas. Recoger o entregar se confirma al detenerse; no hay botón de salto. Aparcar con orientación y seguir un riel son extensiones concretas, no capacidades supuestas de cualquier vehículo.

| ID | Juego y ficha | Mecánica propia | Qué se reutiliza y qué falta construir |
|---|---|---|---|
| 024 | [Friv Taxi](seleccion.md#juego-024) | Recogida y entrega con correspondencia origen/destino. | Conducción con paradas, sin salto. Estados libre/cargando/entrega, destinos y rutas; usar frenado al soltar joystick y paradas automáticas. |
| 025 | [Extreme Car Parking](seleccion.md#juego-025) | Estacionamiento con orientación, espacio disponible y parada final. | Conducción con paradas, sin salto. Detección de orientación y ocupación de plaza, marcha atrás y validación solo al detenerse. |
| 031 | [Sky Wire](seleccion.md#juego-031) | Desplazamiento sobre riel fijo con ventanas temporales de paso. | Conducción con paradas, sin salto. Seguimiento de spline o riel y obstáculos cíclicos; extensión del vehículo, sin dirección libre. |

## Sin motor adecuado todavía (46)

El núcleo de estas referencias no lo resuelve ninguno de los tres motores tal como fueron descritos. Se indica el sistema nuevo mínimo. Algunos pueden compartir infraestructura —tableros, cursor, deshacer o simulación—, pero conservarán reglas y comprobaciones distintas.

| ID | Juego y ficha | Mecánica propia | Qué se reutiliza y qué falta construir |
|---|---|---|---|
| 007 | [Give Up robot](seleccion.md#juego-007) | Desplazamiento pendular mediante enganche. | Sistema nuevo: Locomoción de enganche y péndulo asistido sobre base lateral; los saltos pequeños actuales no bastan. |
| 008 | [Chisel](seleccion.md#juego-008) | Recortar el terreno que se recorre: cada perforación cambia el contorno y el camino disponible. | Sistema nuevo: Terreno recortable y colisión que se reconstruye; locomoción por contorno, diferente de plataforma fija. |
| 009 | [Fault Line](seleccion.md#juego-009) | Plegado o recomposición del escenario para conectar posiciones. | Sistema nuevo: Transformación de segmentos y recálculo de colisiones/rutas; la base lateral sola no conserva su núcleo. |
| 010 | [Head Case](seleccion.md#juego-010) | Locomoción adherida al contorno con cambio de gravedad/orientación. | Sistema nuevo: Control y colisión por orientación local, adhesión a superficies y gravedad variable. |
| 011 | [Flip and Go](seleccion.md#juego-011) | Conmutación entre escenario y reflejo. | Sistema nuevo: Dos configuraciones reflejadas con transiciones y validación de posiciones seguras. |
| 012 | [Level Editor](seleccion.md#juego-012) | Editor de recorrido integrado en la partida. | Sistema nuevo: Constructor durante juego, catálogo pequeño, ocupación y prueba de rutas; luego puede reutilizar física lateral. |
| 020 | [Gummo](seleccion.md#juego-020) | Cambiar la flotabilidad del protagonista para variar su locomoción; no retirar obstáculos de un ascenso automático. | Sistema nuevo: Locomoción con flotabilidad/estados físicos asistidos; la base de saltos pequeños sola no reproduce su función. |
| 022 | [Hanna In A Choppa](seleccion.md#juego-022) | Vuelo multidireccional con inercia y tareas físicas. | Sistema nuevo: Vuelo/inercia, sustentación y aterrizaje asistido; el vehículo con paradas actual no cubre movimiento aéreo. |
| 023 | [Choo Choons](seleccion.md#juego-023) | Secuenciador musical espacial activado por un recorrido. | Sistema nuevo: Editor por casillas y secuenciación de eventos sonoros al recorrer una pista; motor musical nuevo. |
| 026 | [Eggy Car](seleccion.md#juego-026) | Transporte de carga inestable con control de aceleración. | Sistema nuevo: Vehículo lateral con pendientes y carga física; el motor de paradas puede aportar destinos, pero no esta simulación. |
| 027 | [Free Gear](seleccion.md#juego-027) | Carrera de adelantamiento con marchas y nitro limitado. | Sistema nuevo: Motor de carreras 2D con progreso de pista, adelantamiento y estados de rendimiento; vehículo de entregas no basta. |
| 028 | [Moto X3M](seleccion.md#juego-028) | Conducción de rampas con equilibrio y orientación en el aire. | Sistema nuevo: Vehículo lateral con rotación y contacto de ruedas; distinto de vehículo con paradas y del salto del protagonista. |
| 029 | [Mega Miner](seleccion.md#juego-029) | Excavación con capacidad y combustible: salir, recoger y retornar. | Sistema nuevo: Cuadrícula excavable, inventario/capacidad y ruta de regreso; no confundir excavación lateral con laberinto cenital fijo. |
| 032 | [Bloxorz](seleccion.md#juego-032) | Rodar una pieza alargada: orientación y huella de ocupación. | Sistema nuevo: Tablero de pieza orientada y ocupación variable. |
| 033 | [Factory Balls](seleccion.md#juego-033) | Aplicar transformaciones ordenadas con máscaras de protección. | Sistema nuevo: Editor de estados, transformaciones y máscaras. |
| 034 | [Civiballs](seleccion.md#juego-034) | Liberar péndulos cortando sus sujeciones. | Sistema nuevo: Puzle de sujeciones, péndulos y receptores. |
| 035 | [Cover Orange](seleccion.md#juego-035) | Construir un refugio por colocación de cuerpos físicos. | Sistema nuevo: Puzle de colocar coberturas y probar colisiones. |
| 036 | [Amigo Pancho](seleccion.md#juego-036) | Preparar un ascenso autónomo retirando obstáculos; no controlar directamente la flotación del protagonista. | Sistema nuevo: Puzle de flotación, apoyos y eliminación de obstáculos. |
| 037 | [Castle Tales](seleccion.md#juego-037) | Eliminar apoyos completos para alterar el equilibrio; no cortar la forma de un cuerpo ni soltar una cadena. | Sistema nuevo: Puzle de cuerpos apilados y eliminación de apoyos. |
| 038 | [Draw Parking](seleccion.md#juego-038) | Dibujar una orden de recorrido que sigue un vehículo; la línea es una ruta, no un suelo físico. | Sistema nuevo: Editor de rutas y seguimiento automático; no es el motor de conducción manual. |
| 039 | [Construct a Bridge](seleccion.md#juego-039) | Construir una estructura portante y someterla a carga. | Sistema nuevo: Editor de nodos y barras con prueba estructural. |
| 040 | [Liquid Measure](seleccion.md#juego-040) | Distribuir flujo por una red con capacidades. | Sistema nuevo: Red de flujo, capacidades y simulación por unidades. |
| 041 | [Liquid Sort](seleccion.md#juego-041) | Ordenar contenidos apilados mediante trasvases restringidos. | Sistema nuevo: Tablero de pilas y transferencias con capacidad. |
| 042 | [Pin Cracker](seleccion.md#juego-042) | Deducir una combinación secreta a partir de intentos y pistas; el valor oculto cambia entre retos. | Sistema nuevo: Tablero de código secreto con retroalimentación verificable. |
| 043 | [Color Link](seleccion.md#juego-043) | Conectar parejas por caminos mutuamente excluyentes. | Sistema nuevo: Tablero de rutas, ocupación y validación de cruces. |
| 044 | [Gummy Blocks](seleccion.md#juego-044) | Empaquetar poliformas y vaciar líneas completas. | Sistema nuevo: Tablero de encaje de formas y detección de líneas. |
| 045 | [2048 Number Match](seleccion.md#juego-045) | Fusionar cantidades siguiendo una cadena numérica. | Sistema nuevo: Tablero de cadenas, fusión numérica y generación de piezas. |
| 046 | [Classic Nonogram](seleccion.md#juego-046) | Deducir casillas con restricciones numéricas de filas y columnas; no descubrir posiciones por disparos o consultas. | Sistema nuevo: Tablero de restricciones por filas y columnas. |
| 047 | [Battle Ships](seleccion.md#juego-047) | Buscar una forma oculta consultando coordenadas; cada consulta devuelve información de una posición. | Sistema nuevo: Tablero oculto de coordenadas y pistas de búsqueda. |
| 048 | [Checkers](seleccion.md#juego-048) | Mover por diagonales y encadenar saltos reglados por turnos. | Sistema nuevo: Tablero de turnos, movimientos legales y saltos encadenados. |
| 049 | [Connect Four](seleccion.md#juego-049) | Alinear por turnos con caída a la casilla libre inferior. | Sistema nuevo: Tablero de turnos, caída por columnas y detección de alineaciones. |
| 050 | [Animal Words](seleccion.md#juego-050) | Reconstruir una unidad del lenguaje colocando sus componentes. | Sistema nuevo: Tablero de unidades móviles, espacios y reproducción de audio. |
| 051 | [Line Rider](seleccion.md#juego-051) | Dibujar terreno: su pendiente y contacto determinan el recorrido físico posterior. | Sistema nuevo: Editor de terreno por líneas y simulación de trayectorias. |
| 052 | [Bloons](seleccion.md#juego-052) | Lanzamiento balístico con presupuesto de proyectiles. | Sistema nuevo: Lanzador de ángulo y potencia, trayectoria y receptores. |
| 053 | [Laser Cannon](seleccion.md#juego-053) | Resolver un puzle fijo provocando efectos indirectos del escenario; no consiste en abrir una ruta mientras se camina. | Sistema nuevo: Puzle fijo de puntería, mecanismos y reacciones encadenadas; reflejos solo si la regla se comprueba aparte. |
| 054 | [Happy Filled Glass](seleccion.md#juego-054) | Dibujar un cauce para dirigir una masa de líquido. | Sistema nuevo: Editor de cauces y flujo; distinto de tuberías prefijadas. |
| 055 | [Domino Adventure](seleccion.md#juego-055) | Prolongar una cadena por coincidencia de extremos. | Sistema nuevo: Tablero de cadena abierta, extremos y turnos. |
| 057 | [Blacksmith Lab](seleccion.md#juego-057) | Producción incremental y reinversión de recursos. | Sistema nuevo: Gestor de recetas, cantidades, mejoras y ciclos de producción. |
| 058 | [Endless Siege](seleccion.md#juego-058) | Defensa de ruta mediante cobertura y combinación de estaciones. | Sistema nuevo: Motor de rutas, estaciones, alcances, oleadas y presupuesto. |
| 060 | [Friv Halloween Memory](seleccion.md#juego-060) | Emparejar información oculta recordando su posición. | Sistema nuevo: Tablero de cartas ocultas, memoria de estado y relaciones de pareja. |
| 061 | [Chat Noir](seleccion.md#juego-061) | Reducir rutas de escape mediante bloqueo progresivo. | Sistema nuevo: Tablero por turnos, bloqueo y búsqueda de caminos. |
| 062 | [Ice Breaker](seleccion.md#juego-062) | Cortar un cuerpo en fragmentos cuya caída resuelve el puzle; no perforar el terreno sobre el que camina el protagonista. | Sistema nuevo: Corte de polígonos, cuerpos resultantes y física de contacto. |
| 063 | [Christmas Sliding Puzzle](seleccion.md#juego-063) | Reordenar una cuadrícula por desplazamientos locales. | Sistema nuevo: Tablero de permutación local y condiciones de desplazamiento. |
| 064 | [Furiosity](seleccion.md#juego-064) | Descubrir qué regla transforma las casillas mediante experimentos; lo desconocido es la operación, no un código secreto. | Sistema nuevo: Tablero de reglas variables, historial de pruebas y predicciones. |
| 065 | [Tower Blaster](seleccion.md#juego-065) | Mantener una estructura ordenada insertando valores. | Sistema nuevo: Tablero de inserción o reemplazo con restricciones de orden. |
| 066 | [Mechanics](seleccion.md#juego-066) | Acoplar elementos que transmiten rotación. | Sistema nuevo: Red de acoplamiento y transmisión de movimiento. |

## Reglas comunes para las adaptaciones

La confirmación por parada debe verse antes de completarse y cancelarse al alejarse; pasar por encima de una opción no cuenta como respuesta. En plataformas, no se exige responder durante un salto. Cada versión debe permitir corregir una decisión sin reiniciar todo el nivel. La consigna se escucha y se puede repetir; los objetos muestran relaciones grandes y comprensibles. El contenido se comprueba con una regla independiente del código generado.

«Sin motor» no significa que la referencia sea inadecuada: señala trabajo adicional para preservar su idea. No conviene llamar adaptación de ese juego a un recorrido que haya eliminado precisamente su mecánica diferencial. Friv Typing y Cycle Sprint quedaron fuera por solapamiento de las adaptaciones, no por falta de valor como juegos.

## Fuentes y límites

Las fuentes de las reglas originales están enlazadas en cada ficha de [seleccion.md](seleccion.md), incluida su página oficial de Friv y las instrucciones complementarias consultadas. La [lista A–Z oficial](https://www.friv.com/gameslist.html) y la [portada de Friv](https://www.friv.com/) sustentan el inventario; el conteo y las categorías se explican en [lista-friv.md](lista-friv.md). La disponibilidad de motores procede del contexto de Luis. La clasificación y las ampliaciones son análisis de diseño; no se ejecutaron juegos ni se probaron las adaptaciones.

**No encontrado:** esfuerzo real de construcción, compatibilidad técnica de cada ampliación y resultado de pruebas con niños. Los detalles del original que no pudieron confirmarse están marcados en las fichas; no se completan aquí por suposición.
