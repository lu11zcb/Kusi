import secrets

from django.contrib.auth.models import Group
from django.db import transaction

from .models import Usuario


def generar_contrasena_temporal():
    # Evitamos caracteres que pueden confundirse, como 0, O, 1, I y l.
    caracteres = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789"

    # Elegimos al azar 10 caracteres y los unimos en una contraseña.
    return "".join(secrets.choice(caracteres) for _ in range(10))


def crear_cuenta(datos_validados):
    """Crea una cuenta usando los datos ya revisados por el formulario."""

    contrasena_temporal = generar_contrasena_temporal()

    # La cuenta y su rol deben guardarse juntos.
    # Si algo falla, Django deshace estas operaciones.
    with transaction.atomic():
        usuario = Usuario.objects.create_user(
            nombre=datos_validados["nombre"],
            correo=datos_validados["correo"],
            dni=datos_validados.get("dni"),
            password=contrasena_temporal,
            debe_cambiar_contrasena=True,
        )

        # Busca el grupo del rol elegido; lo crea si todavía no existe.
        grupo, _ = Group.objects.get_or_create(
            name=datos_validados["rol"]
        )

        usuario.groups.add(grupo)

    # La contraseña original se devuelve para entregarla al administrador.
    return usuario, contrasena_temporal