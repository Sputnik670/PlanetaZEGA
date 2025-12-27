# 🧪 Tests E2E con Playwright

Este directorio contiene los tests end-to-end (E2E) para Kiosco 24hs usando Playwright.

## 🚀 Ejecutar Tests

### Todos los tests
```bash
npm run test:e2e
```

### Con interfaz gráfica (recomendado para desarrollo)
```bash
npm run test:e2e:ui
```

### En modo headed (ver el navegador)
```bash
npm run test:e2e:headed
```

### En modo debug (paso a paso)
```bash
npm run test:e2e:debug
```

### Ver reporte de resultados
```bash
npm run test:e2e:report
```

## 📁 Estructura

```
e2e/
├── auth.spec.ts              # Tests de autenticación
├── registro-empleado.spec.ts # Tests de registro de empleados
├── example.spec.ts           # Test de ejemplo básico
├── setup/                    # Archivos de setup
│   └── auth.setup.ts        # Setup de autenticación
└── .auth/                    # Estado de autenticación (gitignored)
    └── user.json            # Sesión guardada del usuario de prueba
```

## 🔧 Configuración

### Variables de Entorno

Para tests que requieren autenticación, crea un archivo `.env.test.local`:

```env
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=password123
NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
```

### Configuración de Playwright

La configuración principal está en `playwright.config.ts` en la raíz del proyecto.

## 📝 Escribir Nuevos Tests

### Ejemplo Básico

```typescript
import { test, expect } from '@playwright/test';

test('mi test', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toHaveText('Kiosco 24hs');
});
```

### Test con Autenticación

Si necesitas que el test use una sesión autenticada, usa `storageState`:

```typescript
import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/user.json' });

test('test autenticado', async ({ page }) => {
  await page.goto('/dashboard');
  // Tu test aquí
});
```

## 🎯 Mejores Prácticas

1. **Usa selectores estables**: Prefiere `data-testid` o roles de accesibilidad
2. **Espera explícitamente**: Usa `waitForLoadState`, `waitForURL`, etc.
3. **Limpia después de tests**: Si creas datos de prueba, elimínalos después
4. **Tests independientes**: Cada test debe poder ejecutarse solo
5. **Timeouts apropiados**: Ajusta timeouts según necesidades

## 🔍 Debugging

### Ver el test ejecutarse

```bash
npm run test:e2e:headed
```

### Modo debug interactivo

```bash
npm run test:e2e:debug
```

### Screenshots y videos

Los screenshots y videos se guardan automáticamente en `test-results/` cuando un test falla.

## 📚 Recursos

- [Documentación de Playwright](https://playwright.dev/)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Guide](https://playwright.dev/docs/debug)

