-- La identidad procede de la sesión validada por Django, nunca del mensaje JS.
CREATE TABLE partidas (
    id VARCHAR(120) PRIMARY KEY,
    usuario_id UUID NOT NULL,
    prueba_docente BOOLEAN NOT NULL,
    creado_en TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE avisos_partida (
    partida_id VARCHAR(120) NOT NULL REFERENCES partidas(id),
    orden INTEGER NOT NULL CHECK (orden > 0),
    tipo VARCHAR(24) NOT NULL,
    nivel INTEGER,
    ayuda INTEGER,
    contenido TEXT NOT NULL,
    creado_en TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (partida_id, orden)
);
CREATE INDEX ix_partidas_usuario ON partidas(usuario_id);
