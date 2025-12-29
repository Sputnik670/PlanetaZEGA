# 🚨 PROBLEMA: Ventas aparecen en "Gastos del Turno"

## ❌ **Qué está pasando**

Cuando haces una venta, se registra como **egreso** (gasto) en lugar de **ingreso**, por eso aparece en "Gastos del Turno".

---

## 🔍 **PASO 1: Confirmar el problema**

Ejecuta en **Supabase SQL Editor**:

```sql
SELECT
    tipo AS tipo_movimiento,
    descripcion,
    monto,
    created_at
FROM public.movimientos_caja
WHERE descripcion LIKE 'Venta%'
ORDER BY created_at DESC
LIMIT 5;
```

**Si ves `tipo_movimiento = 'egreso'`** → Tienes el problema.

---

## ✅ **PASO 2: Ejecutar el FIX**

### Opción A: Desde el repositorio

1. Abre el archivo **`FIX_PROCESAR_VENTA.sql`** de tu repositorio
2. Copia **TODO** el contenido
3. Ve a **Supabase Dashboard → SQL Editor**
4. Pega y ejecuta

### Opción B: Script directo

Copia y ejecuta este script completo en Supabase:

```sql
-- =====================================================
-- FIX: Corrección de procesar_venta
-- =====================================================

-- 1. Eliminar función anterior
DROP FUNCTION IF EXISTS public.procesar_venta CASCADE;
DROP FUNCTION IF EXISTS public.procesar_venta(UUID, UUID, JSONB, TEXT, NUMERIC) CASCADE;
DROP FUNCTION IF EXISTS public.procesar_venta(JSONB, TEXT, NUMERIC) CASCADE;
DROP FUNCTION IF EXISTS public.procesar_venta(JSONB, TEXT, NUMERIC, UUID) CASCADE;

-- 2. Recrear función correcta
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
    v_usuario_id := auth.uid();

    SELECT organization_id INTO v_organization_id
    FROM public.caja_diaria
    WHERE id = p_caja_id;

    IF v_organization_id IS NULL THEN
        RAISE EXCEPTION 'Error: No se encontró el turno/caja (ID: %) o no tiene organización.', p_caja_id;
    END IF;

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

    -- ✅ ESTA ES LA LÍNEA CLAVE: tipo = 'ingreso'
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
        'ingreso',  -- ✅ CAMBIADO DE 'egreso' A 'ingreso'
        'Venta #' || substring(v_venta_id::text, 1, 8),
        'ventas',
        NOW()
    );

END;
$$;

GRANT EXECUTE ON FUNCTION public.procesar_venta TO authenticated;
GRANT EXECUTE ON FUNCTION public.procesar_venta TO service_role;
```

---

## ✅ **PASO 3: Verificar que funcionó**

Ejecuta en Supabase:

```sql
SELECT
    p.proname as nombre_funcion,
    pg_get_function_arguments(p.oid) as argumentos
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
    AND p.proname = 'procesar_venta';
```

**Resultado esperado:**
```
nombre_funcion: procesar_venta
argumentos: p_sucursal_id uuid, p_caja_id uuid, p_items jsonb, p_metodo_pago_global text, p_monto_total_cliente numeric
```

---

## ✅ **PASO 4: Probar en la app**

1. Haz una venta de prueba
2. Ve a "Gastos del Turno"
3. **La venta NO debería aparecer ahí**
4. El cierre de caja debería calcular correctamente

---

## 🗑️ **OPCIONAL: Limpiar ventas anteriores incorrectas**

Si quieres **corregir las ventas pasadas** que se registraron mal:

```sql
-- ⚠️ CUIDADO: Esto modifica datos existentes
-- Cambiar las ventas de 'egreso' a 'ingreso'
UPDATE public.movimientos_caja
SET tipo = 'ingreso'
WHERE descripcion LIKE 'Venta%'
  AND tipo = 'egreso'
  AND categoria = 'ventas';

-- Verificar cuántas se corrigieron
SELECT COUNT(*) as ventas_corregidas
FROM public.movimientos_caja
WHERE descripcion LIKE 'Venta%'
  AND tipo = 'ingreso'
  AND categoria = 'ventas';
```

---

## 📋 **Resumen**

1. ✅ Ejecuta `FIX_PROCESAR_VENTA.sql` en Supabase
2. ✅ Verifica que la función se actualizó
3. ✅ Haz una venta de prueba
4. ✅ (Opcional) Corrige ventas anteriores con UPDATE

---

## 🆘 **Si el problema persiste**

1. Verifica que ejecutaste el script completo (incluyendo `DROP FUNCTION`)
2. Reinicia el pooler de Supabase (Settings → Database → Restart)
3. Limpia el cache del navegador (Ctrl+Shift+R)

---

**¡La solución es simple: ejecutar el script SQL en Supabase!** 🚀
