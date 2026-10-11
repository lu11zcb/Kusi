from django import forms
from django.db import IntegrityError, transaction
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.cache import never_cache
from django.views.decorators.http import require_GET, require_http_methods

from .acceso_views import leer_json
from .models import Curso
from .permisos import exigir_administrador


def datos_curso(curso):
    return {"id": str(curso.pk), "nombre": curso.nombre}


@never_cache
@require_GET
def listar_cursos(request):
    rechazo = exigir_administrador(request)
    if rechazo is not None:
        return rechazo
    return JsonResponse({"cursos": [datos_curso(curso) for curso in Curso.objects.all()]})


@never_cache
@require_http_methods(["PATCH"])
def actualizar_curso(request, curso_id):
    rechazo = exigir_administrador(request)
    if rechazo is not None:
        return rechazo
    datos, error = leer_json(request)
    if error is not None:
        return error
    if set(datos) != {"nombre"} or not isinstance(datos.get("nombre"), str):
        return JsonResponse({"mensaje": "Envía únicamente el nombre del curso como texto."}, status=400)
    try:
        nombre = forms.CharField(max_length=120).clean(datos["nombre"])
    except forms.ValidationError:
        return JsonResponse({"mensaje": "Escribe un nombre de curso de entre 1 y 120 caracteres."}, status=400)
    try:
        with transaction.atomic():
            curso = get_object_or_404(Curso.objects.select_for_update(), pk=curso_id)
            if Curso.objects.filter(nombre__iexact=nombre).exclude(pk=curso.pk).exists():
                return JsonResponse({"mensaje": "Ya existe un curso con este nombre."}, status=400)
            curso.nombre = nombre
            curso.save(update_fields=["nombre"])
    except IntegrityError:
        if Curso.objects.filter(nombre__iexact=nombre).exclude(pk=curso_id).exists():
            return JsonResponse({"mensaje": "Ya existe un curso con este nombre."}, status=409)
        raise
    return JsonResponse({"mensaje": "Curso actualizado.", "curso": datos_curso(curso)})
