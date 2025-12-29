# 🔍 AUDITORÍA SQL - PlanetaZEGA

## ❌ PROBLEMA CRÍTICO ENCONTRADO

### Error Reportado
```
Could not find the function public.procesar_venta(p_caja_id, p_items,
p_metodo_pago_global, p_monto_total_cliente, p_sucursal_id) in the schema cache
```

---

## 🎯 ANÁLISIS DEL PROBLEMA

### 1. Definición de la Función en SQL (03_FUNCIONES.sql)

**Orden de parámetros CORRECTO:**
```sql
CREATE OR REPLACE FUNCTION public.procesar_venta(
    p_sucursal_id UUID,           -- ✅ Parámetro 1
    p_caja_id UUID,               -- ✅ Parámetro 2
    p_items JSONB,                -- ✅ Parámetro 3
    p_metodo_pago_global TEXT,    -- ✅ Parámetro 4
    p_monto_total_cliente NUMERIC -- ✅ Parámetro 5
)
RETURNS VOID
```

**Ubicación:** `/03_FUNCIONES.sql:44-52`

---

### 2. Llamada desde la App (components/caja-ventas.tsx)

**Uso CORRECTO:**
```typescript
const { data, error } = await supabase.rpc('procesar_venta', {
  p_sucursal_id: sucursalId,           // ✅ Parámetro 1
  p_caja_id: turnoId,                  // ✅ Parámetro 2
  p_items: itemsSimplificados,         // ✅ Parámetro 3
  p_metodo_pago_global: metodoPago,    // ✅ Parámetro 4
  p_monto_total_cliente: calcularTotal() // ✅ Parámetro 5
})
```

**Ubicación:** `components/caja-ventas.tsx:238-244`

---

### 3. ❌ TIPOS TypeScript DESACTUALIZADOS (types/tipos-db.ts)

**Problema:** El archivo de tipos tiene DOS definiciones incorrectas:

#### Definición 1 (Incompleta - 3 parámetros):
```typescript
procesar_venta: {
  Args: {
    p_items: Json                  // ❌ Falta p_sucursal_id y p_caja_id
    p_metodo_pago_global: string
    p_monto_total_cliente: number
  }
  Returns: Json
}
```

#### Definición 2 (Incompleta - 4 parámetros):
```typescript
procesar_venta: {
  Args: {
    p_items: Json
    p_metodo_pago_global: string
    p_monto_total_cliente: number
    p_sucursal_id: string          // ❌ Falta p_caja_id y orden incorrecto
  }
  Returns: Json
}
```

**Ubicación:** `types/tipos-db.ts:1693-1710`

---

## 🔧 CAUSA RAÍZ

El problema tiene **TRES causas**:

1. ✅ **SQL está correcto** - La función tiene los 5 parámetros en el orden correcto
2. ✅ **El código TypeScript está correcto** - La llamada usa los 5 parámetros correctamente
3. ❌ **Los tipos TypeScript están desactualizados** - No coinciden con la definición SQL
4. ❌ **Supabase tiene cacheada una versión anterior** - El schema cache no se actualizó

---

## ✅ SOLUCIONES

### Solución 1: Re-ejecutar la función en Supabase

Ejecuta este comando en Supabase SQL Editor para **forzar la actualización**:

