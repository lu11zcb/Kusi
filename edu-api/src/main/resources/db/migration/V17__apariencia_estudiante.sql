-- El cuy de cada estudiante, para que sus compañeros de sección lo vean en el podio del salón.
-- Los accesorios son los nombres de las prendas de la app («SOMBRERO», «CHALECO»…) separados por comas.
CREATE TABLE apariencias_estudiante (
    estudiante_id UUID PRIMARY KEY,
    pelaje SMALLINT NOT NULL CHECK (pelaje BETWEEN 0 AND 3),
    accesorios VARCHAR(200) NOT NULL DEFAULT '',
    actualizado_en TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
