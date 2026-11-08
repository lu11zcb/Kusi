# Qué entrega cada juego nuevo

## 1. La carpeta de trabajo

El trabajador crea una carpeta por trabajo en `juego/taller/trabajos/<trabajo>/`.
Es una carpeta de esta Mac y **no se sube a GitHub**: los juegos que crea el
taller los guarda Kusi, cada uno con su propuesta, su procedencia y su
revisión.

```text
<trabajo>/
  trabajo.json        lo que llegó del buzón: la propuesta aprobada, sin datos de niños
  plan.md             el plan del supervisor
  juego/              el juego (sección 2)
  piezas/             las piezas nuevas, pendientes (sección 7)
  revision/           los informes y las capturas del revisor
  evidencia.json      tiempo, intentos y costo estimado (sección 8)
```

## 2. El juego

Sigue la misma forma que [el laberinto](../juegos/laberinto/README.md):

```text
juego/
  juego.js                  la ficha del juego (sección 3)
  README.md                  qué es, cómo se juega, sus reglas y qué piezas usa
  escenas/Escena<Nombre>.js la escena de Phaser
  logica/                   las reglas del juego, sin Phaser
  datos/validar<Nombre>.js  revisa que un guion se pueda jugar
  guion-ejemplo.json        un guion completo de ejemplo (sección 4)
  pruebas/                  pruebas de la lógica y del validador (node --test)
```

Si las necesita, agrega `interfaz/`, `efectos/` o `dibujos/`, como el
laberinto.

| Archivo | Qué exige el revisor |
| --- | --- |
| `juego.js` | Está completo y su familia no se repite en la biblioteca. |
| `README.md` | Explica el juego en español sencillo, sus reglas, sus niveles y sus piezas. |
| `escenas/` | Usa el protagonista del reproductor, Kusi con su voz, Escuchar, Ayuda, el botón de sonido y los avisos. |
| `logica/` | Son funciones sin Phaser, que se pueden probar solas, como `reglasLaberinto.js`. |
| `datos/validar<Nombre>.js` | Devuelve `{ valido, errores }`: acepta el guion de ejemplo y rechaza un guion roto diciendo por qué. |
| `guion-ejemplo.json` | Pasa su validador y se puede terminar. |
| `pruebas/` | Pasan con `node --test`. |

## 3. La ficha `juego.js` (contrato propuesto)

La ficha le dice al reproductor cómo abrir el juego. **Está pendiente de
programar**, junto con el registro de la sección 6.

```js
// Ficha del juego: lo que el reproductor necesita para abrirlo.
import { EscenaMemoria } from './escenas/EscenaMemoria.js'
import { validarMemoria } from './datos/validarMemoria.js'

export default {
  // La misma familia que trae el guion. Minúsculas, sin tildes y con guion bajo.
  familia: 'memoria',
  nombre: 'La memoria de Kusi',
  // La clave de la escena en Phaser es la familia.
  escena: EscenaMemoria,
  // Recibe el guion y devuelve { valido, errores }.
  validar: validarMemoria,
  // Los dibujos que el juego carga además de lo común (protagonista, Kusi,
  // interfaz y sonidos). Son ids del catálogo o piezas nuevas de este trabajo.
  piezas: ['fresa', 'olla-de-barro'],
}
```

## 4. El guion

Es un guion `kusi-paquete/0` con la familia del juego. Tiene los mismos campos
comunes que el guion del laberinto, y cada juego agrega los suyos dentro de
cada reto.

| Campo | Qué es |
| --- | --- |
| `formato` | siempre `kusi-paquete/0` |
| `familia` | la familia del juego |
| `titulo`, `curso`, `meta` e `historia` | lo que el docente ve del juego |
| `orientacion` | siempre `horizontal` |
| `consigna` | la consigna general |
| `retos` | de 1 a 5 niveles. Cada uno tiene `id`, `consigna`, exactamente 2 `ayudas` y los campos propios del juego. |
| `cierre` | `{ mensaje }`: lo que dice Kusi al terminar |

La consigna y cada ayuda tienen 90 caracteres como máximo. Los objetos se
nombran con su id del catálogo (`platano`, `pina`).

## 5. Los avisos de la partida

