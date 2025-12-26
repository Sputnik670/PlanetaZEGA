-- =====================================================
-- ESQUEMA SQL COMPLETO PARA PLANETAZEGA - SUPABASE
-- =====================================================
-- Este archivo contiene todas las tablas, relaciones,
-- índices y vistas necesarias para el sistema.
-- =====================================================

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLAS PRINCIPALES
-- =====================================================

-- Tabla: organizations (Organizaciones/Empresas)
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre TEXT NOT NULL,
    plan TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla: perfiles (Perfiles de usuarios - dueños y empleados)
CREATE TABLE IF NOT EXISTS public.perfiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    rol TEXT NOT NULL CHECK (rol IN ('dueño', 'empleado')),
    nombre TEXT,
    email TEXT,
    xp INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla: sucursales (Sucursales/Locales)
CREATE TABLE IF NOT EXISTS public.sucursales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    direccion TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla: productos (Catálogo de productos)
CREATE TABLE IF NOT EXISTS public.productos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    emoji TEXT,
    categoria TEXT,
    codigo_barras TEXT,
    precio_venta NUMERIC(10, 2) NOT NULL DEFAULT 0,
    costo NUMERIC(10, 2) NOT NULL DEFAULT 0,
    stock_minimo INTEGER NOT NULL DEFAULT 0,
    vida_util_dias INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT productos_precio_venta_check CHECK (precio_venta >= 0),
    CONSTRAINT productos_costo_check CHECK (costo >= 0)
);

-- Tabla: proveedores (Proveedores - globales o por sucursal)
CREATE TABLE IF NOT EXISTS public.proveedores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    sucursal_id UUID REFERENCES public.sucursales(id) ON DELETE SET NULL,
    nombre TEXT NOT NULL,
    rubro TEXT,
    contacto_nombre TEXT,
    telefono TEXT,
    email TEXT,
    condicion_pago TEXT,
    saldo_actual NUMERIC(10, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla: compras (Compras a proveedores)
CREATE TABLE IF NOT EXISTS public.compras (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    proveedor_id UUID REFERENCES public.proveedores(id) ON DELETE SET NULL,
    monto_total NUMERIC(10, 2) NOT NULL,
    estado_pago TEXT,
    medio_pago TEXT,
    comprobante_nro TEXT,
    fecha_compra TIMESTAMPTZ,
    vencimiento_pago TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT compras_monto_total_check CHECK (monto_total >= 0)
);

-- Tabla: caja_diaria (Cajas diarias por turno)
CREATE TABLE IF NOT EXISTS public.caja_diaria (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    sucursal_id UUID NOT NULL REFERENCES public.sucursales(id) ON DELETE CASCADE,
    empleado_id UUID REFERENCES public.perfiles(id) ON DELETE SET NULL,
    fecha_apertura TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fecha_cierre TIMESTAMPTZ,
    monto_inicial NUMERIC(10, 2) NOT NULL DEFAULT 0,
    monto_final NUMERIC(10, 2),
    diferencia NUMERIC(10, 2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT caja_diaria_monto_inicial_check CHECK (monto_inicial >= 0)
);

-- Tabla: movimientos_caja (Movimientos de dinero en caja)
CREATE TABLE IF NOT EXISTS public.movimientos_caja (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    caja_diaria_id UUID NOT NULL REFERENCES public.caja_diaria(id) ON DELETE CASCADE,
    monto NUMERIC(10, 2) NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('ingreso', 'egreso')),
    descripcion TEXT NOT NULL,
    categoria TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT movimientos_caja_monto_check CHECK (monto > 0)
);

-- Tabla: stock (Movimientos de stock - entradas y salidas)
CREATE TABLE IF NOT EXISTS public.stock (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    sucursal_id UUID NOT NULL REFERENCES public.sucursales(id) ON DELETE CASCADE,
    producto_id UUID NOT NULL REFERENCES public.productos(id) ON DELETE CASCADE,
    caja_diaria_id UUID REFERENCES public.caja_diaria(id) ON DELETE SET NULL,
    proveedor_id UUID REFERENCES public.proveedores(id) ON DELETE SET NULL,
    compra_id UUID REFERENCES public.compras(id) ON DELETE SET NULL,
    cantidad INTEGER NOT NULL,
    tipo_movimiento TEXT NOT NULL CHECK (tipo_movimiento IN ('entrada', 'salida')),
    metodo_pago TEXT,
    precio_venta_historico NUMERIC(10, 2),
    costo_unitario_historico NUMERIC(10, 2),
    fecha_vencimiento DATE,
    estado TEXT,
    fecha_venta TIMESTAMPTZ,
    fecha_ingreso TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notas TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT stock_cantidad_check CHECK (cantidad > 0),
    CONSTRAINT stock_precio_venta_historico_check CHECK (precio_venta_historico IS NULL OR precio_venta_historico >= 0),
    CONSTRAINT stock_costo_unitario_historico_check CHECK (costo_unitario_historico IS NULL OR costo_unitario_historico >= 0)
);

-- Tabla: misiones (Misiones para empleados)
CREATE TABLE IF NOT EXISTS public.misiones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    empleado_id UUID NOT NULL REFERENCES public.perfiles(id) ON DELETE CASCADE,
    caja_diaria_id UUID REFERENCES public.caja_diaria(id) ON DELETE SET NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('vencimiento', 'arqueo_cierre', 'manual')),
    descripcion TEXT,
    objetivo_unidades INTEGER NOT NULL DEFAULT 1,
    unidades_completadas INTEGER NOT NULL DEFAULT 0,
    es_completada BOOLEAN NOT NULL DEFAULT FALSE,
    puntos INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT misiones_objetivo_unidades_check CHECK (objetivo_unidades > 0),
    CONSTRAINT misiones_unidades_completadas_check CHECK (unidades_completadas >= 0)
);

