-- HU19: propósito e instrucciones del docente en la solicitud.
ALTER TABLE solicitudes_propuesta ADD COLUMN proposito VARCHAR(20) DEFAULT 'preparacion' NOT NULL;
ALTER TABLE solicitudes_propuesta ADD CONSTRAINT ck_solicitud_proposito CHECK (proposito IN ('preparacion', 'refuerzo'));
ALTER TABLE solicitudes_propuesta ADD COLUMN instrucciones VARCHAR(4000);

-- HU20-HU25: cada versión indica su origen, la versión que ajusta, sus recursos
-- (opcionales) y su revisión docente. Las versiones anteriores nunca se modifican.
ALTER TABLE propuestas ADD COLUMN recursos VARCHAR(50000);
ALTER TABLE propuestas ADD COLUMN origen VARCHAR(10) DEFAULT 'ia' NOT NULL;
ALTER TABLE propuestas ADD CONSTRAINT ck_propuesta_origen CHECK (origen IN ('ia', 'docente'));
ALTER TABLE propuestas ADD COLUMN version_base INTEGER;
ALTER TABLE propuestas ADD COLUMN observaciones VARCHAR(4000);
ALTER TABLE propuestas ADD COLUMN estado_revision VARCHAR(12) DEFAULT 'pendiente' NOT NULL;
ALTER TABLE propuestas ADD CONSTRAINT ck_propuesta_revision CHECK (estado_revision IN ('pendiente', 'aprobada', 'rechazada'));
ALTER TABLE propuestas ADD COLUMN revisada_por UUID;
ALTER TABLE propuestas ADD COLUMN revisada_en TIMESTAMP(6) WITH TIME ZONE;
-- Una versión editada por el docente no tiene proveedor ni modelo de IA.
ALTER TABLE propuestas ALTER COLUMN proveedor DROP NOT NULL;
ALTER TABLE propuestas ALTER COLUMN modelo DROP NOT NULL;
