from django.urls import path

from . import acceso_views as views


app_name = "acceso"
urlpatterns = [
    path("sesion/", views.sesion, name="sesion"),
    path("ingreso/", views.ingresar, name="ingresar"),
    path("salida/", views.salir, name="salir"),
    path("contrasena/", views.cambiar_contrasena, name="cambiar_contrasena"),
]