-- Tabla: plantillas_misiones (Plantillas de misiones)
CREATE TABLE IF NOT EXISTS public.plantillas_misiones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    sucursal_id UUID REFERENCES public.sucursales(id) ON DELETE SET NULL,
    descripcion TEXT NOT NULL,
    puntos INTEGER NOT NULL DEFAULT 0,
    activa BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla: historial_precios (Historial de cambios de precios)
CREATE TABLE IF NOT EXISTS public.historial_precios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    producto_id UUID REFERENCES public.productos(id) ON DELETE SET NULL,
    empleado_id UUID REFERENCES public.perfiles(id) ON DELETE SET NULL,
    precio_venta_anterior NUMERIC(10, 2),
    precio_venta_nuevo NUMERIC(10, 2),
    costo_anterior NUMERIC(10, 2),
    costo_nuevo NUMERIC(10, 2),
    fecha_cambio TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla: asistencia (Registro de asistencia de empleados)
CREATE TABLE IF NOT EXISTS public.asistencia (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    sucursal_id UUID NOT NULL REFERENCES public.sucursales(id) ON DELETE CASCADE,
    empleado_id UUID NOT NULL REFERENCES public.perfiles(id) ON DELETE CASCADE,
    entrada TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    salida TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- MIGRACIONES: Agregar columnas faltantes si la tabla ya existe
-- =====================================================

-- Agregar columnas faltantes a stock si no existen
DO $$ 
BEGIN
    -- Agregar proveedor_id si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'stock' 
                   AND column_name = 'proveedor_id') THEN
        ALTER TABLE public.stock 
        ADD COLUMN proveedor_id UUID REFERENCES public.proveedores(id) ON DELETE SET NULL;
    END IF;

    -- Agregar compra_id si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'stock' 
                   AND column_name = 'compra_id') THEN
        ALTER TABLE public.stock 
        ADD COLUMN compra_id UUID REFERENCES public.compras(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Agregar vencimiento_pago a compras si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'compras' 
                   AND column_name = 'vencimiento_pago') THEN
        ALTER TABLE public.compras 
        ADD COLUMN vencimiento_pago TIMESTAMPTZ;
    END IF;
END $$;

-- Agregar email y condicion_pago a proveedores si no existen
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'proveedores' 
                   AND column_name = 'email') THEN
        ALTER TABLE public.proveedores 
        ADD COLUMN email TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'proveedores' 
                   AND column_name = 'condicion_pago') THEN
        ALTER TABLE public.proveedores 
        ADD COLUMN condicion_pago TEXT;
    END IF;
END $$;

-- Agregar categoria a movimientos_caja si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'movimientos_caja' 
                   AND column_name = 'categoria') THEN
        ALTER TABLE public.movimientos_caja 
        ADD COLUMN categoria TEXT;
    END IF;
END $$;

