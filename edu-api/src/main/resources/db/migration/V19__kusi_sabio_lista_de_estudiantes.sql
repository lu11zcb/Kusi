-- Kusi Sabio puede pedir que el panel muestre la lista de estudiantes del docente (con nombres, armada por Spring).
ALTER TABLE consultas_sabio ADD COLUMN mostrar_estudiantes BOOLEAN NOT NULL DEFAULT FALSE;
