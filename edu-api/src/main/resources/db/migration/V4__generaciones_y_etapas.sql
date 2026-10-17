
-- HU27: historial de generaciones de juegos y sus etapas.

CREATE TABLE generaciones (
    id UUID PRIMARY KEY,
    solicitud_id UUID NOT NULL,
    propuesta_id UUID NOT NULL,
    version_propuesta INTEGER NOT NULL CHECK (version_propuesta >= 1),
    estado VARCHAR(24) NOT NULL
        CHECK (estado IN (
            'pendiente',
            'generando',
            'comprobando',
            'lista',
            'correccion',
            'fallida'
        )),
    paquete TEXT,
    ultimo_error VARCHAR(1000),
    creado_en TIMESTAMP(6) WITH TIME ZONE NOT NULL,
    actualizado_en TIMESTAMP(6) WITH TIME ZONE NOT NULL,

    CONSTRAINT fk_generacion_solicitud
        FOREIGN KEY (solicitud_id)
        REFERENCES solicitudes_propuesta(id),

    CONSTRAINT fk_generacion_propuesta
        FOREIGN KEY (propuesta_id)
        REFERENCES propuestas(id)
);

CREATE INDEX ix_generacion_solicitud
    ON generaciones(solicitud_id);

CREATE INDEX ix_generacion_estado
    ON generaciones(estado);

CREATE TABLE etapas_generacion (
    id UUID PRIMARY KEY,
    generacion_id UUID NOT NULL,
    etapa VARCHAR(40) NOT NULL,
    estado VARCHAR(20) NOT NULL,
    mensaje VARCHAR(1000),
    creado_en TIMESTAMP(6) WITH TIME ZONE NOT NULL,

    CONSTRAINT fk_etapa_generacion
        FOREIGN KEY (generacion_id)
        REFERENCES generaciones(id)
        ON DELETE CASCADE
);

CREATE INDEX ix_etapa_generacion_fecha
    ON etapas_generacion(generacion_id, creado_en);
