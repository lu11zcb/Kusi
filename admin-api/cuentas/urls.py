from django.urls import path

from . import cursos_views, gestion_views, views


app_name = "cuentas"

urlpatterns = [
    path("registro/contexto/", views.contexto_registro, name="contexto_registro"),
    path("usuarios/", views.registrar_usuario, name="registrar_usuario"),
    path("usuarios/listado/", gestion_views.listar_usuarios, name="listar_usuarios"),
    path("usuarios/<uuid:usuario_id>/", gestion_views.consultar_usuario, name="consultar_usuario"),
    path("usuarios/<uuid:usuario_id>/roles/", gestion_views.asignar_roles, name="asignar_roles"),
    path("usuarios/<uuid:usuario_id>/datos/", gestion_views.editar_usuario, name="editar_usuario"),
    path("usuarios/<uuid:usuario_id>/estado/", gestion_views.cambiar_estado_usuario, name="cambiar_estado_usuario"),
    path("usuarios/<uuid:usuario_id>/contrasena-temporal/", gestion_views.generar_contrasena_usuario, name="generar_contrasena_usuario"),
    path("cursos/", cursos_views.listar_cursos, name="listar_cursos"),
    path("cursos/<uuid:curso_id>/", cursos_views.actualizar_curso, name="actualizar_curso"),
]
