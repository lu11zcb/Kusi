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


# Cabecera con la que el panel web manda la sesión de cada pestaña (ver web/src/servicios/sesionPestana.ts).
CABECERA_SESION = "HTTP_X_KUSI_SESION"


def sesion_de_pestana_valida(valor):
    """Las claves de sesión de Django son letras minúsculas y números; cualquier otra cosa se descarta."""
    return isinstance(valor, str) and 0 < len(valor) <= 64 and valor.isascii() and valor.isalnum() and valor.islower()


class SesionPorPestanaMiddleware:
    """Varias cuentas a la vez en el mismo navegador: cada pestaña del panel manda su propia sesión.

    El navegador comparte la cookie de sesión entre todas las pestañas, así que entrar con otra cuenta en una
    pestaña cambiaba la de las demás. El panel guarda la sesión de cada pestaña y la manda en X-Kusi-Sesion
    (vacía si esa pestaña todavía no inició sesión). Si llega, manda sobre la cookie; la app del celular no la
    manda y sigue con su cookie de siempre. Va antes de SessionMiddleware, que lee la sesión de request.COOKIES.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if CABECERA_SESION in request.META:
            from django.conf import settings

            valor = request.META[CABECERA_SESION].strip()
            if sesion_de_pestana_valida(valor):
                request.COOKIES[settings.SESSION_COOKIE_NAME] = valor
            else:
                request.COOKIES.pop(settings.SESSION_COOKIE_NAME, None)
        return self.get_response(request)
