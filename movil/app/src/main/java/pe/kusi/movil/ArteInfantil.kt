package pe.kusi.movil

import androidx.compose.foundation.layout.*
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.dp
import androidx.compose.material3.Text
import androidx.compose.ui.graphics.Color
import androidx.compose.foundation.shape.CircleShape

/** Familia Phosphor Fill local. El color se aplica según el contexto; nunca se rasteriza. */
@Composable
fun StickerKusi(recurso: Int, modifier: Modifier = Modifier) {
    IconoKusi(recurso, modifier = modifier, color = MaterialTheme.colorScheme.primary)
}

@Composable
fun MiniSelloInfantil(recurso: Int, texto: String) {
    val fondo = when(recurso) { R.drawable.ic_kusi_compass -> MaterialTheme.colorScheme.primaryContainer; R.drawable.ic_kusi_book -> MaterialTheme.colorScheme.secondaryContainer; else -> MaterialTheme.colorScheme.tertiaryContainer }
    val tinta = when(recurso) { R.drawable.ic_kusi_compass -> MaterialTheme.colorScheme.onPrimaryContainer; R.drawable.ic_kusi_book -> MaterialTheme.colorScheme.onSecondaryContainer; else -> MaterialTheme.colorScheme.onTertiaryContainer }
    Row(horizontalArrangement = Arrangement.spacedBy(7.dp), verticalAlignment = Alignment.CenterVertically) {
        Surface(color = fondo, shape = CircleShape) { IconoKusi(recurso, modifier = Modifier.padding(8.dp).size(23.dp), color = tinta) }
        Text(texto, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Composable
fun InsigniaKusi(recurso: Int, modifier: Modifier = Modifier) {
    Surface(modifier, color = MaterialTheme.colorScheme.tertiaryContainer, contentColor = MaterialTheme.colorScheme.onTertiaryContainer,
        shape = MaterialTheme.shapes.large) { Box(Modifier.padding(16.dp), contentAlignment = Alignment.Center) { IconoKusi(recurso, modifier = Modifier.fillMaxSize()) } }
}
