import json

from django.contrib.auth.models import Group
from django.db import IntegrityError, transaction
from django.test import Client, TestCase
from django.urls import reverse

from .models import Curso, Usuario


class CursosTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.admin = Usuario.objects.create_superuser("admin-cursos@example.com", "ClaveSegura2026!", nombre="Admin QA")
        cls.docente = Usuario.objects.create_user("docente-cursos@example.com", "ClaveSegura2026!", nombre="Docente QA", debe_cambiar_contrasena=False)
        cls.docente.groups.add(Group.objects.create(name="docente"))

    def setUp(self):
        self.client = Client(enforce_csrf_checks=True)
        self.client.force_login(self.admin)
        self.token = self.client.get(reverse("acceso:sesion")).json()["csrf_token"]
        self.curso = Curso.objects.get(nombre="Matemática")
        self.url = reverse("cuentas:actualizar_curso", args=[self.curso.pk])

    def guardar(self, datos):
        return self.client.patch(self.url, json.dumps(datos), content_type="application/json", HTTP_X_CSRFTOKEN=self.token)

    def test_catalogo_inicial_siete_cursos(self):
        respuesta = self.client.get(reverse("cuentas:listar_cursos"))
        self.assertEqual(respuesta.status_code, 200)
        self.assertSetEqual({curso["nombre"] for curso in respuesta.json()["cursos"]}, {
            "Matemática", "Comunicación", "Personal Social", "Ciencia y Tecnología", "Arte y Cultura", "Educación Religiosa", "Inglés",
        })
        self.assertEqual(len({curso["id"] for curso in respuesta.json()["cursos"]}), 7)
        self.assertIn("no-store", respuesta.headers["Cache-Control"])

    def test_renombrar_conserva_identificador_y_consulta_actualizada(self):
        respuesta = self.guardar({"nombre": " Matemática de primero "})
        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(respuesta.json()["curso"]["id"], str(self.curso.pk))
        self.curso.refresh_from_db()
        self.assertEqual(self.curso.nombre, "Matemática de primero")
        self.assertIn(respuesta.json()["curso"], self.client.get(reverse("cuentas:listar_cursos")).json()["cursos"])
        self.assertEqual(Curso.objects.count(), 7)

    def test_nombre_obligatorio_tipo_longitud_y_duplicado(self):
        for datos in ({}, {"nombre": " "}, {"nombre": "x" * 121}, {"nombre": 1}, {"nombre": "comunicación"}, {"nombre": "Curso", "id": "otro"}):
            with self.subTest(datos=datos):
                self.assertEqual(self.guardar(datos).status_code, 400)
        self.curso.refresh_from_db()
        self.assertEqual(self.curso.nombre, "Matemática")
        with self.assertRaises(IntegrityError), transaction.atomic():
            Curso.objects.create(nombre="MATEMÁTICA")

    def test_api_directa_exige_admin_y_contrasena_definitiva(self):
        for usuario, estado in ((None, 401), (self.docente, 403)):
            self.client.logout()
            if usuario:
                self.client.force_login(usuario)
            self.token = self.client.get(reverse("acceso:sesion")).json()["csrf_token"]
            self.assertEqual(self.client.get(reverse("cuentas:listar_cursos")).status_code, estado)
            self.assertEqual(self.guardar({"nombre": "Otro"}).status_code, estado)
        self.admin.debe_cambiar_contrasena = True
        self.admin.save()
        self.client.force_login(self.admin)
        self.assertEqual(self.client.get(reverse("cuentas:listar_cursos")).status_code, 403)

    def test_csrf_y_curso_inexistente(self):
        self.assertEqual(self.client.patch(self.url, '{"nombre":"Otro"}', content_type="application/json").status_code, 403)
        self.url = reverse("cuentas:actualizar_curso", args=["00000000-0000-0000-0000-000000000000"])
        self.assertEqual(self.guardar({"nombre": "Otro"}).status_code, 404)
