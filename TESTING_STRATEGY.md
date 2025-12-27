# 🧪 Estrategia de Testing - Kiosco 24hs

## Recomendación Inicial

### Opción Recomendada: Playwright + Jest (Stack Moderno y Gratuito)

Para un proyecto Next.js con Supabase como Kiosco 24hs, recomendamos comenzar con **Playwright** para pruebas E2E y **Jest** para pruebas unitarias.

**Ventajas:**
- ✅ Gratuito y open-source
- ✅ Excelente soporte para Next.js
- ✅ Comunidad grande y activa
- ✅ Integración con CI/CD (GitHub Actions, Vercel)
- ✅ Soporte nativo para TypeScript
- ✅ Debugging excelente

### Instalación Rápida

```bash
# Instalar Playwright
npm install -D @playwright/test

# Instalar Jest y React Testing Library
npm install -D jest @testing-library/react @testing-library/jest-dom jest-environment-jsdom

# Inicializar Playwright
npx playwright install
```

### Estructura de Testing Recomendada

```
├── __tests__/
│   ├── components/          # Tests de componentes
│   ├── lib/                 # Tests de utilidades
│   └── integration/         # Tests de integración
├── e2e/                     # Tests E2E con Playwright
│   ├── auth.spec.ts
│   ├── productos.spec.ts
│   └── ventas.spec.ts
└── playwright.config.ts
```

### Casos de Prueba Prioritarios

#### 1. Autenticación y Perfiles
- ✅ Registro de dueño
- ✅ Invitación y registro de empleado
- ✅ Login/logout
- ✅ Navegación según rol

#### 2. Gestión de Productos
- ✅ Crear producto
- ✅ Agregar stock
- ✅ Búsqueda por código de barras
- ✅ Actualizar precios

#### 3. Ventas
- ✅ Procesar venta
- ✅ Cálculo de totales
- ✅ Actualización de stock
- ✅ Generación de tickets

#### 4. Gestión de Caja
- ✅ Apertura de caja
- ✅ Arqueo de caja
- ✅ Registro de movimientos
- ✅ Cálculo de diferencias

#### 5. Supabase/RLS
- ✅ Políticas RLS funcionando
- ✅ Usuarios solo ven datos de su organización
- ✅ Invitaciones pendientes

## Alternativa: TestSprite

Si prefieres empezar con **TestSprite** para pruebas iniciales rápidas:

### Pros
- Rápido de configurar
- No requiere escribir código
- Auto-reparación

### Contras
- Costo (probablemente)
- Menos control que código propio
- Puede ser overkill para un proyecto pequeño

### Cuándo Usar TestSprite
- ✅ Tienes presupuesto para herramientas comerciales
- ✅ Necesitas pruebas rápidas sin escribir código
- ✅ Tu equipo es mayormente no-técnico

### Cuándo NO Usar TestSprite
- ❌ Quieres control total sobre las pruebas
- ❌ Prefieres herramientas open-source
- ❌ Quieres integrar profundamente con tu CI/CD
- ❌ Buscas algo gratuito para comenzar

## Plan de Implementación Sugerido

### Fase 1: Setup Básico (Semana 1)
1. Instalar Playwright
2. Configurar primer test E2E (autenticación)
3. Integrar con GitHub Actions

### Fase 2: Tests Críticos (Semana 2-3)
1. Tests de flujos principales (ventas, stock, caja)
2. Tests de componentes críticos
3. Tests de integración con Supabase

### Fase 3: Cobertura Completa (Semana 4+)
1. Tests de todos los componentes
2. Tests de edge cases
3. Tests de performance

## Scripts de package.json Sugeridos

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:coverage": "jest --coverage"
  }
}
```

## Notas Importantes

1. **Supabase Testing**: Para tests de integración con Supabase, considera usar un proyecto de prueba separado o mocks
2. **Variables de Entorno**: Configura variables de entorno de test separadas
3. **CI/CD**: Integra los tests en tu pipeline de deployment (Vercel, GitHub Actions)

## Recursos

- [Playwright Docs](https://playwright.dev/)
- [Jest Docs](https://jestjs.io/)
- [Testing Library](https://testing-library.com/)
- [Next.js Testing Guide](https://nextjs.org/docs/app/building-your-application/testing)

