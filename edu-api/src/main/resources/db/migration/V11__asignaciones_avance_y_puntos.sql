-- Un envío conserva sus destinatarios. Un vínculo posterior no recibe juegos viejos.
ALTER TABLE generaciones ADD COLUMN destinatarios_fijados BOOLEAN NOT NULL DEFAULT FALSE;
CREATE TABLE destinatarios_actividad (
    generacion_id UUID NOT NULL REFERENCES generaciones(id) ON DELETE CASCADE,
    estudiante_id UUID NOT NULL,
    asignado_por UUID NOT NULL,
    asignado_en TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    vista_en TIMESTAMP WITH TIME ZONE,
    PRIMARY KEY (generacion_id, estudiante_id)
);
CREATE INDEX ix_destinatario_estudiante ON destinatarios_actividad(estudiante_id);
INSERT INTO destinatarios_actividad(generacion_id, estudiante_id, asignado_por, asignado_en)
SELECT g.id, v.estudiante_id, s.docente_id, g.publicada_en
FROM generaciones g JOIN solicitudes_propuesta s ON s.id = g.solicitud_id
JOIN secciones sec ON sec.id = s.seccion_id
JOIN vinculos_estudiante v ON v.seccion_id = sec.id AND v.anio_escolar = sec.anio_escolar
WHERE g.publicada = TRUE AND g.estado = 'lista' AND v.creado_en <= g.publicada_en;
UPDATE generaciones SET destinatarios_fijados = TRUE WHERE publicada = TRUE;

-- Solo se guarda un punto de regreso confirmado por actividad, con su versión exacta.
CREATE TABLE avances_actividad (
    estudiante_id UUID NOT NULL,
    actividad_id UUID NOT NULL REFERENCES solicitudes_propuesta(id) ON DELETE CASCADE,
    generacion_id UUID NOT NULL REFERENCES generaciones(id) ON DELETE CASCADE,
    partida_id VARCHAR(120) NOT NULL REFERENCES partidas(id) ON DELETE CASCADE,
    ultimo_orden INTEGER NOT NULL CHECK (ultimo_orden > 0),
    nivel INTEGER NOT NULL CHECK (nivel BETWEEN 1 AND 5),
    completada BOOLEAN NOT NULL DEFAULT FALSE,
    actualizado_en TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (estudiante_id, actividad_id)
);

-- Repetir una actividad o jugar otra versión no vuelve a premiar el mismo reto.
CREATE TABLE puntos_reto (
    estudiante_id UUID NOT NULL,
    actividad_id UUID NOT NULL REFERENCES solicitudes_propuesta(id) ON DELETE CASCADE,
    nivel INTEGER NOT NULL CHECK (nivel BETWEEN 1 AND 5),
    puntos INTEGER NOT NULL CHECK (puntos BETWEEN 0 AND 20),
    generacion_id UUID NOT NULL REFERENCES generaciones(id) ON DELETE CASCADE,
    partida_id VARCHAR(120) NOT NULL REFERENCES partidas(id) ON DELETE CASCADE,
    creado_en TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (estudiante_id, actividad_id, nivel)
);
