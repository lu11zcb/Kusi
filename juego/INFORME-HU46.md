# Informe de limpieza HU46

La limpieza está implementada y preparada en el índice de Git, exclusivamente dentro de `juego/`. **No hay commit ni push:** falta la ejecución del navegador exigida antes del commit y el entorno bloquea el puerto local. El pull inicial y la configuración global del autor también quedaron bloqueados.

## Archivos borrados

Se retiran 53 archivos. La búsqueda de dependencias incluyó el catálogo dinámico, los manifiestos, los fixtures, las herramientas y los JSON de vista previa. Antes de crear este informe, ninguno de los archivos retirados seguía nombrado por los 134 archivos de texto restantes de juego/.

### Código y datos (12)

- `src/escenas/EscenaMercado.js`
- `src/interfaz/VentanaPuesto.js`
- `src/interfaz/Joystick.js`
- `src/interfaz/Cartel.js`
- `src/logica/compras.js`
- `src/logica/piso.js`
- `src/logica/nombres.js`
- `src/datos/plaza.json`
- `src/dibujos/escenario.js`
- `src/datos/generarPaquetePrueba.js`
- `src/datos/validarPaquete.js`
- `public/paquete-ejemplo.json`

### Imágenes públicas (38)

- `public/dibujos/alfajor.png`
- `public/dibujos/alpaca.png`
- `public/dibujos/avena.png`
- `public/dibujos/caramelo.png`
- `public/dibujos/chocolate.png`
- `public/dibujos/chupetin.png`
- `public/dibujos/condor.png`
- `public/dibujos/cuy-nino-cuadros-v4.png`
- `public/dibujos/cuy-nino-espaldas.png`
- `public/dibujos/cuy-nino-frente.png`
- `public/dibujos/cuy-nino.png`
- `public/dibujos/fondo-plaza.png`
- `public/dibujos/galleta.png`
- `public/dibujos/gallito-de-las-rocas.png`
- `public/dibujos/gato.png`
- `public/dibujos/harina.png`
- `public/dibujos/huevo.png`
- `public/dibujos/kusi-espaldas.png`
- `public/dibujos/leche.png`
- `public/dibujos/loro.png`
- `public/dibujos/mantequilla.png`
- `public/dibujos/mermelada.png`
- `public/dibujos/miel.png`
- `public/dibujos/oso-de-anteojos.png`
- `public/dibujos/oveja.png`
- `public/dibujos/paloma.png`
- `public/dibujos/pan.png`
- `public/dibujos/perro.png`
- `public/dibujos/puesto-dulces.png`
- `public/dibujos/puesto-frutas.png`
- `public/dibujos/puesto-granja.png`
- `public/dibujos/puesto-granos.png`
- `public/dibujos/puesto-pan.png`
- `public/dibujos/puesto-verduras.png`
- `public/dibujos/queso.png`
- `public/dibujos/vicuna.png`
- `public/dibujos/vizcacha.png`
- `public/dibujos/yogur.png`

### Pruebas (2)

- `pruebas/compra.spec.js`
- `pruebas/paquete.spec.js`

### Arte (1)

- `arte/cuy/origen/cuy-espalda-3-cuadros.png`

### Herramientas y sonidos

No se borró ninguna herramienta: todas las existentes pertenecen al laberinto o a sus animaciones. Se conservan los siete sonidos públicos, sus originales y licencias.

## Archivos modificados

