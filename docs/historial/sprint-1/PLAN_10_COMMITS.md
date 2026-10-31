# Plan de 10 commits — HU05, HU15, HU07 y HU08

Realiza cada commit después de revisar el diff y ejecutar las pruebas aplicables. Desde la raíz del repositorio, usa `git add <rutas>` para mantener los commits separados; después de cada commit ejecuta `git push origin HEAD`.

1. `feat(HU05): implementar cambio de estado de cuentas` — `admin-api/cuentas/gestion_views.py`, `admin-api/cuentas/urls.py`.
2. `test(HU05): validar bloqueo de cuentas inactivas` — `admin-api/cuentas/test_edicion.py`, `admin-api/cuentas/test_acceso.py`.
3. `feat(HU05): agregar control de estado de usuarios` — `web/src/servicios/usuarios.ts`, `web/src/administracion/GestionarUsuarios.tsx`.
4. `feat(HU15): mejorar mensajes de error del login` — `admin-api/cuentas/acceso_views.py`, `web/src/acceso/Ingresar.tsx`, `web/src/servicios/http.ts`.
5. `test(HU15): validar mensajes de acceso seguros` — `admin-api/cuentas/test_acceso.py`, `web/tests/acceso.test.mjs`.
6. `feat(HU07): implementar vinculación de estudiantes` — `edu-api/src/main/java/pe/kusi/edu/model/Seccion.java`, `VinculoEstudiante.java`, `VinculoEstudianteRepository.java` y la ruta de vinculación de `EducacionController.java`.
7. `fix(HU07): evitar vínculos duplicados` — restricción única de `VinculoEstudiante.java`, validación de duplicados en `EducacionController.java`.
8. `test(HU07): validar asignación de secciones` — `admin-api/cuentas/interno_views.py`, `admin-api/cuentas/educacion_views.py`, `admin-api/cuentas/test_interno.py`, `web/src/servicios/educacion.ts`, `web/src/administracion/GestionarVinculos.tsx`.
9. `feat(HU08): implementar asignación de docentes` — `edu-api/src/main/java/pe/kusi/edu/model/AsignacionDocente.java`, `AsignacionDocenteRepository.java`, `DjangoInternoClient.java`, `EducacionController.java`.
10. `test(HU08): validar permisos de docentes` — `edu-api/src/test/java/pe/kusi/edu/ContratoEducacionTest.java`, `web/src/administracion/AsignarDocentes.tsx`, `web/src/administracion/PanelAdministracion.tsx`, `web/src/servicios/educacion.ts`.

**Nota:** este listado es una guía para crear los commits en tu clon. No contiene commits ya subidos. Como algunos archivos incluyen varios endpoints, si necesitas que cada commit sea estrictamente aislado por HU, usa `git add -p` o divide los cambios en commits pequeños revisando cada hunk.
