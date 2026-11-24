import os
import secrets
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'admin-api'))
import psycopg
from psycopg import sql

env_path = ROOT / '.env'
lines = env_path.read_text(encoding='utf-8-sig').splitlines()
env = dict(line.split('=', 1) for line in lines if '=' in line and not line.startswith('#'))
database = 'kusi_flutter_local'
with psycopg.connect(host=env['PG_HOST'], user=env['PG_USER'], password=env['PG_PASSWORD'], dbname='postgres', autocommit=True) as conn:
    if not conn.execute('SELECT 1 FROM pg_database WHERE datname=%s', (database,)).fetchone():
        conn.execute(sql.SQL('CREATE DATABASE {}').format(sql.Identifier(database)))
with psycopg.connect(host=env['PG_HOST'], user=env['PG_USER'], password=env['PG_PASSWORD'], dbname=database, autocommit=True) as conn:
    conn.execute('CREATE SCHEMA IF NOT EXISTS admin')
    conn.execute('CREATE SCHEMA IF NOT EXISTS edu')
env['PG_DATABASE'] = database
env_path.write_text('\n'.join('PG_DATABASE=' + database if line.startswith('PG_DATABASE=') else line for line in lines) + '\n', encoding='utf-8')
os.environ.update(env)
os.environ['DJANGO_SETTINGS_MODULE'] = 'kusi_admin.settings'
import django
django.setup()
from django.core.management import call_command
from django.contrib.auth.models import Group
from cuentas.models import Usuario
call_command('migrate', interactive=False)
credentials_path = ROOT / '.local' / 'cuentas-locales.json'
credentials_path.parent.mkdir(exist_ok=True)
import json
credentials = json.loads(credentials_path.read_text()) if credentials_path.exists() else {'password': 'Kusi-' + secrets.token_urlsafe(10) + '!'}
password = credentials['password']
accounts = [
    ('admin@kusi.local', 'Administrador Local', 'administrador', None),
    ('profesor1@kusi.local', 'Profesor de Matemática', 'docente', None),
    ('profesor2@kusi.local', 'Profesora de Comunicación', 'docente', None),
    (None, 'Estudiante de Prueba 1', 'estudiante', '90000001'),
    (None, 'Estudiante de Prueba 2', 'estudiante', '90000002'),
]
for email, name, role, dni in accounts:
    query = {'correo': email} if email else {'dni': dni}
    if not Usuario.objects.filter(**query).exists():
        create = Usuario.objects.create_superuser if role == 'administrador' else Usuario.objects.create_user
        user = create(email, password, nombre=name, dni=dni, debe_cambiar_contrasena=False)
        group, _ = Group.objects.get_or_create(name=role)
        user.groups.add(group)
    print('Cuenta lista:', email or dni, role)
credentials_path.write_text(json.dumps(credentials), encoding='utf-8')
output = ROOT / '.local' / 'accesos-locales.md'
output.write_text('# Accesos locales de Kusi\n\nBase de datos: `'+database+'` en PostgreSQL local.\n\nContraseña de las cinco cuentas de prueba: `'+password+'`\n\n| Rol | Acceso |\n|---|---|\n| Administrador | admin@kusi.local |\n| Docente | profesor1@kusi.local |\n| Docente | profesor2@kusi.local |\n| Estudiante (DNI) | 90000001 |\n| Estudiante (DNI) | 90000002 |\n\nWeb: http://127.0.0.1:5173/\n\nEstas cuentas contienen datos ficticios para desarrollo local.\n', encoding='utf-8')
print('Base y cuentas verificadas. Credenciales guardadas en .local/accesos-locales.md')
