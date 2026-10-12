import json
from datetime import timedelta

from django.contrib.auth.models import Group
from django.contrib.sessions.models import Session
from django.test import Client, TestCase, override_settings
from django.urls import reverse
from django.utils import timezone

from .models import Usuario


class AccesoTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.usuario = Usuario.objects.create_user(
            correo="adulto@example.com", nombre="Adulto QA", password="ClaveInicialSegura2026!",
            debe_cambiar_contrasena=False,
        )
        cls.usuario.groups.add(Group.objects.create(name="administrador"), Group.objects.create(name="docente"))

    def setUp(self):
        self.client = Client(enforce_csrf_checks=True)
        self.token = self.client.get(reverse("acceso:sesion")).json()["csrf_token"]

    def post(self, nombre, datos, token=None):
        return self.client.post(
            reverse(nombre), json.dumps(datos), content_type="application/json",
            HTTP_X_CSRFTOKEN=token or self.token,
        )

    def ingreso(self):
        respuesta = self.post("acceso:ingresar", {"correo": " ADULTO@EXAMPLE.COM ", "contrasena": "ClaveInicialSegura2026!"})
        if respuesta.status_code == 200:
            self.token = respuesta.json()["csrf_token"]
        return respuesta

    def cambio(self, **valores):
        datos = {"contrasena_actual": "ClaveInicialSegura2026!", "nueva_contrasena": "OtraClaveSegura2026!", "confirmacion": "OtraClaveSegura2026!"}
        return self.post("acceso:cambiar_contrasena", {**datos, **valores})

    def test_sesion_anonima_emite_csrf_sin_identidad(self):
        respuesta = self.client.get(reverse("acceso:sesion"))
        self.assertIsNone(respuesta.json()["usuario"])
        self.assertIn("no-store", respuesta.headers["Cache-Control"])
        self.assertTrue(self.client.cookies["csrftoken"]["httponly"])

    def test_ingreso_normaliza_correo_y_devuelve_ambos_roles_sin_secretos(self):
        respuesta = self.ingreso()
        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(respuesta.json()["usuario"]["roles"], ["administrador", "docente"])
        self.assertNotIn("password", respuesta.json()["usuario"])
        self.assertEqual(self.client.get(reverse("acceso:sesion")).json()["usuario"]["id"], str(self.usuario.id))

    def test_correo_inexistente_clave_incorrecta_y_cuenta_inactiva_mismo_mensaje(self):
        for datos in ({"correo": "nadie@example.com", "contrasena": "ClaveInicialSegura2026!"}, {"correo": self.usuario.correo, "contrasena": "incorrecta"}, {}):
            respuesta = self.post("acceso:ingresar", datos)
            self.assertEqual(respuesta.status_code, 401)
            self.assertEqual(respuesta.json()["mensaje"], "Correo o contraseña incorrectos")
        self.usuario.is_active = False
        self.usuario.save(update_fields=["is_active"])
        respuesta = self.ingreso()
        self.assertEqual(respuesta.status_code, 401)
        self.assertEqual(respuesta.json()["mensaje"], "Correo o contraseña incorrectos")

    def test_estudiante_se_autentica_para_el_contrato_movil(self):
        estudiante = Usuario.objects.create_user(correo="estudiante@example.com", nombre="Estudiante QA", password="ClaveInicialSegura2026!")
        estudiante.groups.add(Group.objects.create(name="estudiante"))
        respuesta = self.post("acceso:ingresar", {"correo": estudiante.correo, "contrasena": "ClaveInicialSegura2026!"})
        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(respuesta.json()["usuario"]["roles"], ["estudiante"])
        self.token = respuesta.json()["csrf_token"]
        self.assertEqual(self.client.get(reverse("cuentas:contexto_registro")).status_code, 403)

    def test_ingreso_exige_csrf(self):
        respuesta = self.client.post(reverse("acceso:ingresar"), "{}", content_type="application/json")
        self.assertEqual(respuesta.status_code, 403)

    def test_contrasena_temporal_bloquea_registro_hasta_cambiarla(self):
        self.usuario.debe_cambiar_contrasena = True
        self.usuario.save(update_fields=["debe_cambiar_contrasena"])
        self.assertTrue(self.ingreso().json()["usuario"]["debe_cambiar_contrasena"])
        self.assertEqual(self.client.get(reverse("cuentas:contexto_registro")).status_code, 403)
        self.assertEqual(self.cambio().status_code, 200)
        self.usuario.refresh_from_db()
        self.assertFalse(self.usuario.debe_cambiar_contrasena)
        self.assertTrue(self.usuario.check_password("OtraClaveSegura2026!"))
        self.assertFalse(self.usuario.check_password("ClaveInicialSegura2026!"))
        self.assertEqual(self.client.get(reverse("cuentas:contexto_registro")).status_code, 200)

    def test_cambio_rechaza_actual_erronea_confirmacion_debil_y_reutilizada(self):
        self.ingreso()
        for valores in (
            {"contrasena_actual": "incorrecta"},
            {"confirmacion": "diferente"},
            {"nueva_contrasena": "123", "confirmacion": "123"},
            {"nueva_contrasena": "ClaveInicialSegura2026!", "confirmacion": "ClaveInicialSegura2026!"},
        ):
            with self.subTest(valores=valores):
                self.assertEqual(self.cambio(**valores).status_code, 400)
        self.usuario.refresh_from_db()
        self.assertTrue(self.usuario.check_password("ClaveInicialSegura2026!"))

    def test_cambio_requiere_sesion(self):
        self.assertEqual(self.cambio().status_code, 401)

    def test_salida_invalida_la_sesion(self):
        self.ingreso()
        self.assertEqual(self.post("acceso:salir", {}).status_code, 200)
        self.assertIsNone(self.client.get(reverse("acceso:sesion")).json()["usuario"])

    @override_settings(CLAVE_INTERNA="clave-interna-prueba")
    def test_validacion_interna_requiere_clave_y_comprueba_sesion_real(self):
        self.ingreso()
        datos = {"sesion": self.client.cookies["sessionid"].value}
        url = reverse("validar_sesion_interna")
        interno = Client(enforce_csrf_checks=True)
        self.assertEqual(interno.post(url, json.dumps(datos), content_type="application/json").status_code, 403)
        respuesta = interno.post(url, json.dumps(datos), content_type="application/json", HTTP_X_CLAVE_INTERNA="clave-interna-prueba")
        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(respuesta.json()["usuario"]["id"], str(self.usuario.id))
        self.assertLessEqual(respuesta.json()["cache_maxima_segundos"], 60)
        self.assertIn("no-store", respuesta.headers["Cache-Control"])
        self.post("acceso:salir", {})
        self.assertEqual(interno.post(url, json.dumps(datos), content_type="application/json", HTTP_X_CLAVE_INTERNA="clave-interna-prueba").status_code, 401)

    @override_settings(CLAVE_INTERNA="clave-interna-prueba")
    def test_sesion_interna_bloquea_temporal_inactiva_y_expirada(self):
        self.ingreso()
        url = reverse("validar_sesion_interna")
        datos = {"sesion": self.client.cookies["sessionid"].value}
        def validar():
            return self.client.post(url, json.dumps(datos), content_type="application/json", HTTP_X_CLAVE_INTERNA="clave-interna-prueba")
        self.usuario.debe_cambiar_contrasena = True
        self.usuario.save(update_fields=["debe_cambiar_contrasena"])
        self.assertEqual(validar().status_code, 403)
        self.usuario.is_active = False
        self.usuario.save(update_fields=["is_active"])
        self.assertEqual(validar().status_code, 401)
        datos["sesion"] = "sesion-inexistente"
        self.assertEqual(validar().status_code, 401)

    @override_settings(CLAVE_INTERNA="")
    def test_clave_interna_sin_configurar_falla_cerrada(self):
        respuesta = self.client.post(reverse("validar_sesion_interna"), "{}", content_type="application/json")
        self.assertEqual(respuesta.status_code, 503)

    @override_settings(CLAVE_INTERNA="clave-interna-prueba")
    def test_cache_interna_respeta_expiracion_persistida_y_rechaza_expirada(self):
        self.ingreso()
        sesion = self.client.cookies["sessionid"].value
        Session.objects.filter(session_key=sesion).update(expire_date=timezone.now() + timedelta(seconds=25))
        interno = Client()
        def validar():
            return interno.post(reverse("validar_sesion_interna"), json.dumps({"sesion": sesion}), content_type="application/json", HTTP_X_CLAVE_INTERNA="clave-interna-prueba")
        respuesta = validar()
        self.assertEqual(respuesta.status_code, 200)
        self.assertGreaterEqual(respuesta.json()["cache_maxima_segundos"], 0)
        self.assertLessEqual(respuesta.json()["cache_maxima_segundos"], 25)
        Session.objects.filter(session_key=sesion).update(expire_date=timezone.now() - timedelta(seconds=1))
        self.assertEqual(validar().status_code, 401)

    @override_settings(CLAVE_INTERNA="clave-interna-prueba")
    def test_introspeccion_observa_roles_y_rechaza_otras_sesiones_tras_cambio(self):
        self.ingreso()
        otra = Client()
        otra.force_login(self.usuario)
        sesion_anterior = otra.cookies["sessionid"].value
        interno = Client()
        def validar(sesion):
            return interno.post(reverse("validar_sesion_interna"), json.dumps({"sesion": sesion}), content_type="application/json", HTTP_X_CLAVE_INTERNA="clave-interna-prueba")
        self.usuario.groups.remove(Group.objects.get(name="administrador"))
        self.assertEqual(validar(sesion_anterior).json()["usuario"]["roles"], ["docente"])
        self.assertEqual(self.cambio().status_code, 200)
        self.assertEqual(validar(sesion_anterior).status_code, 401)
        self.assertEqual(validar(self.client.cookies["sessionid"].value).status_code, 200)
