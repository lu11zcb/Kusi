-- Solo objetos del esquema edu, seleccionado por Flyway. Las cuentas y los
-- cursos pertenecen a Django y se validan por su contrato interno.
CREATE TABLE secciones (
    id UUID PRIMARY KEY,
    nombre VARCHAR(80) NOT NULL,
    nombre_clave VARCHAR(100) NOT NULL,
    grado INTEGER NOT NULL CHECK (grado = 1),
    anio_escolar INTEGER NOT NULL CHECK (anio_escolar BETWEEN 1000 AND 9999),
    CONSTRAINT uk_seccion_nombre_anio UNIQUE (nombre_clave, anio_escolar)
);

CREATE TABLE vinculos_estudiante (
    id UUID PRIMARY KEY,
    estudiante_id UUID NOT NULL,
    seccion_id UUID NOT NULL,
    anio_escolar INTEGER NOT NULL CHECK (anio_escolar BETWEEN 1000 AND 9999),
    creado_en TIMESTAMP(6) WITH TIME ZONE NOT NULL,
    creado_por UUID NOT NULL,
    CONSTRAINT fk_vinculo_seccion FOREIGN KEY (seccion_id) REFERENCES secciones(id),
    CONSTRAINT uk_estudiante_seccion_anio UNIQUE (estudiante_id, seccion_id, anio_escolar)
);

CREATE TABLE asignaciones_docente (
    id UUID PRIMARY KEY,
    docente_id UUID NOT NULL,
    curso_id UUID NOT NULL,
    seccion_id UUID NOT NULL,
    anio_escolar INTEGER NOT NULL CHECK (anio_escolar BETWEEN 1000 AND 9999),
    creado_en TIMESTAMP(6) WITH TIME ZONE NOT NULL,
    creado_por UUID NOT NULL,
    CONSTRAINT fk_asignacion_seccion FOREIGN KEY (seccion_id) REFERENCES secciones(id),
    CONSTRAINT uk_docente_curso_seccion_anio UNIQUE (docente_id, curso_id, seccion_id, anio_escolar)
);

CREATE INDEX ix_asignacion_docente ON asignaciones_docente(docente_id);
