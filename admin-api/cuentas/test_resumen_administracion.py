from django.contrib.auth.models import Group
from django.test import TestCase
from django.urls import reverse

from .models import Curso, Usuario


class ResumenAdministracionTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.admin = Usuario.objects.create_superuser("admin-resumen@example.com", nombre="Admin Resumen", password="Clave de prueba")
        rol_admin = Group.objects.get(name="administrador")
        rol_docente = Group.objects.create(name="docente")
        rol_estudiante = Group.objects.create(name="estudiante")
        cls.docente = Usuario.objects.create_user("docente-resumen@example.com", nombre="Docente Resumen", debe_cambiar_contrasena=False)
        cls.docente.groups.add(rol_docente)
        cls.docente_admin = Usuario.objects.create_user("docente-admin@example.com", nombre="Docente Administrador")
        cls.docente_admin.groups.add(rol_docente, rol_admin, Group.objects.create(name="tecnico"))
        cls.estudiantes = []
        for numero in range(4):
            estudiante = Usuario.objects.create_user(None, dni=str(70000001 + numero), nombre="Estudiante Ejemplo", is_active=numero != 0)
            estudiante.groups.add(rol_estudiante)
            cls.estudiantes.append(estudiante)
        Curso.objects.create(nombre="Curso para el resumen")

    def test_devuelve_los_totales_y_cinco_altas_recientes_con_los_datos_necesarios(self):
        self.client.force_login(self.admin)
        respuesta = self.client.get(reverse("cuentas:resumen_administracion"))
        self.assertEqual(respuesta.status_code, 200)
        self.assertIn("no-store", respuesta.headers["Cache-Control"])
        resumen = respuesta.json()
        self.assertEqual(set(resumen), {"estudiantes", "docentes", "cursos", "usuarios_recientes"})
        self.assertEqual(resumen["estudiantes"], 4)
        self.assertEqual(resumen["docentes"], 2)
        self.assertEqual(resumen["cursos"], Curso.objects.count())
        recientes = resumen["usuarios_recientes"]
        self.assertEqual([usuario["id"] for usuario in recientes],
                         [str(usuario.pk) for usuario in [*reversed(self.estudiantes), self.docente_admin]])
        for usuario in recientes:
            self.assertEqual(set(usuario), {"id", "nombre", "roles", "fecha_creacion"})
        self.assertEqual(recientes[-1]["roles"], ["administrador", "docente"])

    def test_exige_administrador_con_contrasena_definitiva(self):
        url = reverse("cuentas:resumen_administracion")
        self.assertEqual(self.client.get(url).status_code, 401)
        for usuario in (self.docente, self.estudiantes[1], self.docente_admin):
            with self.subTest(usuario=usuario.nombre):
                self.client.force_login(usuario)
                self.assertEqual(self.client.get(url).status_code, 403)
