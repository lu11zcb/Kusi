-- HU34: buzón asíncrono para la creación de juegos.
-- Los trabajos esperan aquí hasta que el trabajador de Luis los recoja.

CREATE TABLE trabajos_taller (
    id UUID PRIMARY KEY,
    generacion_id UUID NOT NULL,

    tipo VARCHAR(30) NOT NULL
        CHECK (tipo IN ('crear_juego')),

    estado VARCHAR(20) NOT NULL
        CHECK (estado IN ('pendiente', 'en_proceso', 'listo', 'fallido')),

    datos_entrada TEXT NOT NULL,
    resultado TEXT,

    motivo_fallo VARCHAR(2000),

    intentos INTEGER NOT NULL DEFAULT 0
        CHECK (intentos >= 0),

    tomado_por VARCHAR(120),

    creado_en TIMESTAMP(6) WITH TIME ZONE NOT NULL,
    tomado_en TIMESTAMP(6) WITH TIME ZONE,
    terminado_en TIMESTAMP(6) WITH TIME ZONE,

    CONSTRAINT fk_trabajo_taller_generacion
        FOREIGN KEY (generacion_id)
        REFERENCES generaciones(id)
        ON DELETE CASCADE
);

-- Permite encontrar rápidamente el trabajo pendiente más antiguo.
CREATE INDEX ix_trabajos_taller_pendientes
    ON trabajos_taller(estado, creado_en, id);

-- Permite consultar los trabajos relacionados con una generación.
CREATE INDEX ix_trabajos_taller_generacion
    ON trabajos_taller(generacion_id, creado_en);

-- Permite encontrar trabajos que llevan demasiado tiempo en proceso.
CREATE INDEX ix_trabajos_taller_en_proceso
    ON trabajos_taller(estado, tomado_en);
