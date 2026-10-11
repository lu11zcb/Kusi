"""Servidor local para recorridos de navegador con PostgreSQL desechable.

Ejecutar desde admin-api: .venv/Scripts/python.exe scripts/servidor_qa.py
No usa settings_pruebas ni modifica los datos de kusi. Ctrl+C elimina su base.
"""

import os
from pathlib import Path
import sys
import uuid


sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "kusi_admin.settings")

import django
from django.core.management import call_command
from django.db import connection


django.setup()
nombre_original = connection.settings_dict["NAME"]
nombre_qa = "test_kusi_navegador_" + uuid.uuid4().hex[:10]
connection.settings_dict["OPTIONS"] = {"options": "-c search_path=public"}
connection.settings_dict["TEST"]["NAME"] = nombre_qa

try:
    connection.creation.create_test_db(verbosity=1, autoclobber=False)
    from cuentas.models import Usuario

    # Datos públicos y ficticios exclusivos de esta base desechable.
    Usuario.objects.create_superuser(
        nombre="Administración QA", correo="qa-admin@example.com",
        password="PruebaLocalSegura2026!",
    )
    print("Base aislada lista: " + nombre_qa, flush=True)
    call_command("runserver", "127.0.0.1:8000", use_reloader=False)
finally:
    if connection.settings_dict["NAME"] == nombre_qa:
        connection.creation.destroy_test_db(nombre_original, verbosity=1)
