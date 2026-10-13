"""
URL configuration for kusi_admin project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import include, path
from cuentas.acceso_views import validar_sesion_interna
from cuentas.secciones_views import crear_seccion
from cuentas import interno_views, educacion_views

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/cuentas/', include('cuentas.urls')),
    path('api/acceso/', include('cuentas.acceso_urls')),
    path('api/interno/sesiones/validar/', validar_sesion_interna, name='validar_sesion_interna'),
    path('api/educacion/secciones/', crear_seccion, name='crear_seccion'),
    path('api/interno/cuentas/<uuid:usuario_id>/', interno_views.consultar_cuenta_interna, name='consultar_cuenta_interna'),
    path('api/interno/cursos/<uuid:curso_id>/', interno_views.consultar_curso_interno, name='consultar_curso_interno'),
    path('api/educacion/vinculos-estudiantes/', educacion_views.listar_vinculos, name='listar_vinculos'),
    path('api/educacion/vinculos-estudiantes/crear/', educacion_views.vincular_estudiante, name='vincular_estudiante'),
    path('api/educacion/asignaciones-docentes/', educacion_views.listar_asignaciones, name='listar_asignaciones'),
    path('api/educacion/asignaciones-docentes/crear/', educacion_views.asignar_docente, name='asignar_docente'),
    path('api/educacion/mis-asignaciones/', educacion_views.mis_asignaciones_docente, name='mis_asignaciones_docente'),
]
