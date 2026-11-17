package pe.kusi.movil

import androidx.compose.foundation.*
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.graphics.BlendMode
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

private val Tinta = Color(0xFF593629)
private val Verde = Color(0xFF218D45)
private val Crema = Color(0xFFFFF9EE)
private val Borde = Color(0xFFEADBC4)
private data class CursoVisual(val nombre: String, val icono: String, val color: Color)
private val cursosVisuales = listOf(
    CursoVisual("Matemática", "🔢", Color(0xFFE8DDF5)),
    CursoVisual("Comunicación", "📖", Color(0xFFFFECC5)),
    CursoVisual("Personal Social", "🐹", Color(0xFFF8DEE5)),
    CursoVisual("Ciencia y Tecnología", "🌎", Color(0xFFDCECD8)),
    CursoVisual("Arte y Cultura", "🎨", Color(0xFFE7DFF7)),
    CursoVisual("Educación Religiosa", "💛", Color(0xFFFFE6D5)),
    CursoVisual("Inglés", "🌍", Color(0xFFE7DDF3))
)

@Composable
private fun TituloReferencia(texto: String, modifier: Modifier = Modifier, pequeno: Boolean = false) {
    Text(texto, modifier, style = if (pequeno) MaterialTheme.typography.titleLarge else MaterialTheme.typography.headlineMedium,
        color = Tinta, textAlign = TextAlign.Center)
}
@Composable
private fun IlustracionReferencia(modifier: Modifier = Modifier, mascota: Boolean = false, pelaje: Int = 0) {
    val filtro = when(pelaje) { 1 -> ColorFilter.tint(Color(0xFFFFE4B3), BlendMode.Modulate); 2 -> ColorFilter.tint(Color(0xFFAFB5B2), BlendMode.Modulate); 3 -> ColorFilter.tint(Color(0xFFFFBA7C), BlendMode.Modulate); else -> null }
    Box(modifier, contentAlignment = Alignment.Center) {
        Box(Modifier.fillMaxWidth(.84f).fillMaxHeight(.65f).align(Alignment.BottomCenter).padding(bottom = 12.dp).background(Color(0xFFE7EECF), RoundedCornerShape(90.dp)))
        Image(painterResource(if (mascota) R.drawable.kusi_mascota_referencia else R.drawable.kusi_referencia),
            if (mascota) "Mi cuy" else "Kusi te saluda", Modifier.fillMaxSize(), colorFilter = if(mascota) filtro else null)
    }
}
@Composable
fun BienvenidaReferencia(voz: VozKusi, entrar: () -> Unit) {
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        IlustracionReferencia(Modifier.fillMaxWidth().height(300.dp))
        Spacer(Modifier.height(20.dp))
        TituloReferencia("Ven, vamos a\nla aventura")
        Text("Un mundo por descubrir, a tu ritmo.", color = Color(0xFF917A61), textAlign = TextAlign.Center, modifier = Modifier.padding(vertical = 16.dp))
        BotonKusi("¡Vamos!  →", entrar, Modifier.fillMaxWidth())
        TextButton(onClick = { voz.hablar("Ven, vamos a la aventura. ¡Vamos!") }) { Text("Escuchar a Kusi", color = Verde) }
    }
}

