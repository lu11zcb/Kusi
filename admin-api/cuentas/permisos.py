from django.http import JsonResponse


def exigir_administrador(request):
    if not request.user.is_authenticated:
        return JsonResponse({"mensaje": "Debes iniciar sesión."}, status=401)
    if not request.user.is_active or not request.user.groups.filter(name="administrador").exists():
        return JsonResponse({"mensaje": "Esta operación requiere el rol administrador."}, status=403)
    if request.user.debe_cambiar_contrasena:
        return JsonResponse({"mensaje": "Debes cambiar tu contraseña temporal."}, status=403)
    return None
