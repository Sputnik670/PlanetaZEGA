# 🧪 Probar QR de Fichaje - Paso a Paso

## 🎯 Objetivo
Probar el sistema de fichaje con QR codes sin necesidad de ser dueño.

## 📋 Requisitos Previos

1. Tener al menos una sucursal creada en la base de datos
2. Tener una cuenta de empleado para probar
3. Tener acceso a la cámara del dispositivo

## 🚀 Pasos para Probar

### Paso 1: Obtener ID de Sucursal

**Opción A - Desde Supabase:**
1. Ve a tu proyecto en Supabase Dashboard
2. Abre la tabla `sucursales`
3. Copia el `id` (UUID) de una sucursal
4. Ejemplo: `123e4567-e89b-12d3-a456-426614174000`

**Opción B - Desde la App:**
1. Inicia sesión como empleado
2. En la pantalla de vista empleado, verás el componente "🧪 Generador de QR de Prueba"
3. Selecciona una sucursal del dropdown
4. El ID se usa automáticamente

### Paso 2: Generar QR de Prueba

**Usando el Componente de Prueba (Recomendado):**

1. Inicia sesión como **empleado**
2. En la pantalla principal, verás el componente **"🧪 Generador de QR de Prueba"**
3. Selecciona una sucursal
4. Elige "Entrada" o "Salida"
5. Se generará automáticamente el QR
6. Opciones:
   - **Escanear desde pantalla**: Abre el scanner y apunta a este QR
   - **Descargar**: Descarga el QR como imagen PNG
   - **Copiar JSON**: Copia el código para usar en otra herramienta

**Generar QR Manualmente:**

Si prefieres usar una herramienta externa, el JSON debe ser:
```json
{"sucursal_id":"TU-UUID-AQUI","tipo":"entrada"}
```

O para salida:
```json
{"sucursal_id":"TU-UUID-AQUI","tipo":"salida"}
```

Herramientas recomendadas:
- https://www.qr-code-generator.com/
- https://qr-code-generator.com/
- Cualquier app de QR en tu teléfono

### Paso 3: Probar el Escaneo

1. **Abre el scanner:**
   - Haz clic en "Escanear QR del Local" (pantalla inicial)
   - O haz clic en "Escanear QR ENTRADA/SALIDA" (desde RelojControl)

2. **Escanea el QR:**
   - Si está en pantalla: Apunta la cámara al QR mostrado
   - Si está impreso: Apunta la cámara al QR impreso
   - Si está en otro dispositivo: Apunta la cámara a la pantalla

3. **Resultado esperado:**
   - ✅ Vibración (si está disponible)
   - ✅ Mensaje de éxito
   - ✅ Fichaje procesado automáticamente
   - ✅ Panel de trabajo desbloqueado (si es entrada)

### Paso 4: Verificar en Base de Datos

1. Ve a Supabase Dashboard
2. Abre la tabla `asistencia`
3. Deberías ver:
   - Nuevo registro con `entrada` = timestamp actual (si escaneaste entrada)
   - Registro actualizado con `salida` = timestamp actual (si escaneaste salida)
   - `sucursal_id` = ID de la sucursal del QR
   - `empleado_id` = ID del empleado que escaneó

## 🧪 Escenarios de Prueba

### Escenario 1: Fichaje Normal
1. Genera QR de entrada
2. Escanea QR de entrada
3. ✅ Debe registrar entrada
4. Genera QR de salida
5. Escanea QR de salida
6. ✅ Debe registrar salida

### Escenario 2: Error - Entrada Duplicada
1. Escanea QR de entrada
2. Intenta escanear QR de entrada otra vez
3. ❌ Debe mostrar error: "Ya tienes una entrada registrada"

### Escenario 3: Error - Salida Sin Entrada
1. Sin haber fichado entrada
2. Intenta escanear QR de salida
3. ❌ Debe mostrar error: "No tienes una entrada registrada"

### Escenario 4: Error - QR Inválido
1. Genera un QR con JSON inválido
2. Intenta escanearlo
3. ❌ Debe mostrar error: "QR inválido: formato incorrecto"

### Escenario 5: Error - Sucursal Incorrecta
1. Genera QR con ID de sucursal de otra organización
2. Intenta escanearlo
3. ❌ Debe mostrar error: "No tienes acceso a esta sucursal"

## 📱 Probar en Móvil

### Opción 1: Dos Dispositivos
1. **Dispositivo 1**: Muestra el QR (puede ser la app o una imagen)
2. **Dispositivo 2**: Escanea el QR con la app

### Opción 2: Un Dispositivo
1. Genera y descarga el QR
2. Ábrelo en otra app (galería, navegador)
3. Vuelve a la app y escanea

### Opción 3: Imprimir
1. Descarga el QR
2. Imprímelo
3. Escanea desde papel

## 🔍 Debugging

### Ver el JSON del QR
El componente de prueba muestra el JSON completo. Puedes copiarlo y validarlo en:
- https://jsonlint.com/
- Cualquier editor de JSON

### Ver Logs de Consola
Abre las DevTools (F12) y revisa:
- Errores de validación
- Respuestas de Supabase
- Mensajes del scanner

### Verificar Permisos
Si el scanner no funciona:
1. Verifica permisos de cámara en el navegador
2. Asegúrate de estar en HTTPS (o localhost)
3. Prueba en otro navegador

## ✅ Checklist de Pruebas

- [ ] Generar QR de entrada
- [ ] Escanear QR de entrada
- [ ] Verificar entrada en base de datos
- [ ] Generar QR de salida
- [ ] Escanear QR de salida
- [ ] Verificar salida en base de datos
- [ ] Probar error: entrada duplicada
- [ ] Probar error: salida sin entrada
- [ ] Probar error: QR inválido
- [ ] Probar en móvil
- [ ] Probar con QR impreso

## 🎉 ¡Listo!

Una vez que hayas probado todos los escenarios, el sistema está funcionando correctamente.

