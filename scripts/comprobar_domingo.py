"""Integración REAL Django/Spring/PostgreSQL en base desechable, sin proveedor IA.

Desde la raíz: admin-api\.venv\Scripts\python.exe scripts\comprobar_domingo.py
--servir conserva el entorno para navegador/emulador; Ctrl+C lo elimina.
"""
import argparse
from contextlib import contextmanager
from datetime import timedelta
import http.cookiejar
import json
import os
from pathlib import Path
import secrets
import subprocess
import sys
import time
import unittest
import urllib.error
import urllib.request
import uuid

import psycopg
from psycopg import sql

RAIZ = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ / "admin-api"))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "kusi_admin.settings")
CLAVE_QA = "PruebaLocalSegura2026!"  # Dato ficticio público, no credencial real.
CURSO = "4b757369-2026-4011-8000-000000000001"


class Cliente:
    def __init__(self):
        self.cookies = http.cookiejar.CookieJar()
        self.http = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(self.cookies))

    def pedir(self, puerto, ruta, datos=None, cabeceras=None):
        encabezados = {"Accept": "application/json", **(cabeceras or {})}
        cuerpo = None if datos is None else json.dumps(datos).encode("utf-8")
        if cuerpo is not None:
            encabezados["Content-Type"] = "application/json"
        peticion = urllib.request.Request("http://127.0.0.1:" + str(puerto) + ruta, cuerpo, encabezados)
        try:
            respuesta = self.http.open(peticion, timeout=12)
        except urllib.error.HTTPError as fallo:
            respuesta = fallo
        with respuesta:
            return respuesta.status, json.loads(respuesta.read())

    def django(self, ruta, datos):
        token = self.pedir(8000, "/api/acceso/sesion/")[1]["csrf_token"]
        return self.pedir(8000, ruta, datos, {"X-CSRFToken": token})

    def ingreso(self, correo):
        estado, datos = self.django("/api/acceso/ingreso/", {"correo": correo, "contrasena": CLAVE_QA})
        assert estado == 200, datos
        return datos["usuario"]

    def educacion(self, ruta, datos):
        token = self.pedir(8080, "/api/edu/acceso/csrf/")[1]["csrf_token"]
        return self.pedir(8080, ruta, datos, {"X-XSRF-TOKEN": token})