-- =====================================================
-- ÍNDICES PARA OPTIMIZAR PERFORMANCE
-- =====================================================

-- Índices para perfiles
CREATE INDEX IF NOT EXISTS idx_perfiles_organization_id ON public.perfiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_perfiles_rol ON public.perfiles(rol);

-- Índices para sucursales
CREATE INDEX IF NOT EXISTS idx_sucursales_organization_id ON public.sucursales(organization_id);

-- Índices para productos
CREATE INDEX IF NOT EXISTS idx_productos_organization_id ON public.productos(organization_id);
CREATE INDEX IF NOT EXISTS idx_productos_codigo_barras ON public.productos(codigo_barras) WHERE codigo_barras IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_productos_categoria ON public.productos(categoria);

-- Índices para proveedores
CREATE INDEX IF NOT EXISTS idx_proveedores_organization_id ON public.proveedores(organization_id);
CREATE INDEX IF NOT EXISTS idx_proveedores_sucursal_id ON public.proveedores(sucursal_id);

-- Índices para compras
CREATE INDEX IF NOT EXISTS idx_compras_organization_id ON public.compras(organization_id);
CREATE INDEX IF NOT EXISTS idx_compras_proveedor_id ON public.compras(proveedor_id);
CREATE INDEX IF NOT EXISTS idx_compras_fecha_compra ON public.compras(fecha_compra);

-- Índices para caja_diaria
CREATE INDEX IF NOT EXISTS idx_caja_diaria_organization_id ON public.caja_diaria(organization_id);
CREATE INDEX IF NOT EXISTS idx_caja_diaria_sucursal_id ON public.caja_diaria(sucursal_id);
CREATE INDEX IF NOT EXISTS idx_caja_diaria_empleado_id ON public.caja_diaria(empleado_id);
CREATE INDEX IF NOT EXISTS idx_caja_diaria_fecha_apertura ON public.caja_diaria(fecha_apertura);
CREATE INDEX IF NOT EXISTS idx_caja_diaria_fecha_cierre ON public.caja_diaria(fecha_cierre) WHERE fecha_cierre IS NOT NULL;

