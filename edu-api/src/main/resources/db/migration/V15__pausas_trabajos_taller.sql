-- Una pausa conserva el motivo aparte de los fallos y difiere la próxima toma.
ALTER TABLE trabajos_taller
    ADD COLUMN disponible_desde TIMESTAMP(6) WITH TIME ZONE;

ALTER TABLE trabajos_taller
    ADD COLUMN motivo_pausa VARCHAR(2000);