class Entorno:
    def __init__(self):
        self.nombre = "test_kusi_domingo_" + uuid.uuid4().hex
        self.procesos = []
        self.archivos = []
        self.creada = False
        self.pg = {"host": os.environ.get("PG_HOST", "127.0.0.1"), "port": os.environ.get("PG_PORT", "5432"),
                   "user": os.environ.get("PG_USER", "postgres"), "password": os.environ.get("PG_PASSWORD", "")}

    def ejecutar_servidor(self, comando, carpeta, nombre):
        salida = open(RAIZ / ".qa" / (nombre + ".log"), "w", encoding="utf-8")
        self.archivos.append(salida)
        proceso = subprocess.Popen(comando, cwd=carpeta, env=os.environ.copy(), stdout=salida, stderr=subprocess.STDOUT)
        self.procesos.append(proceso)
        return proceso

    def esperar(self, puerto, ruta, proceso):
        inicio = time.monotonic()
        while time.monotonic() - inicio < 55:
            if proceso.poll() is not None:
                raise RuntimeError("El servidor terminó. Revisa .qa (sin publicar secretos).")
            try:
                Cliente().pedir(puerto, ruta)
                return
            except (OSError, ValueError):
                time.sleep(0.3)
        raise RuntimeError("El servidor no arrancó a tiempo.")

    def iniciar(self):
        (RAIZ / ".qa").mkdir(exist_ok=True)
        for puerto in (8000, 8080):
            import socket
            with socket.socket() as prueba:
                if prueba.connect_ex(("127.0.0.1", puerto)) == 0:
                    raise RuntimeError("Puerto ocupado: " + str(puerto) + ". No se detiene un proceso ajeno.")
        with psycopg.connect(dbname="postgres", autocommit=True, **self.pg) as conexion:
            conexion.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(self.nombre)))
        self.creada = True
        os.environ.update(PG_DATABASE=self.nombre, DJANGO_SCHEMA="public", CLAVE_INTERNA=secrets.token_urlsafe(48),
                          DJANGO_SECRET_KEY=secrets.token_urlsafe(48), EDU_API_URL="http://127.0.0.1:8080",
                          DJANGO_API_URL="http://127.0.0.1:8000", IA_HABILITADA="false")
        import django
        django.setup()
        from django.core.management import call_command
        from django.contrib.auth.models import Group
        from cuentas.models import Usuario
        call_command("migrate", verbosity=0)
        self.cuentas = {}
        for correo, roles, temporal in (
            ("qa-admin@example.com", ["administrador"], False), ("qa-docente@example.com", ["docente"], False),
            ("qa-otro@example.com", ["docente"], False), ("qa-doble@example.com", ["administrador", "docente"], False),
            ("qa-estudiante@example.com", ["estudiante"], False), ("qa-temporal@example.com", ["estudiante"], True),
            ("qa-temporal-movil@example.com", ["estudiante"], True),
        ):
            cuenta = Usuario.objects.create_user(nombre="Cuenta ficticia QA", correo=correo, password=CLAVE_QA, debe_cambiar_contrasena=temporal)
            cuenta.groups.add(*(Group.objects.get_or_create(name=rol)[0] for rol in roles))
            self.cuentas[correo] = cuenta
        self.django = self.ejecutar_servidor([sys.executable, "manage.py", "runserver", "127.0.0.1:8000", "--noreload"], RAIZ / "admin-api", "django")
        self.esperar(8000, "/api/acceso/sesion/", self.django)
        self.iniciar_spring()
        with self.conectar() as conexion:
            for correo in ("qa-docente@example.com", "qa-doble@example.com"):
                conexion.execute("insert into edu.asignacion_docente(id,docente_id,curso_id) values(%s,%s,%s)",
                                 (uuid.uuid4(), self.cuentas[correo].id, CURSO))
        print("Integración REAL local lista; base aislada " + self.nombre + ". IA deshabilitada.", flush=True)

    def conectar(self):
        return psycopg.connect(dbname=self.nombre, **self.pg)

    def iniciar_spring(self):
        self.spring = self.ejecutar_servidor(["java", "-jar", "target/edu-api-0.0.1-SNAPSHOT.jar"], RAIZ / "edu-api", "spring")
        self.esperar(8080, "/api/edu/acceso/csrf/", self.spring)

    def reiniciar_spring(self):
        self.spring.terminate()
        self.spring.wait(timeout=15)
        self.iniciar_spring()

    def cerrar(self):
        for proceso in reversed(self.procesos):
            if proceso.poll() is None:
                proceso.terminate()
                try:
                    proceso.wait(timeout=15)
                except subprocess.TimeoutExpired:
                    proceso.kill()
                    proceso.wait(timeout=5)
        for archivo in self.archivos:
            archivo.close()
        if self.creada:
            from django.db import connections
            connections.close_all()
            if not self.nombre.startswith("test_kusi_domingo_"):
                raise RuntimeError("Se rechazó eliminar una base no aislada.")
            with psycopg.connect(dbname="postgres", autocommit=True, **self.pg) as conexion:
                conexion.execute(sql.SQL("DROP DATABASE {}").format(sql.Identifier(self.nombre)))
            print("Base y procesos propios eliminados.", flush=True)


