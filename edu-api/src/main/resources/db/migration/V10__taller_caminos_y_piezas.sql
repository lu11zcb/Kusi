-- El taller crea los juegos nuevos. El laberinto sigue su camino de siempre: Spring le
-- pide el guion directo a la IA y ya no deja ningún trabajo en el buzón. Las propuestas
-- con tipo_juego «otro» sí pasan por el buzón y las prepara el trabajador de esta Mac.

-- 1. Cada generación dice si la prepara el taller. Las anteriores son todas del laberinto.
ALTER TABLE generaciones ADD COLUMN taller BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Hasta hoy, cada laberinto dejaba un trabajo en el buzón. Los que quedaron abiertos
-- (por ejemplo, una generación que esperaba a la IA) se cierran para que el trabajador
-- nunca los tome como si fueran juegos nuevos. No se borra nada: queda el historial.
UPDATE trabajos_taller
SET estado = 'fallido',
    motivo_fallo = 'Laberinto: se genera directo con la IA, sin pasar por el taller.',
    terminado_en = CURRENT_TIMESTAMP
WHERE estado IN ('pendiente', 'en_proceso');

-- 3. Las piezas nuevas que dibujó el taller para un juego (objetos y, si el tema lo pide,
-- un fondo). El archivo vive en juego/taller/trabajos/<trabajo>/piezas/<pieza>.png, en
-- esta Mac; aquí se guarda su estado. Quedan «pendientes» hasta que el docente las aprueba.
CREATE TABLE piezas_taller (
    id UUID PRIMARY KEY,
    trabajo_id UUID NOT NULL,
    pieza VARCHAR(60) NOT NULL,
    tipo VARCHAR(12) NOT NULL
        CHECK (tipo IN ('objeto', 'fondo')),
    nombre VARCHAR(80),
    estado VARCHAR(12) NOT NULL
        CHECK (estado IN ('pendiente', 'aprobada')),
    creado_en TIMESTAMP(6) WITH TIME ZONE NOT NULL,
    aprobada_en TIMESTAMP(6) WITH TIME ZONE,

    CONSTRAINT fk_pieza_taller_trabajo
        FOREIGN KEY (trabajo_id)
        REFERENCES trabajos_taller(id)
        ON DELETE CASCADE,

    -- Un trabajo no entrega dos veces la misma pieza.
    CONSTRAINT uk_pieza_taller_trabajo
        UNIQUE (trabajo_id, pieza)
);

-- Permite listar rápido las piezas aprobadas para la biblioteca del supervisor.
CREATE INDEX ix_piezas_taller_estado
    ON piezas_taller(estado, creado_en);