| Archivo dentro de juego/ | Cambio |
| --- | --- |
| `HU46-LABERINTO.md` | Corrige la entrada sin parámetros, el puente disponible por defecto, las referencias al juego retirado y el estado actual de la suite. |
| `README.md` | Describe los tres niveles, controles, parámetros, guiones por mensaje, catálogo, recursos y comandos del laberinto. |
| `herramientas/animaciones/LEEME.md` | Corrige el uso y escala del zorro, identifica v6 como atlas activo y documenta qué fuentes reemplazadas se retiraron. |
| `index.html` | Título «Kusi · El laberinto». |
| `playwright.config.js` | Actualiza el comentario de la escena que abren las pruebas; conserva la configuración. |
| `pruebas/animacion.spec.js` | Sustituye el inicio con «Vamos», el recorrido de la plaza y la pileta por el inicio directo, un mapa controlado de cuatro vistas y un muro del laberinto; conserva los contratos del Sprite real. |
| `pruebas/asustado.spec.js` | Conserva las pruebas reales; al abrir / ahora usan el laberinto. Corrige el comentario de su escena. |
| `pruebas/feliz.spec.js` | Conserva las pruebas reales; al abrir / ahora usan el laberinto. Corrige el comentario de la hoja. |
| `pruebas/hu46Profundidad.spec.js` | Añade detección de errores de consola y respuestas HTTP fallidas en los tres niveles, tamaños y modos de vida ya cubiertos. |
| `pruebas/logica/partidaLaberinto.test.js` | Actualiza el comentario sobre el registro de avisos. |
| `pruebas/logica/zorrosLaberinto.test.js` | Cambia «sentidos opuestos» por «direcciones contrarias» para satisfacer la búsqueda literal solicitada; no cambia la prueba. |
| `pruebas/mensajes.spec.js` | Reemplaza la expectativa de plaza sin puente por la del laberinto por defecto que acepta un fixture mediante postMessage. Conserva los casos ?paquete=mensaje y el alias. |
| `pruebas/renderizador.spec.js` | Comprueba /, ?renderizador=canvas, ?nivel=2 y ?nivel=3&vida=0 como entradas directas del laberinto. Conserva AUTO, alias y validación de niveles. |
| `pruebas/tactil.spec.js` | Adapta el control descartado a dos dedos reales: un toque elige una fruta y el arrastre del otro se ignora; comprueba llegada, animación, ayuda y cambio de tamaño. |
| `src/dibujos/dibujos.js` | Retira selección, texturas y figuras exclusivas del juego anterior; conserva las claves dinámicas del guion. No solicita PNG inexistentes para la mano ni los iconos de clase que se generan por código. |
| `src/dibujos/personajes.js` | Conserva la figura frontal de Kusi y retira vendedores, vistas traseras y las figuras estáticas del jugador retirado. |
| `src/dibujos/productos.js` | Conserva las figuras de los ocho alimentos, usadas también por los iconos de clase. Retira los otros alimentos, dinero, cartera e iconos del juego anterior. |
| `src/escenas/EscenaCarga.js` | Carga y valida únicamente el laberinto por defecto; mantiene espera de mensajes, manifiestos, nivel inicial, sonidos condicionados a vida y recuperación de errores. |
| `src/escenas/EscenaLaberinto.js` | Ajusta el título y comentarios del puente y de las lecturas de prueba; no cambia la lógica de la partida. |
| `src/interfaz/piezas.js` | Retira fijarEnPantalla, que solo usaba la interfaz eliminada; conserva botones y globos. |
| `src/logica/avisos.js` | Describe los avisos actuales del laberinto; conserva su funcionamiento. |
| `src/logica/parametrosLaberinto.js` | Elimina un comentario que describía una selección de renderizador ya retirada. |
| `src/logica/zorrosLaberinto.js` | Sustituye «sentidos opuestos» por «direcciones contrarias» en un comentario; ninguna lógica cambia. |
| `src/main.js` | Registra únicamente carga y laberinto, crea siempre el puente y aplica la configuración existente del laberinto a /: Canvas, EXPAND y smoothStep desactivado. |
| `src/medidas.js` | Retira las dimensiones, movimiento, colisiones y profundidades exclusivos del juego anterior; conserva tamaño base, colores y tipografía. |
| `src/mensajes/puenteGuion.js` | Corrige el comentario de leerPuente: el puente se crea siempre en el arranque; conserva el protocolo. |
| `INFORME-HU46.md` (nuevo) | Inventario, decisiones y comprobaciones de esta limpieza. |

## Conservados por dependencia o duda

- `src/dibujos/productos.js` no se elimina: el laberinto y sus iconos de clase importan sus figuras de alimentos.
- Se conservan `fresa.png`, `platano.png`, `mango.png`, `mandarina.png`, `pina.png`, `zanahoria.png`, `papa.png` y `choclo.png`, aunque un ejemplo no utilice todos: el catálogo del guion los admite.
- `cuy-nino-caminar-v1.png` y los atlas `cuy-nino-cuadros-v1.png`, `v2.png`, `v3.png` y `v5.png` se conservan porque los nombran herramientas, pruebas y reportes de vista previa. V6 sigue siendo el atlas servido al jugador.
- `cuy-parpadeo-v1.png` y su JSON se conservan porque siguen en el flujo y las pruebas de animación.
- Por la regla conservadora solicitada, se mantienen `cuy.png`, `kusi.png`, `llama.png`, `palta.png`, `tomate.png` y `zorro.png`: sus claves o nombres aparecen en el laberinto o sus pruebas, aunque varias menciones son etiquetas o ejemplos de validación y no una descarga de esa imagen. No asumí que eso autorizaba borrarlas.
- El original `cuy-espalda-3-cuadros-v2.png` se conserva: lo usa el armado de espalda. Su versión anterior y el atlas v4 carecían de referencias en JSON o herramientas y se retiraron.
- `renderizador.js` y `voz.js` se conservan sin cambios porque los usa el laberinto.

