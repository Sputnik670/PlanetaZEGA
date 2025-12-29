-- =====================================================
-- VERIFICAR PROBLEMA: ¿Las ventas tienen tipo='egreso'?
-- =====================================================
-- EJECUTAR EN: Supabase SQL Editor
-- =====================================================

-- Ver los últimos movimientos de caja de tipo 'Venta'
SELECT
    id,
    caja_diaria_id,
    monto,
    tipo AS tipo_movimiento,  -- ❌ Si dice 'egreso' = PROBLEMA
    descripcion,
    categoria,
    created_at
FROM public.movimientos_caja
WHERE descripcion LIKE 'Venta%'
ORDER BY created_at DESC
LIMIT 10;

-- =====================================================
-- RESULTADO ESPERADO:
-- tipo_movimiento = 'ingreso' ✅ CORRECTO
--
-- RESULTADO INCORRECTO (tu caso actual):
-- tipo_movimiento = 'egreso' ❌ PROBLEMA
-- =====================================================

-- Si ves 'egreso', entonces la función está insertando
-- las ventas como egresos (gastos) en lugar de ingresos.
--
-- SOLUCIÓN: Ejecuta FIX_PROCESAR_VENTA.sql
