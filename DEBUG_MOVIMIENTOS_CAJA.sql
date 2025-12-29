-- =====================================================
-- DEBUG: Ver todos los movimientos de la caja actual
-- =====================================================
-- EJECUTAR EN: Supabase SQL Editor
-- =====================================================

-- Ver el turno más reciente
SELECT
    id AS turno_id,
    fecha_apertura,
    fecha_cierre,
    monto_inicial
FROM public.caja_diaria
WHERE fecha_cierre IS NULL  -- Turno abierto
ORDER BY fecha_apertura DESC
LIMIT 1;

-- Copiar el turno_id del resultado anterior y usarlo aquí ↓
-- Reemplaza 'TU_TURNO_ID' con el ID real:

SELECT
    id,
    tipo,
    descripcion,
    monto,
    categoria,
    created_at
FROM public.movimientos_caja
WHERE caja_diaria_id = 'TU_TURNO_ID'  -- ← CAMBIAR ESTE ID
ORDER BY created_at DESC;

-- =====================================================
-- RESULTADO ESPERADO:
-- =====================================================
-- Las ventas deberían tener tipo='ingreso' y categoria='ventas'
-- Los gastos deberían tener tipo='egreso' y categoria='proveedores', etc.
--
-- Si ves ventas con tipo='egreso', entonces HAY un problema.
-- Si ves ventas con tipo='ingreso', entonces el problema está en el FRONTEND.
-- =====================================================
