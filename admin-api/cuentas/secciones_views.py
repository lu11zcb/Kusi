"""Adaptador administrativo HU06. La persistencia pertenece a Spring, no a Django."""
import json
import uuid
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener

from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.cache import never_cache
from django.views.decorators.debug import sensitive_variables
from django.views.decorators.http import require_POST

from .acceso_views import leer_json
from .permisos import exigir_administrador


class SinRedirecciones(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        # Nunca reenviar las credenciales internas a otro destino.
        return None


@never_cache
@require_POST
@sensitive_variables("peticion", "opener")
def crear_seccion(request):
    rechazo = exigir_administrador(request)
    if rechazo is not None:
        return rechazo
    datos, error = leer_json(request)
    if error is not None:
        return error
    nombre, grado, anio = (datos.get(campo) for campo in ("nombre", "grado", "anio_escolar"))
    if (set(datos) != {"nombre", "grado", "anio_escolar"} or not isinstance(nombre, str)
            or not nombre.strip() or len(nombre.strip()) > 80 or type(grado) is not int or grado != 1
            or type(anio) is not int or not 1000 <= anio <= 9999):
        return JsonResponse({"mensaje": "Indica primero de primaria, un nombre de hasta 80 caracteres y un año escolar de cuatro cifras."}, status=400)
    datos["nombre"] = " ".join(nombre.split())
    destino = settings.EDU_API_URL.rstrip("/")
    partes = urlsplit(destino)
    if (not destino or not settings.CLAVE_INTERNA or partes.scheme not in ("http", "https")
            or not partes.hostname or partes.username or partes.password or partes.query or partes.fragment
            or (partes.scheme == "http" and partes.hostname not in ("localhost", "127.0.0.1", "::1"))):
        return JsonResponse({"mensaje": "El servicio educativo todavía no está disponible. Conserva los datos e intenta más tarde."}, status=503)
    peticion = Request(destino + "/interno/secciones/", data=json.dumps(datos).encode("utf-8"), method="POST", headers={
        "Content-Type": "application/json", "Accept": "application/json",
        "X-Clave-Interna": settings.CLAVE_INTERNA, "X-Sesion-Kusi": request.session.session_key,
    })
    try:
        opener = build_opener(SinRedirecciones())
        with opener.open(peticion, timeout=5) as respuesta:
            cuerpo = respuesta.read(16385)
            if respuesta.status != 201 or len(cuerpo) > 16384:
                raise ValueError
            seccion = json.loads(cuerpo).get("seccion")
            if (not isinstance(seccion, dict) or not isinstance(seccion.get("nombre"), str)
                    or seccion.get("grado") != grado or seccion.get("anio_escolar") != anio):
                raise ValueError
            identificador = str(uuid.UUID(seccion["id"]))
            seccion = {"id": identificador, "nombre": seccion["nombre"], "grado": grado, "anio_escolar": anio}
    except HTTPError as fallo:
        fallo.close()
        if fallo.code == 409:
            return JsonResponse({"mensaje": "Ya existe una sección con ese nombre en el mismo año escolar."}, status=409)
        if fallo.code == 400:
            return JsonResponse({"mensaje": "Revisa el grado, nombre y año escolar de la sección."}, status=400)
        if fallo.code in (401, 403):
            return JsonResponse({"mensaje": "No se pudo autorizar la operación en el servicio educativo."}, status=503)
        return JsonResponse({"mensaje": "No se pudo confirmar la creación. Comprueba las secciones existentes antes de reintentar."}, status=502)
    except (URLError, TimeoutError, OSError, ValueError, TypeError, KeyError, AttributeError):
        return JsonResponse({"mensaje": "No se pudo confirmar la creación. Comprueba las secciones existentes antes de reintentar."}, status=502)
    return JsonResponse({"mensaje": "Sección creada.", "seccion": seccion}, status=201)
