-- HU10: conservar el vínculo histórico, partidas, avances y puntos.
ALTER TABLE vinculos_estudiante ADD COLUMN retirado_en TIMESTAMP WITH TIME ZONE;
ALTER TABLE vinculos_estudiante ADD COLUMN retirado_por UUID;