class DomingoTests(unittest.TestCase):
    entorno = None

    def test_ingreso_temporal_cambio_salida_y_spring_real(self):
        cliente = Cliente()
        self.assertEqual(cliente.django("/api/acceso/ingreso/", {"correo": "qa-estudiante@example.com", "contrasena": "errónea"})[0], 401)
        usuario = cliente.ingreso("qa-temporal@example.com")
        self.assertTrue(usuario["debe_cambiar_contrasena"])
        self.assertEqual(cliente.pedir(8080, "/api/edu/acceso/estudiante/")[0], 403)
        nueva = "NuevaClaveSeguraDomingo2026!"
        self.assertEqual(cliente.django("/api/acceso/contrasena/", {"contrasena_actual": CLAVE_QA, "nueva_contrasena": nueva, "confirmacion": nueva})[0], 200)
        self.assertEqual(cliente.pedir(8080, "/api/edu/acceso/estudiante/")[0], 200)
        self.assertEqual(cliente.django("/api/acceso/salida/", {})[0], 200)
        self.assertEqual(cliente.pedir(8080, "/api/edu/acceso/estudiante/")[0], 401)

    def test_caducidad_rol_revocado_cuenta_inactiva_y_clave_interna(self):
        from django.contrib.sessions.models import Session
        from django.contrib.auth.models import Group
        from django.utils import timezone
        cliente = Cliente()
        usuario = cliente.ingreso("qa-estudiante@example.com")
        self.assertEqual(cliente.pedir(8080, "/api/edu/acceso/estudiante/")[0], 200)
        cuenta = self.entorno.cuentas["qa-estudiante@example.com"]
        cuenta.groups.clear()
        self.assertEqual(cliente.pedir(8080, "/api/edu/acceso/estudiante/")[0], 403)
        cuenta.groups.add(Group.objects.get(name="estudiante"))
        cuenta.is_active = False
        cuenta.save(update_fields=["is_active"])
        self.assertEqual(cliente.pedir(8080, "/api/edu/acceso/estudiante/")[0], 401)
        cuenta.is_active = True
        cuenta.save(update_fields=["is_active"])
        cliente.ingreso("qa-estudiante@example.com")
        sesion = next(cookie.value for cookie in cliente.cookies if cookie.name == "sessionid")
        Session.objects.filter(session_key=sesion).update(expire_date=timezone.now() - timedelta(seconds=1))
        self.assertEqual(cliente.pedir(8080, "/api/edu/acceso/estudiante/")[0], 401)
        self.assertEqual(cliente.pedir(8080, "/interno/secciones/", {}, {"X-Sesion-Kusi": sesion})[0], 403)

    def test_secciones_gateway_real_validaciones_permisos_y_duplicados(self):
        cliente = Cliente(); cliente.ingreso("qa-admin@example.com")
        entrada = {"grado": 1, "nombre": "  Sección  QA  ", "anio_escolar": 2026}
        estado, datos = cliente.django("/api/educacion/secciones/", entrada)
        self.assertEqual(estado, 201, datos)
        with self.entorno.conectar() as conexion:
            self.assertEqual(conexion.execute("select nombre from edu.seccion where id=%s", (datos["seccion"]["id"],)).fetchone()[0], "Sección QA")
        self.assertEqual(cliente.django("/api/educacion/secciones/", {**entrada, "nombre": "sección qa"})[0], 409)
        self.assertEqual(cliente.django("/api/educacion/secciones/", {**entrada, "anio_escolar": 2027})[0], 201)
        for cambio in ({"grado": 2}, {"grado": True}, {"anio_escolar": 99}, {"nombre": " "}, {"nombre": "a" * 81}):
            self.assertEqual(cliente.django("/api/educacion/secciones/", {**entrada, **cambio})[0], 400)
        self.assertEqual(cliente.pedir(8000, "/api/educacion/secciones/", entrada)[0], 403)
        docente = Cliente(); docente.ingreso("qa-docente@example.com")
        self.assertEqual(docente.django("/api/educacion/secciones/", entrada)[0], 403)
        self.assertEqual(docente.pedir(8080, "/interno/secciones/", entrada, {"X-Clave-Interna": os.environ["CLAVE_INTERNA"], "X-Sesion-Kusi": next(c.value for c in docente.cookies if c.name == "sessionid")})[0], 403)

    def test_solicitudes_persistencia_csrf_propiedad_reinicio_y_catalogo(self):
        docente = Cliente(); docente.ingreso("qa-docente@example.com")
        estado, contexto = docente.pedir(8080, "/api/edu/contexto/propuestas/")
        self.assertEqual(estado, 200); self.assertFalse(contexto["ia_configurada"])
        self.assertEqual(contexto["contextos"][0]["curso_id"], CURSO)
        objetivo = "  Objetivo docente exacto\n  "
        entrada = {"id_solicitud": str(uuid.uuid4()), "curso_id": CURSO, "seccion_id": None, "tema": "  Sumas  ", "objetivo": objetivo}
        ruta = "/api/edu/propuestas/solicitudes/"
        self.assertEqual(docente.pedir(8080, ruta, entrada)[0], 403)
        estado, datos = docente.educacion(ruta, entrada)
        self.assertEqual(estado, 201, datos); self.assertEqual(datos["solicitud"]["objetivo_docente"], objetivo)
        self.assertEqual(datos["solicitud"]["estado"], "pendiente"); self.assertIsNone(datos["solicitud"]["propuesta"])
        self.assertEqual(docente.educacion(ruta, entrada)[0], 201)
        self.assertEqual(docente.educacion(ruta, {**entrada, "tema": "Otro tema"})[0], 409)
        self.assertEqual(docente.educacion(ruta + entrada["id_solicitud"] + "/reintentar/", {})[0], 503)
        otro = Cliente(); otro.ingreso("qa-otro@example.com")
        self.assertEqual(otro.pedir(8080, ruta + entrada["id_solicitud"] + "/")[0], 403)
        admin = Cliente(); admin.ingreso("qa-admin@example.com")
        self.assertEqual(admin.pedir(8080, "/api/edu/contexto/propuestas/")[0], 403)
        self.entorno.reiniciar_spring()
        self.assertEqual(docente.pedir(8080, ruta + entrada["id_solicitud"] + "/")[1]["solicitud"], datos["solicitud"])
        with self.entorno.conectar() as conexion:
            self.assertEqual(conexion.execute("select count(*) from edu.solicitud_propuesta where id=%s", (entrada["id_solicitud"],)).fetchone()[0], 1)
            self.assertEqual(conexion.execute("select count(*) from edu.intento_generacion").fetchone()[0], 0)
        from cuentas.models import Curso
        curso = Curso.objects.get(pk=CURSO); curso.nombre = "Matemática renombrada QA"; curso.save()
        self.assertEqual(docente.pedir(8080, "/api/edu/contexto/propuestas/")[1]["contextos"][0]["curso_nombre"], curso.nombre)
        with self.entorno.conectar() as conexion:
            conexion.execute("update edu.asignacion_docente set activa=false where docente_id=%s", (self.entorno.cuentas["qa-docente@example.com"].id,))
        self.assertEqual(docente.pedir(8080, ruta + entrada["id_solicitud"] + "/")[0], 403)

    def test_cuentas_roles_edicion_catalogo_regresion_hu01_hu02_hu03_hu04(self):
        admin = Cliente(); admin.ingreso("qa-admin@example.com")
        estado, datos = admin.django("/api/cuentas/usuarios/", {"nombre": "Cuenta registro QA", "correo": "registro-integracion@example.com", "rol": "docente"})
        self.assertEqual(estado, 201, datos)
        self.assertEqual(len(datos["contrasena_temporal"]), 10)
        identidad = datos["usuario"]["id"]
        self.assertEqual(admin.django("/api/cuentas/usuarios/", {"nombre": "Duplicado", "correo": "REGISTRO-INTEGRACION@example.com", "rol": "docente"})[0], 400)
        self.assertEqual(admin.django("/api/cuentas/usuarios/" + identidad + "/roles/", {"roles": ["administrador", "docente"]})[0], 200)
        # PATCH conserva UUID/hash/roles y registra historial (Django real).
        token = admin.pedir(8000, "/api/acceso/sesion/")[1]["csrf_token"]
        peticion = urllib.request.Request("http://127.0.0.1:8000/api/cuentas/usuarios/" + identidad + "/datos/",
            json.dumps({"nombre": "Nombre editado QA", "correo": "editado-integracion@example.com"}).encode(),
            {"Content-Type": "application/json", "X-CSRFToken": token}, method="PATCH")
        with admin.http.open(peticion) as respuesta:
            self.assertEqual(respuesta.status, 200)
        estado, datos = admin.pedir(8000, "/api/cuentas/usuarios/" + identidad + "/")
        self.assertEqual(estado, 200); self.assertEqual(datos["usuario"]["id"], identidad)
        self.assertEqual(datos["usuario"]["nombre"], "Nombre editado QA")
        self.assertEqual(len(admin.pedir(8000, "/api/cuentas/cursos/")[1]["cursos"]), 7)


def main():
    argumentos = argparse.ArgumentParser()
    argumentos.add_argument("--servir", action="store_true")
    opciones = argumentos.parse_args()
    entorno = Entorno()
    try:
        entorno.iniciar()
        if opciones.servir:
            print("Datos ficticios: qa-admin/docente/doble/estudiante/temporal@example.com; contraseña publicada en el script. Ctrl+C termina.", flush=True)
            while True:
                time.sleep(1)
        else:
            DomingoTests.entorno = entorno
            resultado = unittest.TextTestRunner(verbosity=2).run(unittest.defaultTestLoader.loadTestsFromTestCase(DomingoTests))
            if not resultado.wasSuccessful():
                sys.exit(1)
    except KeyboardInterrupt:
        pass
    finally:
        entorno.cerrar()


if __name__ == "__main__":
    main()
