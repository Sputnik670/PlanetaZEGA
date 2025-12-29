-- =====================================================
-- FIX: organizations - Agregar columna 'activo' faltante
-- =====================================================
-- PROBLEMA: La función crear_perfil_desde_auth_user() usa
--           la columna 'activo' pero no existe en la tabla
-- SOLUCIÓN: Agregar columna activo a organizations
-- EJECUTAR EN: Supabase SQL Editor
-- =====================================================

-- Agregar columna 'activo' si no existe
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT TRUE;

-- Comentario
COMMENT ON COLUMN public.organizations.activo IS
    'Indica si la organización está activa en el sistema';

-- Verificar estructura de la tabla
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'organizations'
ORDER BY ordinal_position;

-- =====================================================
-- RESULTADO ESPERADO:
-- id          | uuid         | NO  | uuid_generate_v4()
-- nombre      | text         | NO  | NULL
-- plan        | text         | YES | NULL
-- created_at  | timestamptz  | NO  | now()
-- activo      | boolean      | NO  | true
-- =====================================================
