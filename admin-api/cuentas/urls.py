from django.urls import path

from . import gestion_views, views


app_name = "cuentas"

urlpatterns = [
    path("registro/contexto/", views.contexto_registro, name="contexto_registro"),
    path("usuarios/", views.registrar_usuario, name="registrar_usuario"),
    path("usuarios/listado/", gestion_views.listar_usuarios, name="listar_usuarios"),
    path("usuarios/<uuid:usuario_id>/", gestion_views.consultar_usuario, name="consultar_usuario"),
    path("usuarios/<uuid:usuario_id>/roles/", gestion_views.asignar_roles, name="asignar_roles"),
]
