from pathlib import Path
import sys, os, json, uuid
ROOT=Path(__file__).resolve().parent.parent
sys.path.insert(0,str(ROOT/'admin-api'))
os.environ['DJANGO_SETTINGS_MODULE']='kusi_admin.settings'
import django
django.setup()
from django.conf import settings
from cuentas.models import Usuario,Curso
import psycopg
def uid(name):return uuid.uuid5(uuid.NAMESPACE_URL,'kusi-local:'+name)
db=settings.DATABASES['default']
assert db['NAME']=='kusi_flutter_local', 'Solo se permite preparar la base de pruebas nueva.'
admin=Usuario.objects.get(correo='admin@kusi.local')
teacher=Usuario.objects.get(correo='profesor1@kusi.local')
course=Curso.objects.get(nombre__iexact='Matemática')
section=uid('seccion');request=uid('solicitud');proposal=uid('propuesta');game=uid('juego')
package=json.loads((ROOT/'juego/kit/recursos/paquete-laberinto-ejemplo.json').read_text())
package['titulo']='El laberinto de frutas · prueba local'
with psycopg.connect(host=db['HOST'],port=db['PORT'],user=db['USER'],password=db['PASSWORD'],dbname=db['NAME']) as c:
    c.execute('INSERT INTO edu.secciones(id,nombre,nombre_clave,grado,anio_escolar) VALUES (%s,%s,%s,1,2026) ON CONFLICT DO NOTHING',(section,'Primero A · Prueba local','primero a prueba local'))
    for correo,curso in [('profesor1@kusi.local','Matemática'),('profesor2@kusi.local','Comunicación')]:
        c.execute('INSERT INTO edu.asignaciones_docente(id,docente_id,curso_id,seccion_id,anio_escolar,creado_en,creado_por) VALUES (%s,%s,%s,%s,2026,now(),%s) ON CONFLICT DO NOTHING',(uid(correo),Usuario.objects.get(correo=correo).id,Curso.objects.get(nombre__iexact=curso).id,section,admin.id))
    for dni in ('90000001','90000002'):
        student=Usuario.objects.get(dni=dni)
        c.execute('INSERT INTO edu.vinculos_estudiante(id,estudiante_id,seccion_id,anio_escolar,creado_en,creado_por) VALUES (%s,%s,%s,2026,now(),%s) ON CONFLICT DO NOTHING',(uid('vinculo-'+dni),student.id,section,admin.id))
    c.execute("INSERT INTO edu.solicitudes_propuesta(id,docente_id,curso_id,seccion_id,tema,objetivo_docente,estado,creado_en,actualizado_en) VALUES (%s,%s,%s,%s,%s,%s,'generada',now(),now()) ON CONFLICT DO NOTHING",(request,teacher.id,course.id,section,'El laberinto de frutas · prueba local','Probar el recorrido del juego con datos ficticios.'))
    c.execute("INSERT INTO edu.propuestas(id,solicitud_id,version,objetivo,origen_objetivo,historia,acciones,reglas,retos,ayudas,creado_en,origen,estado_revision,revisada_por,revisada_en) VALUES (%s,%s,1,%s,'docente',%s,'[]','[]',%s,'[]',now(),'docente','aprobada',%s,now()) ON CONFLICT DO NOTHING",(proposal,request,'Contenido de ejemplo del repositorio para pruebas locales.',package['historia'],json.dumps(package['retos']),teacher.id))
    c.execute("INSERT INTO edu.generaciones(id,solicitud_id,propuesta_id,version_propuesta,estado,paquete,creado_en,actualizado_en,publicada,publicada_en,destinatarios_fijados) VALUES (%s,%s,%s,1,'lista',%s,now(),now(),true,now(),true) ON CONFLICT DO NOTHING",(game,request,proposal,json.dumps(package)))
    for dni in ('90000001','90000002'):
        c.execute('INSERT INTO edu.destinatarios_actividad(generacion_id,estudiante_id,asignado_por) VALUES (%s,%s,%s) ON CONFLICT DO NOTHING',(game,Usuario.objects.get(dni=dni).id,teacher.id))
print('Clase, docentes, estudiantes y laberinto de prueba local preparados.')