```sql
-- 1. Eliminar la función anterior (todas las sobrecargas)
DROP FUNCTION IF EXISTS public.procesar_venta CASCADE;

-- 2. Recrear con la firma correcta
CREATE OR REPLACE FUNCTION public.procesar_venta(
    p_sucursal_id UUID,
    p_caja_id UUID,
    p_items JSONB,
    p_metodo_pago_global TEXT,
    p_monto_total_cliente NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_organization_id UUID;
    v_usuario_id UUID;
    v_venta_id UUID;
BEGIN
    -- A. Obtener usuario actual
    v_usuario_id := auth.uid();

    -- B. Validar Caja y Organización
    SELECT organization_id INTO v_organization_id
    FROM public.caja_diaria
    WHERE id = p_caja_id;

    IF v_organization_id IS NULL THEN
        RAISE EXCEPTION 'Error: No se encontró el turno/caja (ID: %) o no tiene organización.', p_caja_id;
    END IF;

    -- C. Insertar Venta
    INSERT INTO public.ventas (
        organization_id,
        sucursal_id,
        perfil_id,
        caja_diaria_id,
        total,
        metodo_pago,
        items,
        observaciones,
        creado_en
    ) VALUES (
        v_organization_id,
        p_sucursal_id,
        v_usuario_id,
        p_caja_id,
        p_monto_total_cliente,
        p_metodo_pago_global,
        p_items,
        'Venta mostrador',
        NOW()
    ) RETURNING id INTO v_venta_id;

    -- D. Registrar Ingreso de Dinero en Caja
    INSERT INTO public.movimientos_caja (
        organization_id,
        caja_diaria_id,
        monto,
        tipo,
        descripcion,
        categoria,
        created_at
    ) VALUES (
        v_organization_id,
        p_caja_id,
        p_monto_total_cliente,
        'ingreso',
        'Venta #' || substring(v_venta_id::text, 1, 8),
        'ventas',
        NOW()
    );

END;
$$;

-- 3. Otorgar permisos
GRANT EXECUTE ON FUNCTION public.procesar_venta TO authenticated;
GRANT EXECUTE ON FUNCTION public.procesar_venta TO service_role;
```

### Solución 2: Actualizar tipos TypeScript

Después de ejecutar la función en Supabase, **regenera los tipos**:

```bash
# Opción A: Usando Supabase CLI
npx supabase gen types typescript --project-id TU_PROJECT_ID > types/database.types.ts

# Opción B: Desde el Dashboard de Supabase
# Settings > API > Generate Types > TypeScript
```

### Solución 3: Limpiar cache de Supabase

Si el problema persiste, desde el Dashboard de Supabase:
1. Ve a **Settings** > **Database**
2. Haz clic en **Restart Database** (reinicia solo el pooler, no borra datos)

---

## 📋 OTRAS OBSERVACIONES DE LA AUDITORÍA

### ✅ Cosas que están BIEN:

1. **Orden de dependencias de tablas** - Correcto:
   - `organizations` (primera)
   - `sucursales` (segunda - depende de organizations)
   - `perfiles` (tercera - depende de organizations y sucursales)

2. **Foreign Keys** - Todas configuradas correctamente con `ON DELETE CASCADE`

3. **Políticas RLS** - Correctamente configuradas en todas las tablas

4. **Índices** - Bien optimizados para queries frecuentes

5. **Triggers** - `trigger_validar_stock_antes_venta` bien implementado

### ⚠️ ADVERTENCIAS MENORES:

#### 1. Tabla `organizations` tiene columna `activo` que no existe en el schema

**En:** `03_FUNCIONES.sql:57`
```sql
INSERT INTO public.organizations (nombre, activo)
VALUES (nombre_organization, true)
```

**Pero en:** `01_SCHEMA_BASE_CORREGIDO.sql:15-19`
```sql
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre TEXT NOT NULL,
    plan TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    -- ❌ NO tiene columna 'activo'
);
```

**Solución:** Agregar columna `activo` a la tabla:
```sql
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT TRUE;
```

#### 2. Tabla `stock` - Estructura confusa

La tabla `stock` mezcla **movimientos** con **inventario**. Recomendación:

**Actual (confuso):**
```sql
CREATE TABLE public.stock (
    tipo_movimiento TEXT NOT NULL CHECK (tipo_movimiento IN ('entrada', 'salida')),
    cantidad INTEGER NOT NULL,
    -- Esto guarda MOVIMIENTOS, no stock actual
)
```

**Recomendación:** Separar en:
- `stock_actual` - Estado actual del inventario
- `movimientos_stock` - Historial de movimientos

