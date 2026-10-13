
package pe.kusi.movil

import java.net.CookieManager
import java.net.HttpCookie
import java.net.CookiePolicy
import java.net.HttpURLConnection
import java.net.URI
import org.json.JSONObject

data class Cuenta(
    val id: String,
    val nombre: String,
    val roles: Set<String>,
    val temporal: Boolean
)

class FalloAcceso(val estado: Int, mensaje: String) : Exception(mensaje)

/** HU13: dónde se recuerda la sesión en el celular (null = solo en memoria). */
interface AlmacenSesion {
    fun leer(): String?
    fun guardar(valor: String?)
}

/** Las cookies viven en memoria y, si el estudiante lo elige, en el almacén (HU13). */
class AccesoApi(private val django: String, private val edu: String, private val almacen: AlmacenSesion? = null) {

    private val cookies = CookieManager(null, CookiePolicy.ACCEPT_ORIGINAL_SERVER)

    /** Si es false, la sesión se olvida al cerrar la app. */
    var recordar: Boolean = true
        set(valor) { field = valor; persistir() }

    init {
        // Recupera la sesión guardada; Django sigue decidiendo si aún es válida.
        almacen?.leer()?.lines()?.forEach { linea ->
            val separador = linea.indexOf('=')
            if (separador > 0) {
                val cookie = HttpCookie(linea.substring(0, separador), linea.substring(separador + 1))
                cookie.path = "/"
                cookie.version = 0
                cookies.cookieStore.add(URI(django), cookie)
            }
        }
    }

    // Solo se guardan las cookies de Django necesarias para continuar la sesión.
    private fun persistir() {
        val destino = almacen ?: return
        val vigentes = cookies.cookieStore.get(URI(django)).filter { it.name in GUARDADAS && !it.hasExpired() }
        if (!recordar || vigentes.none { it.name == "sessionid" }) destino.guardar(null)
        else destino.guardar(vigentes.joinToString("\n") { it.name + "=" + it.value })
    }

    private fun olvidar() {
        cookies.cookieStore.removeAll()
        almacen?.guardar(null)
    }

    private fun solicitar(
        base: String,
        ruta: String,
        datos: JSONObject? = null,
        csrf: String? = null
    ): JSONObject {
        val uri = URI(base.trimEnd('/') + ruta)
        val conexion = uri.toURL().openConnection() as HttpURLConnection

        conexion.connectTimeout = 5000
        conexion.readTimeout = 10000
        conexion.instanceFollowRedirects = false
        conexion.useCaches = false
        conexion.setRequestProperty("Accept", "application/json")

        cookies.get(uri, emptyMap()).forEach { (clave, valores) ->
            conexion.setRequestProperty(clave, valores.joinToString("; "))
        }

        if (datos != null) {
            conexion.requestMethod = "POST"
            conexion.doOutput = true
            conexion.setRequestProperty("Content-Type", "application/json")
            if (csrf != null) {
                conexion.setRequestProperty("X-CSRFToken", csrf)
            }
        }

        try {
            if (datos != null) {
                conexion.outputStream.use {
                    it.write(datos.toString().toByteArray(Charsets.UTF_8))
                }
            }

            val estado = conexion.responseCode
            cookies.put(uri, conexion.headerFields.filterKeys { it != null })
            persistir()

            val flujo = if (estado in 200..299) {
                conexion.inputStream
            } else {
                conexion.errorStream
            }

            val texto = flujo?.use {
                String(it.readBytes(), Charsets.UTF_8)
            } ?: "{}"

            if (texto.length > 131072) {
                throw FalloAcceso(502, "La respuesta del servidor no es válida.")
            }

            val resultado = try {
                JSONObject(texto)
            } catch (_: Exception) {
                throw FalloAcceso(502, "La respuesta del servidor no es válida.")
            }

            if (estado !in 200..299) {
                throw FalloAcceso(
                    estado,
                    resultado.optString(
                        "mensaje",
                        "No se pudo completar la operación."
                    )
                )
            }

            return resultado
        } catch (fallo: FalloAcceso) {
            throw fallo
        } catch (_: Exception) {
            throw FalloAcceso(
                0,
                "No se pudo conectar. Comprueba la conexión y vuelve a intentarlo."
            )
        } finally {
            conexion.disconnect()
        }
    }

    private fun cuenta(datos: JSONObject): Cuenta? {
        val usuario = datos.optJSONObject("usuario") ?: return null
        val rolesJson = usuario.optJSONArray("roles") ?: return null

        val roles = (0 until rolesJson.length())
            .map { rolesJson.getString(it) }
            .toSet()

        return Cuenta(
            id = usuario.optString("id").takeIf { it.isNotBlank() }
                ?: return null,
            nombre = usuario.optString("nombre").takeIf { it.isNotBlank() }
                ?: return null,
            roles = roles,
            temporal = usuario.optBoolean("debe_cambiar_contrasena", false)
        )
    }

    private fun enviar(ruta: String, datos: JSONObject): JSONObject {
        val csrf = solicitar(django, "/api/acceso/sesion/")
            .optString("csrf_token")
            .takeIf { it.isNotBlank() }
            ?: throw FalloAcceso(403, "No se pudo validar la solicitud.")

        return solicitar(django, ruta, datos, csrf)
    }

    /** Si la sesión guardada caducó, se borra del celular. */
    fun sesion(): Cuenta? =
        cuenta(solicitar(django, "/api/acceso/sesion/")).also { if (it == null) olvidar() }

    /** HU12: el estudiante ingresa con su DNI y la contraseña que le dio su docente. */
    fun ingresar(dni: String, contrasena: String): Cuenta =
        cuenta(
            enviar(
                "/api/acceso/ingreso/",
                JSONObject()
                    .put("dni", dni.trim())
                    .put("contrasena", contrasena)
            )
        ) ?: throw FalloAcceso(401, "No se pudo iniciar sesión.")

    fun cambiar(
        actual: String,
        nueva: String,
        confirmacion: String
    ): Cuenta =
        cuenta(
            enviar(
                "/api/acceso/contrasena/",
                JSONObject()
                    .put("contrasena_actual", actual)
                    .put("nueva_contrasena", nueva)
                    .put("confirmacion", confirmacion)
            )
        ) ?: throw FalloAcceso(401, "Debes volver a ingresar.")

    fun validarEstudiante(): Cuenta =
        cuenta(solicitar(edu, "/api/edu/acceso/estudiante/"))
            ?: throw FalloAcceso(401, "Debes volver a ingresar.")

    /** Aunque falle la red, el celular olvida la sesión. */
    fun salir() {
        try {
            enviar("/api/acceso/salida/", JSONObject())
        } finally {
            olvidar()
        }
    }

    private companion object {
        val GUARDADAS = setOf("sessionid", "csrftoken")
    }
}
