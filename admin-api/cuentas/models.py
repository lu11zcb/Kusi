import uuid

from django.contrib.auth.models import (
    AbstractBaseUser,
    BaseUserManager,
    Group,
    PermissionsMixin,
)
from django.db import models, transaction
from django.db.models.functions import Lower


class GestorUsuarios(BaseUserManager):
    """Centraliza la creación de usuarios y del administrador inicial."""

    use_in_migrations = True

    # Django utiliza estos nombres de métodos y el parámetro password.
    def create_user(self, correo, password=None, **datos):
        if not correo or not correo.strip():
            raise ValueError("El correo es obligatorio.")

        # Normalizamos el correo para evitar cuentas distintas
        # por diferencias entre mayúsculas y minúsculas.
        correo_normalizado = self.normalize_email(correo.strip()).lower()

        usuario = self.model(correo=correo_normalizado, **datos)

        # Guarda una representación protegida, nunca la contraseña original.
        usuario.set_password(password)
        usuario.save(using=self._db)

        return usuario

    def create_superuser(self, correo, password=None, **datos):
        datos.setdefault("is_staff", True)
        datos.setdefault("is_superuser", True)
        datos.setdefault("debe_cambiar_contrasena", False)

        if datos["is_staff"] is not True:
            raise ValueError("El superusuario debe tener is_staff=True.")

        if datos["is_superuser"] is not True:
            raise ValueError("El superusuario debe tener is_superuser=True.")

        if not password:
            raise ValueError("El administrador necesita una contraseña.")

        # La cuenta y su rol se guardan juntos.
        # Si falla una operación, se deshacen ambas.
        with transaction.atomic(using=self._db):
            usuario = self.create_user(correo, password, **datos)

            rol_administrador, _ = Group.objects.using(
                self._db
            ).get_or_create(name="administrador")

            usuario.groups.add(rol_administrador)

        return usuario


class Usuario(AbstractBaseUser, PermissionsMixin):
    """Cuenta común para administradores, docentes y estudiantes."""

    # El identificador permanece estable aunque cambien los datos.
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    nombre = models.CharField(max_length=150)
    correo = models.EmailField(unique=True)

    # Estos nombres son los que espera el sistema de acceso de Django.
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    debe_cambiar_contrasena = models.BooleanField(default=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    objects = GestorUsuarios()

    # El ingreso utilizará el correo, sin un nombre de usuario adicional.
    USERNAME_FIELD = "correo"
    EMAIL_FIELD = "correo"
    REQUIRED_FIELDS = ["nombre"]

    class Meta:
        verbose_name = "usuario"
        verbose_name_plural = "usuarios"

        # La base también impide duplicados como Luis@correo.com
        # y luis@correo.com, aunque se guarden por otro camino.
        constraints = [
            models.UniqueConstraint(
                Lower("correo"),
                name="usuario_correo_sin_mayusculas_unico",
            ),
        ]

    def __str__(self):
        return self.nombre + " - " + self.correo


class CambioUsuario(models.Model):
    """Historial administrativo sin contraseñas ni datos de sesión."""

    usuario = models.ForeignKey(Usuario, on_delete=models.PROTECT, related_name="cambios")
    administrador = models.ForeignKey(Usuario, on_delete=models.PROTECT, related_name="cambios_realizados")
    tipo = models.CharField(max_length=20)
    anterior = models.JSONField()
    actual = models.JSONField()
    fecha = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-fecha", "-id"]


class Curso(models.Model):
    """Catálogo de Django; Spring referencia el UUID, nunca el nombre."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    nombre = models.CharField(max_length=120)

    class Meta:
        ordering = ["nombre", "id"]
        constraints = [models.UniqueConstraint(Lower("nombre"), name="curso_nombre_sin_mayusculas_unico")]

    def __str__(self):
        return self.nombre
