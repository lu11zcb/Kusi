import json

from django.db import IntegrityError
from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.views.decorators.cache import never_cache
from django.views.decorators.http import require_GET, require_POST
from django.views.csrf import csrf_failure as respuesta_csrf_django

from .forms import FormularioRegistroUsuario
from .models import Usuario
from .servicios import crear_cuenta


def comprobar_permiso_registro(request):
    # Solo un administrador con sesión iniciada puede registrar cuentas.
    if not request.user.is_authenticated:
        return JsonResponse(
            {"mensaje": "Debes iniciar sesión."},
            status=401,
        )

    es_administrador = request.user.groups.filter(
        name="administrador"
    ).exists()

    if not request.user.is_active or not es_administrador:
        return JsonResponse(
            {"mensaje": "No tienes permiso para registrar usuarios."},
            status=403,
        )

    if request.user.debe_cambiar_contrasena:
        return JsonResponse(
            {"mensaje": "Debes cambiar tu contraseña temporal antes de registrar usuarios."},
            status=403,
        )

    return None


@never_cache
@require_GET
def contexto_registro(request):
    """Prepara el formulario usando la sesión existente, sin iniciar otra."""
    rechazo = comprobar_permiso_registro(request)
    if rechazo is not None:
        return rechazo

    return JsonResponse({
        "usuario": {
            "id": str(request.user.id),
            "nombre": request.user.nombre,
            "correo": request.user.correo,
        },
        "csrf_token": get_token(request),
    })


@never_cache
def fallo_csrf(request, reason=""):
    # El administrador técnico conserva la página de error de Django.
    if not request.path.startswith("/api/"):
        return respuesta_csrf_django(request, reason=reason)

    return JsonResponse(
        {"mensaje": "La verificación de seguridad falló. Recarga la página e intenta de nuevo."},
        status=403,
    )


# Evita guardar en caché la respuesta con la contraseña temporal.
@never_cache
@require_POST
def registrar_usuario(request):
    rechazo = comprobar_permiso_registro(request)
    if rechazo is not None:
        return rechazo

    if request.content_type != "application/json":
        return JsonResponse(
            {"mensaje": "Envía los datos con el tipo application/json."},
            status=415,
        )

    # Convertimos el JSON enviado por React en un diccionario de Python.
    try:
        datos = json.loads(request.body)
    except (json.JSONDecodeError, UnicodeDecodeError):
        return JsonResponse(
            {"mensaje": "Los datos enviados no son un JSON válido."},
            status=400,
        )

    if not isinstance(datos, dict):
        return JsonResponse(
            {"mensaje": "Envía los datos como un objeto JSON."},
            status=400,
        )

    errores_tipo = {
        campo: [{"message": "Este dato debe ser un texto.", "code": "invalid_type"}]
        for campo in ("nombre", "correo", "rol")
        if campo in datos and not isinstance(datos[campo], str)
    }
    if errores_tipo:
        return JsonResponse(
            {"mensaje": "Revisa los datos del registro.", "errores": errores_tipo},
            status=400,
        )

    # Comprobamos los campos antes de intentar guardar la cuenta.
    formulario = FormularioRegistroUsuario(datos)

    if not formulario.is_valid():
        return JsonResponse(
            {
                "mensaje": "Revisa los datos del registro.",
                "errores": formulario.errors.get_json_data(),
            },
            status=400,
        )

    try:
        usuario, contrasena_temporal = crear_cuenta(
            formulario.cleaned_data
        )
    except IntegrityError:
        # Dos solicitudes podrían intentar registrar el mismo correo
        # al mismo tiempo, después de superar la validación inicial.
        correo = formulario.cleaned_data["correo"]

        if Usuario.objects.filter(correo__iexact=correo).exists():
            return JsonResponse(
                {
                    "mensaje": "Ya existe una cuenta con este correo.",
                    "errores": {"correo": [{
                        "message": "Ya existe una cuenta con este correo.",
                        "code": "unique",
                    }]},
                },
                status=409,
            )

        # Si fue otro problema de la base, no lo ocultamos como duplicado.
        raise

    # Entregamos los datos de la cuenta y su contraseña temporal.
    return JsonResponse(
        {
            "mensaje": "Usuario registrado correctamente.",
            "usuario": {
                "id": str(usuario.id),
                "nombre": usuario.nombre,
                "correo": usuario.correo,
                "rol": formulario.cleaned_data["rol"],
            },
            "contrasena_temporal": contrasena_temporal,
        },
        status=201,
    )
