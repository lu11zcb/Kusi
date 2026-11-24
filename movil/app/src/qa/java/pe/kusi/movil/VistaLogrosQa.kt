package pe.kusi.movil

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch

private val accesoDeMuestra = EstadoEntradaKusi(cuenta = null, validado = true)
private val bibliotecaDeMuestra = EstadoBibliotecaInfantil(
    listOf(
        AventuraInfantil(
            id = "feria-qa",
            titulo = "La feria de las cantidades",
            curso = Curso.MATEMATICA.titulo,
            meta = "Cuenta los productos de la feria.",
            consigna = "Escucha el pedido y elige la cantidad.",
            nuevo = true,
        ),
    ),
)
private val cuyDeMuestra = AparienciaCuy(
    PelajeCuy.CARAMELO,
    mapOf(CategoriaCuy.CABEZA to PiezaCuy.SOMBRERO, CategoriaCuy.ROPA to PiezaCuy.BUFANDA),
)
private val sinAvance = EstadoLogrosInfantil(
    resumen = ResumenLogrosInfantil(0, 0, emptyList()),
    ranking = RankingSalonInfantil(emptyList(), misPuntos = 0),
    metaSalon = MetaSalonInfantil(puntosDelSalon = 0, objetivo = 400),
)
private val conAvance = EstadoLogrosInfantil(
    ResumenLogrosInfantil(
        puntos = 33,
        retos = 6,
        cursos = listOf(
            ProgresoCursoInfantil("Matemática", 20, 4),
            ProgresoCursoInfantil("Comunicación", 13, 2),
        ),
    ),
    ranking = RankingSalonInfantil(
        podio = listOf(
            PuestoSalonInfantil("Lucía", 72, pelaje = 1, accesorios = listOf("FLOR", "POLO")),
            PuestoSalonInfantil("Inti", 54, pelaje = 2, accesorios = listOf("GORRA_CELESTE")),
            PuestoSalonInfantil("Mateo", 33, esMiPuesto = true, pelaje = 3, accesorios = listOf("SOMBRERO", "BUFANDA")),
        ),
        misPuntos = 33,
    ),
    metaSalon = MetaSalonInfantil(puntosDelSalon = 235, objetivo = 400),
)
private val fueraDelPodio = conAvance.copy(
    ranking = conAvance.ranking?.let { ranking ->
        ranking.copy(podio = ranking.podio.take(2) + PuestoSalonInfantil("Sami", 42, accesorios = listOf("BOINA")))
    },
)

private enum class CasoLogros(val etiqueta: String, val estado: EstadoLogrosInfantil) {
    EN_PODIO("En podio", conAvance),
    FUERA("Fuera", fueraDelPodio),
    SIN_PUNTOS("Sin puntos", sinAvance),
}

class VistaLogrosQa : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent { TemaKusi { DisenoDeLogros() } }
    }
}

@Composable
private fun DisenoDeLogros() {
    var caso by rememberSaveable { mutableStateOf(CasoLogros.EN_PODIO) }
    var seccion by rememberSaveable { mutableIntStateOf(2) }
    var curso by rememberSaveable { mutableStateOf<String?>(null) }
    var ayuda by rememberSaveable { mutableStateOf(false) }
    var vozActiva by rememberSaveable { mutableStateOf(true) }
    var editandoCuy by rememberSaveable { mutableStateOf(false) }
    var apariencia by rememberSaveable(stateSaver = AparienciaCuySaver) { mutableStateOf(cuyDeMuestra) }
    val avisos = remember { SnackbarHostState() }
    val alcance = rememberCoroutineScope()
    val voz = remember(avisos, alcance) {
        VozKusi(disponible = true, hablar = { mensaje -> alcance.launch { avisos.showSnackbar(mensaje) } })
    }

    fun abrir(seleccion: Int) {
        seccion = seleccion
        curso = null
    }
    BackHandler(seccion == 1) {
        if (curso != null) curso = null else abrir(2)
    }
    BackHandler(seccion == 3) {
        if (editandoCuy) editandoCuy = false else abrir(2)
    }
    Scaffold(snackbarHost = { SnackbarHost(avisos) }) { margen ->
        if (editandoCuy) {
            Box(Modifier.fillMaxSize().padding(margen)) {
                CreaTuCuy(apariencia, voz, vozActiva, editando = true, volver = { editandoCuy = false }) {
                    apariencia = it
                    editandoCuy = false
                }
            }
            return@Scaffold
        }
        Column(Modifier.fillMaxSize().padding(margen), horizontalAlignment = Alignment.CenterHorizontally) {
            if (seccion == 2) {
                key(caso) {
                    LogrosEstudiante(
                        accesoDeMuestra, caso.estado, voz, vozActiva = vozActiva,
                        ayuda = { ayuda = true }, comprobar = {}, recargar = null,
                        abrirCursos = { abrir(1) }, apariencia = apariencia, modifier = Modifier.weight(1f),
                    )
                }
            } else if (seccion == 1) {
                CursosEstudiante(
                    curso, { curso = it }, accesoDeMuestra, bibliotecaDeMuestra,
                    elegir = { alcance.launch { avisos.showSnackbar("Aventura de ejemplo") } },
                    recargar = null, comprobar = {}, voz = voz, vozActiva = vozActiva,
                    ayuda = { ayuda = true }, modifier = Modifier.weight(1f),
                )
            } else {
                MiCuyEstudiante(
                    "Mateo", apariencia, voz, vozActiva, { vozActiva = it }, { editandoCuy = true },
                    ayuda = { ayuda = true },
                    salir = { alcance.launch { avisos.showSnackbar("Cierre de sesión de prueba") } },
                    modifier = Modifier.weight(1f),
                )
            }
            BarraDelEstudiante(seccion, apariencia, pestanasHabilitadas = 1..3, abrir = ::abrir)
        }
    }
    if (ayuda) AlertDialog(
        onDismissRequest = { ayuda = false },
        title = { Text(if (seccion == 3) "Mi cuy" else "Ejemplos de Logros") },
        text = {
            if (seccion == 3) {
                Text("Toca tu cuy para saludarlo o entra al vestidor para cambiar sus accesorios.")
            } else {
            Column(verticalArrangement = Arrangement.spacedBy(5.dp)) {
                for (opcion in CasoLogros.entries) {
                    BotonKusi(
                        opcion.etiqueta, {
                            caso = opcion
                            ayuda = false
                            abrir(2)
                        }, Modifier.fillMaxWidth(), secundario = opcion != caso, compacto = true,
                    )
                }
            }
            }
        },
        confirmButton = { TextButton(onClick = { ayuda = false }) { Text("Cerrar") } },
    )
}

