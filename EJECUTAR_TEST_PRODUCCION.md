# 🧪 Cómo Ejecutar Tests en Producción

## Opción 1: Usar Variable de Entorno

```bash
# Reemplaza con tu URL de Vercel
PLAYWRIGHT_TEST_BASE_URL=https://tu-app.vercel.app npm run test:e2e:qr:prod
```

## Opción 2: Editar el archivo directamente

Edita `e2e/qr-scanner-prod.spec.ts` y cambia la línea 12:

```typescript
const BASE_URL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'https://TU-URL-AQUI.vercel.app';
```

Luego ejecuta:

```bash
npm run test:e2e:qr:prod
```

## Qué hace el test

1. ✅ Navega a tu aplicación en producción
2. ✅ Captura TODOS los logs de consola
3. ✅ Captura TODOS los errores de página
4. ✅ Captura TODOS los requests fallidos
5. ✅ Busca el botón de QR/Fichaje
6. ✅ Intenta abrir el scanner
7. ✅ Captura logs específicos del scanner
8. ✅ Genera screenshots si hay problemas
9. ✅ Muestra un resumen completo de errores

## Ejemplo de salida

```
🌐 Navegando a: https://tu-app.vercel.app
⏳ Esperando a que la página cargue...
🔍 Buscando botones de QR/Fichaje...
✅ Botón encontrado: "Escanear QR"
🖱️ Haciendo clic en el botón...
⏳ Esperando que aparezca el scanner (5 segundos)...
✅ Scanner abierto! Capturando logs...

📊 ============================================
📊 LOGS DEL SCANNER QR:
📊 ============================================
✅ [LOG] 📹 Video metadata cargada
✅ [LOG] ▶️ Video reproduciéndose
✅ [LOG] 🎯 onDecodeResult llamado
❌ [ERROR] NotAllowedError: Permission denied
```

## Encontrar tu URL de Vercel

1. Ve a [vercel.com](https://vercel.com)
2. Inicia sesión
3. Selecciona tu proyecto
4. La URL estará en el dashboard (ejemplo: `planetazega.vercel.app`)

