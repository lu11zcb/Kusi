-- SCRIPT MANUAL DE LEGADO. NO es una migración automática de Django/Flyway.
-- Solo sirve para el esquema anterior: admin.usuarios.id BIGINT y rol único,
-- edu.solicitudes.docente_id BIGINT, sin historial de Django Admin.
-- Revisar respaldo, esquema y permisos antes de usarlo. No usarlo en la
-- instalación actual que ya tiene cuentas_usuario con UUID y datos.
-- Detener Django/Spring durante la conversión para impedir escrituras nuevas.
-- Para habilitarlo deliberadamente en la MISMA sesión psql:
--   SET kusi.confirmar_migracion_usuarios_legacy = 'si';
--   \i migrar_usuarios.sql
-- Todo está en una transacción. Se conservan tablas viejas y mapa de IDs.
-- Las sesiones anteriores se revocan: sus IDs BIGINT ya no son válidos.
-- Si los M2M antiguos tienen datos, se ABORTA para no perder grupos/permisos;
-- primero hace falta adaptar y revisar su traslado en una migración distinta.

\set ON_ERROR_STOP on
BEGIN;

DO $$
DECLARE
    tabla text;
BEGIN
    IF current_setting('kusi.confirmar_migracion_usuarios_legacy', true) IS DISTINCT FROM 'si' THEN
        RAISE EXCEPTION 'Migración de legado deshabilitada: revise respaldo y esquema, y confirme en esta sesión psql';
    END IF;
    FOREACH tabla IN ARRAY ARRAY[
        'admin.usuarios', 'admin.usuarios_groups', 'admin.usuarios_user_permissions',
        'admin.cuentas_usuario', 'admin.cuentas_usuario_groups',
        'admin.cuentas_usuario_user_permissions', 'admin.auth_group',
        'admin.django_admin_log', 'admin.django_session', 'edu.solicitudes'
    ] LOOP
        IF to_regclass(tabla) IS NULL THEN
            RAISE EXCEPTION 'Esquema legado no compatible: falta %', tabla;
        END IF;
    END LOOP;
    IF to_regclass('admin.mig_usuarios_ids') IS NOT NULL THEN
        RAISE EXCEPTION 'Ya existe el mapa de IDs: no vuelva a ejecutar este script';
    END IF;
    IF (SELECT data_type FROM information_schema.columns WHERE table_schema='admin' AND table_name='usuarios' AND column_name='id') IS DISTINCT FROM 'bigint'
       OR (SELECT data_type FROM information_schema.columns WHERE table_schema='admin' AND table_name='cuentas_usuario' AND column_name='id') IS DISTINCT FROM 'uuid'
       OR (SELECT data_type FROM information_schema.columns WHERE table_schema='edu' AND table_name='solicitudes' AND column_name='docente_id') IS DISTINCT FROM 'bigint'
       OR (SELECT data_type FROM information_schema.columns WHERE table_schema='admin' AND table_name='django_admin_log' AND column_name='user_id') IS DISTINCT FROM 'bigint' THEN
        RAISE EXCEPTION 'Tipos no compatibles: se requiere usuarios BIGINT, cuentas_usuario UUID y referencias legadas BIGINT';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='admin' AND table_name='usuarios' AND column_name='rol') THEN
        RAISE EXCEPTION 'Falta la columna rol del modelo legado';
    END IF;
    IF (SELECT count(*) FROM admin.usuarios)=0 THEN
        RAISE EXCEPTION 'admin.usuarios está vacía: nada que migrar';
    END IF;
    IF EXISTS (SELECT 1 FROM admin.cuentas_usuario)
       OR EXISTS (SELECT 1 FROM admin.cuentas_usuario_groups)
       OR EXISTS (SELECT 1 FROM admin.cuentas_usuario_user_permissions) THEN
        RAISE EXCEPTION 'El destino ya tiene usuarios o permisos: este script no combina instalaciones';
    END IF;
    IF EXISTS (SELECT 1 FROM admin.usuarios_groups)
       OR EXISTS (SELECT 1 FROM admin.usuarios_user_permissions) THEN
        RAISE EXCEPTION 'Hay grupos o permisos legados: adapte su traslado antes de migrar; no se descartarán';
    END IF;
    IF EXISTS (SELECT 1 FROM admin.django_admin_log) THEN
        RAISE EXCEPTION 'El historial Django Admin tiene filas: este script requiere una migración distinta que las preserve';
    END IF;
    IF EXISTS (SELECT 1 FROM admin.usuarios WHERE rol IS NULL OR rol NOT IN ('administrador','docente','estudiante')) THEN
        RAISE EXCEPTION 'Hay roles legados no reconocidos';
    END IF;
    IF EXISTS (SELECT 1 FROM admin.usuarios WHERE correo IS NULL OR btrim(correo)='')
       OR EXISTS (SELECT lower(btrim(correo)) FROM admin.usuarios GROUP BY lower(btrim(correo)) HAVING count(*)>1) THEN
        RAISE EXCEPTION 'Hay correos vacíos o duplicados al normalizar: resuélvalos antes de migrar';
    END IF;
    IF EXISTS (SELECT 1 FROM edu.solicitudes s LEFT JOIN admin.usuarios u ON u.id=s.docente_id WHERE u.id IS NULL) THEN
        RAISE EXCEPTION 'Hay solicitudes sin docente legado equivalente';
    END IF;
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE contype='f' AND confrelid='admin.usuarios'::regclass
          AND conrelid NOT IN ('admin.usuarios_groups'::regclass,
              'admin.usuarios_user_permissions'::regclass,
              'admin.django_admin_log'::regclass,'edu.solicitudes'::regclass)
    ) THEN
        RAISE EXCEPTION 'Hay otras referencias a usuarios legados: adapte su traslado antes de migrar';
    END IF;