-- Índices para movimientos_caja
CREATE INDEX IF NOT EXISTS idx_movimientos_caja_organization_id ON public.movimientos_caja(organization_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_caja_caja_diaria_id ON public.movimientos_caja(caja_diaria_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_caja_tipo ON public.movimientos_caja(tipo);

-- Índices para stock (CRÍTICOS para performance)
CREATE INDEX IF NOT EXISTS idx_stock_organization_id ON public.stock(organization_id);
CREATE INDEX IF NOT EXISTS idx_stock_sucursal_id ON public.stock(sucursal_id);
CREATE INDEX IF NOT EXISTS idx_stock_producto_id ON public.stock(producto_id);
CREATE INDEX IF NOT EXISTS idx_stock_caja_diaria_id ON public.stock(caja_diaria_id) WHERE caja_diaria_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stock_proveedor_id ON public.stock(proveedor_id) WHERE proveedor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stock_tipo_movimiento ON public.stock(tipo_movimiento);
CREATE INDEX IF NOT EXISTS idx_stock_estado ON public.stock(estado) WHERE estado IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stock_fecha_vencimiento ON public.stock(fecha_vencimiento) WHERE fecha_vencimiento IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stock_fecha_venta ON public.stock(fecha_venta) WHERE fecha_venta IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stock_compra_id ON public.stock(compra_id) WHERE compra_id IS NOT NULL;

-- Índices para misiones
CREATE INDEX IF NOT EXISTS idx_misiones_organization_id ON public.misiones(organization_id);
CREATE INDEX IF NOT EXISTS idx_misiones_empleado_id ON public.misiones(empleado_id);
CREATE INDEX IF NOT EXISTS idx_misiones_caja_diaria_id ON public.misiones(caja_diaria_id) WHERE caja_diaria_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_misiones_es_completada ON public.misiones(es_completada);
CREATE INDEX IF NOT EXISTS idx_misiones_tipo ON public.misiones(tipo);

-- Índices para plantillas_misiones
CREATE INDEX IF NOT EXISTS idx_plantillas_misiones_organization_id ON public.plantillas_misiones(organization_id);
CREATE INDEX IF NOT EXISTS idx_plantillas_misiones_sucursal_id ON public.plantillas_misiones(sucursal_id);
CREATE INDEX IF NOT EXISTS idx_plantillas_misiones_activa ON public.plantillas_misiones(activa);

-- Índices para historial_precios
CREATE INDEX IF NOT EXISTS idx_historial_precios_organization_id ON public.historial_precios(organization_id);
CREATE INDEX IF NOT EXISTS idx_historial_precios_producto_id ON public.historial_precios(producto_id);
CREATE INDEX IF NOT EXISTS idx_historial_precios_fecha_cambio ON public.historial_precios(fecha_cambio);

-- Índices para asistencia
CREATE INDEX IF NOT EXISTS idx_asistencia_organization_id ON public.asistencia(organization_id);
CREATE INDEX IF NOT EXISTS idx_asistencia_sucursal_id ON public.asistencia(sucursal_id);
CREATE INDEX IF NOT EXISTS idx_asistencia_empleado_id ON public.asistencia(empleado_id);
CREATE INDEX IF NOT EXISTS idx_asistencia_entrada ON public.asistencia(entrada);
CREATE INDEX IF NOT EXISTS idx_asistencia_salida ON public.asistencia(salida) WHERE salida IS NOT NULL;

-- Índice compuesto para asistencia (empleado sin salida)
CREATE INDEX IF NOT EXISTS idx_asistencia_empleado_sin_salida ON public.asistencia(empleado_id, sucursal_id) WHERE salida IS NULL;

-- =====================================================
-- VISTA: view_productos_con_stock
-- =====================================================
-- Vista que calcula el stock disponible por producto y sucursal
-- Eliminamos la vista si existe para evitar conflictos de tipo de dato
DROP VIEW IF EXISTS public.view_productos_con_stock CASCADE;

CREATE VIEW public.view_productos_con_stock AS
SELECT 
    p.id,
    p.organization_id,
    p.nombre,
    p.emoji,
    p.categoria,
    p.codigo_barras,
    p.precio_venta,
    p.costo,
    p.stock_minimo,
    s.id AS sucursal_id,
    COALESCE(
        SUM(
            CASE 
                WHEN st.tipo_movimiento = 'entrada' AND (st.estado IS NULL OR st.estado = 'disponible') 
                THEN st.cantidad 
                ELSE 0 
            END
        ) - 
        SUM(
            CASE 
                WHEN st.tipo_movimiento = 'salida' 
                THEN st.cantidad 
                ELSE 0 
            END
        ), 
        0
    )::BIGINT AS stock_disponible
FROM 
    public.productos p
CROSS JOIN 
    public.sucursales s
LEFT JOIN 
    public.stock st ON st.producto_id = p.id AND st.sucursal_id = s.id
WHERE 
    p.organization_id = s.organization_id
GROUP BY 
    p.id, 
    p.organization_id, 
    p.nombre, 
    p.emoji, 
    p.categoria, 
    p.codigo_barras, 
    p.precio_venta, 
    p.costo, 
    p.stock_minimo, 
    s.id;

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sucursales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caja_diaria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimientos_caja ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.misiones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plantillas_misiones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historial_precios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asistencia ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios solo pueden ver/modificar datos de su organización
-- NOTA: Estas son políticas básicas. Ajusta según tus necesidades de seguridad específicas.

-- Función helper para obtener organization_id del usuario actual
CREATE OR REPLACE FUNCTION public.get_user_organization_id()
RETURNS UUID AS $$
    SELECT organization_id FROM public.perfiles WHERE id = auth.uid() LIMIT 1
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Políticas para organizations
CREATE POLICY "Users can view their own organization"
    ON public.organizations FOR SELECT
    USING (id = public.get_user_organization_id());

CREATE POLICY "Users can update their own organization"
    ON public.organizations FOR UPDATE
    USING (id = public.get_user_organization_id());

-- Políticas para perfiles
CREATE POLICY "Users can view profiles in their organization"
    ON public.perfiles FOR SELECT
    USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Users can update their own profile"
    ON public.perfiles FOR UPDATE
    USING (id = auth.uid());

-- Políticas para sucursales
CREATE POLICY "Users can view sucursales in their organization"
    ON public.sucursales FOR SELECT
    USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Users can manage sucursales in their organization"
    ON public.sucursales FOR ALL
    USING (organization_id = public.get_user_organization_id());

-- Políticas para productos
CREATE POLICY "Users can view products in their organization"
    ON public.productos FOR SELECT
    USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Users can manage products in their organization"
    ON public.productos FOR ALL
    USING (organization_id = public.get_user_organization_id());

-- Políticas para proveedores
CREATE POLICY "Users can view proveedores in their organization"
    ON public.proveedores FOR SELECT
    USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Users can manage proveedores in their organization"
    ON public.proveedores FOR ALL
    USING (organization_id = public.get_user_organization_id());

-- Políticas para compras
CREATE POLICY "Users can view compras in their organization"
    ON public.compras FOR SELECT
    USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Users can manage compras in their organization"
    ON public.compras FOR ALL
    USING (organization_id = public.get_user_organization_id());

-- Políticas para caja_diaria
CREATE POLICY "Users can view caja_diaria in their organization"
    ON public.caja_diaria FOR SELECT
    USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Users can manage caja_diaria in their organization"
    ON public.caja_diaria FOR ALL
    USING (organization_id = public.get_user_organization_id());

-- Políticas para movimientos_caja
CREATE POLICY "Users can view movimientos_caja in their organization"
    ON public.movimientos_caja FOR SELECT
    USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Users can manage movimientos_caja in their organization"
    ON public.movimientos_caja FOR ALL
    USING (organization_id = public.get_user_organization_id());

-- Políticas para stock
CREATE POLICY "Users can view stock in their organization"
    ON public.stock FOR SELECT
    USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Users can manage stock in their organization"
    ON public.stock FOR ALL
    USING (organization_id = public.get_user_organization_id());

-- Políticas para misiones
CREATE POLICY "Users can view misiones in their organization"
    ON public.misiones FOR SELECT
    USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Users can manage misiones in their organization"
    ON public.misiones FOR ALL
    USING (organization_id = public.get_user_organization_id());

-- Políticas para plantillas_misiones
CREATE POLICY "Users can view plantillas_misiones in their organization"
    ON public.plantillas_misiones FOR SELECT
    USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Users can manage plantillas_misiones in their organization"
    ON public.plantillas_misiones FOR ALL
    USING (organization_id = public.get_user_organization_id());

-- Políticas para historial_precios
CREATE POLICY "Users can view historial_precios in their organization"
    ON public.historial_precios FOR SELECT
    USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Users can manage historial_precios in their organization"
    ON public.historial_precios FOR ALL
    USING (organization_id = public.get_user_organization_id());

-- Políticas para asistencia
CREATE POLICY "Users can view asistencia in their organization"
    ON public.asistencia FOR SELECT
    USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Users can manage asistencia in their organization"
    ON public.asistencia FOR ALL
    USING (organization_id = public.get_user_organization_id());

-- NOTA: Las vistas no soportan políticas RLS directamente
-- La seguridad se maneja a través de las políticas RLS de las tablas subyacentes (productos, stock, sucursales)
-- Por lo tanto, los usuarios solo verán datos de su organización automáticamente

-- =====================================================
-- COMENTARIOS PARA DOCUMENTACIÓN
-- =====================================================

COMMENT ON TABLE public.organizations IS 'Organizaciones o empresas que usan el sistema';
COMMENT ON TABLE public.perfiles IS 'Perfiles de usuarios (dueños y empleados)';
COMMENT ON TABLE public.sucursales IS 'Sucursales o locales de cada organización';
COMMENT ON TABLE public.productos IS 'Catálogo de productos maestros por organización';
COMMENT ON TABLE public.proveedores IS 'Proveedores (pueden ser globales o por sucursal si sucursal_id no es null)';
COMMENT ON TABLE public.compras IS 'Registro de compras a proveedores';
COMMENT ON TABLE public.caja_diaria IS 'Cajas diarias por turno de trabajo';
COMMENT ON TABLE public.movimientos_caja IS 'Movimientos de dinero (ingresos/egresos) en cada caja';
COMMENT ON TABLE public.stock IS 'Movimientos de stock (entradas y salidas)';
COMMENT ON TABLE public.misiones IS 'Misiones asignadas a empleados';
COMMENT ON TABLE public.plantillas_misiones IS 'Plantillas para crear misiones';
COMMENT ON TABLE public.historial_precios IS 'Historial de cambios de precios y costos';
COMMENT ON TABLE public.asistencia IS 'Registro de asistencia de empleados (entrada/salida)';
COMMENT ON VIEW public.view_productos_con_stock IS 'Vista que calcula el stock disponible por producto y sucursal';

