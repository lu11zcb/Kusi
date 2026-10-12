import json
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener
from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.cache import never_cache
from django.views.decorators.http import require_GET, require_POST
from .acceso_views import leer_json
from .permisos import exigir_administrador

class SinRedirecciones(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl): return None

def _solicitar(request, recurso, metodo):
    rechazo = exigir_administrador(request)
    if rechazo is not None: return rechazo
    base = settings.EDU_API_URL.rstrip("/")
    try:
        partes = urlsplit(base)
        valido = partes.scheme in ("http", "https") and partes.hostname and not (partes.username or partes.password or partes.query or partes.fragment) and (partes.scheme == "https" or partes.hostname in ("localhost", "127.0.0.1", "::1"))
    except ValueError: valido = False
    if not valido or not settings.CLAVE_INTERNA:
        return JsonResponse({"mensaje": "El servicio educativo no está disponible. Comprueba su configuración e inténtalo de nuevo."}, status=503)
    datos = None
    if metodo == "POST":
        datos, error = leer_json(request)
        if error is not None: return error
    contenido = json.dumps(datos).encode() if datos is not None else None
    cabeceras = {"Accept":"application/json", "X-Clave-Interna":settings.CLAVE_INTERNA, "X-Sesion-Kusi":request.session.session_key or ""}
    if contenido is not None: cabeceras["Content-Type"]="application/json"
    peticion = Request(base + "/interno/" + recurso.strip("/") + "/", data=contenido, method=metodo, headers=cabeceras)
    try:
        with build_opener(SinRedirecciones()).open(peticion, timeout=5) as respuesta:
            cuerpo=respuesta.read(65537)
            if len(cuerpo)>65536: raise ValueError("respuesta demasiado grande")
            return JsonResponse(json.loads(cuerpo), status=respuesta.status)
    except HTTPError as ex:
        try: cuerpo=ex.read(65537); datos_error=json.loads(cuerpo) if len(cuerpo)<=65536 else {}
        except (ValueError, OSError): datos_error={}
        mensaje=datos_error.get("mensaje") if isinstance(datos_error,dict) else None
        status=ex.code if ex.code in (400,403,404,409,503) else 502
        return JsonResponse({"mensaje":mensaje or "No se pudo completar la operación educativa."}, status=status)
    except (URLError, TimeoutError, OSError, ValueError):
        return JsonResponse({"mensaje":"No se pudo confirmar la operación. Comprueba lo guardado antes de volver a enviarla."}, status=502)

@never_cache
@require_POST
def vincular_estudiante(request): return _solicitar(request,"vinculos-estudiantes", "POST")
@never_cache
@require_GET
def listar_vinculos(request): return _solicitar(request,"vinculos-estudiantes", "GET")
@never_cache
@require_POST
def asignar_docente(request): return _solicitar(request,"asignaciones-docentes", "POST")
@never_cache
@require_GET
def listar_asignaciones(request): return _solicitar(request,"asignaciones-docentes", "GET")

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
    base = settings.EDU_API_URL.rstrip("/")
    if not base or not settings.CLAVE_INTERNA:
        return JsonResponse({"mensaje": "El servicio educativo no está disponible."}, status=503)
    peticion = Request(base + "/interno/docentes/" + str(usuario.id) + "/recursos/", method="GET", headers={
        "Accept": "application/json", "X-Clave-Interna": settings.CLAVE_INTERNA,
        "X-Sesion-Kusi": request.session.session_key or "",
    })
    try:
        with build_opener(SinRedirecciones()).open(peticion, timeout=5) as respuesta:
            cuerpo = respuesta.read(65537)
            if len(cuerpo) > 65536: raise ValueError("respuesta demasiado grande")
            return JsonResponse(json.loads(cuerpo), status=respuesta.status)
    except HTTPError as ex:
        try: cuerpo=ex.read(65537); dato=json.loads(cuerpo) if len(cuerpo)<=65536 else {}
        except (ValueError, OSError): dato={}
        return JsonResponse({"mensaje": dato.get("mensaje", "No se pudieron consultar tus recursos asignados.")}, status=ex.code if ex.code in (400,403,404,503) else 502)
    except (URLError, TimeoutError, OSError, ValueError):
        return JsonResponse({"mensaje": "No se pudieron consultar tus recursos asignados. Intenta nuevamente."}, status=502)
