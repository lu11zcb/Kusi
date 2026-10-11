import uuid

from django.db import migrations


def cargar_catalogo(apps, schema_editor):
    curso = apps.get_model("cuentas", "Curso")
    for numero, nombre in enumerate((
        "Matemática", "Comunicación", "Personal Social", "Ciencia y Tecnología",
        "Arte y Cultura", "Educación Religiosa", "Inglés",
    ), start=1):
        # Identificadores publicados, independientes del nombre editable.
        identificador = uuid.UUID("4b757369-2026-4011-8000-" + str(numero).zfill(12))
        curso.objects.using(schema_editor.connection.alias).get_or_create(pk=identificador, defaults={"nombre": nombre})


class Migration(migrations.Migration):
    dependencies = [("cuentas", "0003_curso")]
    operations = [migrations.RunPython(cargar_catalogo, migrations.RunPython.noop)]
