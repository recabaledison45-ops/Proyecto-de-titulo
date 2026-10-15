import { defineConfig, devices } from '@playwright/test'

// Puertos propios para no chocar con un servidor de desarrollo que ya esté abierto.
const API_PORT = process.env.E2E_API_PORT || '8765'
const WEB_PORT = process.env.E2E_WEB_PORT || '5199'
const PYTHON = process.env.E2E_PYTHON || 'python'
const BASE_URL = `http://127.0.0.1:${WEB_PORT}`

export default defineConfig({
  testDir: './tests',
  // Las pruebas de reserva comparten base de datos: se ejecutan en serie.
  workers: 1,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }], ['junit', { outputFile: 'results/junit.xml' }]] : [['list']],
  outputDir: 'results/artifacts',
  use: {
    baseURL: BASE_URL,
    locale: 'es-CL',
    timezoneId: 'America/Santiago',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    // En máquinas con un Chromium ya instalado: PW_CHROMIUM_PATH=/ruta/a/chromium
    launchOptions: process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {},
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } }],
  webServer: [
    {
      // Backend real con una base SQLite desechable y los datos demo.
      command: `sh -c "rm -f e2e-test.sqlite3 && ${PYTHON} manage.py migrate --noinput && ${PYTHON} manage.py seed_demo && ${PYTHON} manage.py runserver 127.0.0.1:${API_PORT} --noreload"`,
      cwd: '../backend',
      url: `http://127.0.0.1:${API_PORT}/api/v1/health/`,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        DJANGO_SETTINGS_MODULE: 'config.settings.local',
        SECRET_KEY: 'e2e-only-secret-key-not-for-production-0123456789',
        DATABASE_URL: 'sqlite:///e2e-test.sqlite3',
        DEBUG: 'true',
        EMAIL_BACKEND: 'django.core.mail.backends.console.EmailBackend',
      },
    },
    {
      command: `npx vite --host 127.0.0.1 --port ${WEB_PORT} --strictPort`,
      cwd: '../frontend',
      url: BASE_URL,
      reuseExistingServer: false,
      timeout: 120_000,
      env: { VITE_BACKEND_URL: `http://127.0.0.1:${API_PORT}` },
    },
  ],
})
