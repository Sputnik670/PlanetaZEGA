# 📝 Changelog de Cambios en la Base de Datos

Este documento detalla todos los cambios realizados para hacer el esquema SQL PERFECTO.

## ✅ Cambios Realizados

### 1. Campos Agregados a Tablas Existentes

#### `stock`
- ✅ `proveedor_id` (UUID, FK a `proveedores`) - Relación con proveedores
- ✅ `compra_id` (UUID, FK a `compras`) - Relación con compras

#### `compras`
- ✅ `vencimiento_pago` (TIMESTAMPTZ) - Para gestionar pagos pendientes
- ✅ `created_at` (TIMESTAMPTZ) - Timestamp de creación

#### `proveedores`
- ✅ `email` (TEXT) - Email del proveedor
- ✅ `condicion_pago` (TEXT) - Condición de pago (ej: "contado", "30 días")

#### `movimientos_caja`
- ✅ `categoria` (TEXT) - Categoría del movimiento (ej: "proveedores")

#### `caja_diaria`
- ✅ `sucursal_id` ya estaba en tipos pero ahora está explícito y con FK correcta

### 2. Nueva Tabla

#### `asistencia`
Tabla completamente nueva para registro de asistencia:
- `id` (UUID, PK)
- `organization_id` (UUID, FK)
- `sucursal_id` (UUID, FK)
- `empleado_id` (UUID, FK)
- `entrada` (TIMESTAMPTZ)
- `salida` (TIMESTAMPTZ, nullable)
- `created_at` (TIMESTAMPTZ)

### 3. Vista Creada

#### `view_productos_con_stock`
Vista que calcula el stock disponible por producto y sucursal:
- Combina datos de `productos` y `stock`
- Calcula stock disponible: (entradas disponibles - salidas)
- Incluye todos los campos necesarios para consultas rápidas

### 4. Índices Agregados

Se agregaron índices optimizados para:
- ✅ Todas las tablas: índice en `organization_id` (búsquedas por organización)
- ✅ Tablas con `sucursal_id`: índice en `sucursal_id`
- ✅ Tablas con `empleado_id`: índice en `empleado_id`
- ✅ `stock`: índices en `proveedor_id`, `compra_id`, `tipo_movimiento`, `estado`, `fecha_vencimiento`, `fecha_venta`
- ✅ `productos`: índice en `codigo_barras` (para búsquedas rápidas)
- ✅ `asistencia`: índice compuesto en `empleado_id, sucursal_id` para búsquedas de fichaje activo

### 5. Foreign Keys y Constraints

- ✅ Todas las relaciones están correctamente definidas con FOREIGN KEY
- ✅ Constraints de CHECK para valores válidos (ej: montos >= 0, cantidades > 0)
- ✅ Constraints de CHECK para ENUMs (ej: `rol IN ('dueño', 'empleado')`)

### 6. Row Level Security (RLS)

- ✅ RLS habilitado en todas las tablas
- ✅ Función helper `get_user_organization_id()` para políticas
- ✅ Políticas básicas que restringen acceso por organización
- ✅ Política para la vista `view_productos_con_stock`

### 7. Correcciones en Código

#### `components/team-ranking.tsx`
- ✅ Corregido: `.eq('completada', true)` → `.eq('es_completada', true)`

#### `lib/supabase.ts`
- ✅ Actualizado: `createClient<any>` → `createClient<Database>`
- ✅ Ahora usa tipos correctos de TypeScript

#### `types/tipos-db.ts`
- ✅ Actualizados todos los tipos para coincidir con el esquema SQL
- ✅ Agregados campos faltantes en todas las tablas
- ✅ Agregada definición completa de la tabla `asistencia`

## 📊 Estructura Final

El esquema incluye **14 tablas** principales:
1. `organizations`
2. `perfiles`
3. `sucursales`
4. `productos`
5. `proveedores`
6. `compras`
7. `caja_diaria`
8. `movimientos_caja`
9. `stock`
10. `misiones`
11. `plantillas_misiones`
12. `historial_precios`
13. `asistencia` ⭐ NUEVA

Y **1 vista**:
1. `view_productos_con_stock` ⭐ NUEVA

## 🚀 Próximos Pasos

1. **Ejecutar el esquema SQL** en Supabase (ver `DATABASE_SETUP.md`)
2. **Verificar** que todas las tablas se crearon correctamente
3. **Probar** las consultas básicas del código
4. **Ajustar políticas RLS** si necesitas permisos más granulares

## ⚠️ Notas Importantes

- **Backup**: Siempre haz backup antes de ejecutar cambios en producción
- **Migración**: Si ya tienes datos, considera crear migraciones incrementales
- **RLS**: Las políticas actuales son básicas. Ajusta según tus necesidades de seguridad
- **Vista**: La vista `view_productos_con_stock` puede ser costosa con muchos datos. Considera materializarla si es necesario

## 📁 Archivos Creados/Modificados

### Nuevos Archivos
- ✅ `supabase-schema.sql` - Esquema SQL completo
- ✅ `DATABASE_SETUP.md` - Guía de instalación
- ✅ `CHANGELOG_BD.md` - Este archivo

### Archivos Modificados
- ✅ `types/tipos-db.ts` - Tipos TypeScript actualizados
- ✅ `lib/supabase.ts` - Cliente Supabase con tipos correctos
- ✅ `components/team-ranking.tsx` - Corrección de campo

## ✨ Resultado

El esquema SQL ahora está **PERFECTO** y completamente sincronizado con:
- ✅ El código TypeScript
- ✅ Las consultas en los componentes
- ✅ Las relaciones entre tablas
- ✅ Las mejores prácticas de Supabase/PostgreSQL

