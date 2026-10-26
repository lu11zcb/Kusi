import { defineConfig, devices } from '@playwright/test'

// Pruebas automáticas del juego: abren el mercado en Chromium y juegan con el teclado y el mouse.
export default defineConfig({
  testDir: './pruebas',
  // La lógica de casillas se prueba con node --test, sin abrir un navegador.
  testMatch: '**/*.spec.js',
  timeout: 60_000,
  // Las pruebas de la capa de vida miden tiempos de animación y sonido. Con varios
  // navegadores a la vez compiten por el procesador y fallan por unos milisegundos
  // (una respiración de 2,2 s en vez de 2 s), así que corren de una en una.
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:5174/',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 } },
    },
  ],
  // Levanta el servidor de Vite si no está corriendo (si ya está, lo usa)
  webServer: {
    command: 'npm run dev',
    url: 'http://127.0.0.1:5174/',
    reuseExistingServer: true,
    timeout: 60_000,
  },
})
