# 📱 Sistema de Fichaje con QR Codes

## 🎯 Objetivo

Implementar un sistema de fichaje basado en QR codes para eliminar la responsabilidad de los empleados de elegir el punto de venta manualmente. Cada local tiene dos QR: uno de entrada y otro de salida.

## ✅ Funcionalidades Implementadas

### 1. **Scanner de QR para Empleados** ✅
- Componente: `components/qr-fichaje-scanner.tsx`
- Escanea QR codes que contienen `sucursal_id` y `tipo` (entrada/salida)
- Valida que el QR sea válido y que el empleado tenga acceso a la sucursal
- Verifica lógica de entrada/salida (no puede fichar entrada si ya tiene una activa)
- Procesa automáticamente el fichaje después de escanear

### 2. **Generador de QR para Dueños** ✅
- Componente: `components/generar-qr-fichaje.tsx`
- Genera QR codes para cada sucursal
- Dos tipos de QR: entrada y salida
- Opción de descargar QR como imagen PNG
- Opción de copiar datos del QR
- Disponible en el dashboard del dueño en la pestaña "Mi Equipo"

### 3. **Flujo Modificado** ✅
- **Empleados**: Ya no pueden seleccionar sucursal manualmente
- Al iniciar sesión, se muestra pantalla para escanear QR
- Después de escanear QR, se establece la sucursal automáticamente
- El sistema de fichaje se abre automáticamente con la sucursal correcta

### 4. **Validaciones de Seguridad** ✅
- Verifica que la sucursal existe
- Verifica que el empleado pertenece a la misma organización
- Valida que no haya entrada activa antes de permitir nueva entrada
- Valida que haya entrada activa antes de permitir salida
- Mensajes de error claros para el usuario

## 📋 Estructura del QR

El QR contiene un JSON con la siguiente estructura:
```json
{
  "sucursal_id": "uuid-de-la-sucursal",
  "tipo": "entrada" | "salida"
}
```

## 🔄 Flujo de Trabajo

### Para Empleados:
1. Empleado inicia sesión
2. Se muestra pantalla "Escanear QR del Local"
3. Empleado escanea el QR de entrada o salida
4. Sistema valida el QR
5. Sistema procesa fichaje automáticamente
6. Se muestra el panel de trabajo con la sucursal correcta

### Para Dueños:
1. Dueño va a "Mi Equipo" en el dashboard
2. Selecciona una sucursal
3. Elige generar QR de entrada o salida
4. Descarga o copia el QR
5. Imprime y coloca el QR en el local

## 📁 Archivos Modificados/Creados

### Nuevos Componentes:
- `components/qr-fichaje-scanner.tsx` - Scanner de QR con validaciones
- `components/generar-qr-fichaje.tsx` - Generador de QR para dueños

### Archivos Modificados:
- `app/page.tsx` - Flujo modificado para empleados (escaneo QR primero)
- `components/vista-empleado.tsx` - Integración del scanner de QR
- `components/reloj-control.tsx` - Opción para escanear QR en lugar de botón manual
- `components/dashboard-dueno.tsx` - Agregado generador de QR en "Mi Equipo"

## 🔒 Seguridad

- ✅ Los empleados no pueden elegir sucursal manualmente
- ✅ Solo pueden fichar en sucursales de su organización
- ✅ Validación de lógica entrada/salida
- ✅ QR contiene solo IDs, no información sensible
- ✅ Validación en servidor (a través de Supabase RLS)

## 📦 Dependencias Agregadas

- `qrcode.react` - Para generar QR codes

## 🎨 Características de UX

- Scanner con vista de cámara en tiempo real
- Indicador visual de área de escaneo
- Vibración al detectar QR (en dispositivos móviles)
- Mensajes de error claros y específicos
- Feedback visual durante el proceso
- Opción de cancelar escaneo

## ⚠️ Notas Importantes

1. **HTTPS Requerido**: El scanner de QR requiere HTTPS en producción para acceder a la cámara
2. **Permisos de Cámara**: Los usuarios deben otorgar permisos de cámara la primera vez
3. **QR Físicos**: Los QR deben imprimirse y colocarse físicamente en cada local
4. **Dos QR por Local**: Cada local necesita dos QR separados (entrada y salida)

## 🚀 Próximos Pasos Recomendados

1. Agregar historial de QR escaneados (opcional)
2. Agregar expiración de QR (opcional, para seguridad adicional)
3. Agregar estadísticas de fichajes por QR (opcional)
4. Mejorar diseño visual de los QR generados (opcional)

