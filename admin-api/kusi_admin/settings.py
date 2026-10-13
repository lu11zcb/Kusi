"""Configuración de Django para Kusi: administración en PostgreSQL, esquema admin."""
from pathlib import Path
import os
from django.core.management.utils import get_random_secret_key

BASE_DIR = Path(__file__).resolve().parent.parent

# Archivo local opcional. Las variables del proceso tienen prioridad.
archivo_local = BASE_DIR.parent / ".env"
if archivo_local.is_file():
    for linea in archivo_local.read_text(encoding="utf-8").splitlines():
        if linea.strip() and not linea.lstrip().startswith("#") and "=" in linea:
            nombre_local, valor_local = linea.split("=", 1)
            os.environ.setdefault(nombre_local.strip(), valor_local.strip())

SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY") or get_random_secret_key()
DEBUG = os.environ.get("DJANGO_DEBUG", "1") == "1"
ALLOWED_HOSTS = [
    host.strip()
    for host in os.environ.get("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1").split(",")
    if host.strip()
]

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "cuentas",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "cuentas.middleware.SesionCompatibleMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "kusi_admin.urls"
TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]
WSGI_APPLICATION = "kusi_admin.wsgi.application"

# PG_* conserva la configuración local existente; DB_* es un alias compatible
# con la entrega de HU07/HU08. Ninguna contraseña se guarda en este archivo.
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.environ.get("PG_DATABASE", os.environ.get("DB_NAME", "kusi")),
        "USER": os.environ.get("PG_USER", os.environ.get("DB_USER", "postgres")),
        "PASSWORD": os.environ.get("PG_PASSWORD", os.environ.get("DB_PASSWORD", "")),
        "HOST": os.environ.get("PG_HOST", os.environ.get("DB_HOST", "127.0.0.1")),
        "PORT": os.environ.get("PG_PORT", os.environ.get("DB_PORT", "5432")),
        "OPTIONS": {
            "options": "-c search_path=" + os.environ.get("DJANGO_SCHEMA", "admin"),
        },
    }
}

AUTH_USER_MODEL = "cuentas.Usuario"
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]
LANGUAGE_CODE = "es-pe"
TIME_ZONE = "America/Lima"
USE_I18N = True
USE_TZ = True
STATIC_URL = "static/"
MAILERS = {
    "default": {"BACKEND": "django.core.mail.backends.console.EmailBackend"},
}

CSRF_FAILURE_VIEW = "cuentas.views.fallo_csrf"
CSRF_TRUSTED_ORIGINS = [
    origen.strip()
    for origen in os.environ.get(
        "DJANGO_CSRF_TRUSTED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
    ).split(",")
    if origen.strip()
]
CSRF_COOKIE_HTTPONLY = True
SESSION_COOKIE_HTTPONLY = True

# Solo entre servidores, nunca se entrega la clave al cliente React.
CLAVE_INTERNA = os.environ.get("CLAVE_INTERNA", "")
EDU_API_URL = os.environ.get("EDU_API_URL", "")
URL_SPRING = os.environ.get("URL_SPRING", "http://localhost:8080")
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
