# 🧪 Guía para Probar QR de Fichaje

## 📋 Información Necesaria

Para crear QR codes de prueba, necesitas:

1. **ID de una Sucursal existente** en tu base de datos
2. **Tipo de QR**: "entrada" o "salida"

## 🔍 Paso 1: Obtener ID de Sucursal

### Opción A: Desde la Base de Datos
1. Ve a tu proyecto en Supabase
2. Abre la tabla `sucursales`
3. Copia el `id` (UUID) de una sucursal

### Opción B: Desde la App (Dueño)
1. Inicia sesión como dueño
2. Ve a "Mi Equipo" → "Generar QR de Fichaje"
3. Selecciona una sucursal
4. El ID se usa automáticamente

## 📱 Paso 2: Generar QR de Prueba

### Opción A: Usar el Generador en la App (Recomendado)
1. Inicia sesión como **dueño**
2. Ve a **"Mi Equipo"** en el dashboard
3. En la sección **"Generar QR de Fichaje"**:
   - Selecciona una sucursal
   - Elige "QR Entrada" o "QR Salida"
   - Descarga el QR como imagen PNG
   - O copia el código JSON

### Opción B: Crear QR Manualmente

El QR debe contener este JSON:
```json
{
  "sucursal_id": "aqui-va-el-uuid-de-la-sucursal",
  "tipo": "entrada"
}
```

O para salida:
```json
{
  "sucursal_id": "aqui-va-el-uuid-de-la-sucursal",
  "tipo": "salida"
}
```

**Herramientas para generar QR:**
- https://www.qr-code-generator.com/
- https://qr-code-generator.com/
- Cualquier app de QR en tu teléfono

## 🧪 Paso 3: Probar el QR

### Como Empleado:
1. Inicia sesión como **empleado**
2. Verás la pantalla "Escanear QR del Local"
3. Haz clic en **"Escanear QR del Local"**
4. Apunta la cámara al QR (puede ser desde otra pantalla/impreso)
5. El sistema debería:
   - Validar el QR
   - Procesar el fichaje automáticamente
   - Mostrar el panel de trabajo

### Como Dueño (para generar QR):
1. Inicia sesión como **dueño**
2. Ve a **"Mi Equipo"**
3. Usa el generador de QR
4. Descarga los QR de prueba

## 📝 Ejemplo de QR de Prueba

Si tu sucursal tiene ID: `123e4567-e89b-12d3-a456-426614174000`

**QR de Entrada:**
```json
{"sucursal_id":"123e4567-e89b-12d3-a456-426614174000","tipo":"entrada"}
```

**QR de Salida:**
```json
{"sucursal_id":"123e4567-e89b-12d3-a456-426614174000","tipo":"salida"}
```

## ⚠️ Validaciones que se Realizan

1. ✅ El QR contiene `sucursal_id` y `tipo`
2. ✅ El `tipo` es "entrada" o "salida"
3. ✅ La sucursal existe en la base de datos
4. ✅ El empleado pertenece a la misma organización
5. ✅ No hay entrada activa antes de permitir nueva entrada
6. ✅ Hay entrada activa antes de permitir salida

## 🐛 Solución de Problemas

### "QR inválido: formato incorrecto"
- Verifica que el JSON esté bien formateado
- Asegúrate de que tenga `sucursal_id` y `tipo`

### "Sucursal no encontrada"
- Verifica que el `sucursal_id` sea correcto
- Asegúrate de que la sucursal exista en la base de datos

### "No tienes acceso a esta sucursal"
- El empleado debe pertenecer a la misma organización que la sucursal
- Verifica los datos en la tabla `perfiles` y `sucursales`

### "Ya tienes una entrada registrada"
- Debes fichar la salida primero antes de poder fichar otra entrada
- O escanea el QR de salida

### "No tienes una entrada registrada"
- Debes fichar la entrada primero antes de poder fichar la salida
- Escanea el QR de entrada

## 💡 Tips para Pruebas

1. **Usa dos dispositivos**: Uno para mostrar el QR, otro para escanear
2. **Imprime el QR**: Es más fácil escanear desde papel
3. **Prueba ambos tipos**: Entrada y salida
4. **Prueba errores**: QR inválido, sucursal incorrecta, etc.
5. **Verifica en la BD**: Revisa la tabla `asistencia` después de fichar

## 🔗 Dónde se Guardan los Datos

Después de escanear el QR:
- Se crea/actualiza un registro en la tabla `asistencia`
- Campo `entrada`: timestamp cuando se escanea QR de entrada
- Campo `salida`: timestamp cuando se escanea QR de salida
- Campo `sucursal_id`: ID de la sucursal del QR
- Campo `empleado_id`: ID del empleado que escaneó

