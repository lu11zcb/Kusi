# Sonidos del laberinto

Autor: **Kenney** (<https://kenney.nl/>). Paquetes locales **Impact Sounds 1.0**
y **Interface Sounds 1.0**, distribuidos bajo **CC0 1.0**. Se incluyen las licencias
originales como `LICENCIA-KENNEY-IMPACT.txt` y `LICENCIA-KENNEY-INTERFACE.txt`.

Los siete archivos son copias exactas de los originales, sin conversiones,
mezclas ni modificaciones. Rutas de origen relativas a `juego/arte/sonidos/origen/`:

| Archivo público | Origen | Uso y elección |
|---|---|---|
| `paso-cuy.ogg` | `kenney_impact-sounds/Audio/footstep_carpet_000.ogg` | Apoyo suave y breve de 0,144 s; evita una pisada agresiva. |
| `paso-zorro.ogg` | `kenney_impact-sounds/Audio/footstep_wood_000.ogg` | Golpe grave de 0,248 s para un apoyo de mayor peso, a volumen bajo. |
| `fruta-pop.ogg` | `kenney_interface-sounds/Audio/drop_003.ogg` | Pop corto de 0,188 s para recoger la fruta correcta. |
| `fruta-boing.ogg` | `kenney_interface-sounds/Audio/bong_001.ogg` | Tono elástico y grave de 0,120 s para la fruta equivocada. |
| `cuy-ay.ogg` | `kenney_interface-sounds/Audio/error_006.ogg` | Quejido sintético de 0,500 s para el contacto con el zorro; no es una voz humana. |
| `puerta.ogg` | `kenney_interface-sounds/Audio/open_004.ogg` | Apertura corta de 0,323 s, para acompañar la puerta. |
| `nivel-fanfarria.ogg` | `kenney_interface-sounds/Audio/confirmation_004.ogg` | Confirmación musical de 0,490 s al terminar cada nivel. |

Del paquete completo de Kenney solo se versionan estos siete originales y las dos
licencias; los paquetes enteros se pueden volver a bajar de <https://kenney.nl/>.

La duración y la intensidad se comprobaron decodificando los archivos con Web
Audio local. El controlador usa volúmenes entre 0,08 y 0,14; los pasos tienen un
intervalo mínimo compartido y no se superponen. `?vida=0` desactiva esta capa.
