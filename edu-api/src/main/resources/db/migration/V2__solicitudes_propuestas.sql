-- HU18/HU16: solicitudes del docente y propuestas generadas por IA.
-- El curso y el docente pertenecen a Django; aquí solo se guardan sus UUID.
CREATE TABLE solicitudes_propuesta (
    id UUID PRIMARY KEY,
    docente_id UUID NOT NULL,
    curso_id UUID NOT NULL,
    seccion_id UUID,
    tema VARCHAR(2000) NOT NULL,
    objetivo_docente VARCHAR(4000),
    estado VARCHAR(20) NOT NULL CHECK (estado IN ('pendiente', 'generando', 'generada', 'fallida')),
    intentos INTEGER NOT NULL DEFAULT 0,
    ultimo_error VARCHAR(300),
    creado_en TIMESTAMP(6) WITH TIME ZONE NOT NULL,
    actualizado_en TIMESTAMP(6) WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_solicitud_seccion FOREIGN KEY (seccion_id) REFERENCES secciones(id)
);

CREATE INDEX ix_solicitud_docente ON solicitudes_propuesta(docente_id);

-- Cada resultado es una versión; HU22/HU23/HU25 añadirán versiones posteriores.
CREATE TABLE propuestas (
    id UUID PRIMARY KEY,
    solicitud_id UUID NOT NULL,
    version INTEGER NOT NULL CHECK (version >= 1),
    objetivo VARCHAR(4000) NOT NULL,
    origen_objetivo VARCHAR(10) NOT NULL CHECK (origen_objetivo IN ('docente', 'ia')),
    historia VARCHAR(10000) NOT NULL,
    acciones VARCHAR(50000) NOT NULL,
    reglas VARCHAR(50000) NOT NULL,
    retos VARCHAR(50000) NOT NULL,
    ayudas VARCHAR(50000) NOT NULL,
    proveedor VARCHAR(80) NOT NULL,
    modelo VARCHAR(120) NOT NULL,
    creado_en TIMESTAMP(6) WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_propuesta_solicitud FOREIGN KEY (solicitud_id) REFERENCES solicitudes_propuesta(id),
    CONSTRAINT uk_propuesta_solicitud_version UNIQUE (solicitud_id, version)
);
