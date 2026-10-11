"""Pruebas en PostgreSQL aislado; nunca crear tablas en el esquema admin de kusi."""

from .settings import *  # noqa: F403


# Django crea y elimina esta base al ejecutar su runner de pruebas.
# public existe en una base nueva; admin solo está preparado en la base local.
DATABASES = {
    "default": {
        **DATABASES["default"],  # noqa: F405
        "OPTIONS": {"options": "-c search_path=public"},
        "TEST": {"NAME": "test_kusi_hu01"},
    },
}
