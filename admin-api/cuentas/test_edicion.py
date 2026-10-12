import json
from unittest.mock import patch

from django.contrib.auth.models import Group
from django.db import IntegrityError
from django.test import Client, TestCase
from django.urls import reverse

from .models import CambioUsuario, Usuario


class EdicionTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.admin = Usuario.objects.create_superuser("admin-edicion@example.com", "ClaveSegura2026!", nombre="Admin QA")
        cls.persona = Usuario.objects.create_user("editar@example.com", "ClavePersona2026!", nombre="Nombre original", debe_cambiar_contrasena=False)
        cls.persona.groups.add(Group.objects.create(name="docente"))

    def setUp(self):
        self.client = Client(enforce_csrf_checks=True)
        self.client.force_login(self.admin)
        self.token = self.client.get(reverse("acceso:sesion")).json()["csrf_token"]
        self.url = reverse("cuentas:editar_usuario", args=[self.persona.pk])

    def guardar(self, **datos):
        return self.client.patch(self.url, json.dumps(datos), content_type="application/json", HTTP_X_CSRFTOKEN=self.token)

    def test_edicion_persiste_uuid_roles_contrasena_e_historial(self):
        identificador, hash_original = self.persona.pk, self.persona.password
        CambioUsuario.objects.create(usuario=self.persona, administrador=self.admin, tipo="roles", anterior={"roles": []}, actual={"roles": ["docente"]})
        respuesta = self.guardar(nombre=" Nombre actualizado ", correo=" NUEVO@EXAMPLE.COM ")
        self.assertEqual(respuesta.status_code, 200)
        self.persona.refresh_from_db()
        self.assertEqual(self.persona.pk, identificador)
        self.assertEqual(self.persona.password, hash_original)
        self.assertEqual(self.persona.correo, "nuevo@example.com")
        detalle = self.client.get(reverse("cuentas:consultar_usuario", args=[identificador])).json()
        self.assertEqual(detalle["usuario"]["nombre"], "Nombre actualizado")
        self.assertEqual(detalle["usuario"]["roles"], ["docente"])
        self.assertEqual(len(detalle["historial"]), 2)
        self.assertEqual(detalle["historial"][0]["anterior"], {"nombre": "Nombre original", "correo": "editar@example.com"})
        self.assertEqual(detalle["historial"][0]["actual"], {"nombre": "Nombre actualizado", "correo": "nuevo@example.com"})
        self.assertNotIn(hash_original, str(detalle))
        self.assertNotIn("password", str(detalle))
        self.assertIn("no-store", respuesta.headers["Cache-Control"])

    def test_mismo_correo_propio_es_valido_y_no_duplica_historial(self):
        for _ in range(2):
            self.assertEqual(self.guardar(nombre=self.persona.nombre, correo="EDITAR@EXAMPLE.COM").status_code, 200)
        self.assertFalse(CambioUsuario.objects.exists())

    def test_validacion_duplicados_tipos_y_campos_ajenos(self):
        for datos in (
            {"nombre": "", "correo": "otro@example.com"}, {"nombre": "x" * 151, "correo": "otro@example.com"},
            {"nombre": "Nombre", "correo": "invalido"}, {"nombre": "Nombre", "correo": "ADMIN-EDICION@EXAMPLE.COM"},
            {"nombre": 3, "correo": "otro@example.com"}, {"nombre": "Nombre"},
            {"nombre": "Nombre", "correo": "otro@example.com", "password": "impuesta"},
            {"nombre": "Nombre", "correo": "otro@example.com", "is_active": False},
        ):
            with self.subTest(datos=datos):
                self.assertEqual(self.guardar(**datos).status_code, 400)
        self.persona.refresh_from_db()
        self.assertEqual(self.persona.correo, "editar@example.com")
        self.assertFalse(CambioUsuario.objects.exists())

    def test_fallo_historial_revierte_edicion_completa(self):
        with patch("cuentas.gestion_views.CambioUsuario.objects.create", side_effect=IntegrityError("Fallo QA")):
            with self.assertRaises(IntegrityError):
                self.guardar(nombre="Nuevo", correo="nuevo@example.com")
        self.persona.refresh_from_db()
        self.assertEqual(self.persona.nombre, "Nombre original")
        self.assertEqual(self.persona.correo, "editar@example.com")

    def test_api_directa_no_autorizada_y_contrasena_temporal(self):
        for usuario, estado in ((None, 401), (self.persona, 403)):
            self.client.logout()
            if usuario:
                self.client.force_login(usuario)
            self.token = self.client.get(reverse("acceso:sesion")).json()["csrf_token"]
            self.assertEqual(self.guardar(nombre="Nuevo", correo="nuevo@example.com").status_code, estado)
        self.admin.debe_cambiar_contrasena = True
        self.admin.save()
        self.client.force_login(self.admin)
        self.token = self.client.get(reverse("acceso:sesion")).json()["csrf_token"]
        self.assertEqual(self.guardar(nombre="Nuevo", correo="nuevo@example.com").status_code, 403)

    def test_csrf_y_recurso_inexistente(self):
        self.assertEqual(self.client.patch(self.url, '{}', content_type="application/json").status_code, 403)
        self.url = reverse("cuentas:editar_usuario", args=["00000000-0000-0000-0000-000000000000"])
        self.assertEqual(self.guardar(nombre="Nuevo", correo="nuevo@example.com").status_code, 404)

    def test_administrador_activa_y_desactiva_cuenta_con_historial(self):
        url = reverse("cuentas:cambiar_estado_usuario", args=[self.persona.pk])
        identificador = self.persona.pk
        respuesta = self.client.post(url, json.dumps({"activo": False}), content_type="application/json", HTTP_X_CSRFTOKEN=self.token)
        self.assertEqual(respuesta.status_code, 200)
        self.persona.refresh_from_db()
        self.assertFalse(self.persona.is_active)
        self.assertEqual(self.persona.pk, identificador)
        self.assertEqual(respuesta.json()["usuario"]["activo"], False)
        cambio = CambioUsuario.objects.get(usuario=self.persona, tipo="estado")
        self.assertEqual(cambio.anterior, {"activo": True})
        self.assertEqual(cambio.actual, {"activo": False})
        self.assertEqual(self.persona.nombre, "Nombre original")
        respuesta = self.client.post(url, json.dumps({"activo": True}), content_type="application/json", HTTP_X_CSRFTOKEN=self.token)
        self.assertEqual(respuesta.status_code, 200)
        self.persona.refresh_from_db()
        self.assertTrue(self.persona.is_active)
        self.assertEqual(CambioUsuario.objects.filter(usuario=self.persona, tipo="estado").count(), 2)

    def test_estado_rechaza_datos_invalidos_y_usuarios_no_admin(self):
        url = reverse("cuentas:cambiar_estado_usuario", args=[self.persona.pk])
        for datos in ({}, {"activo": "false"}, {"activo": False, "is_superuser": True}):
            respuesta = self.client.post(url, json.dumps(datos), content_type="application/json", HTTP_X_CSRFTOKEN=self.token)
            self.assertEqual(respuesta.status_code, 400)
        self.client.logout()
        self.client.force_login(self.persona)
        token = self.client.get(reverse("acceso:sesion")).json()["csrf_token"]
        respuesta = self.client.post(url, json.dumps({"activo": False}), content_type="application/json", HTTP_X_CSRFTOKEN=token)
        self.assertEqual(respuesta.status_code, 403)
