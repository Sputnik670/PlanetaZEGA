# 🧪 Guía de Pruebas - Scanner QR de Fichaje

## ✅ Estado del Servidor
El servidor está corriendo en: **http://localhost:3000**

## 🔍 Cambios Implementados

### 1. **Memory Leak Corregido** ✅
- Agregado cleanup completo del video stream
- Los tracks se detienen cuando:
  - El componente se desmonta
  - El dialog se cierra
  - Se detecta un QR válido

### 2. **Navegación con Router** ✅
- Cambiado `window.location.href` → `router.push()`
- Mantiene el estado de React sin recargar la página

### 3. **Timeout en getUserMedia** ✅
- Timeout de 10 segundos para evitar esperas infinitas
- Mensaje de error claro si el timeout ocurre

### 4. **Validación Simplificada** ✅
- Eliminada validación duplicada en el scanner
- El scanner solo redirige a `/fichaje`
- Toda la validación se hace en `app/fichaje/page.tsx`

## 📋 Pasos para Probar

### Paso 1: Acceder a la App
1. Abre tu navegador y ve a: **http://localhost:3000**
2. Inicia sesión con un usuario empleado

### Paso 2: Generar QR de Prueba

Necesitas generar un QR de fichaje para probar. El formato del QR debe ser:

**Formato URL (recomendado):**
```
http://localhost:3000/fichaje?sucursal_id=TU_SUCURSAL_ID&tipo=entrada
http://localhost:3000/fichaje?sucursal_id=TU_SUCURSAL_ID&tipo=salida
```

**O formato JSON (legacy):**
```json
{"sucursal_id": "TU_SUCURSAL_ID", "tipo": "entrada"}
{"sucursal_id": "TU_SUCURSAL_ID", "tipo": "salida"}
```

### Paso 3: Obtener Sucursal ID

Si tienes acceso al componente `generar-qr-fichaje.tsx`, puedes:
1. Acceder a la sección de generar QR de fichaje (si está en el dashboard)
2. Copiar la URL generada
3. Usar esa URL para crear un QR

O manualmente, puedes crear un QR con esta URL de ejemplo:
```
http://localhost:3000/fichaje?sucursal_id=TU_ID_AQUI&tipo=entrada
```

### Paso 4: Crear QR de Prueba

**Opción A: Usar un generador online**
1. Ve a https://qr.io/es/ (o cualquier generador QR)
2. Pega la URL: `http://localhost:3000/fichaje?sucursal_id=TU_ID&tipo=entrada`
3. Genera el QR
4. Ábrelo en otra pestaña o impresión para escanear

**Opción B: Crear QR manualmente**
1. Abre la consola del navegador en `http://localhost:3000`
2. Ejecuta:
```javascript
// Reemplaza TU_SUCURSAL_ID con tu ID real
const url = `http://localhost:3000/fichaje?sucursal_id=TU_SUCURSAL_ID&tipo=entrada`
console.log('URL del QR:', url)
// Luego copia esta URL y úsala en un generador QR
```

### Paso 5: Probar el Scanner

1. **Abrir el Scanner:**
   - Como empleado, debería haber una opción para escanear QR de fichaje
   - O ve directamente a la ruta que muestre el componente `EscanearQRFichaje`

2. **Probar Escaneo:**
   - Abre el scanner
   - Asegúrate de dar permisos de cámara
   - Escanea el QR que generaste
   - **VERIFICAR:** Debe redirigir a `/fichaje` sin recargar la página completamente

3. **Verificar Cleanup (Memory Leak):**
   - Abre las DevTools (F12)
   - Ve a la pestaña "Performance" o "Memory"
   - Abre y cierra el scanner varias veces
   - **VERIFICAR:** No debe haber aumento continuo en el uso de memoria
   - **VERIFICAR:** Los tracks de video deben estar cerrados (ver en "Sources" → "Media streams")

4. **Probar Timeout:**
   - Si puedes simular bloqueo de cámara
   - **VERIFICAR:** Después de 10 segundos debe mostrar error de timeout

5. **Probar Navegación:**
   - Escanea un QR válido
   - **VERIFICAR:** Debe navegar a `/fichaje` usando `router.push` (sin recargar la página)
   - **VERIFICAR:** El estado de React se mantiene (puedes volver atrás)

## 🐛 Casos de Prueba Específicos

### Test 1: QR Válido (URL)
- ✅ Escanear QR con formato: `http://localhost:3000/fichaje?sucursal_id=XXX&tipo=entrada`
- ✅ Debe redirigir correctamente
- ✅ No debe validar en el scanner (solo redirige)

### Test 2: QR Válido (JSON Legacy)
- ✅ Escanear QR con formato: `{"sucursal_id": "XXX", "tipo": "entrada"}`
- ✅ Debe convertir a URL y redirigir
- ✅ Debe funcionar igual que el formato URL

### Test 3: QR Inválido
- ✅ Escanear QR con formato no reconocido
- ✅ Debe mostrar error
- ✅ Debe permitir reintentar después de 2 segundos

### Test 4: Memory Leak
- ✅ Abrir scanner 10 veces
- ✅ Cerrar scanner 10 veces
- ✅ Verificar en DevTools que no hay memory leaks
- ✅ Verificar que los MediaStreams se limpian correctamente

### Test 5: Permisos Denegados
- ✅ Denegar permisos de cámara
- ✅ Debe mostrar mensaje de error claro
- ✅ Debe ofrecer opción para cerrar

### Test 6: Timeout
- ✅ Simular cámara que tarda más de 10 segundos
- ✅ Debe mostrar error de timeout
- ✅ Mensaje debe ser claro y útil

## 🔧 Verificación Técnica

### Revisar en DevTools:

1. **Console:**
   - No debe haber errores relacionados con `MediaStream`
   - No debe haber warnings sobre tracks no limpiados

2. **Network:**
   - Al escanear, debe hacer navegación del lado del cliente (no full page reload)
   - Request a `/fichaje` debe ser una navegación normal

3. **Performance/Memory:**
   - El uso de memoria debe ser estable
   - No debe haber crecimiento continuo

## 📝 Notas Adicionales

- El componente ahora usa `router.push()` en lugar de `window.location.href`
- El cleanup del video stream se ejecuta automáticamente
- La validación completa del fichaje se hace en `/fichaje/page.tsx`
- El scanner es más simple y solo se encarga de detectar y redirigir

## ⚠️ Problemas Comunes

**El scanner no inicia:**
- Verifica permisos de cámara en el navegador
- Verifica que estés usando HTTPS o localhost (requerido para getUserMedia)

**El QR no redirige:**
- Verifica que el formato del QR sea correcto
- Revisa la consola para errores
- Verifica que tengas una sesión activa

**Memory leak persiste:**
- Asegúrate de que el código actualizado esté corriendo
- Verifica que el servidor se haya reiniciado después de los cambios
- Limpia la caché del navegador


