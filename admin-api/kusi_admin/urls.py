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

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/cuentas/', include('cuentas.urls')),
    path('api/acceso/', include('cuentas.acceso_urls')),
    path('api/interno/sesiones/validar/', validar_sesion_interna, name='validar_sesion_interna'),
    path('api/educacion/secciones/', crear_seccion, name='crear_seccion'),
]
