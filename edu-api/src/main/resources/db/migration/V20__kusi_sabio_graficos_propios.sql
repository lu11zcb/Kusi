-- Los gráficos que el docente le pide a Kusi Sabio («hazme un gráfico de los puntos de cada estudiante»), en JSON:
-- [{ titulo, barras: [{ etiqueta, valor, total }] }]. Los armó quien respondió con los datos de la clase.
ALTER TABLE consultas_sabio ADD COLUMN graficos_propios TEXT;
