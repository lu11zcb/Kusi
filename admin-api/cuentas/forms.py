from django import forms

from .models import Usuario


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
        error_messages={
            "required": "El correo es obligatorio.",
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

    def clean_correo(self):
        # Django llama a este método al validar el campo correo.
        correo = self.cleaned_data["correo"].strip().lower()

        # Busca coincidencias sin distinguir mayúsculas.
        if Usuario.objects.filter(correo__iexact=correo).exists():
            raise forms.ValidationError(
                "Ya existe una cuenta con este correo."
            )

        return correo


class FormularioEdicionUsuario(forms.Form):
    nombre = forms.CharField(max_length=150, error_messages={"required": "El nombre es obligatorio."})
    correo = forms.EmailField(max_length=254, error_messages={"required": "El correo es obligatorio.", "invalid": "Escribe un correo válido."})

    def __init__(self, datos, usuario):
        super().__init__(datos)
        self.usuario = usuario

    def clean_correo(self):
        correo = self.cleaned_data["correo"].strip().lower()
        if Usuario.objects.filter(correo__iexact=correo).exclude(pk=self.usuario.pk).exists():
            raise forms.ValidationError("Ya existe una cuenta con este correo.")
        return correo