#### 3. Función `actualizar_stock_al_vender()` puede fallar

**Problema:** Si hay múltiples registros de stock para el mismo producto/sucursal:

```sql
UPDATE public.stock
SET cantidad = cantidad - cantidad_vendida
WHERE producto_id = producto_id_val
  AND sucursal_id = NEW.sucursal_id;
-- ⚠️ Esto actualiza TODAS las filas que coincidan
```

**Solución:** Agregar constraint UNIQUE o usar lógica de FIFO/LIFO.

#### 4. Vista `view_productos_con_stock` - Lógica compleja

La vista calcula stock con `SUM()` sobre movimientos, pero puede dar resultados inesperados si hay datos inconsistentes.

---

## 📊 RESUMEN DE OBJETOS DE BASE DE DATOS

### Tablas (19):
- ✅ organizations
- ✅ perfiles
- ✅ sucursales
- ✅ productos
- ✅ proveedores
- ✅ compras
- ✅ caja_diaria
- ✅ movimientos_caja
- ✅ stock
- ✅ misiones
- ✅ plantillas_misiones
- ✅ historial_precios
- ✅ asistencia
- ✅ pending_invites
- ✅ ventas
- ✅ actividades_empleados
- ✅ tareas_empleados
- ✅ alertas_vencimientos
- ✅ metricas_diarias

### Funciones (12):
- ✅ get_user_organization_id
- ✅ get_user_email
- ✅ crear_perfil_desde_auth_user
- ❌ **procesar_venta** (PROBLEMA AQUÍ)
- ✅ actualizar_stock_al_vender (trigger function)
- ✅ actualizar_stock_al_comprar
- ✅ verificar_stock_disponible
- ✅ incrementar_saldo_proveedor
- ✅ descontar_saldo_proveedor
- ✅ calcular_horas_trabajadas
- ✅ update_updated_at_column (trigger function)
- ✅ actualizar_metricas_venta (trigger function)

### Vistas (9):
- ✅ view_productos_con_stock
- ✅ vista_resumen_empleados
- ✅ vista_top_vendedores_mes
- ✅ vista_metricas_por_sucursal
- ✅ vista_empleados_por_sucursal
- ✅ vista_asistencias_hoy
- ✅ vista_ventas_recientes
- ✅ vista_productos_bajo_stock
- ✅ vista_alertas_vencimientos_activas

### Triggers (4):
- ✅ update_tareas_updated_at
- ✅ update_metricas_updated_at
- ✅ trigger_actualizar_metricas_venta
- ✅ trigger_validar_stock_antes_venta

---

## 🚀 PASOS PARA RESOLVER

### PASO 1: Ejecutar en Supabase SQL Editor
```sql
DROP FUNCTION IF EXISTS public.procesar_venta CASCADE;
-- Luego pega la función completa de "Solución 1"
```

### PASO 2: Regenerar tipos TypeScript
```bash
npx supabase gen types typescript --project-id TU_PROJECT_ID > types/database.types.ts
```

### PASO 3: (Opcional) Agregar columna faltante
```sql
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT TRUE;
```

### PASO 4: Probar la venta
Intenta hacer una venta en la app.

---

## 📞 VERIFICACIÓN POST-FIX

Ejecuta este query en Supabase para verificar:

```sql
SELECT
    p.proname as nombre_funcion,
    pg_get_function_arguments(p.oid) as argumentos,
    pg_get_function_result(p.oid) as retorno
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
    AND p.proname = 'procesar_venta';
```

Debería mostrar:
```
nombre_funcion: procesar_venta
argumentos: p_sucursal_id uuid, p_caja_id uuid, p_items jsonb, p_metodo_pago_global text, p_monto_total_cliente numeric
retorno: void
```

---

**Fecha de auditoría:** 2025-12-29
**Auditor:** Claude Code
**Estado:** ❌ PROBLEMA CRÍTICO - Requiere acción inmediata