@Composable
fun InicioReferencia(cuenta: Cuenta, estado: EstadoEntradaKusi, biblioteca: EstadoBibliotecaInfantil,
    voz: VozKusi, elegir: (AventuraInfantil) -> Unit, recargar: (() -> Unit)?, comprobar: () -> Unit, salir: () -> Unit) {
    val contexto = LocalContext.current
    val preferencias = remember { contexto.getSharedPreferences("kusi_mi_cuy", android.content.Context.MODE_PRIVATE) }
    var seccion by rememberSaveable(cuenta.id) { mutableStateOf(0) }
    var curso by rememberSaveable(cuenta.id) { mutableStateOf<String?>(null) }
    var crearCuy by rememberSaveable(cuenta.id) { mutableStateOf(!preferencias.getBoolean("creado_${cuenta.id}", false)) }
    var pelaje by rememberSaveable(cuenta.id) { mutableStateOf(preferencias.getInt("pelaje_${cuenta.id}", 0)) }
    var vozActiva by rememberSaveable { mutableStateOf(preferencias.getBoolean("voz", true)) }
    var confirmar by remember { mutableStateOf(false) }
    val nombre = cuenta.nombre.trim().substringBefore(' ')
    Column(Modifier.fillMaxSize().background(Crema)) {
        Row(Modifier.fillMaxWidth().padding(horizontal = 22.dp, vertical = 5.dp), verticalAlignment = Alignment.CenterVertically) {
            if (curso != null || crearCuy) TextButton(onClick = { if(curso != null) curso = null else crearCuy = false }) { Text("←", color = Tinta, fontSize = 25.sp) }
            Text(if(crearCuy) "Crea tu cuy" else curso ?: when(seccion) {1 -> "Mis cursos";2 -> "Mis logros";3 -> "Mi cuy $nombre";else -> "¡Hola, $nombre!"},
                Modifier.weight(1f), style = MaterialTheme.typography.headlineSmall, color = Tinta)
            IconButton(onClick = { if(vozActiva) voz.hablar(if(crearCuy) "Elige el pelaje de tu cuy." else "¡Hola, $nombre! Elige una aventura.") }) {
                IconoKusi(R.drawable.ic_speaker_high, "Escuchar", color = Color(0xFFD98056))
            }
        }
        Column(Modifier.weight(1f).verticalScroll(rememberScrollState()).padding(horizontal = 22.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            when {
                crearCuy -> {
                    IlustracionReferencia(Modifier.fillMaxWidth().height(235.dp), true, pelaje)
                    TituloReferencia("Un amigo como tú", pequeno = true)
                    Text("Elige su pelaje", Modifier.fillMaxWidth().padding(top = 20.dp, bottom = 10.dp), fontWeight = FontWeight.Bold, color = Tinta)
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        listOf("Café", "Crema", "Gris", "Caramelo").forEachIndexed { i, texto ->
                            Column(Modifier.weight(1f).clip(RoundedCornerShape(16.dp)).background(if(pelaje == i) Color(0xFFE5EDCA) else Color.White)
                                .border(if(pelaje == i) 2.dp else 1.dp, if(pelaje == i) Verde else Borde, RoundedCornerShape(16.dp)).clickable { pelaje = i }.padding(vertical = 8.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                                IlustracionReferencia(Modifier.size(56.dp), true, i)
                                Text(texto, fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Tinta)
                                if(pelaje == i) Text("✓", color = Verde)
                            }
                        }
                    }
                    Spacer(Modifier.height(18.dp)); BloqueProximo("Ropa"); Spacer(Modifier.height(8.dp)); BloqueProximo("Accesorios")
                    Spacer(Modifier.height(18.dp)); Text("🧢     🎒     👓     🌼", fontSize = 25.sp)
                    Spacer(Modifier.height(18.dp))
                    BotonKusi("¡Listo!", { preferencias.edit().putInt("pelaje_${cuenta.id}", pelaje).putBoolean("creado_${cuenta.id}",true).apply(); crearCuy = false }, Modifier.fillMaxWidth())
                }
                curso != null -> {
                    val aventuras = biblioteca.aventuras.filter { it.curso.equals(curso, true) }
                    if(aventuras.isEmpty()) {
                        IlustracionReferencia(Modifier.fillMaxWidth().height(270.dp))
                        TituloReferencia("Pronto habrá\naventuras aquí")
                        Text("Tu profe te avisará.", Modifier.padding(16.dp), color = Tinta)
                        BotonKusi("Ver otros cursos  →", { curso = null }, Modifier.fillMaxWidth())
                    } else aventuras.forEach { TarjetaAventuraReferencia(it, estado.validado && !estado.ocupado) { elegir(it) } }
                }
                seccion == 1 -> {
                    cursosVisuales.chunked(2).forEach { fila ->
                        Row(Modifier.fillMaxWidth().padding(vertical = 6.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            fila.forEach { c ->
                                Column(Modifier.weight(1f).heightIn(min = 135.dp).clip(RoundedCornerShape(22.dp)).background(c.color).clickable { curso = c.nombre }.padding(14.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
                                    Text(c.icono, fontSize = 34.sp); Text(c.nombre, color = Tinta, textAlign = TextAlign.Center, fontWeight = FontWeight.Bold); Text("→", color = Tinta)
                                }
                            }
                            if(fila.size == 1) Spacer(Modifier.weight(1f))
                        }
                    }
                }
                seccion == 2 -> {
                    Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(25.dp)).background(Color(0xFFFFEBC0)).padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                        IlustracionReferencia(Modifier.size(125.dp)); Column(Modifier.weight(1f),horizontalAlignment = Alignment.CenterHorizontally) {Text("🏆",fontSize = 40.sp);TituloReferencia("Mis puntos",pequeno=true);EtiquetaPronto()}
                    }
                    Text("Mis medallas",Modifier.fillMaxWidth().padding(top=24.dp,bottom=12.dp),style=MaterialTheme.typography.titleLarge,color=Tinta)
                    Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.SpaceEvenly) {
                        repeat(3) { i -> Column(horizontalAlignment=Alignment.CenterHorizontally) {Text("🏅",fontSize=43.sp,color=Color(0xFFB4A890));Text(if(i==0)"Primera\naventura" else "Pronto",textAlign=TextAlign.Center,fontSize=12.sp,color=Tinta)} }
                    }
                    Spacer(Modifier.height(24.dp))
                    TarjetaKusi(Modifier.fillMaxWidth()) {TituloReferencia("Avance por curso",pequeno=true);Text("🔢  📖  🐹  🌎  🎨  💛",fontSize=24.sp);Text("Aquí verás tu avance.",color=Tinta);EtiquetaPronto()}
                    Text("Disponibilidad y puntos desde el servidor.",fontSize=12.sp,color=Color(0xFF8A775F),modifier=Modifier.padding(16.dp),textAlign=TextAlign.Center)
                }
                seccion == 3 -> {
                    IlustracionReferencia(Modifier.fillMaxWidth().height(230.dp),true,pelaje)
                    BotonKusi("Cambiar pelaje",{crearCuy=true},Modifier.fillMaxWidth())
                    Spacer(Modifier.height(12.dp));BloqueProximo("Ropa y accesorios")
                    Text("Sonido",Modifier.fillMaxWidth().padding(top=25.dp,bottom=12.dp),style=MaterialTheme.typography.titleLarge,color=Tinta)
                    BloqueProximo("Música y efectos")
                    Row(Modifier.fillMaxWidth().padding(vertical=10.dp),verticalAlignment=Alignment.CenterVertically) {
                        IconoKusi(R.drawable.ic_speaker_high,color=Tinta);Text("Voz de Kusi",Modifier.weight(1f).padding(start=12.dp),fontWeight=FontWeight.Bold,color=Tinta)
                        Switch(vozActiva,{vozActiva=it;preferencias.edit().putBoolean("voz",it).apply();if(!it)voz.callar()},colors=SwitchDefaults.colors(checkedThumbColor=Color.White,checkedTrackColor=Verde))
                    }
                    BotonKusi("Cerrar sesión",{confirmar=true},Modifier.fillMaxWidth(),secundario=true)
                    Text("Te pediremos confirmar.",fontSize=12.sp,color=Color(0xFF8A775F),modifier=Modifier.padding(10.dp))
                }
                else -> {
                    Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(24.dp)).background(Color(0xFFE7EECF)).padding(horizontal=14.dp),verticalAlignment=Alignment.CenterVertically) {
                        Text("Hoy puede ser\nuna gran aventura",Modifier.weight(1f),style=MaterialTheme.typography.titleLarge,color=Tinta)
                        Image(painterResource(R.drawable.kusi_referencia),null,Modifier.size(100.dp))
                    }
                    Spacer(Modifier.height(18.dp))
                    if(!estado.validado) {AvisoKusi(estado.mensaje ?: "Comprobando tu acceso…");TextButton(onClick=comprobar){Text("Volver a comprobar")}}
                    when {
                        biblioteca.cargando -> {LinearProgressIndicator(Modifier.fillMaxWidth());Text("Buscando tus aventuras…",Modifier.padding(16.dp))}
                        biblioteca.error != null -> {AvisoKusi(biblioteca.error,true);recargar?.let {BotonKusi("Intentar otra vez",it,Modifier.fillMaxWidth())}}
                        biblioteca.aventuras.isEmpty() -> {
                            IlustracionReferencia(Modifier.fillMaxWidth().height(240.dp))
                            TituloReferencia("Tus aventuras\nestán por llegar")
                            Text("Tu profe te avisará.",Modifier.padding(16.dp),color=Tinta)
                            recargar?.let {BotonKusi("Buscar juegos nuevos",it,Modifier.fillMaxWidth())}
                            BotonKusi("Ver cursos",{seccion=1},Modifier.fillMaxWidth(),secundario=true)
                        }
                        else -> {
                            biblioteca.aventuras.forEach {TarjetaAventuraReferencia(it,estado.validado && !estado.ocupado){elegir(it)}}
                            BotonKusi("Ver actividades",{seccion=1},Modifier.fillMaxWidth(),secundario=true)
                            recargar?.let {TextButton(onClick=it){Text("Buscar juegos nuevos",color=Verde)}}
                        }
                    }
                }
            }
            Spacer(Modifier.height(22.dp))
        }
        if(!crearCuy) Row(Modifier.fillMaxWidth().background(Color(0xFFFFFBF4)).padding(horizontal=12.dp,vertical=10.dp),horizontalArrangement=Arrangement.spacedBy(5.dp)) {
            listOf("⌂" to "Inicio","▣" to "Cursos","♜" to "Logros","🐹" to "Mi cuy").forEachIndexed { i, item ->
                Column(Modifier.weight(1f).clip(RoundedCornerShape(18.dp)).background(if(seccion==i)Color(0xFFE5EFC6) else Color.Transparent).clickable {seccion=i;curso=null}.padding(vertical=7.dp),horizontalAlignment=Alignment.CenterHorizontally) {
                    Text(item.first,fontSize=23.sp,color=if(seccion==i)Verde else Tinta)
                    Text(item.second,fontSize=11.sp,fontWeight=FontWeight.Bold,color=if(seccion==i)Verde else Tinta)
                }
            }
        }
    }
    if(confirmar) DialogoSalidaReferencia({confirmar=false}) {confirmar=false;salir()}
}

