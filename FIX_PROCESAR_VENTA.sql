-- =====================================================
-- FIX: procesar_venta - Corrección de Firma de Función
-- =====================================================
-- PROBLEMA: Schema cache tiene versión anterior de la función
-- SOLUCIÓN: Eliminar y recrear con firma correcta
-- EJECUTAR EN: Supabase SQL Editor
-- =====================================================

-- =====================================================
-- PASO 1: Eliminar función anterior (todas las sobrecargas)
-- =====================================================
DROP FUNCTION IF EXISTS public.procesar_venta CASCADE;
DROP FUNCTION IF EXISTS public.procesar_venta(UUID, UUID, JSONB, TEXT, NUMERIC) CASCADE;
DROP FUNCTION IF EXISTS public.procesar_venta(JSONB, TEXT, NUMERIC) CASCADE;
DROP FUNCTION IF EXISTS public.procesar_venta(JSONB, TEXT, NUMERIC, UUID) CASCADE;

-- =====================================================
-- PASO 2: Recrear función con firma correcta
-- =====================================================
CREATE OR REPLACE FUNCTION public.procesar_venta(
    p_sucursal_id UUID,           -- Parámetro 1: ID de la sucursal
    p_caja_id UUID,               -- Parámetro 2: ID del turno/caja
    p_items JSONB,                -- Parámetro 3: Items vendidos
    p_metodo_pago_global TEXT,    -- Parámetro 4: Método de pago
    p_monto_total_cliente NUMERIC -- Parámetro 5: Monto total
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

-- =====================================================
-- PASO 3: Otorgar permisos
-- =====================================================
GRANT EXECUTE ON FUNCTION public.procesar_venta TO authenticated;
GRANT EXECUTE ON FUNCTION public.procesar_venta TO service_role;

-- =====================================================
-- PASO 4: Verificar función creada correctamente
-- =====================================================
SELECT
    p.proname as nombre_funcion,
    pg_get_function_arguments(p.oid) as argumentos,
    pg_get_function_result(p.oid) as retorno
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
    AND p.proname = 'procesar_venta';

-- =====================================================
-- RESULTADO ESPERADO:
-- nombre_funcion: procesar_venta
-- argumentos: p_sucursal_id uuid, p_caja_id uuid, p_items jsonb, p_metodo_pago_global text, p_monto_total_cliente numeric
-- retorno: void
-- =====================================================
