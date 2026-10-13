from django.contrib.auth import SESSION_KEY
from django.contrib.auth.models import Group
from django.contrib.sessions.models import Session
from django.core.paginator import Paginator
from django.db import IntegrityError, transaction
from django.db.models import Q
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.views.decorators.cache import never_cache
from django.views.decorators.http import require_GET, require_POST, require_http_methods

from .acceso_views import ROLES, datos_usuario, leer_json
from .forms import FormularioEdicionUsuario
from .models import CambioUsuario, Usuario
from .permisos import exigir_administrador
from .servicios import generar_contrasena_temporal


def datos_usuario_administracion(usuario):
    return {**datos_usuario(usuario), "activo": usuario.is_active}


def revocar_sesiones_usuario(usuario):
    # Las sesiones son opacas y no tienen una FK al usuario. Se eliminan solo
    # las de esta cuenta para que reactivarla nunca rehabilite cookies antiguas.
    identificador = str(usuario.pk)
    claves = []
    for sesion in Session.objects.filter(expire_date__gt=timezone.now()).iterator():
        datos = sesion.get_decoded()
        if isinstance(datos, dict) and str(datos.get(SESSION_KEY)) == identificador:
            claves.append(sesion.session_key)
    if claves:
        Session.objects.filter(session_key__in=claves).delete()


@never_cache
@require_GET
def listar_usuarios(request):
    rechazo = exigir_administrador(request)
    if rechazo is not None:
        return rechazo
    try:
        pagina = int(request.GET.get("pagina", "1"))
        if pagina < 1:
            raise ValueError
    except ValueError:
        return JsonResponse({"mensaje": "La página debe ser un entero positivo."}, status=400)
    busqueda = request.GET.get("buscar", "").strip()[:150]
    consulta = Usuario.objects.filter(Q(nombre__icontains=busqueda) | Q(correo__icontains=busqueda) | Q(dni__icontains=busqueda)).order_by("nombre", "id")
    paginador = Paginator(consulta, 25)
    resultado = paginador.get_page(pagina)
    return JsonResponse({
        "usuarios": [datos_usuario_administracion(usuario) for usuario in resultado],
        "pagina": resultado.number, "paginas": paginador.num_pages, "total": paginador.count,
    })


@never_cache
@require_GET
def consultar_usuario(request, usuario_id):
    rechazo = exigir_administrador(request)
    if rechazo is not None:
        return rechazo
    usuario = get_object_or_404(Usuario, pk=usuario_id)
    cambios = usuario.cambios.select_related("administrador")[:50]
    return JsonResponse({
        "usuario": datos_usuario_administracion(usuario),
        "historial": [{
            "id": cambio.pk, "tipo": cambio.tipo, "fecha": cambio.fecha.isoformat(),
            "administrador_id": str(cambio.administrador_id),
            "administrador": cambio.administrador.nombre,
            "anterior": cambio.anterior, "actual": cambio.actual,
        } for cambio in cambios],
    })


@never_cache
@require_POST
def asignar_roles(request, usuario_id):
    rechazo = exigir_administrador(request)
    if rechazo is not None:
        return rechazo
    datos, error = leer_json(request)
    if error is not None:
        return error
    roles = datos.get("roles")
    if (set(datos) != {"roles"} or not isinstance(roles, list) or not roles
            or any(not isinstance(rol, str) or rol not in ROLES for rol in roles)
            or len(set(roles)) != len(roles)
            or ("estudiante" in roles and len(roles) != 1)):
        return JsonResponse({"mensaje": "Selecciona administrador, docente, ambos, o únicamente estudiante."}, status=400)
    with transaction.atomic():
        usuario = get_object_or_404(Usuario.objects.select_for_update(), pk=usuario_id)
        anterior = datos_usuario_administracion(usuario)["roles"]
        actual = sorted(roles)
        # HU12: un estudiante necesita DNI para la app; un adulto, correo para la web.
        if "estudiante" in actual and not usuario.dni:
            return JsonResponse({"mensaje": "Registra el DNI de la cuenta antes de asignarle el rol estudiante."}, status=400)
        if "estudiante" not in actual and not usuario.correo:
            return JsonResponse({"mensaje": "Registra el correo de la cuenta antes de asignarle un rol de adulto."}, status=400)
        if anterior != actual:
            # Solo modifica roles escolares; nunca grupos técnicos ni privilegios Django.
            usuario.groups.remove(*usuario.groups.filter(name__in=ROLES))
            usuario.groups.add(*[Group.objects.get_or_create(name=rol)[0] for rol in actual])
            CambioUsuario.objects.create(
                usuario=usuario, administrador=request.user, tipo="roles",
                anterior={"roles": anterior}, actual={"roles": actual},
            )
    return JsonResponse({"mensaje": "Roles guardados.", "usuario": datos_usuario_administracion(usuario)})