END $$;

CREATE TABLE admin.mig_usuarios_ids (
    id_anterior bigint PRIMARY KEY,
    id_nuevo uuid NOT NULL UNIQUE
);
INSERT INTO admin.mig_usuarios_ids (id_anterior,id_nuevo)
SELECT id,gen_random_uuid() FROM admin.usuarios;

-- Se conserva el hash; no se genera ni registra ninguna contraseña visible.
INSERT INTO admin.cuentas_usuario
    (id,password,last_login,is_superuser,nombre,correo,
     is_active,is_staff,debe_cambiar_contrasena,fecha_creacion)
SELECT m.id_nuevo,u.password,u.last_login,u.is_superuser,u.nombre,
       lower(btrim(u.correo)),u.is_active,u.is_staff,false,u.fecha_registro
FROM admin.usuarios u JOIN admin.mig_usuarios_ids m ON m.id_anterior=u.id;

INSERT INTO admin.auth_group (name)
VALUES ('administrador'),('docente'),('estudiante')
ON CONFLICT (name) DO NOTHING;
INSERT INTO admin.cuentas_usuario_groups (usuario_id,group_id)
SELECT m.id_nuevo,g.id
FROM admin.usuarios u
JOIN admin.mig_usuarios_ids m ON m.id_anterior=u.id
JOIN admin.auth_group g ON g.name=u.rol;

DO $$
BEGIN
    IF (SELECT count(*) FROM admin.cuentas_usuario)<>(SELECT count(*) FROM admin.usuarios)
       OR (SELECT count(*) FROM admin.cuentas_usuario_groups)<>(SELECT count(*) FROM admin.usuarios) THEN
        RAISE EXCEPTION 'No se copiaron todos los usuarios y sus roles';
    END IF;
END $$;

ALTER TABLE edu.solicitudes ADD COLUMN docente_uuid uuid;
UPDATE edu.solicitudes s SET docente_uuid=m.id_nuevo
FROM admin.mig_usuarios_ids m WHERE m.id_anterior=s.docente_id;
ALTER TABLE edu.solicitudes ALTER COLUMN docente_uuid SET NOT NULL;
ALTER TABLE edu.solicitudes DROP COLUMN docente_id;
ALTER TABLE edu.solicitudes RENAME COLUMN docente_uuid TO docente_id;

-- El nombre de la FK depende del esquema anterior: no se presupone un hash.
DO $$
DECLARE
    restriccion record;
BEGIN
    FOR restriccion IN
        SELECT c.conname FROM pg_constraint c
        JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attname='user_id'
        WHERE c.conrelid='admin.django_admin_log'::regclass
          AND c.contype='f' AND a.attnum=ANY(c.conkey)
    LOOP
        EXECUTE format('ALTER TABLE admin.django_admin_log DROP CONSTRAINT %I',restriccion.conname);
    END LOOP;
END $$;
ALTER TABLE admin.django_admin_log ALTER COLUMN user_id TYPE uuid USING NULL::uuid;
ALTER TABLE admin.django_admin_log
    ADD CONSTRAINT django_admin_log_user_id_cuentas_usuario_fk
    FOREIGN KEY (user_id) REFERENCES admin.cuentas_usuario(id)
    DEFERRABLE INITIALLY DEFERRED;

-- Los navegadores deberán volver a iniciar sesión con el modelo UUID.
DELETE FROM admin.django_session;

-- Resultados informativos; no se presupone una cantidad fija de usuarios.
SELECT count(*) AS usuarios FROM admin.cuentas_usuario;
SELECT g.name AS grupo,count(*) AS usuarios
FROM admin.cuentas_usuario_groups ug JOIN admin.auth_group g ON g.id=ug.group_id
GROUP BY g.name ORDER BY g.name;
SELECT count(*) AS solicitudes_con_docente
FROM edu.solicitudes s JOIN admin.cuentas_usuario u ON u.id=s.docente_id;
COMMIT;
