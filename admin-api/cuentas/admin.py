from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import Usuario


@admin.register(Usuario)
class AdministracionUsuario(UserAdmin):
    # Columnas, búsqueda y orden de la lista de usuarios.
    list_display = ("nombre", "correo", "is_active", "is_staff")
    search_fields = ("nombre", "correo")
    ordering = ("correo",)

    # Campos que aparecen al editar un usuario existente.
    fieldsets = (
        ("Cuenta", {
            "fields": ("correo", "nombre", "password"),
        }),
        ("Acceso y permisos", {
            "fields": (
                "is_active",
                "is_staff",
                "is_superuser",
                "groups",
                "user_permissions",
                "debe_cambiar_contrasena",
            ),
        }),
    )

    # Campos que aparecen al agregar un usuario.
    add_fieldsets = (
        ("Nueva cuenta", {
            "classes": ("wide",),
            "fields": (
                "correo",
                "nombre",
                "usable_password",
                "password1",
                "password2",
            ),
        }),
    )

    def save_model(self, request, obj, form, change):
        # Conservamos los correos sin espacios y en minúsculas.
        obj.correo = obj.correo.strip().lower()
        super().save_model(request, obj, form, change)