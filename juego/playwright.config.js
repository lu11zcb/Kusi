import { defineConfig, devices } from '@playwright/test'

// Pruebas automáticas del juego: abren el mercado en Chromium y juegan con el teclado y el mouse.
export default defineConfig({
  testDir: './pruebas',
  timeout: 60_000,
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