## Restos fuera de juego/

No se modificó ningún archivo de estas rutas.

- `edu-api/src/main/resources/paquete-ejemplo.json`: ejemplo antiguo con historia, plaza y recursos del mercado.
- `web/src/docente/SolicitarPropuesta.tsx:65`: el tema sigue mostrando «sumar y restar al comprar en el mercado». Indicación pendiente para Jesús: cambiarlo a «patrones con frutas». No se envió ningún mensaje externo.
- `web/tests/revision-propuesta.test.mjs`: historia y expectativas de compras.
- `docs/AVANCE_20_OCTUBRE.md` y `docs/evidencias/20-octubre/propuesta-ia-real.json`: referencias históricas.
- `docs/CONTRATO_PROPUESTAS_IA.md` y `edu-api/README.md`: menciones que explican que ya se ofrece únicamente el laberinto; son historia y documentación de la transición.
- Pruebas de edu-api: `ConstructorGuionTest.java`, `ValidadorLaberintoTest.java`, `GeneradorGuionIaTest.java`, `GeneradorPropuestasIaTest.java`, `ValidadorPropuestaTest.java` y `GeneracionesProcesoTest.java`. Algunas conservan historias antiguas; otras usan mercado como valor inválido que debe rechazarse.
- La clase CSS `puesto` en `web/src/App.css`, `web/src/docente/InicioDocente.tsx` y `web/src/administracion/InicioAdministracion.tsx` representa el número de orden de listas, no un recurso del juego descartado.
- `movil/gradle/gradle-daemon-jvm.properties` ya estaba sin seguimiento al comenzar: permanece intacto y fuera del índice.

## Comprobaciones

| Comprobación | Resultado |
| --- | --- |
| git status inicial | main; solo el archivo de Gradle sin seguimiento. |
| git pull origin main | No pudo conectar: Could not resolve host: github.com. No se pudo confirmar que la copia remota siga igual. |
| git config --global user.name / user.email | Ambos fallaron: no se puede escribir /Users/luis/.gitconfig, Operation not permitted. |
| npm run prueba:logica | **158/158 pasan**, cero fallos. |
| npm run build | **Pasa**, compilación de producción creada. |
| npx playwright test | **Bloqueado antes de ejecutar las pruebas**: Vite recibe listen EPERM en 127.0.0.1:5174. |
| npx playwright test --list | **Pasa**: descubre 124 pruebas en 23 archivos. Esto no significa que se hayan ejecutado. |
| Búsqueda literal solicitada en src, public y pruebas | **Sin coincidencias**; grep devuelve 1, como corresponde cuando no encuentra ninguna. |
| Recursos del catálogo, guiones, atlas y audio | **26 rutas existentes**, incluyendo los tres guiones y los siete sonidos; comprobación local sin HTTP. |
| Figuras de reemplazo | **Idénticas** operaciones de lienzo frente a HEAD para Kusi y los ocho alimentos. |
| git diff --check | **Sin errores** de espacios o formato. |
| Abrir localhost:5174 y jugar los tres niveles | **Pendiente**: el entorno no permite iniciar el servidor. |
| Consola y red sin 404 durante el juego | **Pendiente en navegador**. Los recursos existen y las pruebas de profundidad ahora detectan HTTP fallidos y errores de consola. |
| ?paquete=mensaje con fixtures por postMessage | Se conserva y adapta la cobertura de mensajes; **pendiente su ejecución en navegador** por el mismo bloqueo. |
| Pruebas adicionales de herramientas de animación | No ejecutables con el Python disponible: falta Pillow (No module named PIL). No se alteraron las herramientas ni sus fuentes conservadas. |
| git add -A juego/ y revisión del índice | **Pasa**: todas las rutas preparadas comienzan con juego/. Ninguna ruta externa está preparada. |

## Commit y autor

No se creó commit porque todavía no pasan todas las comprobaciones obligatorias. Por eso no hay hash nuevo, no se ejecutó push y no corresponde verificar un nuevo git log -1.

La identidad efectiva actual sigue siendo `Luis <luis@MacBook-Air-de-Luis.local>`; no es la solicitada. Antes de crear el commit, autor y committer deben quedar como:

```text
lu11zcb <luiscb.once@gmail.com> | lu11zcb <luiscb.once@gmail.com>
```

Mensaje previsto, pendiente de poder completar las comprobaciones:

```text
refactor(HU46): quitar el mercado y dejar solo el laberinto

Quita la escena, los datos, las imágenes y las pruebas exclusivas del mercado.
Abre el laberinto por defecto y conserva los guiones por mensaje.
```

El mensaje previsto no tiene coautorías, texto de generación ni atribuciones adicionales.
