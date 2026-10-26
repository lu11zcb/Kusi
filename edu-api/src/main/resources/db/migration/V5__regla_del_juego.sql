-- HU28: la propuesta elige con qué regla se juega el laberinto: «orden» (patrones que
-- se repiten) o «solo_clase» (solo frutas o solo verduras). Las propuestas anteriores
-- no la eligieron: queda vacía y la IA que escribe el guion elige según el tema.
ALTER TABLE propuestas ADD COLUMN regla_juego VARCHAR(12);
ALTER TABLE propuestas ADD CONSTRAINT ck_propuesta_regla_juego CHECK (regla_juego IS NULL OR regla_juego IN ('orden', 'solo_clase'));
