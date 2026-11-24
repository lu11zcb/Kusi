import json
from django.contrib.auth.models import Group
from django.test import Client, TestCase
from django.urls import reverse
from .models import Usuario, CambioUsuario


class RecuperacionEstudianteTest(TestCase):
    def test_hu14_contrasena_nueva_ingresa_a_la_misma_cuenta(self):
        admin = Usuario.objects.create_superuser(correo="admin-hu14@example.com", nombre="Admin", password="ClaveAdmin2026!")
        estudiante = Usuario.objects.create_user(correo=None, dni="76543210", nombre="Ana", password="Anterior2026!", debe_cambiar_contrasena=False)
        estudiante.groups.add(Group.objects.get_or_create(name="estudiante")[0])
        identidad = estudiante.pk
        fecha = estudiante.fecha_creacion
        from pathlib import Path
        movil = Path(__file__).resolve().parents[2] / "movil/app/src/main/java/pe/kusi/movil/PantallasReferencia.kt"
        contrato = movil.read_text(encoding="utf-8")
        self.assertIn('"creado_${cuenta.id}"', contrato)
        self.assertIn('"pelaje_${cuenta.id}"', contrato)
        claves_cuy = (f"creado_{identidad}", f"pelaje_{identidad}")
        anterior = Client(enforce_csrf_checks=True)
        token = anterior.get(reverse("acceso:sesion")).json()["csrf_token"]
        ingreso = anterior.post(reverse("acceso:ingresar"), json.dumps({"dni": estudiante.dni, "contrasena": "Anterior2026!"}), content_type="application/json", HTTP_X_CSRFTOKEN=token)
        self.assertEqual(ingreso.json()["usuario"]["id"], str(identidad))
        self.client.force_login(admin)
        respuesta = self.client.post(reverse("cuentas:generar_contrasena_usuario", args=[identidad]), "{}", content_type="application/json")
        self.assertEqual(respuesta.status_code, 200)
        temporal = respuesta.json()["contrasena_temporal"]
        self.assertIsNone(anterior.get(reverse("acceso:sesion")).json()["usuario"])
        nuevo = Client(enforce_csrf_checks=True)
        token = nuevo.get(reverse("acceso:sesion")).json()["csrf_token"]
        self.assertEqual(nuevo.post(reverse("acceso:ingresar"), json.dumps({"dni": estudiante.dni, "contrasena": "Anterior2026!"}), content_type="application/json", HTTP_X_CSRFTOKEN=token).status_code, 401)
        ingreso = nuevo.post(reverse("acceso:ingresar"), json.dumps({"dni": estudiante.dni, "contrasena": temporal}), content_type="application/json", HTTP_X_CSRFTOKEN=token)
        self.assertEqual(ingreso.status_code, 200)
        self.assertEqual(ingreso.json()["usuario"]["id"], str(identidad))
        token = ingreso.json()["csrf_token"]
        cambio = nuevo.post(reverse("acceso:cambiar_contrasena"), json.dumps({"contrasena_actual": temporal, "nueva_contrasena": "NuevaSegura2026!", "confirmacion": "NuevaSegura2026!"}), content_type="application/json", HTTP_X_CSRFTOKEN=token)
        self.assertEqual(cambio.status_code, 200)
        self.assertEqual(cambio.json()["usuario"]["id"], str(identidad))
        estudiante.refresh_from_db()
        self.assertEqual(claves_cuy, (f"creado_{estudiante.pk}", f"pelaje_{estudiante.pk}"))
        self.assertEqual(estudiante.fecha_creacion, fecha)
        self.assertFalse(estudiante.debe_cambiar_contrasena)
        self.assertEqual(Usuario.objects.filter(dni="76543210").count(), 1)
        self.assertEqual(list(estudiante.groups.values_list("name", flat=True)), ["estudiante"])
        self.assertNotIn(temporal, json.dumps(CambioUsuario.objects.get(usuario=estudiante).actual))
