"""Adaptadores HU07/HU08 con transporte simulado; no prueba integración real."""
import json
from io import BytesIO
from unittest.mock import MagicMock, patch
from urllib.error import HTTPError, URLError

from django.contrib.auth.models import Group
from django.test import Client, TestCase, override_settings
from django.urls import reverse

from .models import Usuario


@override_settings(EDU_API_URL="http://127.0.0.1:8080", CLAVE_INTERNA="clave-ficticia-qa")
class EducacionContratoTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.admin = Usuario.objects.create_superuser("admin-educacion@example.com", "ClaveSegura2026!", nombre="Admin QA")
        cls.docente = Usuario.objects.create_user("docente-educacion@example.com", "ClaveDocente2026!", nombre="Docente QA", debe_cambiar_contrasena=False)
        cls.docente.groups.add(Group.objects.create(name="docente"))
        cls.estudiante = Usuario.objects.create_user("estudiante-educacion@example.com", "ClaveEstudiante2026!", nombre="Estudiante QA", debe_cambiar_contrasena=False)
        cls.estudiante.groups.add(Group.objects.create(name="estudiante"))

    def cliente_autenticado(self, usuario):
        cliente = Client(enforce_csrf_checks=True)
        if usuario is not None:
            cliente.force_login(usuario)
        token = cliente.get(reverse("acceso:sesion")).json()["csrf_token"]
        return cliente, token

    def configurar_respuesta(self, construir, datos, estado=200):
        respuesta = MagicMock(status=estado)
        respuesta.read.return_value = json.dumps(datos).encode("utf-8")
        construir.return_value.open.return_value.__enter__.return_value = respuesta
        return respuesta

    @patch("cuentas.educacion_views.build_opener")
    def test_admin_lista_secciones_existentes_con_su_sesion(self, construir):
        cliente, _ = self.cliente_autenticado(self.admin)
        datos = {"secciones": [{"id": "00000000-0000-4000-8000-000000000001", "nombre": "A", "grado": 1, "anio_escolar": 2026}]}
        self.configurar_respuesta(construir, datos)
        respuesta = cliente.get(reverse("listar_secciones"))
        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(respuesta.json(), datos)
        peticion = construir.return_value.open.call_args.args[0]
        self.assertEqual(peticion.full_url, "http://127.0.0.1:8080/interno/secciones/")
        self.assertEqual(peticion.get_header("X-sesion-kusi"), cliente.session.session_key)
        self.assertIn("no-store", respuesta.headers["Cache-Control"])

    @patch("cuentas.educacion_views.build_opener")
    def test_listar_secciones_rechaza_otros_roles_y_errores_remotos(self, construir):
        for usuario, estado in ((None, 401), (self.docente, 403), (self.estudiante, 403)):
            cliente, _ = self.cliente_autenticado(usuario)
            self.assertEqual(cliente.get(reverse("listar_secciones")).status_code, estado)
        construir.assert_not_called()
        admin, _ = self.cliente_autenticado(self.admin)
        self.configurar_respuesta(construir, {"secciones": {}})
        self.assertEqual(admin.get(reverse("listar_secciones")).status_code, 502)
        construir.return_value.open.side_effect = URLError("QA")
        self.assertEqual(admin.get(reverse("listar_secciones")).status_code, 502)

    @patch("cuentas.educacion_views.build_opener")
    def test_admin_envia_sesion_y_clave_para_crear_vinculos_y_asignaciones(self, construir):
        cliente, token = self.cliente_autenticado(self.admin)
        for ruta, recurso, clave_resultado, datos in (
            ("vincular_estudiante", "vinculos-estudiantes", "vinculo", {"estudiante_id": str(self.estudiante.pk), "seccion_id": "00000000-0000-4000-8000-000000000001", "anio_escolar": 2026}),
            ("asignar_docente", "asignaciones-docentes", "asignacion", {"docente_id": str(self.docente.pk), "curso_id": "00000000-0000-4000-8000-000000000002", "seccion_id": "00000000-0000-4000-8000-000000000001", "anio_escolar": 2026}),
        ):
            with self.subTest(ruta=ruta):
                self.configurar_respuesta(construir, {clave_resultado: {"id": "00000000-0000-4000-8000-000000000003"}}, 201)
                resultado = cliente.post(reverse(ruta), json.dumps(datos), content_type="application/json", HTTP_X_CSRFTOKEN=token)
                self.assertEqual(resultado.status_code, 201)
                peticion = construir.return_value.open.call_args.args[0]
                self.assertEqual(peticion.full_url, "http://127.0.0.1:8080/interno/" + recurso + "/")
                self.assertEqual(peticion.get_header("X-clave-interna"), "clave-ficticia-qa")
                self.assertEqual(peticion.get_header("X-sesion-kusi"), cliente.session.session_key)
                self.assertEqual(json.loads(peticion.data), datos)
                self.assertIn("no-store", resultado.headers["Cache-Control"])
                self.assertNotIn("clave-ficticia", resultado.content.decode())

    @patch("cuentas.educacion_views.build_opener")
    def test_docente_consulta_solo_su_uuid_autenticado(self, construir):
        cliente, _ = self.cliente_autenticado(self.docente)
        self.configurar_respuesta(construir, {"asignaciones": []})
        resultado = cliente.get(reverse("mis_asignaciones_docente"), {"docente_id": str(self.admin.pk)})
        self.assertEqual(resultado.status_code, 200)
        peticion = construir.return_value.open.call_args.args[0]
        self.assertEqual(peticion.full_url, "http://127.0.0.1:8080/interno/docentes/" + str(self.docente.pk) + "/recursos/")
        self.assertEqual(peticion.get_header("X-sesion-kusi"), cliente.session.session_key)

    @patch("cuentas.educacion_views.build_opener")
    def test_docente_consulta_solo_estudiantes_de_sus_secciones(self, construir):
        cliente, _ = self.cliente_autenticado(self.docente)
        estudiante = Usuario.objects.create_user("estudiante-hu09@example.com", "ClaveEstudiante2026!", nombre="Ana Ficticia")
        self.configurar_respuesta(construir, {"estudiantes": [{"id": "v1", "estudiante_id": str(estudiante.pk)}]})
        resultado = cliente.get(
            reverse("mis_estudiantes_docente"),
            {"docente_id": str(self.admin.pk)},
        )
        self.assertEqual(resultado.status_code, 200)
        self.assertEqual(resultado.json()["estudiantes"][0]["estudiante_nombre"], "Ana Ficticia")
        peticion = construir.return_value.open.call_args.args[0]
        self.assertEqual(
            peticion.full_url,
            "http://127.0.0.1:8080/interno/docentes/" + str(self.docente.pk) + "/estudiantes/",
        )
        self.assertEqual(peticion.get_header("X-sesion-kusi"), cliente.session.session_key)

    @patch("cuentas.educacion_views.build_opener")
    def test_url_y_puerto_invalidos_fallan_cerrados_para_admin_y_docente(self, construir):
        admin, _ = self.cliente_autenticado(self.admin)
        docente, _ = self.cliente_autenticado(self.docente)
        for configuracion in (
            {"EDU_API_URL": ""}, {"CLAVE_INTERNA": ""}, {"EDU_API_URL": "incorrecta"},
            {"EDU_API_URL": "http://externo.example"}, {"EDU_API_URL": "file:///secreto"},
            {"EDU_API_URL": "http://["}, {"EDU_API_URL": "http://127.0.0.1:invalido"},
            {"EDU_API_URL": "http://127.0.0.1:0"}, {"EDU_API_URL": "http://127.0.0.1:65536"},
            {"EDU_API_URL": "https://usuario:clave@example.com"},
            {"EDU_API_URL": "https://example.com/?secreto=valor"},
        ):
            with self.subTest(configuracion=configuracion), override_settings(**configuracion):
                self.assertEqual(admin.get(reverse("listar_vinculos")).status_code, 503)
                self.assertEqual(docente.get(reverse("mis_asignaciones_docente")).status_code, 503)
        construir.assert_not_called()

    @patch("cuentas.educacion_views.build_opener")
    def test_json_incompatible_y_fallos_de_red_no_causan_500(self, construir):
        admin, _ = self.cliente_autenticado(self.admin)
        docente, _ = self.cliente_autenticado(self.docente)
        for cliente, ruta, clave_resultado in ((admin, "listar_asignaciones", "asignaciones"), (docente, "mis_asignaciones_docente", "asignaciones")):
            for cuerpo in (b"html", b"[]", b"null", b"{}", b'{"asignaciones":{}}', b"x" * 65537):
                with self.subTest(ruta=ruta, longitud=len(cuerpo)):
                    respuesta = self.configurar_respuesta(construir, {clave_resultado: []})
                    respuesta.read.return_value = cuerpo
                    self.assertEqual(cliente.get(reverse(ruta)).status_code, 502)
            for fallo in (TimeoutError(), URLError("QA")):
                construir.return_value.open.side_effect = fallo
                self.assertEqual(cliente.get(reverse(ruta)).status_code, 502)
            construir.return_value.open.side_effect = None

    @patch("cuentas.educacion_views.build_opener")
    def test_sesion_remota_vencida_conserva_401_para_admin_y_docente(self, construir):
        for usuario, ruta in ((self.admin, "listar_asignaciones"), (self.docente, "mis_asignaciones_docente")):
            with self.subTest(ruta=ruta):
                cliente, _ = self.cliente_autenticado(usuario)
                construir.return_value.open.side_effect = HTTPError(
                    "http://127.0.0.1:8080", 401, "QA", {},
                    BytesIO(b'{"mensaje": "Sesion invalida."}'),
                )
                resultado = cliente.get(reverse(ruta))
                self.assertEqual(resultado.status_code, 401)
                self.assertEqual(resultado.json(), {"mensaje": "Sesion invalida."})
                self.assertIn("no-store", resultado.headers["Cache-Control"])

    @patch("cuentas.educacion_views.build_opener")
    def test_error_remoto_no_objeto_o_mensaje_no_texto_no_causa_500(self, construir):
        docente, _ = self.cliente_autenticado(self.docente)
        for cuerpo in (b"[]", b"null", b"html", b'{"mensaje": {"detalle": "interno"}}'):
            with self.subTest(cuerpo=cuerpo):
                construir.return_value.open.side_effect = HTTPError("http://127.0.0.1:8080", 403, "QA", {}, BytesIO(cuerpo))
                resultado = docente.get(reverse("mis_asignaciones_docente"))
                self.assertEqual(resultado.status_code, 403)
                self.assertEqual(resultado.json(), {"mensaje": "No se pudo completar la operación educativa."})
        construir.return_value.open.side_effect = HTTPError("http://127.0.0.1:8080", 500, "QA", {}, BytesIO(b'{"mensaje": "secreto remoto"}'))
        resultado = docente.get(reverse("mis_asignaciones_docente"))
        self.assertEqual(resultado.status_code, 502)
        self.assertNotIn("secreto remoto", resultado.content.decode())

    @patch("cuentas.educacion_views.build_opener")
    def test_permisos_y_csrf_se_validan_antes_de_contactar_spring(self, construir):
        for usuario, esperado in ((None, 401), (self.docente, 403), (self.estudiante, 403)):
            cliente, token = self.cliente_autenticado(usuario)
            self.assertEqual(cliente.get(reverse("listar_vinculos")).status_code, esperado)
            self.assertEqual(cliente.post(reverse("asignar_docente"), "{}", content_type="application/json", HTTP_X_CSRFTOKEN=token).status_code, esperado)
        for usuario, esperado in ((None, 401), (self.admin, 403), (self.estudiante, 403)):
            cliente, _ = self.cliente_autenticado(usuario)
            self.assertEqual(cliente.get(reverse("mis_asignaciones_docente")).status_code, esperado)
        admin, _ = self.cliente_autenticado(self.admin)
        self.assertEqual(admin.post(reverse("vincular_estudiante"), "{}", content_type="application/json").status_code, 403)
        self.docente.debe_cambiar_contrasena = True
        self.docente.save(update_fields=["debe_cambiar_contrasena"])
        docente, _ = self.cliente_autenticado(self.docente)
        self.assertEqual(docente.get(reverse("mis_asignaciones_docente")).status_code, 403)
        construir.assert_not_called()
