import json
import secrets
from types import SimpleNamespace

from django.conf import settings
from django.contrib.auth import authenticate, get_user, login, logout, update_session_auth_hash
from django.contrib.auth.password_validation import validate_password
from django.contrib.sessions.backends.db import SessionStore
from django.contrib.sessions.models import Session
from django.core.exceptions import ValidationError
from django.db import transaction
from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.utils import timezone
from django.views.decorators.cache import never_cache
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_POST
from django.views.decorators.debug import sensitive_variables

from .models import Usuario


ROLES = ("administrador", "docente", "estudiante")


def datos_usuario(usuario):
    return {
        "id": str(usuario.id), "nombre": usuario.nombre, "correo": usuario.correo,
        "roles": list(usuario.groups.filter(name__in=ROLES).order_by("name").values_list("name", flat=True)),
        "debe_cambiar_contrasena": usuario.debe_cambiar_contrasena,
    }


def leer_json(request):
    if request.content_type != "application/json":
        return None, JsonResponse({"mensaje": "Envía los datos como JSON."}, status=415)
    try:
        datos = json.loads(request.body)
    except (ValueError, UnicodeDecodeError):
        return None, JsonResponse({"mensaje": "Los datos enviados no son un JSON válido."}, status=400)
    if not isinstance(datos, dict):
        return None, JsonResponse({"mensaje": "Envía un objeto JSON."}, status=400)
    return datos, None


@never_cache
@require_GET
def sesion(request):
    usuario = request.user
    return JsonResponse({
        "usuario": datos_usuario(usuario) if usuario.is_authenticated and usuario.is_active else None,
        "csrf_token": get_token(request),
    })


@never_cache
@require_POST
@sensitive_variables("datos", "contrasena")
def ingresar(request):
    datos, error = leer_json(request)
    if error is not None:
        return error
    correo = datos.get("correo")
    contrasena = datos.get("contrasena")
    usuario = None
    if isinstance(correo, str) and isinstance(contrasena, str):
        usuario = authenticate(request, correo=correo.strip().lower(), password=contrasena)
    if usuario is None or not usuario.is_active:
        return JsonResponse({"mensaje": "Correo o contraseña incorrectos"}, status=401)
    login(request, usuario)
    return JsonResponse({"usuario": datos_usuario(usuario), "csrf_token": get_token(request)})


@never_cache
@require_POST
def salir(request):
    logout(request)
    return JsonResponse({"usuario": None, "csrf_token": get_token(request)})


@never_cache
@require_POST
@sensitive_variables("datos", "actual", "nueva", "confirmacion")
def cambiar_contrasena(request):
    if not request.user.is_authenticated or not request.user.is_active:
        return JsonResponse({"mensaje": "Debes iniciar sesión."}, status=401)
    datos, error = leer_json(request)
    if error is not None:
        return error
    actual, nueva, confirmacion = (datos.get(campo) for campo in ("contrasena_actual", "nueva_contrasena", "confirmacion"))
    if not all(isinstance(valor, str) and valor for valor in (actual, nueva, confirmacion)):
        return JsonResponse({"mensaje": "Completa las tres contraseñas."}, status=400)
    with transaction.atomic():
        usuario = Usuario.objects.select_for_update().get(pk=request.user.pk)
        if not usuario.is_active or not usuario.check_password(actual):
            return JsonResponse({"mensaje": "La contraseña actual es incorrecta."}, status=400)
        if nueva != confirmacion:
            return JsonResponse({"mensaje": "Las contraseñas nuevas no coinciden."}, status=400)
        if usuario.check_password(nueva):
            return JsonResponse({"mensaje": "Elige una contraseña diferente de la actual."}, status=400)
        try:
            validate_password(nueva, usuario)
        except ValidationError as error_validacion:
            return JsonResponse({"mensaje": " ".join(error_validacion.messages)}, status=400)
        usuario.set_password(nueva)
        usuario.debe_cambiar_contrasena = False
        usuario.save(update_fields=["password", "debe_cambiar_contrasena"])
    update_session_auth_hash(request, usuario)
    return JsonResponse({"usuario": datos_usuario(usuario), "csrf_token": get_token(request)})


@never_cache
@csrf_exempt
@require_POST
@sensitive_variables("datos", "clave", "sesion_opaca")
def validar_sesion_interna(request):
    # Solo servicio a servicio: no usa la cookie del navegador para autorizar.
    # Se excluye CSRF exclusivamente aquí y se exige la clave interna del contrato.
    clave = settings.CLAVE_INTERNA
    if not clave:
        return JsonResponse({"mensaje": "La validación interna no está configurada."}, status=503)
    recibida = request.headers.get("X-Clave-Interna", "")
    if not secrets.compare_digest(recibida.encode("utf-8"), clave.encode("utf-8")):
        return JsonResponse({"mensaje": "Servicio no autorizado."}, status=403)
    datos, error = leer_json(request)
    if error is not None:
        return error
    sesion_opaca = datos.get("sesion")
    if not isinstance(sesion_opaca, str) or not sesion_opaca or len(sesion_opaca) > 64:
        return JsonResponse({"mensaje": "Sesión inválida."}, status=401)
    almacen = SessionStore(session_key=sesion_opaca)
    usuario = get_user(SimpleNamespace(session=almacen))
    if not usuario.is_authenticated or not usuario.is_active:
        return JsonResponse({"mensaje": "Sesión inválida."}, status=401)
    if usuario.debe_cambiar_contrasena:
        return JsonResponse({"mensaje": "Debes cambiar tu contraseña temporal."}, status=403)
    # get_expiry_age() puede usar la duración predeterminada aunque la fila
    # persistida esté a punto de caducar. Spring no debe ampliar ese plazo.
    ahora = timezone.now()
    expiracion = Session.objects.filter(
        session_key=almacen.session_key, expire_date__gt=ahora,
    ).values_list("expire_date", flat=True).first()
    if expiracion is None:
        return JsonResponse({"mensaje": "Sesión inválida."}, status=401)
    return JsonResponse({
        "usuario": datos_usuario(usuario),
        "cache_maxima_segundos": min(60, max(0, int((expiracion - ahora).total_seconds()))),
    })
