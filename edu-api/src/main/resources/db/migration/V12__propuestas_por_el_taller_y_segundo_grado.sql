-- La propuesta la escribe el taller (por el buzón) y las secciones pueden ser de
-- primero o de segundo grado. Los CHECK sin nombre de V1 y V9 se rehacen con nombre:
-- cada base los nombra distinto, así que no se pueden borrar por su nombre.

-- 1. Un trabajo del buzón también puede ser pedir una propuesta («proponer»). Ese trabajo
-- no tiene generación sino solicitud: exactamente una de las dos.
ALTER TABLE trabajos_taller ALTER COLUMN generacion_id DROP NOT NULL;
ALTER TABLE trabajos_taller ADD COLUMN solicitud_id UUID;
ALTER TABLE trabajos_taller ADD CONSTRAINT fk_trabajo_taller_solicitud
    FOREIGN KEY (solicitud_id) REFERENCES solicitudes_propuesta(id) ON DELETE CASCADE;
ALTER TABLE trabajos_taller DROP CONSTRAINT ck_trabajo_taller_tipo;
ALTER TABLE trabajos_taller ADD CONSTRAINT ck_trabajo_taller_tipo
    CHECK (tipo IN ('crear_juego', 'corregir_juego', 'proponer'));
ALTER TABLE trabajos_taller ADD CONSTRAINT ck_trabajo_taller_destino
    CHECK ((generacion_id IS NOT NULL AND solicitud_id IS NULL)
        OR (generacion_id IS NULL AND solicitud_id IS NOT NULL));
CREATE INDEX ix_trabajos_taller_solicitud ON trabajos_taller(solicitud_id, creado_en);

-- 2. De dónde salió el contenido de la propuesta (documento y página o enlace de cada
-- tema), en JSON. Es interno: el docente no lo ve. Vacío si la propuesta vino del respaldo.
ALTER TABLE propuestas ADD COLUMN fuentes TEXT;

-- 3. Las secciones pueden ser de primer o de segundo grado. El CHECK de V1 (grado = 1)
-- no tiene nombre: se rehace la columna con un CHECK con nombre. Los valores se conservan.
ALTER TABLE secciones ADD COLUMN grado_nuevo INTEGER;
UPDATE secciones SET grado_nuevo = grado;
ALTER TABLE secciones DROP COLUMN grado;
ALTER TABLE secciones RENAME COLUMN grado_nuevo TO grado;
ALTER TABLE secciones ALTER COLUMN grado SET NOT NULL;
ALTER TABLE secciones ADD CONSTRAINT ck_seccion_grado CHECK (grado IN (1, 2));
