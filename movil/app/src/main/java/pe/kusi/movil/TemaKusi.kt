package pe.kusi.movil

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.font.FontVariation
import androidx.compose.ui.text.ExperimentalTextApi
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@OptIn(ExperimentalTextApi::class)
private val Nunito = FontFamily(
    Font(R.font.nunito, weight = FontWeight.Normal, variationSettings = FontVariation.Settings(FontVariation.weight(500))),
    Font(R.font.nunito, weight = FontWeight.Medium, variationSettings = FontVariation.Settings(FontVariation.weight(600))),
    Font(R.font.nunito, weight = FontWeight.Bold, variationSettings = FontVariation.Settings(FontVariation.weight(750)))
)
@OptIn(ExperimentalTextApi::class)
private val Baloo = FontFamily(Font(R.font.baloo2, weight = FontWeight.Bold, variationSettings = FontVariation.Settings(FontVariation.weight(700))))
private val ClaroKusi = lightColorScheme(
    primary = Color(0xFF6541A0), onPrimary = Color.White,
    primaryContainer = Color(0xFFFFBE45), onPrimaryContainer = Color(0xFF4D3016),
    secondary = Color(0xFF216A59), onSecondary = Color.White,
    secondaryContainer = Color(0xFFDFF5ED), onSecondaryContainer = Color(0xFF205749),
    tertiary = Color(0xFF7452AF), onTertiary = Color.White,
    tertiaryContainer = Color(0xFFEEE5FF), onTertiaryContainer = Color(0xFF594084),
    background = Color(0xFFFFF9EE), onBackground = Color(0xFF37304D),
    surface = Color(0xFFFFFFFF), onSurface = Color(0xFF37304D),
    surfaceVariant = Color(0xFFF4EEE5), onSurfaceVariant = Color(0xFF706579),
    outline = Color(0xFF8E7E9B), outlineVariant = Color(0xFFE6DDEB),
    error = Color(0xFFA73324), onError = Color.White,
    errorContainer = Color(0xFFFFEAE3), onErrorContainer = Color(0xFF7D281D)
)
private val OscuroKusi = darkColorScheme(
    primary = Color(0xFFD5BEFF), onPrimary = Color(0xFF382358),
    primaryContainer = Color(0xFFFFBE45), onPrimaryContainer = Color(0xFF4D3016),
    secondary = Color(0xFF8BD8BE), onSecondary = Color(0xFF153C31),
    secondaryContainer = Color(0xFF244A41), onSecondaryContainer = Color(0xFFB8ECD9),
    tertiary = Color(0xFFD5BEFF), onTertiary = Color(0xFF382358),
    tertiaryContainer = Color(0xFF443359), onTertiaryContainer = Color(0xFFEADFFF),
    background = Color(0xFF152439), onBackground = Color(0xFFFFF0DA),
    surface = Color(0xFF1D3045), onSurface = Color(0xFFFFF0DA),
    surfaceVariant = Color(0xFF344458), onSurfaceVariant = Color(0xFFDFCEBB),
    outline = Color(0xFFB8A99B), outlineVariant = Color(0xFF536174),
    error = Color(0xFFFFB4A4), onError = Color(0xFF571C13),
    errorContainer = Color(0xFF6E3025), onErrorContainer = Color(0xFFFFDAD1)
)
private fun cuerpo(size: Int, line: Int, weight: FontWeight = FontWeight.Normal) = TextStyle(fontFamily = Nunito, fontSize = size.sp, lineHeight = line.sp, fontWeight = weight)
private fun titulo(size: Int, line: Int) = TextStyle(fontFamily = Baloo, fontSize = size.sp, lineHeight = line.sp, fontWeight = FontWeight.Bold)
private val TipografiaKusi = Typography(
    displayLarge = titulo(44, 48), displayMedium = titulo(40, 44), displaySmall = titulo(36, 40),
    headlineLarge = titulo(34, 38), headlineMedium = titulo(30, 34), headlineSmall = titulo(26, 30),
    titleLarge = titulo(23, 27), titleMedium = cuerpo(18, 24, FontWeight.Bold), titleSmall = cuerpo(16, 22, FontWeight.Bold),
    bodyLarge = cuerpo(18, 26), bodyMedium = cuerpo(16, 23), bodySmall = cuerpo(14, 20),
    labelLarge = cuerpo(18, 24, FontWeight.Bold), labelMedium = cuerpo(15, 20, FontWeight.Bold), labelSmall = cuerpo(13, 18, FontWeight.Bold)
)
@Composable
fun TemaKusi(oscuro: Boolean = isSystemInDarkTheme(), contenido: @Composable () -> Unit) {
    MaterialTheme(colorScheme = if (oscuro) OscuroKusi else ClaroKusi, typography = TipografiaKusi,
        shapes = Shapes(extraSmall = RoundedCornerShape(8.dp), small = RoundedCornerShape(12.dp), medium = RoundedCornerShape(20.dp), large = RoundedCornerShape(28.dp), extraLarge = RoundedCornerShape(32.dp)), content = contenido)
}
