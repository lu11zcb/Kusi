from django.contrib.auth.backends import ModelBackend

from .models import Usuario


class DniBackend(ModelBackend):
    """HU12: el estudiante ingresa a la app con su DNI y su contraseña."""

    def authenticate(self, request, dni=None, password=None, **kwargs):
        if not isinstance(dni, str) or not isinstance(password, str):
            return None
        try:
            usuario = Usuario.objects.get(dni=dni.strip(), groups__name="estudiante")
        except Usuario.DoesNotExist:
            # Igual coste que una contraseña real para no revelar qué DNI existen.
            Usuario().set_password(password)
            return None
        if usuario.check_password(password) and self.user_can_authenticate(usuario):
            return usuario
        return None
