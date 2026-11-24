package pe.kusi.movil

import android.content.Context
import android.media.AudioAttributes
import android.media.SoundPool
import android.os.SystemClock
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.compose.LifecycleResumeEffect

internal enum class SonidoKusi(val recurso: Int, val volumen: Float, val tono: Float = 1f) {
    IMPULSO(R.raw.bienvenida_impulso, 0.17f, 1.21f),
    NUMEROS(R.raw.bienvenida_madera, 0.26f, 1.19f),
    LIBRO(R.raw.bienvenida_libro, 0.56f),
    LLEGADA(R.raw.bienvenida_paso, 0.29f),
    COSQUILLAS(R.raw.bienvenida_cosquillas, 0.24f, 1.17f),
}

internal class EfectosBienvenida(contexto: Context) {
    private val reproductor = SoundPool.Builder().setMaxStreams(2).setAudioAttributes(
        AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_GAME)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build(),
    ).build()
    private val cargados = mutableSetOf<Int>()
    private val muestras: Map<SonidoKusi, Int>
    private val flujos = IntArray(2)
    private var siguienteFlujo = 0
    private var ultimoEfecto = 0L
    private var habilitado = false
    private var visible = false
    private var cerrado = false

    init {
        reproductor.setOnLoadCompleteListener { _, muestra, resultado -> if (resultado == 0) cargados.add(muestra) }
        muestras = SonidoKusi.entries.associateWith { reproductor.load(contexto, it.recurso, 1) }
    }

    fun sonar(sonido: SonidoKusi): Boolean {
        val ahora = SystemClock.uptimeMillis()
        val muestra = muestras.getValue(sonido)
        if (cerrado || !habilitado || !visible || muestra !in cargados || ahora - ultimoEfecto < 80L) return false
        val flujo = reproductor.play(muestra, sonido.volumen, sonido.volumen, 1, 0, sonido.tono)
        if (flujo == 0) return false
        ultimoEfecto = ahora
        flujos[siguienteFlujo] = flujo
        siguienteFlujo = (siguienteFlujo + 1) % flujos.size
        return true
    }

    fun habilitar(activo: Boolean) {
        if (habilitado && !activo) detener()
        habilitado = activo
    }

    fun mostrar(enPrimerPlano: Boolean) {
        visible = enPrimerPlano
        if (!visible) detener()
    }

    fun cerrar() {
        if (cerrado) return
        detener()
        cerrado = true
        reproductor.setOnLoadCompleteListener(null)
        reproductor.release()
    }

    private fun detener() {
        for (flujo in flujos) if (flujo != 0) reproductor.stop(flujo)
        flujos.fill(0)
    }
}

@Composable
internal fun recordarEfectosBienvenida(activos: Boolean): EfectosBienvenida {
    val contexto = LocalContext.current.applicationContext
    val efectos = remember(contexto) { EfectosBienvenida(contexto) }
    SideEffect { efectos.habilitar(activos) }
    LifecycleResumeEffect(efectos) {
        efectos.mostrar(true)
        onPauseOrDispose { efectos.mostrar(false) }
    }
    DisposableEffect(efectos) { onDispose(efectos::cerrar) }
    return efectos
}
