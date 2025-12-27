# 🧪 Cómo Ejecutar Tests en Producción

## ✅ Configuración Lista

El test ya está configurado con:
- **URL**: https://app-cadena-kiosco-24-7.vercel.app
- **Credenciales**: entornomincyt@gmail.com / RamYLu.2021

## 🚀 Ejecutar el Test

### Opción 1: Script PowerShell (Recomendado)

```powershell
.\e2e\test-prod-manual.ps1
```

### Opción 2: Comando Directo

```powershell
$env:PLAYWRIGHT_TEST_BASE_URL = "https://app-cadena-kiosco-24-7.vercel.app"
npm run test:e2e:qr:prod
```

### Opción 3: Con Variables de Entorno

```powershell
$env:PLAYWRIGHT_TEST_BASE_URL = "https://app-cadena-kiosco-24-7.vercel.app"
$env:TEST_EMPLOYEE_EMAIL = "entornomincyt@gmail.com"
$env:TEST_EMPLOYEE_PASSWORD = "RamYLu.2021"
npx playwright test e2e/qr-scanner-prod.spec.ts --project=chromium --timeout=120000
```

## 📊 Qué Hace el Test

1. ✅ Navega a la aplicación en producción
2. ✅ Hace login automático como empleado
3. ✅ Busca el botón de QR/Fichaje
4. ✅ Intenta abrir el scanner
5. ✅ Captura TODOS los logs de consola
6. ✅ Captura TODOS los errores de página
7. ✅ Captura TODOS los requests fallidos
8. ✅ Genera screenshots si hay problemas
9. ✅ Muestra un resumen completo

## 📝 Interpretar los Resultados

### Si el test encuentra el botón:
```
✅ Botón encontrado: "Escanear QR"
🖱️ Haciendo clic en el botón...
✅ Scanner abierto! Capturando logs...
```

### Logs importantes a buscar:

**✅ Logs normales:**
- `📹 Video metadata cargada` - El video se cargó
- `▶️ Video reproduciéndose` - El video está reproduciéndose
- `🎯 onDecodeResult llamado` - El scanner está funcionando

**❌ Errores críticos:**
- `NotAllowedError` - Problema de permisos de cámara
- `PermissionDeniedError` - Permisos denegados
- `getUserMedia` - Error al acceder a la cámara
- `onDecodeResult` nunca aparece - El scanner no está detectando QRs

### Si no encuentra el botón:
El test generará un screenshot en `test-results/no-button-found.png`

## 🔍 Troubleshooting

### El test se queda esperando
- Verifica que la URL sea correcta
- Asegúrate de tener conexión a internet
- El timeout es de 120 segundos

### No se encuentra el botón
- Puede que necesites estar autenticado primero
- Verifica que el usuario sea un empleado
- Revisa el screenshot generado

### No se capturan logs
- Los logs solo aparecen si el scanner se abre
- Verifica que el botón funcione correctamente
- Revisa la consola del navegador manualmente

## 📸 Screenshots

Los screenshots se guardan en:
- `test-results/scanner-not-opened.png` - Si el scanner no se abre
- `test-results/no-button-found.png` - Si no se encuentra el botón

## 🎯 Próximos Pasos

Después de ejecutar el test:
1. Revisa los logs capturados
2. Identifica errores específicos
3. Comparte los logs para análisis
4. Corregimos los problemas encontrados
