# 🗄️ Configuración de Base de Datos - PlanetaZEGA

Este documento explica cómo configurar la base de datos en Supabase para PlanetaZEGA.

## 📋 Requisitos Previos

- Una cuenta de Supabase
- Acceso al dashboard de Supabase
- Acceso al editor SQL de Supabase

## 🚀 Pasos de Instalación

### 1. Acceder al Editor SQL

1. Ve a tu proyecto en Supabase Dashboard
2. Navega a **SQL Editor** en el menú lateral
3. Haz clic en **New query**

### 2. Ejecutar el Esquema

1. Abre el archivo `supabase-schema.sql` en este repositorio
2. Copia todo el contenido del archivo
3. Pégalo en el editor SQL de Supabase
4. Haz clic en **Run** o presiona `Ctrl+Enter` (o `Cmd+Enter` en Mac)

### 3. Verificar la Instalación

Después de ejecutar el script, verifica que todas las tablas se hayan creado correctamente:

1. Ve a **Table Editor** en el menú lateral
2. Deberías ver las siguientes tablas:
   - `organizations`
   - `perfiles`
   - `sucursales`
   - `productos`
   - `proveedores`
   - `compras`
   - `caja_diaria`
   - `movimientos_caja`
   - `stock`
   - `misiones`
   - `plantillas_misiones`
   - `historial_precios`
   - `asistencia`

## 📊 Estructura de la Base de Datos

### Tablas Principales

#### `organizations`
Almacena las organizaciones/empresas que usan el sistema.

#### `perfiles`
Perfiles de usuarios (dueños y empleados). Vinculados a `auth.users` de Supabase Auth.

#### `sucursales`
Sucursales o locales de cada organización.

#### `productos`
Catálogo maestro de productos por organización.

#### `proveedores`
Proveedores que pueden ser:
- **Globales**: `sucursal_id = NULL` (disponibles para toda la cadena)
- **Locales**: `sucursal_id != NULL` (solo para una sucursal específica)

#### `stock`
Movimientos de stock (entradas y salidas). Incluye:
- `proveedor_id`: Relación con el proveedor
- `compra_id`: Relación con la compra asociada
- `tipo_movimiento`: 'entrada' o 'salida'
- `estado`: Estado del stock (ej: 'disponible', 'vendido')

#### `caja_diaria`
Cajas diarias por turno de trabajo. Cada caja está vinculada a:
- Una sucursal (`sucursal_id`)
- Un empleado (`empleado_id`)

#### `compras`
Registro de compras a proveedores. Incluye:
- `vencimiento_pago`: Fecha de vencimiento si es cuenta corriente

#### `misiones`
Misiones asignadas a empleados. Usa `es_completada` (no `completada`) para el estado.

#### `asistencia`
Registro de asistencia de empleados (entrada/salida).

### Vista: `view_productos_con_stock`

Vista materializada que calcula el stock disponible por producto y sucursal. Útil para consultas rápidas de inventario.

## 🔐 Seguridad (RLS)

El esquema incluye Row Level Security (RLS) básico que:
- Restringe el acceso de usuarios solo a datos de su organización
- Permite que los usuarios actualicen su propio perfil
- Protege todas las tablas con políticas por organización

### Nota sobre RLS

Las políticas básicas asumen que cada usuario tiene un `perfil` con `organization_id`. Si necesitas políticas más granulares (por ejemplo, por rol o sucursal), deberás ajustarlas según tus necesidades.

## 🔍 Índices

El esquema incluye índices optimizados para:
- Búsquedas por `organization_id` (todas las tablas)
- Búsquedas por `sucursal_id` (donde aplica)
- Búsquedas por `empleado_id` (donde aplica)
- Filtros comunes como `tipo_movimiento`, `estado`, `fecha_vencimiento`, etc.
- Búsquedas por `codigo_barras` en productos

Estos índices mejoran significativamente el rendimiento de las consultas.

## ⚠️ Campos Importantes

### Campos que fueron agregados/corregidos:

1. **`stock.proveedor_id`**: Relación con proveedores
2. **`stock.compra_id`**: Relación con compras
3. **`compras.vencimiento_pago`**: Para gestionar pagos pendientes
4. **`proveedores.email`**: Email del proveedor
5. **`proveedores.condicion_pago`**: Condición de pago (ej: "contado", "30 días")
6. **`movimientos_caja.categoria`**: Categoría del movimiento (ej: "proveedores")
7. **`caja_diaria.sucursal_id`**: Ya estaba en tipos pero ahora está explícito en SQL
8. **`misiones.es_completada`**: Usa este campo, no `completada`

## 🛠️ Mantenimiento

### Si necesitas modificar el esquema:

1. **NO elimines tablas existentes** si ya tienes datos
2. Usa `ALTER TABLE` para agregar columnas nuevas
3. Ejecuta migraciones en un entorno de prueba primero
4. Haz backup de tus datos antes de cambios importantes

### Ejemplo de migración para agregar una columna:

```sql
ALTER TABLE public.productos 
ADD COLUMN IF NOT EXISTS nueva_columna TEXT;
```

## 📝 Notas Adicionales

- Todas las tablas tienen `created_at` con timestamp automático
- Los IDs son UUIDs generados automáticamente
- Las relaciones usan `ON DELETE CASCADE` o `ON DELETE SET NULL` según corresponda
- Los campos numéricos tienen constraints para evitar valores negativos donde aplica

## 🐛 Solución de Problemas

### Error: "relation already exists"
Si algunas tablas ya existen, puedes:
1. Eliminarlas primero (¡cuidado, perderás datos!)
2. O usar `CREATE TABLE IF NOT EXISTS` (ya está en el script)

### Error: "permission denied"
Asegúrate de estar ejecutando el script como el usuario correcto en Supabase. Normalmente deberías usar el editor SQL que tiene permisos completos.

### La vista no funciona correctamente
Asegúrate de que la vista se haya creado después de todas las tablas. El script ya está en el orden correcto.

## ✅ Checklist Post-Instalación

- [ ] Todas las tablas están creadas
- [ ] La vista `view_productos_con_stock` está creada
- [ ] Los índices están creados (puedes verificar en el dashboard)
- [ ] RLS está habilitado en todas las tablas
- [ ] Las políticas RLS están creadas
- [ ] Pruebas básicas de inserción/consulta funcionan

## 📞 Soporte

Si encuentras problemas con el esquema, verifica:
1. Los logs en el dashboard de Supabase
2. Que todos los tipos TypeScript coincidan con el esquema SQL
3. Que las variables de entorno estén configuradas correctamente