@never_cache
@require_http_methods(["PATCH"])
def editar_usuario(request, usuario_id):
    rechazo = exigir_administrador(request)
    if rechazo is not None:
        return rechazo
    datos, error = leer_json(request)
    if error is not None:
        return error
    if set(datos) not in ({"nombre", "correo"}, {"nombre", "correo", "dni"}) or any(not isinstance(valor, str) for valor in datos.values()):
        return JsonResponse({"mensaje": "Envía únicamente nombre, correo y DNI como texto."}, status=400)
    try:
        with transaction.atomic():
            usuario = get_object_or_404(Usuario.objects.select_for_update(), pk=usuario_id)
            formulario = FormularioEdicionUsuario({**datos, "dni": datos.get("dni", usuario.dni or "")}, usuario)
            if not formulario.is_valid():
                return JsonResponse({"mensaje": "Revisa los datos del usuario.", "errores": formulario.errors.get_json_data()}, status=400)
            anterior = {"nombre": usuario.nombre, "correo": usuario.correo, "dni": usuario.dni}
            actual = dict(formulario.cleaned_data)
            if anterior != actual:
                usuario.nombre = actual["nombre"]
                usuario.correo = actual["correo"]
                usuario.dni = actual["dni"]
                usuario.save(update_fields=["nombre", "correo", "dni"])
                CambioUsuario.objects.create(usuario=usuario, administrador=request.user, tipo="datos", anterior=anterior, actual=actual)
    except IntegrityError:
        if datos.get("dni") and Usuario.objects.filter(dni=datos["dni"].strip()).exclude(pk=usuario_id).exists():
            return JsonResponse({"mensaje": "Ya existe una cuenta con este DNI.", "errores": {"dni": [{"message": "Ya existe una cuenta con este DNI.", "code": "unique"}]}}, status=409)
        if Usuario.objects.filter(correo__iexact=datos["correo"].strip()).exclude(pk=usuario_id).exists():
            return JsonResponse({"mensaje": "Ya existe una cuenta con este correo.", "errores": {"correo": [{"message": "Ya existe una cuenta con este correo.", "code": "unique"}]}}, status=409)
        raise
    return JsonResponse({"mensaje": "Datos actualizados.", "usuario": datos_usuario_administracion(usuario)})


@never_cache
@require_POST
def cambiar_estado_usuario(request, usuario_id):
    rechazo = exigir_administrador(request)
    if rechazo is not None:
        return rechazo
    datos, error = leer_json(request)
    if error is not None:
        return error
    if set(datos) != {"activo"} or not isinstance(datos["activo"], bool):
        return JsonResponse({"mensaje": "Indica el estado de la cuenta con activo: true o activo: false."}, status=400)
    with transaction.atomic():
        usuario = get_object_or_404(Usuario.objects.select_for_update(), pk=usuario_id)
        anterior = {"activo": usuario.is_active}
        actual = {"activo": datos["activo"]}
        if anterior != actual:
            usuario.is_active = datos["activo"]
            usuario.save(update_fields=["is_active"])
            CambioUsuario.objects.create(
                usuario=usuario, administrador=request.user, tipo="estado",
                anterior=anterior, actual=actual,
            )
        if not usuario.is_active:
            revocar_sesiones_usuario(usuario)
    return JsonResponse({
        "mensaje": "Cuenta activada." if usuario.is_active else "Cuenta desactivada.",
        "usuario": datos_usuario_administracion(usuario),
    })


@never_cache
@require_POST
def generar_contrasena_usuario(request, usuario_id):
    """HU12: solo el administrador genera contraseñas. Si un estudiante olvida la
    suya, el administrador crea una temporal y el docente se la comunica."""
    rechazo = exigir_administrador(request)
    if rechazo is not None:
        return rechazo
    if usuario_id == request.user.pk:
        return JsonResponse({"mensaje": "Para tu propia cuenta usa «Cambiar contraseña»."}, status=400)
    with transaction.atomic():
        usuario = get_object_or_404(Usuario.objects.select_for_update(), pk=usuario_id)
        if not usuario.is_active:
            return JsonResponse({"mensaje": "Activa la cuenta antes de generar una contraseña."}, status=409)
        contrasena_temporal = generar_contrasena_temporal()
        usuario.set_password(contrasena_temporal)
        usuario.debe_cambiar_contrasena = True
        usuario.save(update_fields=["password", "debe_cambiar_contrasena"])
        # El historial registra quién y cuándo, nunca la contraseña.
        CambioUsuario.objects.create(
            usuario=usuario, administrador=request.user, tipo="contrasena_temporal",
            anterior={}, actual={"debe_cambiar_contrasena": True},
        )
    # La contraseña anterior deja de servir también en sesiones abiertas.
    revocar_sesiones_usuario(usuario)
    return JsonResponse({"usuario": datos_usuario_administracion(usuario), "contrasena_temporal": contrasena_temporal})
