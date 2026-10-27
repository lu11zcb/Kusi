-- La propuesta diseña el juego que de verdad corresponde al tema. «laberinto»: Kusi ya
-- sabe construirlo (el laberinto con frutas y verduras y una de sus dos reglas).
-- «otro»: el tema pide otro juego u otros dibujos, y la propuesta se guarda, pero todavía
-- no se puede generar. Las propuestas anteriores quedan vacías y se tratan como laberinto.
ALTER TABLE propuestas ADD COLUMN tipo_juego VARCHAR(12);
ALTER TABLE propuestas ADD CONSTRAINT ck_propuesta_tipo_juego CHECK (tipo_juego IS NULL OR tipo_juego IN ('laberinto', 'otro'));
