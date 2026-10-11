from django.urls import path

from . import views


app_name = "cuentas"

urlpatterns = [
    path("registro/contexto/", views.contexto_registro, name="contexto_registro"),
    path("usuarios/", views.registrar_usuario, name="registrar_usuario"),
]
