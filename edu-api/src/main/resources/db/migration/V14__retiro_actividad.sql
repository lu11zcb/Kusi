-- HU45: retiro de la actividad completa sin borrar sus resultados.
ALTER TABLE solicitudes_propuesta ADD COLUMN retirada_en TIMESTAMP WITH TIME ZONE;
ALTER TABLE solicitudes_propuesta ADD COLUMN retirada_por UUID;
