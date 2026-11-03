import { defineConfig } from 'vite'

export default defineConfig({
  // Rutas relativas: el juego también funciona servido desde una carpeta (por ejemplo, dentro de la app).
  base: './',
  // Sin el modo SPA, un dibujo que falta responde 404 en vez de index.html,
  // y el juego dibuja su figura simple.
  appType: 'mpa',
  server: {
    host: '127.0.0.1',
    // El panel web ya usa el 5173.
    port: 5174,
    strictPort: true,
  },
  build: {
    // Phaser ocupa cerca de 1.5 MB; no es un error.
    chunkSizeWarningLimit: 2000,
  },
})
