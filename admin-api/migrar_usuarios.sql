-- Migracion unica: admin.usuarios (id bigint, columna rol) -> cuentas_usuario
-- (id UUID, roles como grupos). Ejecutar DESPUES de crear las tablas cuentas_*
-- (sqlmigrate de cuentas.0001) y de aplicar "python manage.py migrate".
-- Todo corre en una sola transaccion: si algo falla, no se cambia nada.
-- Las tablas viejas (usuarios, usuarios_groups, usuarios_user_permissions)
-- se dejan intactas hasta verificar.

\set ON_ERROR_STOP on

BEGIN;

-- 0. Comprobaciones previas: aborta si algo no es como se espera
DO $$
BEGIN
    IF (SELECT count(*) FROM admin.usuarios) = 0 THEN
        RAISE EXCEPTION 'admin.usuarios esta vacia: nada que migrar';
    END IF;
    IF (SELECT count(*) FROM admin.cuentas_usuario) <> 0 THEN
        RAISE EXCEPTION 'cuentas_usuario ya tiene filas: el script ya se ejecuto?';
    END IF;
    IF (SELECT count(*) FROM admin.django_admin_log) <> 0 THEN
        RAISE EXCEPTION 'django_admin_log tiene filas: este script asume que esta vacia';
    END IF;
END $$;

-- 1. Equivalencias id anterior -> id nuevo (se conserva para auditar o revertir)
CREATE TABLE admin.mig_usuarios_ids (
    id_anterior bigint PRIMARY KEY,
    id_nuevo    uuid NOT NULL UNIQUE
);

INSERT INTO admin.mig_usuarios_ids (id_anterior, id_nuevo)
SELECT id, gen_random_uuid() FROM admin.usuarios;

-- 2. Usuarios. El correo pasa a minusculas, como hace create_user.
--    Ya tienen contrasena propia, por eso debe_cambiar_contrasena = false.
INSERT INTO admin.cuentas_usuario
    (id, password, last_login, is_superuser, nombre, correo,
     is_active, is_staff, debe_cambiar_contrasena, fecha_creacion)
SELECT m.id_nuevo, u.password, u.last_login, u.is_superuser, u.nombre,
       lower(u.correo), u.is_active, u.is_staff, false, u.fecha_registro
FROM admin.usuarios u
JOIN admin.mig_usuarios_ids m ON m.id_anterior = u.id;

-- 3. Roles -> grupos
INSERT INTO admin.auth_group (name)
VALUES ('administrador'), ('docente'), ('estudiante')
ON CONFLICT (name) DO NOTHING;

INSERT INTO admin.cuentas_usuario_groups (usuario_id, group_id)
SELECT m.id_nuevo, g.id
FROM admin.usuarios u
JOIN admin.mig_usuarios_ids m ON m.id_anterior = u.id
JOIN admin.auth_group g ON g.name = u.rol;

DO $$
BEGIN
    IF (SELECT count(*) FROM admin.cuentas_usuario_groups)
       <> (SELECT count(*) FROM admin.usuarios) THEN
        RAISE EXCEPTION 'hay usuarios con un rol que no corresponde a ningun grupo';
    END IF;
END $$;

-- 4. edu.solicitudes.docente_id: bigint -> uuid
ALTER TABLE edu.solicitudes ADD COLUMN docente_uuid uuid;

UPDATE edu.solicitudes s
SET docente_uuid = m.id_nuevo
FROM admin.mig_usuarios_ids m
WHERE m.id_anterior = s.docente_id;

ALTER TABLE edu.solicitudes DROP COLUMN docente_id;
ALTER TABLE edu.solicitudes RENAME COLUMN docente_uuid TO docente_id;
-- Falla (y revierte todo) si alguna solicitud quedo sin docente equivalente
ALTER TABLE edu.solicitudes ALTER COLUMN docente_id SET NOT NULL;

-- 5. django_admin_log.user_id: bigint -> uuid, con FK al usuario nuevo
--    (la tabla esta vacia, ver comprobacion previa)
ALTER TABLE admin.django_admin_log
    DROP CONSTRAINT django_admin_log_user_id_c564eba6_fk_usuarios_id;
ALTER TABLE admin.django_admin_log
    ALTER COLUMN user_id TYPE uuid USING NULL::uuid;
ALTER TABLE admin.django_admin_log
    ADD CONSTRAINT django_admin_log_user_id_c564eba6_fk_cuentas_usuario_id
    FOREIGN KEY (user_id) REFERENCES admin.cuentas_usuario (id)
    DEFERRABLE INITIALLY DEFERRED;

-- 6. Resultado esperado con los datos de hoy: 9 / 1-4-4 / 4
SELECT count(*) AS usuarios FROM admin.cuentas_usuario;

SELECT g.name AS grupo, count(*) AS usuarios
FROM admin.cuentas_usuario_groups ug
JOIN admin.auth_group g ON g.id = ug.group_id
GROUP BY g.name
ORDER BY g.name;

SELECT count(*) AS solicitudes_con_docente
FROM edu.solicitudes s
JOIN admin.cuentas_usuario u ON u.id = s.docente_id;

COMMIT;
