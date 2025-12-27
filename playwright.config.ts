import { defineConfig, devices } from '@playwright/test';

/**
 * Configuración de Playwright para PlanetaZEGA
 * 
 * Variables de entorno requeridas:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - NEXT_PUBLIC_SUPABASE_ANON_KEY
 * - TEST_USER_EMAIL (opcional, para tests de autenticación)
 * - TEST_USER_PASSWORD (opcional, para tests de autenticación)
 */
export default defineConfig({
  testDir: './e2e',
  
  /* Ejecutar tests en paralelo */
  fullyParallel: true,
  
  /* No ejecutar tests en CI a menos que se especifique explícitamente */
  forbidOnly: !!process.env.CI,
  
  /* Reintentar tests fallidos solo en CI */
  retries: process.env.CI ? 2 : 0,
  
  /* Limitar workers en CI, usar todos los disponibles localmente */
  workers: process.env.CI ? 1 : undefined,
  
  /* Configuración del reporter */
  reporter: [
    ['html'],
    ['list'],
    ...(process.env.CI ? [['github'] as const] : []),
  ],
  
  /* Opciones compartidas para todos los proyectos */
  use: {
    /* Base URL para usar en navegación como `await page.goto('/')` */
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000',
    
    /* Recopilar trace cuando se reintenta el test fallido */
    trace: 'on-first-retry',
    
    /* Screenshots solo en fallos */
    screenshot: 'only-on-failure',
    
    /* Video solo en fallos */
    video: 'retain-on-failure',
  },

  /* Configurar proyectos para múltiples navegadores */
  projects: [
    // Setup project para autenticación (se ejecuta primero)
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'], // Ejecutar setup antes de estos tests
    },

    // Puedes habilitar más navegadores cuando sea necesario
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  /* Servidor de desarrollo local - Playwright puede iniciar Next.js automáticamente */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});

