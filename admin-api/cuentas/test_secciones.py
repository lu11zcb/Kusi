"""Contrato de HU06: transporte Spring simulado; no acredita integración real."""
import json
from io import BytesIO
from unittest.mock import MagicMock, patch
from urllib.error import HTTPError, URLError

from django.contrib.auth.models import Group
from django.test import Client, TestCase, override_settings
from django.urls import reverse

from .models import Usuario


@override_settings(EDU_API_URL="http://127.0.0.1:8080", CLAVE_INTERNA="clave-ficticia-qa")
class SeccionesContratoTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.admin = Usuario.objects.create_superuser("admin-secciones@example.com", "ClaveSegura2026!", nombre="Admin QA")
        cls.docente = Usuario.objects.create_user("docente-secciones@example.com", "ClaveSegura2026!", nombre="Docente QA", debe_cambiar_contrasena=False)
        cls.docente.groups.add(Group.objects.create(name="docente"))

    def setUp(self):
        self.client = Client(enforce_csrf_checks=True)
        self.client.force_login(self.admin)
        self.token = self.client.get(reverse("acceso:sesion")).json()["csrf_token"]
        self.url = reverse("crear_seccion")
        self.datos = {"grado": 1, "nombre": " 1.º   A ", "anio_escolar": 2026}

    def crear(self, **valores):
        return self.client.post(self.url, json.dumps({**self.datos, **valores}), content_type="application/json", HTTP_X_CSRFTOKEN=self.token)

    @patch("cuentas.secciones_views.build_opener")
    def test_envia_identidad_opaca_y_clave_solo_a_spring(self, construir):
        respuesta = MagicMock(status=201)
        respuesta.read.return_value = json.dumps({"seccion": {"id": "00000000-0000-4000-8000-000000000001", "grado": 1, "nombre": "1.º A", "anio_escolar": 2026, "dato_ajeno": "no exponer"}}).encode()
        construir.return_value.open.return_value.__enter__.return_value = respuesta
        resultado = self.crear()
        self.assertEqual(resultado.status_code, 201)
        peticion = construir.return_value.open.call_args.args[0]
        self.assertEqual(peticion.full_url, "http://127.0.0.1:8080/interno/secciones/")
        self.assertEqual(peticion.get_header("X-clave-interna"), "clave-ficticia-qa")
        self.assertEqual(peticion.get_header("X-sesion-kusi"), self.client.session.session_key)
        self.assertEqual(json.loads(peticion.data), {"grado": 1, "nombre": "1.º A", "anio_escolar": 2026})
        self.assertNotIn("dato_ajeno", resultado.content.decode())
        self.assertNotIn("clave-ficticia", resultado.content.decode())
        self.assertIn("no-store", resultado.headers["Cache-Control"])

    @patch("cuentas.secciones_views.build_opener")
    def test_no_configurado_falla_cerrado_sin_llamar(self, construir):
        for config in (
            {"EDU_API_URL": ""}, {"CLAVE_INTERNA": ""},
            {"EDU_API_URL": "http://externo.example"}, {"EDU_API_URL": "file:///secreto"},
            {"EDU_API_URL": "http://["}, {"EDU_API_URL": "http://127.0.0.1:invalido"},
            {"EDU_API_URL": "http://127.0.0.1:0"}, {"EDU_API_URL": "http://127.0.0.1:65536"},
        ):
            with self.subTest(config=config), override_settings(**config):
                self.assertEqual(self.crear().status_code, 503)
        construir.assert_not_called()

    @patch("cuentas.secciones_views.build_opener")
    def test_valida_primero_nombre_y_anio(self, construir):
        for datos in ({"grado": 2}, {"grado": True}, {"nombre": " "}, {"nombre": 3}, {"nombre": "x" * 81}, {"anio_escolar": "2026"}, {"anio_escolar": 26}, {"usuario_id": str(self.admin.pk)}):
            with self.subTest(datos=datos):
                self.assertEqual(self.crear(**datos).status_code, 400)
        construir.assert_not_called()

    @patch("cuentas.secciones_views.build_opener")
    def test_duplicado_y_error_remoto_no_filtran_cuerpo(self, construir):
        for codigo, esperado in ((409, 409), (400, 400), (401, 503), (403, 503), (500, 502), (302, 502)):
            with self.subTest(codigo=codigo):
                construir.return_value.open.side_effect = HTTPError("http://127.0.0.1:8080", codigo, "QA", {}, BytesIO(b"secreto remoto"))
                resultado = self.crear()
                self.assertEqual(resultado.status_code, esperado)
                self.assertNotIn("secreto remoto", resultado.content.decode())

    @patch("cuentas.secciones_views.build_opener")
    def test_timeout_y_respuestas_invalidas_no_confirman_creacion(self, construir):
        for fallo in (TimeoutError(), URLError("QA")):
            construir.return_value.open.side_effect = fallo
            self.assertEqual(self.crear().status_code, 502)
        construir.return_value.open.side_effect = None
        for cuerpo in (b"html", b"{}", b"[]", b"x" * 16385, b'{"seccion":{"id":"no-uuid","grado":1,"nombre":"A","anio_escolar":2026}}'):
            respuesta = MagicMock(status=201)
            respuesta.read.return_value = cuerpo
            construir.return_value.open.return_value.__enter__.return_value = respuesta
            self.assertEqual(self.crear().status_code, 502)

    @patch("cuentas.secciones_views.build_opener")
    def test_permiso_servidor_csrf_y_contrasena_temporal(self, construir):
        self.assertEqual(self.client.post(self.url, '{}', content_type="application/json").status_code, 403)
        for usuario, esperado in ((None, 401), (self.docente, 403)):
            self.client.logout()
            if usuario:
                self.client.force_login(usuario)
            self.token = self.client.get(reverse("acceso:sesion")).json()["csrf_token"]
            self.assertEqual(self.crear().status_code, esperado)
        self.admin.debe_cambiar_contrasena = True
        self.admin.save()
        self.client.force_login(self.admin)
        self.token = self.client.get(reverse("acceso:sesion")).json()["csrf_token"]
        self.assertEqual(self.crear().status_code, 403)
        construir.assert_not_called()
