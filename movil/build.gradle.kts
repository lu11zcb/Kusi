// AGP fijo en 9.3.0: es el más nuevo que acepta Android Studio del equipo.
// No aceptar el "AGP Upgrade Assistant" ni subirlo sin actualizar antes Android Studio.
plugins {
    id("com.android.application") version "9.3.0" apply false
    id("org.jetbrains.kotlin.plugin.compose") version "2.4.20" apply false
}
