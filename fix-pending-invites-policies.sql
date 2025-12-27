-- =====================================================
-- SCRIPT PARA CORREGIR POLÍTICAS RLS DE pending_invites
-- =====================================================
-- Ejecuta este script en el SQL Editor de Supabase
-- para corregir las políticas RLS que permiten a los usuarios
-- ver su propia invitación antes de crear su perfil
-- =====================================================

-- 1. Asegurar que la tabla existe
CREATE TABLE IF NOT EXISTS public.pending_invites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    sucursal_id UUID REFERENCES public.sucursales(id) ON DELETE SET NULL,
    rol TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(email)
);

-- 2. Habilitar RLS
ALTER TABLE public.pending_invites ENABLE ROW LEVEL SECURITY;

-- 3. Eliminar políticas existentes (si existen)
DROP POLICY IF EXISTS "Users can view their own invitation" ON public.pending_invites;
DROP POLICY IF EXISTS "Users can view invitations in their organization" ON public.pending_invites;
DROP POLICY IF EXISTS "Owners can manage invitations in their organization" ON public.pending_invites;

-- 4. Crear función helper para obtener email del usuario autenticado
CREATE OR REPLACE FUNCTION public.get_user_email()
RETURNS TEXT AS $$
    SELECT email FROM auth.users WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 5. Política: Los usuarios autenticados pueden ver su propia invitación por email
-- Esta política funciona incluso si el usuario NO tiene perfil aún
CREATE POLICY "Users can view their own invitation"
    ON public.pending_invites FOR SELECT
    USING (
        auth.uid() IS NOT NULL 
        AND public.get_user_email() IS NOT NULL
        AND LOWER(TRIM(email)) = LOWER(TRIM(public.get_user_email()))
    );

-- 6. Política: Los usuarios con perfil pueden ver invitaciones de su organización (para dueños)
CREATE POLICY "Users can view invitations in their organization"
    ON public.pending_invites FOR SELECT
    USING (
        organization_id = public.get_user_organization_id()
        AND public.get_user_organization_id() IS NOT NULL
    );

-- 7. Política: Los dueños pueden gestionar invitaciones de su organización
CREATE POLICY "Owners can manage invitations in their organization"
    ON public.pending_invites FOR ALL
    USING (
        organization_id = public.get_user_organization_id()
        AND public.get_user_organization_id() IS NOT NULL
    )
    WITH CHECK (
        organization_id = public.get_user_organization_id()
        AND public.get_user_organization_id() IS NOT NULL
    );

-- 8. Crear índice para optimizar búsquedas por email
CREATE INDEX IF NOT EXISTS idx_pending_invites_email_lower ON public.pending_invites(LOWER(TRIM(email)));
CREATE INDEX IF NOT EXISTS idx_pending_invites_organization_id ON public.pending_invites(organization_id);

-- =====================================================
-- VERIFICACIÓN
-- =====================================================
-- Para verificar que las políticas funcionan, ejecuta:
-- SELECT * FROM public.pending_invites;
-- Deberías ver las invitaciones si estás autenticado y tienes una