@Preview(name = "Mi cuy", showBackground = true, widthDp = 390, heightDp = 780)
@Composable
private fun VistaPreviaMiCuy() {
    var vozActiva by rememberSaveable { mutableStateOf(true) }
    TemaKusi(oscuro = false) {
        Surface(color = MaterialTheme.colorScheme.background) {
            Column(Modifier.fillMaxSize(), horizontalAlignment = Alignment.CenterHorizontally) {
                MiCuyEstudiante(
                    "Mateo", cuyDeMuestra, VozKusi(false, {}), vozActiva, { vozActiva = it },
                    personalizar = {}, ayuda = {}, salir = {}, modifier = Modifier.weight(1f),
                )
                BarraDelEstudiante(3, cuyDeMuestra, abrir = {})
            }
        }
    }
}

@Preview(name = "Logros en el podio", showBackground = true, widthDp = 390, heightDp = 780)
@Preview(name = "Logros en ventana alta", showBackground = true, widthDp = 580, heightDp = 1030)
@Composable
private fun VistaLogrosConAvance() {
    VistaPreviaLogros(conAvance)
}

@Preview(name = "Logros en un teléfono compacto", showBackground = true, widthDp = 360, heightDp = 640)
@Composable
private fun VistaLogrosFueraDelPodio() {
    VistaPreviaLogros(fueraDelPodio)
}

@Preview(name = "Logros al empezar", showBackground = true, widthDp = 390, heightDp = 780)
@Composable
private fun VistaLogrosAlEmpezar() {
    VistaPreviaLogros(sinAvance)
}

@Composable
private fun VistaPreviaLogros(logros: EstadoLogrosInfantil) {
    TemaKusi(oscuro = false) {
        Surface(color = MaterialTheme.colorScheme.background) {
            Column(Modifier.fillMaxSize(), horizontalAlignment = Alignment.CenterHorizontally) {
                LogrosEstudiante(
                    accesoDeMuestra, logros, VozKusi(false, {}), vozActiva = true,
                    ayuda = {}, comprobar = {}, recargar = null, abrirCursos = {},
                    apariencia = cuyDeMuestra,
                    modifier = Modifier.weight(1f),
                )
                BarraDelEstudiante(2, cuyDeMuestra, abrir = {})
            }
        }
    }
}

@Preview(name = "Matemática con aventura", showBackground = true, widthDp = 390, heightDp = 780)
@Composable
private fun VistaCursoConAventura() = VistaPreviaCurso(Curso.MATEMATICA)

@Preview(name = "Arte y Cultura sin aventuras", showBackground = true, widthDp = 390, heightDp = 780)
@Composable
private fun VistaCursoEnEspera() = VistaPreviaCurso(Curso.ARTE)

@Preview(name = "Personal Social · Sierra, Selva y Costa", showBackground = true, widthDp = 390, heightDp = 780)
@Composable
private fun VistaCursoPersonalSocial() = VistaPreviaCurso(Curso.PERSONAL_SOCIAL)

@Preview(name = "Mis cursos · Iconos", showBackground = true, widthDp = 390, heightDp = 1080)
@Composable
private fun VistaCuadriculaCursos() = VistaPreviaCurso(null)

@Composable
private fun VistaPreviaCurso(curso: Curso?) {
    var seleccionado by rememberSaveable { mutableStateOf(curso?.titulo) }
    TemaKusi(oscuro = false) {
        Surface(color = MaterialTheme.colorScheme.background) {
            Column(Modifier.fillMaxSize(), horizontalAlignment = Alignment.CenterHorizontally) {
                CursosEstudiante(
                    seleccionado, { seleccionado = it }, accesoDeMuestra, bibliotecaDeMuestra,
                    elegir = {}, recargar = null, comprobar = {}, voz = VozKusi(false, {}), vozActiva = true,
                    ayuda = {}, modifier = Modifier.weight(1f),
                )
                BarraDelEstudiante(1, cuyDeMuestra, abrir = {})
            }
        }
    }
}
