import { defineConfig } from 'vite'
import { esIdTrabajo } from './kit/reproductor/datos/registroJuegos.js'

const indiceVozVacio = {
  name: 'indice-voz-vacio',
  configureServer({ middlewares }) {
    // Vite sirve primero los archivos. Si la grabación aún no existe, la misma
    // ruta devuelve un índice vacío, también para juegos anteriores del taller.
    return () => middlewares.use((peticion, respuesta, siguiente) => {
      if (peticion.method !== 'GET' && peticion.method !== 'HEAD') return siguiente()
      const [ruta] = peticion.url.split('?', 1)
      const coincidencia = /^\/taller\/trabajos\/([^/]+)\/voz\/voz\.json$/.exec(ruta)
      if (!esIdTrabajo(coincidencia?.[1])) return siguiente()

      respuesta.statusCode = 200
      respuesta.setHeader('Content-Type', 'application/json; charset=utf-8')
      // La próxima apertura ya puede tener voz grabada.
      respuesta.setHeader('Cache-Control', 'no-store')
      respuesta.end(peticion.method === 'HEAD' ? undefined : JSON.stringify({ voz: null, frases: {} }))
    })
  },
}

export default defineConfig({
  plugins: [indiceVozVacio],
  // Rutas relativas: el juego también funciona servido desde una carpeta (por ejemplo, dentro de la app).
  base: './',
  // Sin el modo SPA, un dibujo que falta responde 404 en vez de index.html,
  // y el juego dibuja su figura simple.
  appType: 'mpa',
  // Los dibujos, los sonidos y el guion de ejemplo están en el kit y se sirven
  // desde la raíz, igual que antes (por ejemplo, dibujos/fresa.png).
  publicDir: 'kit/recursos',
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
