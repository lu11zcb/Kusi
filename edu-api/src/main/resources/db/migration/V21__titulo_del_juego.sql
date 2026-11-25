-- El título del juego lo inventa Kusi junto con la propuesta (por ejemplo, el nombre de la
-- aventura), para no mostrar como título el tema tal como lo escribió el docente. Las
-- propuestas anteriores no tienen título: las pantallas muestran entonces el tema.
ALTER TABLE propuestas ADD COLUMN titulo VARCHAR(60);
