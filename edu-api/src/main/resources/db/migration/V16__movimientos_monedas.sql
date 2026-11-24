-- La cuenta da un cerrojo por estudiante. El saldo se calcula de sus movimientos.
CREATE TABLE cuentas_monedas (
    estudiante_id UUID PRIMARY KEY
);

CREATE TABLE movimientos_monedas (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    estudiante_id UUID NOT NULL REFERENCES cuentas_monedas(estudiante_id),
    actividad_id UUID REFERENCES solicitudes_propuesta(id),
    partida_id VARCHAR(120) UNIQUE REFERENCES partidas(id),
    turno INTEGER,
    prenda_id VARCHAR(60),
    puntos_convertidos INTEGER NOT NULL DEFAULT 0 CHECK (puntos_convertidos BETWEEN 0 AND 20),
    cantidad INTEGER NOT NULL,
    creado_en TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (estudiante_id, actividad_id, turno),
    UNIQUE (estudiante_id, prenda_id),
    -- El turno 0 es el primer premio. Los turnos 1 a 3 son premios de práctica.
    CHECK (
        (actividad_id IS NOT NULL AND partida_id IS NOT NULL AND prenda_id IS NULL AND turno IS NOT NULL AND
            ((turno = 0 AND cantidad = puntos_convertidos + 5) OR
             (turno BETWEEN 1 AND 3 AND cantidad = puntos_convertidos + 2)))
        OR
        (actividad_id IS NULL AND partida_id IS NULL AND prenda_id IS NOT NULL AND turno IS NULL AND
            puntos_convertidos = 0 AND cantidad < 0)
    )
);
