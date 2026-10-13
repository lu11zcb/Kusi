import json
import uuid
from unittest.mock import patch

from django.contrib.auth.models import Group
from django.db import IntegrityError, transaction
from django.test import Client, TestCase
from django.urls import reverse

from .models import Usuario


class RegistroUsuariosTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.administrador = Usuario.objects.create_user(
            correo="administrador@example.com",
            nombre="Administradora de prueba",
            password="ClaveDePruebaSegura!",
            debe_cambiar_contrasena=False,
        )
        cls.grupo_administrador = Group.objects.create(name="administrador")
        cls.administrador.groups.add(cls.grupo_administrador)

    def setUp(self):
        # Estos casos también atraviesan el middleware CSRF real.
        self.client = Client(enforce_csrf_checks=True)
        self.client.force_login(self.administrador)
        self.url = reverse("cuentas:registrar_usuario")
        self.url_contexto = reverse("cuentas:contexto_registro")
        self.datos = {
            "nombre": "Persona de prueba",
            "correo": "persona@example.com",
            "rol": "docente",
        }
        self.token = self.client.get(self.url_contexto).json()["csrf_token"]

    def registrar(self, datos=None, **cabeceras):
        return self.client.post(
            self.url,
            data=json.dumps(self.datos if datos is None else datos),
            content_type="application/json",
            HTTP_X_CSRFTOKEN=self.token,
            **cabeceras,
        )

    def comprobar_sin_cache(self, respuesta):
        for directiva in ("no-store", "no-cache", "private", "max-age=0"):
            self.assertIn(directiva, respuesta.headers["Cache-Control"])

    def test_registro_persiste_uuid_hash_rol_y_cambio_obligatorio(self):
        self.datos.update(nombre="  Persona de prueba  ", correo=" Persona@EXAMPLE.COM ")
        respuesta = self.registrar(HTTP_ORIGIN="http://testserver")
        self.assertEqual(respuesta.status_code, 201)
        datos = respuesta.json()
        usuario = Usuario.objects.get(correo="persona@example.com")
        self.assertIsInstance(usuario.id, uuid.UUID)
        self.assertEqual(datos["usuario"]["id"], str(usuario.id))
        self.assertEqual(datos["usuario"]["nombre"], "Persona de prueba")
        self.assertEqual(datos["usuario"]["correo"], "persona@example.com")
        self.assertEqual(datos["usuario"]["rol"], "docente")
        temporal = datos["contrasena_temporal"]
        self.assertEqual(len(temporal), 10)
        self.assertNotEqual(usuario.password, temporal)
        self.assertTrue(usuario.check_password(temporal))
        self.assertTrue(usuario.debe_cambiar_contrasena)
        self.assertTrue(usuario.is_active)
        self.assertFalse(usuario.is_staff)
        self.assertFalse(usuario.is_superuser)
        self.assertEqual(list(usuario.groups.values_list("name", flat=True)), ["docente"])
        self.comprobar_sin_cache(respuesta)

    def test_acepta_los_tres_roles_sin_conceder_acceso_tecnico(self):
        for rol in ("administrador", "docente", "estudiante"):
            with self.subTest(rol=rol):
                # HU12: la cuenta de estudiante se identifica con su DNI.
                extra = {"dni": "40000001"} if rol == "estudiante" else {}
                respuesta = self.registrar({**self.datos, "correo": "registro-" + rol + "@example.com", "rol": rol, **extra})
                self.assertEqual(respuesta.status_code, 201)
                usuario = Usuario.objects.get(id=respuesta.json()["usuario"]["id"])
                self.assertTrue(usuario.groups.filter(name=rol).exists())
                self.assertFalse(usuario.is_staff)
                self.assertFalse(usuario.is_superuser)

    def test_campos_faltantes_vacios_o_solo_espacios(self):
        for datos in ({}, {"nombre": "  ", "correo": " ", "rol": ""}):
            with self.subTest(datos=datos):
                respuesta = self.registrar(datos)
                self.assertEqual(respuesta.status_code, 400)
                self.assertEqual(set(respuesta.json()["errores"]), {"nombre", "correo", "rol"})
        self.assertEqual(Usuario.objects.count(), 1)

    def test_correo_invalido_rol_ajeno_y_limites(self):
        for campo, valor in (
            ("correo", "correo-invalido"),
            ("rol", "superusuario"),
            ("nombre", "a" * 151),
            ("correo", "a" * 243 + "@example.com"),
        ):
            with self.subTest(campo=campo, valor=valor):
                respuesta = self.registrar({**self.datos, campo: valor})
                self.assertEqual(respuesta.status_code, 400)
                self.assertIn(campo, respuesta.json()["errores"])
        self.assertEqual(Usuario.objects.count(), 1)

    def test_json_invalido_o_que_no_es_objeto(self):
        for cuerpo in ("{", "[]", "null", '"texto"', "42"):
            with self.subTest(cuerpo=cuerpo):
                respuesta = self.client.post(
                    self.url, data=cuerpo, content_type="application/json",
                    HTTP_X_CSRFTOKEN=self.token,
                )
                self.assertEqual(respuesta.status_code, 400)
        self.assertEqual(Usuario.objects.count(), 1)

    def test_rechaza_campos_json_que_no_son_texto(self):
        for campo, valor in (("nombre", []), ("correo", {}), ("rol", None), ("nombre", 123)):
            with self.subTest(campo=campo, valor=valor):
                respuesta = self.registrar({**self.datos, campo: valor})
                self.assertEqual(respuesta.status_code, 400)
                self.assertIn(campo, respuesta.json()["errores"])

    def test_rechaza_otro_tipo_de_contenido(self):
        respuesta = self.client.post(self.url, self.datos, HTTP_X_CSRFTOKEN=self.token)
        self.assertEqual(respuesta.status_code, 415)
        self.assertEqual(Usuario.objects.count(), 1)

    def test_duplicado_sin_distinguir_mayusculas(self):
        self.assertEqual(self.registrar().status_code, 201)
        respuesta = self.registrar({**self.datos, "correo": "PERSONA@EXAMPLE.COM"})
        self.assertEqual(respuesta.status_code, 400)
        self.assertIn("correo", respuesta.json()["errores"])
        self.assertNotIn("contrasena_temporal", respuesta.json())
        self.assertEqual(Usuario.objects.filter(correo__iexact=self.datos["correo"]).count(), 1)

    def test_base_de_datos_impide_duplicado_por_otro_camino(self):
        self.registrar()
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                Usuario.objects.bulk_create([
                    Usuario(nombre="Otro nombre", correo="PERSONA@EXAMPLE.COM"),
                ])

    def test_conflicto_despues_de_validar_devuelve_error_de_campo(self):
        # Simula otra solicitud que ganó entre la validación y la escritura.
        def registrar_en_otra_solicitud(datos):
            Usuario.objects.create_user(nombre=datos["nombre"], correo=datos["correo"])
            raise IntegrityError("Duplicado simulado")

        with patch("cuentas.views.crear_cuenta", side_effect=registrar_en_otra_solicitud):
            respuesta = self.registrar()
        self.assertEqual(respuesta.status_code, 409)
        self.assertIn("correo", respuesta.json()["errores"])
        self.assertNotIn("contrasena_temporal", respuesta.json())

    def test_fallo_al_asignar_rol_deshace_la_cuenta(self):
        with patch("cuentas.servicios.Group.objects.get_or_create", side_effect=IntegrityError("Fallo simulado")):
            with self.assertRaises(IntegrityError):
                self.registrar()
        self.assertFalse(Usuario.objects.filter(correo=self.datos["correo"]).exists())

    def test_sesion_anonima_no_registra_ni_consulta_contexto(self):
        cookie_csrf = self.client.cookies["csrftoken"].value
        self.client.logout()
        self.client.cookies["csrftoken"] = cookie_csrf
        contexto = self.client.get(self.url_contexto)
        self.assertEqual(contexto.status_code, 401)
        self.assertEqual(self.registrar().status_code, 401)
        self.assertEqual(Usuario.objects.count(), 1)

    def test_docente_estudiante_staff_y_superusuario_sin_rol_no_registran(self):
        for rol in ("docente", "estudiante", "staff", "superusuario"):
            with self.subTest(rol=rol):
                usuario = Usuario.objects.create_user(
                    correo=rol + "@example.com", nombre=rol,
                    debe_cambiar_contrasena=False,
                    is_staff=rol == "staff", is_superuser=rol == "superusuario",
                )
                if rol in ("docente", "estudiante"):
                    usuario.groups.add(Group.objects.get_or_create(name=rol)[0])
                self.client.force_login(usuario)
                cantidad = Usuario.objects.count()
                self.assertEqual(self.client.get(self.url_contexto).status_code, 403)
                self.assertEqual(self.registrar().status_code, 403)
                self.assertEqual(Usuario.objects.count(), cantidad)

    def test_administrador_con_ambos_roles_puede_registrar(self):
        self.administrador.groups.add(Group.objects.get_or_create(name="docente")[0])
        self.assertEqual(self.registrar().status_code, 201)

    def test_cuenta_inactiva_no_registra(self):
        self.administrador.is_active = False
        self.administrador.save(update_fields=["is_active"])
        # ModelBackend deja de resolver la sesión de la cuenta inactiva.
        self.assertEqual(self.registrar().status_code, 401)
        self.assertEqual(Usuario.objects.count(), 1)

    def test_cambio_de_contrasena_pendiente_bloquea_registro(self):
        self.administrador.debe_cambiar_contrasena = True
        self.administrador.save(update_fields=["debe_cambiar_contrasena"])
        self.assertEqual(self.client.get(self.url_contexto).status_code, 403)
        self.assertEqual(self.registrar().status_code, 403)
        self.assertEqual(Usuario.objects.count(), 1)

    def test_no_confia_en_campos_extra_de_privilegios(self):
        respuesta = self.registrar({**self.datos, "is_staff": True, "is_superuser": True, "debe_cambiar_contrasena": False})
        self.assertEqual(respuesta.status_code, 201)
        usuario = Usuario.objects.get(id=respuesta.json()["usuario"]["id"])
        self.assertFalse(usuario.is_staff)
        self.assertFalse(usuario.is_superuser)
        self.assertTrue(usuario.debe_cambiar_contrasena)

    def test_csrf_ausente_incorrecto_y_origen_ajeno_se_rechazan(self):
        for cabeceras in ({}, {"HTTP_X_CSRFTOKEN": "x" * 64}, {"HTTP_X_CSRFTOKEN": self.token, "HTTP_ORIGIN": "http://otro.example"}):
            with self.subTest(cabeceras=cabeceras):
                respuesta = self.client.post(
                    self.url, data=json.dumps(self.datos),
                    content_type="application/json", **cabeceras,
                )
                self.assertEqual(respuesta.status_code, 403)
                self.assertIn("mensaje", respuesta.json())
                self.comprobar_sin_cache(respuesta)
        self.assertEqual(Usuario.objects.count(), 1)

    def test_contexto_da_csrf_y_no_expone_contrasenas(self):
        respuesta = self.client.get(self.url_contexto)
        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(respuesta.json()["usuario"]["id"], str(self.administrador.id))
        self.assertIn("csrftoken", self.client.cookies)
        self.assertNotIn("contrasena_temporal", respuesta.json())
        self.assertNotIn("password", respuesta.json()["usuario"])
        self.comprobar_sin_cache(respuesta)

    def test_registro_solo_acepta_post_y_no_permite_recuperar_temporal(self):
        self.registrar()
        self.assertEqual(self.client.get(self.url).status_code, 405)
        self.assertNotIn("contrasena_temporal", self.client.get(self.url_contexto).json())

    def test_superusuario_inicial_tiene_rol_administrador(self):
        usuario = Usuario.objects.create_superuser(
            correo="INICIAL@example.com", nombre="Inicial", password="ClaveDePruebaSegura!",
        )
        self.assertEqual(usuario.correo, "inicial@example.com")
        self.assertTrue(usuario.groups.filter(name="administrador").exists())
        self.assertFalse(usuario.debe_cambiar_contrasena)
