-- =====================================================
-- MIGRACIÓN: Agregar campos QR de fichaje a sucursales
-- =====================================================
-- Esta migración agrega campos para guardar las URLs
-- de los QR de entrada y salida de forma permanente
-- =====================================================

-- Agregar columnas para URLs de QR de fichaje
ALTER TABLE public.sucursales
ADD COLUMN IF NOT EXISTS qr_entrada_url TEXT,
ADD COLUMN IF NOT EXISTS qr_salida_url TEXT;

-- Comentarios para documentación
COMMENT ON COLUMN public.sucursales.qr_entrada_url IS 'URL del QR de entrada para fichaje de empleados';
COMMENT ON COLUMN public.sucursales.qr_salida_url IS 'URL del QR de salida para fichaje de empleados';

