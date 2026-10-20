"""Configura secretos locales entre servidores sin mostrarlos ni reemplazar los existentes."""
from pathlib import Path
import secrets

raiz = Path(__file__).resolve().parent.parent
archivo = raiz / ".env"
contenido = archivo.read_text(encoding="utf-8") if archivo.exists() else ""
datos = dict(linea.split("=", 1) for linea in contenido.splitlines() if "=" in linea and not linea.startswith("#"))
for nombre in ("DJANGO_SECRET_KEY", "CLAVE_INTERNA"):
    if not datos.get(nombre):
        if nombre in datos:
            contenido = "\n".join(linea for linea in contenido.splitlines() if not linea.startswith(nombre + "=")) + "\n"
        contenido += nombre + "=" + secrets.token_urlsafe(48) + "\n"
for nombre, valor in {"EDU_API_URL": "http://127.0.0.1:8080", "DJANGO_API_URL": "http://127.0.0.1:8000", "IA_HABILITADA": "false"}.items():
    if nombre not in datos:
        contenido += nombre + "=" + valor + "\n"
archivo.write_text(contenido, encoding="utf-8")
print("Configuración local preparada. No se muestran secretos ni se configura un proveedor IA.")
