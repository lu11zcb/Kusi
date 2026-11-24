package pe.kusi.movil

import android.webkit.PermissionRequest
import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class PermisoJuegoTest {
    private val audio = PermissionRequest.RESOURCE_AUDIO_CAPTURE
    private val video = PermissionRequest.RESOURCE_VIDEO_CAPTURE

    @Test fun concedeElMicrofonoAlJuegoSiAndroidDioPermiso() {
        val solicitados = arrayOf(audio)
        assertArrayEquals(solicitados, recursosPermitidosJuego(solicitados, permisoMicrofono = true, origenPermitido = true))
    }

    @Test fun concedeSoloElAudioAunqueSeSolicitenOtrosRecursos() {
        val solicitados = arrayOf(video, audio, "recurso-futuro", PermissionRequest.RESOURCE_MIDI_SYSEX)
        assertArrayEquals(arrayOf(audio), recursosPermitidosJuego(solicitados, permisoMicrofono = true, origenPermitido = true))
    }

    @Test fun deniegaElAudioSiAndroidNoDioPermiso() {
        assertTrue(recursosPermitidosJuego(arrayOf(audio), permisoMicrofono = false, origenPermitido = true).isEmpty())
    }

    @Test fun deniegaLosRecursosDistintosDelAudioAunqueHayaPermiso() {
        val solicitados = arrayOf(video, "recurso-futuro", PermissionRequest.RESOURCE_PROTECTED_MEDIA_ID)
        assertTrue(recursosPermitidosJuego(solicitados, permisoMicrofono = true, origenPermitido = true).isEmpty())
    }

    @Test fun deniegaElAudioDeUnOrigenAjenoAlJuego() {
        assertTrue(recursosPermitidosJuego(arrayOf(audio), permisoMicrofono = true, origenPermitido = false).isEmpty())
    }
}
