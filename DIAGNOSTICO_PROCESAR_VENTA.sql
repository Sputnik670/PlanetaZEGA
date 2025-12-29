-- =====================================================
-- DIAGNÓSTICO: Verificar función procesar_venta actual
-- =====================================================
-- EJECUTAR EN: Supabase SQL Editor
-- OBJETIVO: Ver la definición actual de procesar_venta
-- =====================================================

-- 1. Ver definición completa de la función
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'procesar_venta'
  AND pronamespace = 'public'::regnamespace;

-- 2. Ver si hay múltiples sobrecargas
SELECT
    p.proname as nombre_funcion,
    pg_get_function_arguments(p.oid) as argumentos,
    pg_get_function_result(p.oid) as retorno
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
    AND p.proname = 'procesar_venta';

-- =====================================================
-- 3. VERIFICAR: ¿La función inserta 'ingreso' o 'egreso'?
-- =====================================================
-- Si el resultado contiene "tipo: 'egreso'" en lugar de "tipo: 'ingreso'",
-- entonces ESE es el problema.
--
-- RESULTADO ESPERADO:
-- Debería tener esta línea en el INSERT de movimientos_caja:
-- tipo,  --> 'ingreso'
-- =====================================================

-- 4. Ver últimos movimientos de caja para confirmar el problema
SELECT
    id,
    caja_diaria_id,
    monto,
    tipo,
    descripcion,
    categoria,
    created_at
FROM public.movimientos_caja
WHERE descripcion LIKE 'Venta %'
ORDER BY created_at DESC
LIMIT 10;

-- =====================================================
-- Si el tipo es 'egreso' en los resultados,
-- entonces DEBES ejecutar FIX_PROCESAR_VENTA.sql
-- =====================================================
