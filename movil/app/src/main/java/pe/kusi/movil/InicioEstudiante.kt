package pe.kusi.movil

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp

@Composable
internal fun InicioEstudiante(
    nombre: String,
    estado: EstadoEntradaKusi,
    biblioteca: EstadoBibliotecaInfantil,
    apariencia: AparienciaCuy,
    voz: VozKusi,
    vozActiva: Boolean,
    elegir: (AventuraInfantil) -> Unit,
    recargar: (() -> Unit)?,
    comprobar: () -> Unit,
    abrirCursos: () -> Unit,
    abrirMiCuy: () -> Unit,
    ayuda: () -> Unit,
    cambiarVoz: (Boolean) -> Unit,
    modifier: Modifier = Modifier,
) {
    val colores = MaterialTheme.colorScheme
    val oscuro = colores.background.luminance() < 0.30f
    val cielo = if (oscuro) Color(0xFF1D405B) else Color(0xFF08D4EF)
    val saludo = if (nombre.isBlank()) "¡Hola!" else "¡Hola, $nombre!"
    val textoVoz = when {
        !estado.validado -> "$saludo Vamos a comprobar tu acceso."
        biblioteca.cargando -> "$saludo Estoy buscando tus aventuras."
        biblioteca.error != null -> "$saludo ${biblioteca.error}"
        biblioteca.aventuras.isEmpty() -> "$saludo Tus aventuras están por llegar. Tu profe te avisará."
        else -> "$saludo Elige una aventura para jugar."
    }
    val aventuras = remember(biblioteca.aventuras) { biblioteca.aventuras.sortedByDescending { it.enPausa } }
    val puedeJugar = estado.validado && !estado.ocupado && !biblioteca.cargando
    val buscar = recargar?.takeIf { estado.validado && !estado.ocupado && !biblioteca.cargando }
    val saludar: () -> Unit = { if (vozActiva && !voz.hablando) voz.hablar(textoVoz) }
    val lista = rememberLazyListState()
    val plazaVisible by remember(lista) { derivedStateOf { lista.firstVisibleItemIndex == 0 } }
    val enEspera = estado.validado && biblioteca.error == null && aventuras.isEmpty() && !biblioteca.cargando
    val margen = Modifier.padding(horizontal = 16.dp)

    Box(modifier.fillMaxWidth().background(colores.background)) {
        Column(
            Modifier.widthIn(max = 570.dp).fillMaxSize().align(Alignment.TopCenter),
        ) {
            Box(Modifier.fillMaxWidth().background(cielo)) {
                CabeceraInicio(saludo, apariencia, vozActiva, abrirMiCuy, ayuda) { activa ->
                    cambiarVoz(activa)
                    if (activa) voz.hablar(textoVoz)
                }
            }
            LazyColumn(
                Modifier.weight(1f).fillMaxWidth().testTag("Lista de aventuras"),
                state = lista,
                contentPadding = PaddingValues(bottom = 14.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                item(key = "plaza", contentType = "plaza") {
                    PlazaDeInicio(saludar, plazaVisible, enEspera, cielo, colores.background)
                }
                when {
                    !estado.validado -> item {
                        Column(margen, verticalArrangement = Arrangement.spacedBy(12.dp)) {
                            AvisoKusi(estado.mensaje ?: "Comprobando tu acceso…", estado.mensaje != null)
                            BotonKusi(
                                if (estado.ocupado) "Comprobando…" else "Volver a comprobar",
                                comprobar, Modifier.fillMaxWidth(),
                                habilitado = !estado.ocupado, icono = R.drawable.ic_kusi_replay,
                            )
                        }
                    }
                    biblioteca.error != null -> item {
                        Column(margen, verticalArrangement = Arrangement.spacedBy(12.dp)) {
                            AvisoKusi(biblioteca.error, error = true)
                            if (recargar != null) BotonKusi(
                                "Intentar otra vez", recargar, Modifier.fillMaxWidth(),
                                habilitado = buscar != null, icono = R.drawable.ic_kusi_replay,
                            )
                            BotonVerCursos(abrirCursos)
                        }
                    }
                    enEspera -> item {
                        InicioSinAventuras(recargar, buscar != null, abrirCursos, margen)
                    }
                    else -> {
                        if (biblioteca.cargando) item {
                            Column(
                                margen.fillMaxWidth().semantics { liveRegion = LiveRegionMode.Polite },
                                verticalArrangement = Arrangement.spacedBy(6.dp),
                            ) {
                                LinearProgressIndicator(Modifier.fillMaxWidth())
                                Text("Buscando tus aventuras…", style = MaterialTheme.typography.bodyMedium)
                            }
                        }
                        itemsIndexed(aventuras, key = { _, aventura -> "aventura-${aventura.id}" }, contentType = { _, _ -> "aventura" }) { indice, aventura ->
                            FichaDeAventura(aventura, destacada = indice == 0, habilitada = puedeJugar, modifier = margen) {
                                elegir(aventura)
                            }
                        }
                        if (aventuras.isNotEmpty() && recargar != null) item {
                            TextButton(recargar, margen.fillMaxWidth().heightIn(min = 48.dp), enabled = buscar != null) {
                                Icon(painterResource(R.drawable.ic_kusi_replay), null, Modifier.size(22.dp))
                                Spacer(Modifier.width(8.dp))
                                Text("Buscar juegos nuevos", style = MaterialTheme.typography.titleMedium)
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun CabeceraInicio(
    saludo: String,
    apariencia: AparienciaCuy,
    vozActiva: Boolean,
    abrirMiCuy: () -> Unit,
    ayuda: () -> Unit,
    cambiarVoz: (Boolean) -> Unit,
) {
    Row(
        Modifier.fillMaxWidth().padding(start = 16.dp, end = 16.dp, top = 10.dp, bottom = 12.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically,
    ) {
        Surface(
            onClick = abrirMiCuy,
            modifier = Modifier.size(56.dp).semantics {
                contentDescription = "Abrir Mi cuy"
                role = Role.Button
            },
            shape = RoundedCornerShape(19.dp), color = apariencia.pelaje.fondo,
            border = BorderStroke(1.dp, Color(0xFFBD9162)),
        ) {
            RetratoMiCuy(apariencia, Modifier.fillMaxSize().padding(3.dp))
        }
        Text(
            saludo, Modifier.weight(1f).semantics { heading() },
            style = MaterialTheme.typography.headlineMedium, color = MaterialTheme.colorScheme.onBackground,
        )
        val colores = MaterialTheme.colorScheme
        FilledTonalIconToggleButton(
            checked = vozActiva,
            onCheckedChange = cambiarVoz,
            modifier = Modifier.size(48.dp),
            shape = RoundedCornerShape(16.dp),
            colors = IconButtonDefaults.filledTonalIconToggleButtonColors(
                containerColor = colores.tertiaryContainer,
                contentColor = colores.onTertiaryContainer,
                checkedContainerColor = colores.tertiaryContainer,
                checkedContentColor = colores.onTertiaryContainer,
            ),
        ) {
            Icon(
                painterResource(if (vozActiva) R.drawable.ic_ingreso_voz else R.drawable.ic_ingreso_silenciar),
                if (vozActiva) "Silenciar a Kusi" else "Activar y escuchar a Kusi",
                Modifier.size(24.dp),
            )
        }
        AccionCabecera(R.drawable.ic_question, "Necesito ayuda", pulsar = ayuda)
    }
}

@Composable
private fun AccionCabecera(icono: Int, etiqueta: String, pulsar: () -> Unit) {
    FilledTonalIconButton(
        onClick = pulsar, modifier = Modifier.size(48.dp),
        shape = RoundedCornerShape(16.dp),
        colors = IconButtonDefaults.filledTonalIconButtonColors(
            containerColor = MaterialTheme.colorScheme.tertiaryContainer,
            contentColor = MaterialTheme.colorScheme.onTertiaryContainer,
        ),
    ) {
        Icon(painterResource(icono), etiqueta, Modifier.size(24.dp))
    }
}

@Composable
private fun InicioSinAventuras(
    recargar: (() -> Unit)?,
    habilitada: Boolean,
    abrirCursos: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val colores = MaterialTheme.colorScheme
    Column(
        modifier.fillMaxWidth().padding(horizontal = 4.dp), horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Text(
            "Tus aventuras están por llegar", Modifier.semantics { heading() },
            style = MaterialTheme.typography.headlineSmall, textAlign = TextAlign.Center,
        )
        Text(
            "Tu profe te avisará cuando haya juegos.", textAlign = TextAlign.Center,
            style = MaterialTheme.typography.bodyMedium, color = colores.onSurfaceVariant,
        )
        if (recargar != null) BotonKusi(
            "Buscar juegos nuevos", recargar, Modifier.fillMaxWidth().padding(top = 6.dp),
            habilitado = habilitada, icono = R.drawable.ic_kusi_replay, compacto = true,
        )
        BotonVerCursos(abrirCursos)
    }
}

@Composable
private fun BotonVerCursos(abrirCursos: () -> Unit) {
    OutlinedButton(
        onClick = abrirCursos, modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp),
        shape = RoundedCornerShape(17.dp),
    ) {
        Icon(painterResource(R.drawable.ic_books), null, Modifier.size(20.dp))
        Spacer(Modifier.width(8.dp))
        Text("Ver cursos", style = MaterialTheme.typography.titleSmall)
    }
}

@Composable
internal fun FichaDeAventura(
    aventura: AventuraInfantil,
    destacada: Boolean,
    habilitada: Boolean,
    modifier: Modifier,
    temaCurso: Curso? = null,
    elegir: () -> Unit,
) {
    val colores = MaterialTheme.colorScheme
    val oscuro = colores.background.luminance() < 0.30f
    Surface(
        modifier.fillMaxWidth(), shape = RoundedCornerShape(24.dp),
        color = if (destacada && !oscuro) Color(0xFFFFF4CF) else colores.surface,
        border = BorderStroke(1.dp, when {
            destacada && !oscuro -> Color(0xFFE3B667)
            temaCurso != null && !oscuro -> temaCurso.acento.copy(alpha = .23f)
            else -> colores.outlineVariant
        }),
    ) {
        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(9.dp)) {
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
                SelloDeAventura(aventura, destacada, temaCurso)
                Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                    if (aventura.enPausa || aventura.nuevo) {
                        val pausa = aventura.enPausa
                        Surface(
                            shape = RoundedCornerShape(9.dp),
                            color = if (pausa) Color(0xFFFFECB7) else Color(0xFFDFEED0),
                            contentColor = if (pausa) Color(0xFF65421B) else Color(0xFF285334),
                        ) {
                            Text(if (pausa) "En pausa" else "Nueva",
                                Modifier.padding(horizontal = 8.dp, vertical = 2.dp), style = MaterialTheme.typography.labelSmall)
                        }
                    }
                    Text(
                        aventura.titulo, Modifier.semantics { heading() },
                        style = if (destacada) MaterialTheme.typography.headlineSmall else MaterialTheme.typography.titleLarge,
                    )
                    if (temaCurso == null && aventura.curso.isNotBlank()) Text(
                        aventura.curso, style = MaterialTheme.typography.labelSmall, color = colores.onSurfaceVariant,
                    )
                }
            }
            BotonKusi(
                if (aventura.enPausa) "Continuar" else "Ver la misión", elegir, Modifier.fillMaxWidth(),
                habilitado = habilitada, icono = if (aventura.enPausa) R.drawable.ic_kusi_play else R.drawable.ic_arrow_right,
                secundario = !destacada && temaCurso == null, compacto = true,
            )
        }
    }
}

@Composable
private fun SelloDeAventura(aventura: AventuraInfantil, destacada: Boolean, temaCurso: Curso?) {
    val icono = if (aventura.icono == R.drawable.ic_kusi_compass) iconoCursoInfantil(aventura.curso, false) else aventura.icono
    val dibujo = temaCurso?.dibujoEnCursos ?: when (icono) {
        R.drawable.ic_calculator -> R.drawable.kusi_pila_numeros
        R.drawable.ic_chat_circle_text -> R.drawable.kusi_libro_aventura
        else -> null
    }
    val fondo = temaCurso?.papel ?: when (icono) {
        R.drawable.ic_calculator -> Color(0xFFEEE4F9)
        R.drawable.ic_chat_circle_text -> Color(0xFFFFE8B1)
        else -> Color(0xFFE4F0D3)
    }
    Box(
        Modifier.size(if (destacada) 90.dp else if (temaCurso != null) 76.dp else 70.dp)
            .background(fondo, RoundedCornerShape(20.dp)),
        contentAlignment = Alignment.Center,
    ) {
        if (dibujo != null) Image(painterResource(dibujo), null, Modifier.fillMaxSize().padding(9.dp))
        else Icon(painterResource(icono), null, Modifier.size(if (destacada) 45.dp else 36.dp),
            tint = Color(0xFF365C39))
    }
}
