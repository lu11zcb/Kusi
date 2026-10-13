import uuid

from django.contrib.auth import SESSION_KEY
from django.contrib.auth.models import AnonymousUser
from django.core.exceptions import ValidationError


def validar_identidad_sesion(almacen):
    identificador = almacen.get(SESSION_KEY)
    if identificador is not None:
        if not isinstance(identificador, str):
            raise ValueError("Identidad de sesión incompatible.")
        uuid.UUID(identificador)


class SesionCompatibleMiddleware:
    """Descarta cookies de sesión con identidad incompatible con el modelo."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        try:
            validar_identidad_sesion(request.session)
            # AuthenticationMiddleware resuelve el usuario de forma diferida.
            # Aquí se comprueba antes de entrar en cualquier vista protegida.
            request.user.is_authenticated
        except (ValidationError, ValueError, TypeError, AttributeError):
            request.session.flush()
            request.user = AnonymousUser()
            request._cached_user = request.user
        return self.get_response(request)
