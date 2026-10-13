import secrets
import uuid
from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.cache import never_cache
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET
from .acceso_views import ROLES, datos_usuario
from .models import Curso, Usuario

@never_cache
@csrf_exempt
@require_GET
def consultar_cuenta_interna(request, usuario_id):
    clave = settings.CLAVE_INTERNA
    recibida = request.headers.get("X-Clave-Interna", "")
    if not clave or not secrets.compare_digest(recibida.encode(), clave.encode()):
        return JsonResponse({"mensaje": "Servicio no autorizado."}, status=403)
    try:
        usuario = Usuario.objects.get(pk=usuario_id)
    except (Usuario.DoesNotExist, ValueError):
        return JsonResponse({"mensaje": "Cuenta no encontrada."}, status=404)
    datos = datos_usuario(usuario)
    datos["activo"] = usuario.is_active
    return JsonResponse({"usuario": datos})

@never_cache
@csrf_exempt
@require_GET
def consultar_curso_interno(request, curso_id):
    clave = settings.CLAVE_INTERNA
    recibida = request.headers.get("X-Clave-Interna", "")
    if not clave or not secrets.compare_digest(recibida.encode(), clave.encode()):
        return JsonResponse({"mensaje": "Servicio no autorizado."}, status=403)
    try:
        curso = Curso.objects.get(pk=curso_id)
    except (Curso.DoesNotExist, ValueError):
        return JsonResponse({"mensaje": "Curso no encontrado."}, status=404)
    return JsonResponse({"curso": {"id": str(curso.id), "nombre": curso.nombre}})
