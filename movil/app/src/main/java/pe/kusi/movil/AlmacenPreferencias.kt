package pe.kusi.movil

import android.content.Context

/** HU13: guarda la sesión en las preferencias privadas de la app (allowBackup=false). */
class AlmacenPreferencias(context: Context) : AlmacenSesion {
    private val preferencias = context.getSharedPreferences("kusi_sesion", Context.MODE_PRIVATE)

    override fun leer(): String? = preferencias.getString("cookies", null)

    override fun guardar(valor: String?) {
        val edicion = preferencias.edit()
        if (valor == null) edicion.remove("cookies") else edicion.putString("cookies", valor)
        edicion.apply()
    }
}
