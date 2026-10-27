-- El docente prueba el juego y, cuando le da el OK, lo envía a sus estudiantes. Solo los
-- juegos enviados aparecen en la app del niño. Los juegos anteriores quedan sin enviar.
ALTER TABLE generaciones ADD COLUMN publicada BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE generaciones ADD COLUMN publicada_en TIMESTAMP WITH TIME ZONE;
