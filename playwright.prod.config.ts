import { defineConfig, devices } from '@playwright/test';

/**
 * Configuración de Playwright para PRODUCCIÓN
 * NO inicia servidor de desarrollo - usa URL de producción directamente
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  
  reporter: [
    ['list'],
    ['html'],
  ],

  use: {
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || 'https://app-cadena-kiosco-24-7.vercel.app',
    trace: 'on',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 30000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // NO configurar webServer - estamos probando producción
});



