import json

from django.contrib.auth.models import Group
from django.test import Client, TestCase
from django.urls import reverse

from .models import CambioUsuario, Usuario


class RolesTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.admin = Usuario.objects.create_superuser("admin-roles@example.com", "ClaveSegura2026!", nombre="Admin QA")
        cls.persona = Usuario.objects.create_user("persona@example.com", "ClavePersona2026!", nombre="Persona QA", debe_cambiar_contrasena=False, dni="40000002")
        cls.persona.groups.add(Group.objects.create(name="docente"))

    def setUp(self):
        self.client = Client(enforce_csrf_checks=True)
        self.client.force_login(self.admin)
        self.token = self.client.get(reverse("acceso:sesion")).json()["csrf_token"]
        self.url = reverse("cuentas:asignar_roles", args=[self.persona.pk])

    def guardar(self, roles, **extra):
        return self.client.post(self.url, json.dumps({"roles": roles, **extra}), content_type="application/json", HTTP_X_CSRFTOKEN=self.token)

    def test_asigna_ambos_roles_sin_privilegios_y_con_historial(self):
        respuesta = self.guardar(["docente", "administrador"])
        self.assertEqual(respuesta.status_code, 200)
        self.persona.refresh_from_db()
        self.assertEqual(respuesta.json()["usuario"]["roles"], ["administrador", "docente"])
        self.assertFalse(self.persona.is_staff)
        self.assertFalse(self.persona.is_superuser)
        cambio = CambioUsuario.objects.get(usuario=self.persona)
        self.assertEqual(cambio.administrador_id, self.admin.pk)
        self.assertEqual(cambio.anterior, {"roles": ["docente"]})
        self.assertEqual(cambio.actual, {"roles": ["administrador", "docente"]})
        self.assertEqual(self.guardar(["administrador", "docente"]).status_code, 200)
        self.assertEqual(CambioUsuario.objects.count(), 1)

    def test_rechaza_roles_invalidos_y_campos_tecnicos_sin_cambiar_nada(self):
        for roles in ([], "administrador", ["estudiante", "docente"], ["otro"], ["docente", "docente"], [None], [{}]):
            with self.subTest(roles=roles):
                self.assertEqual(self.guardar(roles).status_code, 400)
        self.assertEqual(self.guardar(["administrador"], is_staff=True).status_code, 400)
        self.assertEqual(list(self.persona.groups.values_list("name", flat=True)), ["docente"])
        self.assertFalse(CambioUsuario.objects.exists())

    def test_cada_rol_individual_y_grupos_tecnicos_se_conservan(self):
        tecnico = Group.objects.create(name="grupo-tecnico")
        self.persona.groups.add(tecnico)
        for rol in ("estudiante", "administrador", "docente"):
            self.assertEqual(self.guardar([rol]).status_code, 200)
            self.assertTrue(self.persona.groups.filter(pk=tecnico.pk).exists())
        self.assertEqual(CambioUsuario.objects.count(), 3)

    def test_apis_directas_exigen_administrador_y_contrasena_definitiva(self):
        urls = [reverse("cuentas:listar_usuarios"), reverse("cuentas:consultar_usuario", args=[self.persona.pk])]
        for usuario, esperado in ((None, 401), (self.persona, 403)):
            self.client.logout()
            if usuario:
                self.client.force_login(usuario)
            token = self.client.get(reverse("acceso:sesion")).json()["csrf_token"]
            for url in urls:
                self.assertEqual(self.client.get(url).status_code, esperado)
            self.assertEqual(self.client.post(self.url, json.dumps({"roles": ["administrador"]}), content_type="application/json", HTTP_X_CSRFTOKEN=token).status_code, esperado)
        self.admin.debe_cambiar_contrasena = True
        self.admin.save()
        self.client.force_login(self.admin)
        self.assertEqual(self.client.get(urls[0]).status_code, 403)

    def test_csrf_y_usuario_inexistente(self):
        self.assertEqual(self.client.post(self.url, '{"roles":["docente"]}', content_type="application/json").status_code, 403)
        self.url = reverse("cuentas:asignar_roles", args=["00000000-0000-0000-0000-000000000000"])
        self.assertEqual(self.guardar(["docente"]).status_code, 404)

    def test_listado_filtrado_y_detalle_no_exponen_contrasenas(self):
        respuesta = self.client.get(reverse("cuentas:listar_usuarios"), {"buscar": "PERSONA@"})
        self.assertEqual(respuesta.json()["total"], 1)
        self.assertEqual(respuesta.json()["usuarios"][0]["id"], str(self.persona.pk))
        self.assertNotIn("password", respuesta.content.decode())
        self.assertIn("no-store", respuesta.headers["Cache-Control"])
        self.guardar(["administrador"])
        detalle = self.client.get(reverse("cuentas:consultar_usuario", args=[self.persona.pk])).json()
        self.assertEqual(len(detalle["historial"]), 1)
        self.assertNotIn("password", str(detalle))
        self.assertEqual(self.client.get(reverse("cuentas:listar_usuarios"), {"pagina": "no"}).status_code, 400)