@Composable
private fun BloqueProximo(texto: String) {
    Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(15.dp)).background(Color(0xFFEEE5D9)).padding(14.dp),verticalAlignment=Alignment.CenterVertically) {
        Text("🔒",fontSize=20.sp);Column(Modifier.padding(start=12.dp)){Text(texto,fontWeight=FontWeight.Bold,color=Color(0xFF927B68));Text("Próximamente",fontSize=11.sp,color=Color(0xFF9C8873))}
    }
}
@Composable
private fun EtiquetaPronto() {Surface(color=Color(0xFFE1EDBC),shape=RoundedCornerShape(20.dp)){Text("Pronto",Modifier.padding(horizontal=16.dp,vertical=4.dp),color=Verde,fontSize=12.sp,fontWeight=FontWeight.Bold)}}
@Composable
private fun TarjetaAventuraReferencia(aventura:AventuraInfantil,habilitada:Boolean,elegir:()->Unit) {
    Row(Modifier.fillMaxWidth().padding(vertical=6.dp).border(1.dp,Borde,RoundedCornerShape(22.dp)).background(Color.White,RoundedCornerShape(22.dp)).padding(14.dp),verticalAlignment=Alignment.CenterVertically,horizontalArrangement=Arrangement.spacedBy(12.dp)) {
        Text("🔢",fontSize=39.sp)
        Column(Modifier.weight(1f)) {
            if(aventura.nuevo) Surface(color=Color(0xFFDDF0EE),shape=RoundedCornerShape(8.dp)){Text("Nueva",Modifier.padding(horizontal=9.dp,vertical=2.dp),fontSize=11.sp,fontWeight=FontWeight.Bold,color=Tinta)}
            Text(aventura.titulo,style=MaterialTheme.typography.titleLarge,color=Tinta)
            Button(onClick=elegir,enabled=habilitada,modifier=Modifier.fillMaxWidth(),colors=ButtonDefaults.buttonColors(containerColor=Verde)){Text("Jugar  →",fontWeight=FontWeight.Bold)}
        }
    }
}
@Composable
private fun DialogoSalidaReferencia(cancelar:()->Unit,salir:()->Unit) {
    var manteniendo by remember {mutableStateOf(false)}
    var progreso by remember {mutableStateOf(0f)}
    val scope=rememberCoroutineScope()
    androidx.compose.ui.window.Dialog(onDismissRequest=cancelar) {
        Column(Modifier.clip(RoundedCornerShape(28.dp)).background(Crema).border(2.dp,Color(0xFFE5C16B),RoundedCornerShape(28.dp)).padding(24.dp),horizontalAlignment=Alignment.CenterHorizontally) {
            Text("🚪🔒",fontSize=48.sp);TituloReferencia("¿Quieres salir?")
            Text("Para volver, necesitarás tu cuenta.",textAlign=TextAlign.Center,color=Tinta,modifier=Modifier.padding(vertical=12.dp))
            BotonKusi("Seguir jugando",cancelar,Modifier.fillMaxWidth())
            Box(Modifier.fillMaxWidth().height(58.dp).clip(RoundedCornerShape(18.dp)).background(Color(0xFFF7E9CE)).border(1.dp,Color(0xFFD8B782),RoundedCornerShape(18.dp))
                .pointerInput(Unit) {detectTapGestures(onPress={manteniendo=true;val trabajo=scope.launch {repeat(30){delay(100);progreso=(it+1)/30f};if(manteniendo)salir()};tryAwaitRelease();manteniendo=false;trabajo.cancel();progreso=0f})},contentAlignment=Alignment.Center) {
                Box(Modifier.fillMaxHeight().fillMaxWidth(progreso).align(Alignment.CenterStart).background(Color(0xFFFFD774)))
                Text("✋  Mantén para salir",fontWeight=FontWeight.Bold,color=Tinta)
            }
            Text("Mantén pulsado 3 segundos.",fontSize=12.sp,color=Tinta,modifier=Modifier.padding(top=10.dp))
        }
    }
}
