import json
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener

from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.cache import never_cache
from django.views.decorators.debug import sensitive_variables
from django.views.decorators.http import require_GET, require_POST

from .acceso_views import leer_json
from django.core.exceptions import ValidationError

from .models import Usuario
from .permisos import exigir_administrador


class SinRedirecciones(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        # No reenviar la clave interna ni la sesión a otro destino.
        return None


def _base_educativa():
    base = settings.EDU_API_URL.rstrip("/")
    try:
        partes = urlsplit(base)
        valido = (
            partes.scheme in ("http", "https") and partes.hostname
            and not (partes.username or partes.password or partes.query or partes.fragment)
            and (partes.port is None or 1 <= partes.port <= 65535)
            and (partes.scheme == "https" or partes.hostname in ("localhost", "127.0.0.1", "::1"))
        )
    except ValueError:
        valido = False
    return base if valido and settings.CLAVE_INTERNA else None


def _leer_objeto(respuesta):
    cuerpo = respuesta.read(65537)
    if len(cuerpo) > 65536:
        raise ValueError("Respuesta educativa demasiado grande.")
    datos = json.loads(cuerpo)
    if not isinstance(datos, dict):
        raise ValueError("Respuesta educativa incompatible.")
    return datos


@sensitive_variables("cabeceras", "peticion", "contenido")
def _transportar(request, recurso, metodo, clave_resultado, datos=None):
    base = _base_educativa()
    if base is None:
        return JsonResponse({"mensaje": "El servicio educativo no está disponible. Comprueba su configuración e inténtalo de nuevo."}, status=503)
    contenido = json.dumps(datos).encode("utf-8") if datos is not None else None
    cabeceras = {
        "Accept": "application/json", "X-Clave-Interna": settings.CLAVE_INTERNA,
        "X-Sesion-Kusi": request.session.session_key or "",
    }
    if contenido is not None:
        cabeceras["Content-Type"] = "application/json"
    try:
        peticion = Request(base + "/interno/" + recurso.strip("/") + "/", data=contenido, method=metodo, headers=cabeceras)
        with build_opener(SinRedirecciones()).open(peticion, timeout=5) as respuesta:
            resultado = _leer_objeto(respuesta)
            estado_esperado = 201 if metodo == "POST" else 200
            tipo_esperado = dict if metodo == "POST" else list
            if respuesta.status != estado_esperado or not isinstance(resultado.get(clave_resultado), tipo_esperado):
                raise ValueError("Respuesta educativa incompatible.")
            return JsonResponse(resultado, status=estado_esperado)
    except HTTPError as fallo:
        try:
            datos_error = _leer_objeto(fallo)
        except (ValueError, OSError):
            datos_error = {}
        finally:
            fallo.close()
        estado = fallo.code if fallo.code in (400, 401, 403, 404, 409, 503) else 502
        mensaje = datos_error.get("mensaje") if estado != 502 else None
        if not isinstance(mensaje, str) or not mensaje.strip():
            mensaje = "No se pudo completar la operación educativa."
        return JsonResponse({"mensaje": mensaje}, status=estado)
    except (URLError, TimeoutError, OSError, ValueError, TypeError):
        return JsonResponse({"mensaje": "No se pudo confirmar la operación. Comprueba lo guardado antes de volver a enviarla."}, status=502)


def _solicitar(request, recurso, metodo, clave_resultado):
    rechazo = exigir_administrador(request)
    if rechazo is not None:
        return rechazo
    datos = None
    if metodo == "POST":
        datos, error = leer_json(request)
        if error is not None:
            return error
    return _transportar(request, recurso, metodo, clave_resultado, datos)


@never_cache
@require_POST
def vincular_estudiante(request):
    return _solicitar(request, "vinculos-estudiantes", "POST", "vinculo")


@never_cache
@require_GET
def listar_vinculos(request):
    return _solicitar(request, "vinculos-estudiantes", "GET", "vinculos")


@never_cache
@require_POST
def asignar_docente(request):
    return _solicitar(request, "asignaciones-docentes", "POST", "asignacion")


@never_cache
@require_GET
def listar_asignaciones(request):
    return _solicitar(request, "asignaciones-docentes", "GET", "asignaciones")


@never_cache
@require_GET
def mis_asignaciones_docente(request):
    usuario = request.user
    if not usuario.is_authenticated or not usuario.is_active:
        return JsonResponse({"mensaje": "Debes iniciar sesión."}, status=401)
    if not usuario.groups.filter(name="docente").exists():
        return JsonResponse({"mensaje": "Esta operación requiere el rol docente."}, status=403)
    if usuario.debe_cambiar_contrasena:
        return JsonResponse({"mensaje": "Debes cambiar tu contraseña temporal."}, status=403)
    return _transportar(request, "docentes/" + str(usuario.id) + "/recursos", "GET", "asignaciones")


def _exigir_docente(usuario):
    if not usuario.is_authenticated or not usuario.is_active:
        return JsonResponse({"mensaje": "Debes iniciar sesión."}, status=401)
    if not usuario.groups.filter(name="docente").exists():
        return JsonResponse({"mensaje": "Esta operación requiere el rol docente."}, status=403)
    if usuario.debe_cambiar_contrasena:
        return JsonResponse({"mensaje": "Debes cambiar tu contraseña temporal."}, status=403)
    return None


@never_cache
@require_GET
def mis_estudiantes_docente(request):
    usuario = request.user
    rechazo = _exigir_docente(usuario)
    if rechazo is not None:
        return rechazo
    respuesta = _transportar(request, "docentes/" + str(usuario.id) + "/estudiantes", "GET", "estudiantes")
    if respuesta.status_code != 200:
        return respuesta
    # Spring solo conoce UUID; el nombre lo aporta Django, propietario de las cuentas.
    datos = json.loads(respuesta.content)
    identificadores = {v.get("estudiante_id") for v in datos["estudiantes"] if isinstance(v, dict)}
    try:
        nombres = {clave: (nombre, dni) for clave, nombre, dni in Usuario.objects.filter(pk__in=identificadores).values_list("id", "nombre", "dni")}
    except (ValidationError, ValueError):
        return JsonResponse({"mensaje": "No se pudo completar la operación educativa."}, status=502)
    nombres = {str(clave): valor for clave, valor in nombres.items()}
    for vinculo in datos["estudiantes"]:
        if isinstance(vinculo, dict):
            nombre, dni = nombres.get(vinculo.get("estudiante_id"), (None, None))
            vinculo["estudiante_nombre"] = nombre
            vinculo["estudiante_dni"] = dni
    return JsonResponse(datos)

