package pe.kusi.movil

import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.selection.selectableGroup
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp

private val Tinta = Color(0xFF593629)
@Composable
internal fun InicioReferencia(cuenta: Cuenta, estado: EstadoEntradaKusi, biblioteca: EstadoBibliotecaInfantil,
    voz: VozKusi, elegir: (AventuraInfantil) -> Unit, recargar: (() -> Unit)?, comprobar: () -> Unit, salir: () -> Unit,
    apariencia: AparienciaCuy, seccion: Int, curso: String?, cambiarSeccion: (Int) -> Unit,
    abrirCurso: (String?) -> Unit, personalizar: () -> Unit, ayuda: () -> Unit,
    logros: EstadoLogrosInfantil = EstadoLogrosInfantil(), recargarLogros: (() -> Unit)? = null) {
    val contexto = LocalContext.current
    val preferencias = remember { contexto.getSharedPreferences("kusi_mi_cuy", android.content.Context.MODE_PRIVATE) }
    var vozActiva by rememberSaveable { mutableStateOf(preferencias.getBoolean("voz", true)) }
    val nombre = cuenta.nombre.trim().substringBefore(' ')
    fun cambiarVoz(activa: Boolean) {
        vozActiva = activa
        preferencias.edit().putBoolean("voz", activa).apply()
        if (!activa) voz.callar()
    }
    Column(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        if (seccion == 0) {
            InicioEstudiante(
                nombre, estado, biblioteca, apariencia, voz, vozActiva, elegir, recargar, comprobar,
                abrirCursos = { cambiarSeccion(1) }, abrirMiCuy = { cambiarSeccion(3) }, ayuda = ayuda,
                cambiarVoz = ::cambiarVoz,
                modifier = Modifier.weight(1f),
            )
        } else if (seccion == 1) {
            CursosEstudiante(
                curso, abrirCurso, estado, biblioteca, elegir, recargar, comprobar, voz, vozActiva, ayuda,
                modifier = Modifier.weight(1f).align(Alignment.CenterHorizontally),
            )
        } else if (seccion == 2) {
            LaunchedEffect(cuenta.id, estado.validado, recargarLogros != null) {
                if (estado.validado) recargarLogros?.invoke()
            }
            LogrosEstudiante(
                estado, logros, voz, vozActiva, ayuda, comprobar, recargarLogros,
                abrirCursos = { cambiarSeccion(1) },
                apariencia = apariencia,
                modifier = Modifier.weight(1f).align(Alignment.CenterHorizontally),
            )
        } else if (seccion == 3) {
            MiCuyEstudiante(
                nombre, apariencia, voz, vozActiva, ::cambiarVoz, personalizar, ayuda,
                salir = salir,
                modifier = Modifier.weight(1f).align(Alignment.CenterHorizontally),
                salidaHabilitada = !estado.ocupado,
            )
        }
        BarraDelEstudiante(seccion, apariencia, abrir = cambiarSeccion)
    }
}

private enum class PestañaEstudiante(val etiqueta: String, val dibujo: Int?, val fondo: Color) {
    INICIO("Inicio", R.drawable.kusi_nav_inicio, Color(0xFFFCE6C6)),
    CURSOS("Cursos", R.drawable.kusi_nav_cursos, Color(0xFFEEE3FA)),
    LOGROS("Logros", R.drawable.kusi_nav_logros, Color(0xFFFFEDB8)),
    CUY("Mi cuy", null, Color(0xFFFFE2D3)),
}

@Composable
internal fun BarraDelEstudiante(
    seccion: Int,
    apariencia: AparienciaCuy,
    pestanasHabilitadas: IntRange = PestañaEstudiante.entries.indices,
    abrir: (Int) -> Unit,
) {
    val colores = MaterialTheme.colorScheme
    val oscuro = colores.surface.luminance() < 0.30f
    val activa = if (oscuro) Color(0xFF2E5743) else Color(0xFFDDECC7)
    val bordeActivo = if (oscuro) Color(0xFF90C79F) else Color(0xFF5C844A)
    Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
        Surface(
            Modifier.widthIn(max = 560.dp).fillMaxWidth().padding(start = 9.dp, end = 9.dp, top = 3.dp, bottom = 6.dp),
            shape = RoundedCornerShape(24.dp),
            color = if (oscuro) colores.surface else Color(0xFFFFF5DD),
            border = BorderStroke(1.dp, if (oscuro) colores.outlineVariant else Color(0xFFE8CC97)),
        ) {
            Row(
                Modifier.fillMaxWidth().height(IntrinsicSize.Min).selectableGroup().padding(6.dp),
                horizontalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                PestañaEstudiante.entries.forEachIndexed { indice, pestaña ->
                    val seleccionada = indice == seccion
                    val forma = RoundedCornerShape(18.dp)
                    Column(
                        Modifier.weight(1f).fillMaxHeight().heightIn(min = 69.dp)
                            .clip(forma).background(if (seleccionada) activa else Color.Transparent)
                            .then(if (seleccionada) Modifier.border(1.5.dp, bordeActivo, forma) else Modifier)
                            .selectable(seleccionada, enabled = indice in pestanasHabilitadas, role = Role.Tab) { abrir(indice) }
                            .padding(horizontal = 2.dp, vertical = 4.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center,
                    ) {
                        Box(
                            Modifier.size(51.dp, 42.dp).background(pestaña.fondo, RoundedCornerShape(14.dp)),
                            contentAlignment = Alignment.Center,
                        ) {
                            if (pestaña.dibujo == null) RetratoMiCuy(apariencia, Modifier.size(41.dp))
                            else Image(painterResource(pestaña.dibujo), null, Modifier.size(40.dp))
                        }
                        Text(
                            pestaña.etiqueta, color = if (oscuro) colores.onSurface else Tinta,
                            style = MaterialTheme.typography.labelMedium, textAlign = TextAlign.Center,
                        )
                    }
                }
            }
        }
    }
}
