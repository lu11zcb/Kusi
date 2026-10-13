import json
from django.contrib.auth.models import Group
from django.test import Client, TestCase, override_settings
from django.urls import reverse
from .models import Curso, Usuario

@override_settings(CLAVE_INTERNA="clave-pruebas-interna")
class ConsultasInternasTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.estudiante = Usuario.objects.create_user(correo="alumno-interno@example.com", nombre="Alumno", password="ClaveSegura2026!")
        self.estudiante.groups.add(Group.objects.create(name="estudiante"))
        self.curso = Curso.objects.create(nombre="Curso interno de prueba")

    def headers(self): return {"HTTP_X_CLAVE_INTERNA": "clave-pruebas-interna"}

    def test_consulta_interna_devuelve_rol_y_estado_sin_password(self):
        respuesta = self.client.get(reverse("consultar_cuenta_interna", args=[self.estudiante.id]), **self.headers())
        self.assertEqual(respuesta.status_code, 200)
        usuario = respuesta.json()["usuario"]
        self.assertEqual(usuario["roles"], ["estudiante"])
        self.assertTrue(usuario["activo"])
        self.assertNotIn("password", usuario)

    def test_consulta_interna_rechaza_clave_incorrecta(self):
        respuesta = self.client.get(reverse("consultar_cuenta_interna", args=[self.estudiante.id]), HTTP_X_CLAVE_INTERNA="mala")
        self.assertEqual(respuesta.status_code, 403)

    def test_consulta_interna_valida_catalogo_de_cursos(self):
        respuesta = self.client.get(reverse("consultar_curso_interno", args=[self.curso.id]), **self.headers())
        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(respuesta.json()["curso"]["nombre"], "Curso interno de prueba")
