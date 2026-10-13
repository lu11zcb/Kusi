import json

from django.contrib.auth.models import Group
from django.test import Client, TestCase
from django.urls import reverse

from .models import CambioUsuario, Usuario


# HU12: el administrador registra al estudiante con su DNI y genera sus
# contraseñas; el estudiante ingresa a la app con DNI y contraseña.
class DniEstudianteTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.admin = Usuario.objects.create_superuser("admin-dni@example.com", "ClaveSegura2026!", nombre="Admin QA")
        cls.docente = Usuario.objects.create_user("docente-dni@example.com", "ClaveDocente2026!", nombre="Docente QA", debe_cambiar_contrasena=False)
        cls.docente.groups.add(Group.objects.get_or_create(name="docente")[0])
        cls.estudiante = Usuario.objects.create_user(None, "ClaveEstudiante2026!", nombre="Ana Ficticia", dni="70000001", debe_cambiar_contrasena=False)
        cls.estudiante.groups.add(Group.objects.get_or_create(name="estudiante")[0])

    def cliente(self, usuario=None):
        cliente = Client(enforce_csrf_checks=True)
        if usuario is not None:
            cliente.force_login(usuario)
        return cliente, cliente.get(reverse("acceso:sesion")).json()["csrf_token"]

    def registrar(self, datos):
        cliente, token = self.cliente(self.admin)
        return cliente.post(reverse("cuentas:registrar_usuario"), json.dumps(datos), content_type="application/json", HTTP_X_CSRFTOKEN=token)

    def ingresar(self, datos):
        cliente, token = self.cliente()
        return cliente, cliente.post(reverse("acceso:ingresar"), json.dumps(datos), content_type="application/json", HTTP_X_CSRFTOKEN=token)

    def test_registra_estudiante_con_dni_y_sin_correo(self):
        respuesta = self.registrar({"nombre": "Luis Niño", "correo": "", "dni": "70000002", "rol": "estudiante"})
        self.assertEqual(respuesta.status_code, 201)
        self.assertEqual(respuesta.json()["usuario"]["dni"], "70000002")
        self.assertIsNone(respuesta.json()["usuario"]["correo"])
        self.assertEqual(len(respuesta.json()["contrasena_temporal"]), 10)
        self.assertTrue(Usuario.objects.get(dni="70000002").debe_cambiar_contrasena)

    def test_dni_obligatorio_valido_y_unico_para_estudiantes(self):
        for dni, mensaje in (("", "obligatorio"), ("1234567", "8 dígitos"), ("1234567a", "8 dígitos"), ("70000001", "Ya existe")):
            with self.subTest(dni=dni):
                respuesta = self.registrar({"nombre": "Niño", "correo": "", "dni": dni, "rol": "estudiante"})
                self.assertEqual(respuesta.status_code, 400)
                self.assertIn(mensaje, respuesta.json()["errores"]["dni"][0]["message"])

    def test_adultos_siguen_necesitando_correo(self):
        respuesta = self.registrar({"nombre": "Docente", "correo": "", "dni": "70000003", "rol": "docente"})
        self.assertEqual(respuesta.status_code, 400)
        self.assertIn("correo", respuesta.json()["errores"])

    def test_estudiante_ingresa_con_dni_y_mensaje_generico_si_falla(self):
        _, respuesta = self.ingresar({"dni": "70000001", "contrasena": "ClaveEstudiante2026!"})
        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(respuesta.json()["usuario"]["dni"], "70000001")
        for datos in ({"dni": "70000001", "contrasena": "incorrecta"}, {"dni": "79999999", "contrasena": "ClaveEstudiante2026!"}, {"dni": 70000001, "contrasena": "x"}):
            with self.subTest(datos=datos):
                _, respuesta = self.ingresar(datos)
                self.assertEqual(respuesta.status_code, 401)
                self.assertEqual(respuesta.json()["mensaje"], "DNI o contraseña incorrectos")

    def test_dni_solo_sirve_para_cuentas_de_estudiante(self):
        Usuario.objects.filter(pk=self.docente.pk).update(dni="70000009")
        _, respuesta = self.ingresar({"dni": "70000009", "contrasena": "ClaveDocente2026!"})
        self.assertEqual(respuesta.status_code, 401)

    def test_estudiante_desactivado_no_ingresa_con_dni(self):
        Usuario.objects.filter(pk=self.estudiante.pk).update(is_active=False)
        _, respuesta = self.ingresar({"dni": "70000001", "contrasena": "ClaveEstudiante2026!"})
        self.assertEqual(respuesta.status_code, 401)

    def generar(self, usuario, cuenta_id):
        cliente, token = self.cliente(usuario)
        return cliente.post(reverse("cuentas:generar_contrasena_usuario", args=[cuenta_id]), "{}", content_type="application/json", HTTP_X_CSRFTOKEN=token)

    def test_administrador_genera_contrasena_temporal_del_estudiante(self):
        cliente_estudiante, _ = self.ingresar({"dni": "70000001", "contrasena": "ClaveEstudiante2026!"})
        respuesta = self.generar(self.admin, self.estudiante.pk)
        self.assertEqual(respuesta.status_code, 200)
        self.assertIn("no-store", respuesta["Cache-Control"])
        contrasena = respuesta.json()["contrasena_temporal"]
        self.assertEqual(len(contrasena), 10)
        self.assertEqual(respuesta.json()["usuario"]["dni"], "70000001")
        self.estudiante.refresh_from_db()
        self.assertTrue(self.estudiante.check_password(contrasena))
        self.assertTrue(self.estudiante.debe_cambiar_contrasena)
        # La sesión que el estudiante tenía en el celular se cierra.
        self.assertIsNone(cliente_estudiante.get(reverse("acceso:sesion")).json()["usuario"])
        cambio = CambioUsuario.objects.get(usuario=self.estudiante, tipo="contrasena_temporal")
        self.assertEqual(cambio.administrador, self.admin)
        self.assertNotIn(contrasena, json.dumps(cambio.actual))
        _, ingreso = self.ingresar({"dni": "70000001", "contrasena": contrasena})
        self.assertTrue(ingreso.json()["usuario"]["debe_cambiar_contrasena"])

    def test_docente_y_estudiante_no_generan_contrasenas(self):
        self.assertEqual(self.generar(self.docente, self.estudiante.pk).status_code, 403)
        self.assertEqual(self.generar(self.estudiante, self.estudiante.pk).status_code, 403)
        self.assertEqual(self.generar(None, self.estudiante.pk).status_code, 401)
        self.assertEqual(self.generar(self.admin, self.admin.pk).status_code, 400)
        self.estudiante.refresh_from_db()
        self.assertTrue(self.estudiante.check_password("ClaveEstudiante2026!"))

    def test_rol_estudiante_exige_dni_y_rol_adulto_exige_correo(self):
        cliente, token = self.cliente(self.admin)
        ruta = reverse("cuentas:asignar_roles", args=[self.docente.pk])
        respuesta = cliente.post(ruta, json.dumps({"roles": ["estudiante"]}), content_type="application/json", HTTP_X_CSRFTOKEN=token)
        self.assertEqual(respuesta.status_code, 400)
        ruta = reverse("cuentas:asignar_roles", args=[self.estudiante.pk])
        respuesta = cliente.post(ruta, json.dumps({"roles": ["docente"]}), content_type="application/json", HTTP_X_CSRFTOKEN=token)
        self.assertEqual(respuesta.status_code, 400)

    def test_edicion_conserva_o_cambia_el_dni(self):
        cliente, token = self.cliente(self.admin)
        ruta = reverse("cuentas:editar_usuario", args=[self.estudiante.pk])
        respuesta = cliente.patch(ruta, json.dumps({"nombre": "Ana Editada", "correo": ""}), content_type="application/json", HTTP_X_CSRFTOKEN=token)
        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(respuesta.json()["usuario"]["dni"], "70000001")
        respuesta = cliente.patch(ruta, json.dumps({"nombre": "Ana Editada", "correo": "", "dni": "70000005"}), content_type="application/json", HTTP_X_CSRFTOKEN=token)
        self.assertEqual(respuesta.json()["usuario"]["dni"], "70000005")
        respuesta = cliente.patch(ruta, json.dumps({"nombre": "Ana Editada", "correo": "", "dni": ""}), content_type="application/json", HTTP_X_CSRFTOKEN=token)
        self.assertEqual(respuesta.status_code, 400)