El juego avisa lo que pasa con `crearPartidaLaberinto` y `avisarPartida` (hoy
en `juegos/laberinto/logica/partidaLaberinto.js`). El panel, la app y Spring
**solo aceptan estos avisos**:

| Aviso | Cuándo | Campos |
| --- | --- | --- |
| `listo` | el primer nivel está en pantalla | `familia`, `nivel` |
| `inicio` | el niño hace su primera acción | `nivel` |
| `accion` | cada acción que cuenta (acertar o equivocarse) | `nivel`, `objeto` y `correcto`, o lo propio del juego |
| `ayuda` | el niño pide una ayuda | `nivel` y `ayuda` (1 o 2) |
| `reto_completado` | termina un nivel | `nivel` |
| `fin` | termina el último nivel (la app cierra el juego) | `niveles` |
| `fallo` | el guion no se pudo abrir (lo avisa el reproductor) | `motivo` |

`nivel` va de 1 a 5 y cada aviso ocupa como máximo 8192 caracteres. Los avisos
no llevan datos personales.

## 6. Cómo se registra un juego

**Hoy** el reproductor solo abre el laberinto: `kit/reproductor/main.js` y
`kit/reproductor/escenas/EscenaCarga.js` lo importan directamente. Además, el
panel y la app solo aceptan guiones de la familia `laberinto`.

**Propuesta, pendiente de programar** antes del primer juego del taller:

1. Cada juego tiene su ficha `juego.js`.
2. El reproductor busca las fichas en dos lugares: `juegos/*/juego.js` (la
   biblioteca) y `taller/trabajos/*/juego/juego.js` (los juegos del taller en
   esta Mac).
3. La carga lee la `familia` del guion, busca su ficha, lo revisa con su
   `validar`, carga lo común y las `piezas`, y abre su escena con
   `{ paquete, partida }`.
4. Si dos fichas tienen la misma familia, o una ficha está incompleta, el
   reproductor muestra un error y el revisor lo detecta.
5. Para probar un juego del taller se abre
   `http://localhost:5174/?juego=<trabajo>`, que carga su guion de ejemplo.
6. El panel, la app y Spring aceptan la nueva familia.

## 7. Las piezas nuevas

```text
piezas/
  <id>.png                    la pieza preparada (256 × 256 con transparencia, o el fondo)
  origen/<id>-intento-<n>.png lo que entregó la herramienta de imágenes, con fondo blanco
  pedidos.md                  el pedido de cada pieza y de cada corrección
```

- Cada pieza pasa los tres filtros de [revision.md](revision.md).
- Queda **pendiente** hasta que el docente la aprueba. El estado lo guarda
  Kusi.
- Si no pasa después de 2 correcciones, el plan anota qué pieza del kit o qué
  figura simple la reemplaza.

## 8. La evidencia

Cada trabajo guarda `evidencia.json`. El docente no la ve.

```json
{
  "trabajo": "id del trabajo en el buzón",
  "familia": "memoria",
  "resultado": "listo",
  "motivo": null,
  "inicio": "2026-11-05T15:00:00-05:00",
  "fin": "2026-11-05T15:21:00-05:00",
  "segundos": 1260,
  "intentos": { "juego": 2, "piezas": { "olla-de-barro": 1 } },
  "correcciones": [
    { "rol": "revisor", "para": "programador", "motivo": "La ayuda 2 no se mostraba." }
  ],
  "pasos": [
    {
      "rol": "programador",
      "inicio": "2026-11-05T15:02:00-05:00",
      "fin": "2026-11-05T15:12:00-05:00",
      "tokens_entrada": 0,
      "tokens_salida": 0,
      "imagenes": 0,
      "costo_estimado_usd": 0
    }
  ],
  "costo_estimado_usd": 0,
  "como_se_estimo": "tokens e imágenes de cada paso por el precio de lista del modelo usado, a la fecha del trabajo"
}
```

- `resultado` es `listo` o `falló`, y `motivo` explica por qué falló.
- El costo es una **estimación**: en la demo se usan suscripciones, así que se
  calcula con el precio de lista que tendría con claves de API.
- Los pasos nombran **roles**, no programas.

## 9. Lo que se devuelve a Kusi

- `juego/`: el juego, que es lo único que ve el docente.
- `piezas/`: las piezas nuevas, pendientes de su aprobación.
- `evidencia.json`, `plan.md` y `revision/`: se guardan por dentro.
