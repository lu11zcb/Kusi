-- Las preguntas del docente a «Kusi Sabio». El contexto es lo único que sale hacia quien responde (el taller o la
-- IA de reserva): datos del grupo, sin nombres, DNI ni ids de estudiantes. Los nombres los pone el panel al mostrar.
CREATE TABLE consultas_sabio (
    id UUID PRIMARY KEY,
    docente_id UUID NOT NULL,
    actividad_id UUID REFERENCES solicitudes_propuesta(id) ON DELETE CASCADE,
    contexto TEXT NOT NULL,
    estado VARCHAR(20) NOT NULL CHECK (estado IN ('pendiente', 'en_proceso', 'respaldo', 'lista')),
    texto TEXT,
    graficos VARCHAR(200),
    mostrar_apoyo BOOLEAN,
    respondio VARCHAR(20) CHECK (respondio IN ('taller', 'respaldo', 'local')),
    creado_en TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    tomado_en TIMESTAMP WITH TIME ZONE,
    respondido_en TIMESTAMP WITH TIME ZONE
);
CREATE INDEX ix_consultas_sabio_estado ON consultas_sabio(estado, creado_en);
CREATE INDEX ix_consultas_sabio_docente ON consultas_sabio(docente_id, creado_en);
