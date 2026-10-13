from django import forms

from .models import Usuario


def validar_dni(valor, excluir=None):
    dni = (valor or "").strip() or None
    if dni is None:
        return None
    if len(dni) != 8 or not dni.isdigit():
        raise forms.ValidationError("El DNI debe tener 8 dígitos.")
    if Usuario.objects.filter(dni=dni).exclude(pk=excluir).exists():
        raise forms.ValidationError("Ya existe una cuenta con este DNI.")
    return dni


def exigir_identificacion(formulario, es_estudiante, datos):
    # HU12: el estudiante ingresa a la app con DNI; los adultos, con correo en la web.
    if es_estudiante and not datos.get("dni") and "dni" not in formulario.errors:
        formulario.add_error("dni", "El DNI es obligatorio para estudiantes.")
    if not es_estudiante and not datos.get("correo") and "correo" not in formulario.errors:
        formulario.add_error("correo", "El correo es obligatorio.")


class FormularioRegistroUsuario(forms.Form):
    # Los campos son obligatorios por defecto.
    nombre = forms.CharField(
        max_length=150,
        error_messages={
            "required": "El nombre es obligatorio.",
            "max_length": "El nombre no puede superar los 150 caracteres.",
        },
    )

    # Comprueba que el texto tenga un formato válido de correo.
    correo = forms.EmailField(
        max_length=254,
        required=False,
        error_messages={
            "invalid": "Escribe un correo válido.",
            "max_length": "El correo no puede superar los 254 caracteres.",
        },
    )

    # Solo permite los roles previstos para Kusi.
    rol = forms.ChoiceField(
        choices=(
            ("administrador", "Administrador"),
            ("docente", "Docente"),
            ("estudiante", "Estudiante"),
        ),
        error_messages={
            "required": "Selecciona un rol.",
            "invalid_choice": "Selecciona un rol válido.",
        },
    )

    dni = forms.CharField(required=False, max_length=8)

    def clean_correo(self):
        # Django llama a este método al validar el campo correo.
        correo = self.cleaned_data["correo"].strip().lower() or None

        # Busca coincidencias sin distinguir mayúsculas.
        if correo and Usuario.objects.filter(correo__iexact=correo).exists():
            raise forms.ValidationError(
                "Ya existe una cuenta con este correo."
            )

        return correo

    def clean_dni(self):
        return validar_dni(self.cleaned_data["dni"])

    def clean(self):
        datos = super().clean()
        exigir_identificacion(self, datos.get("rol") == "estudiante", datos)
        return datos


class FormularioEdicionUsuario(forms.Form):
    nombre = forms.CharField(max_length=150, error_messages={"required": "El nombre es obligatorio."})
    correo = forms.EmailField(max_length=254, required=False, error_messages={"invalid": "Escribe un correo válido."})
    dni = forms.CharField(required=False, max_length=8)

    def __init__(self, datos, usuario):
        super().__init__(datos)
        self.usuario = usuario

    def clean_correo(self):
        correo = self.cleaned_data["correo"].strip().lower() or None
        if correo and Usuario.objects.filter(correo__iexact=correo).exclude(pk=self.usuario.pk).exists():
            raise forms.ValidationError("Ya existe una cuenta con este correo.")
        return correo

    def clean_dni(self):
        return validar_dni(self.cleaned_data["dni"], self.usuario.pk)

    def clean(self):
        datos = super().clean()
        exigir_identificacion(self, self.usuario.groups.filter(name="estudiante").exists(), datos)
        return datos
