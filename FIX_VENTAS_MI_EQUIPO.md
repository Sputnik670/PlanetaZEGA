# 🔧 Fix: Cálculo de Ventas en "Mi Equipo"

## 🐛 Problema Identificado

El panel "Mi Equipo" mostraba un número incorrecto de ventas porque estaba usando **datos simulados (aleatorios)** en lugar de calcular las ventas reales de la base de datos.

### Código Problemático (Antes)
```typescript
// ❌ Datos simulados
const simuladoVentas = Math.floor(Math.random() * 500000)
ventas_total: simuladoVentas, // Reemplazar con real
```

Esto generaba un número aleatorio entre 0 y 500,000 cada vez que se cargaba la página, por eso no correspondía con las ventas reales.

## ✅ Solución Implementada

Se corrigió el cálculo para usar **datos reales** de la base de datos:

1. **Obtener turnos del empleado**: Se consultan los turnos de caja (`caja_diaria`) del empleado en los últimos 30 días
2. **Obtener ventas de esos turnos**: Se consultan las ventas (`stock` con `estado = 'vendido'`) asociadas a esos turnos
3. **Calcular total**: Se suma `precio_venta_historico * cantidad` de todas las ventas

### Código Corregido (Después)
```typescript
// ✅ Datos reales
// 1. Obtener turnos del empleado
const { data: turnosVentas } = await supabase
    .from('caja_diaria')
    .select('id')
    .eq('empleado_id', emp.id)
    .not('fecha_cierre', 'is', null)
    .gte('fecha_apertura', fechaStr)

// 2. Obtener ventas de esos turnos
if (turnosVentas && turnosVentas.length > 0) {
    const turnosIds = turnosVentas.map(t => t.id)
    const { data: ventasData } = await supabase
        .from('stock')
        .select('precio_venta_historico, cantidad')
        .eq('estado', 'vendido')
        .in('caja_diaria_id', turnosIds)
        .gte('fecha_venta', fechaStr)
    
    // 3. Calcular total
    totalVentas = ventasData.reduce((sum, v) => {
        const precio = Number(v.precio_venta_historico) || 0
        const cantidad = Number(v.cantidad) || 1
        return sum + (precio * cantidad)
    }, 0)
}
```

## 📊 Cambios Adicionales

También se corrigió el cálculo de **diferencia de caja acumulada** para usar datos reales en lugar de simulados:

```typescript
// ✅ Usa la diferencia calculada de cada turno
if (t.diferencia !== null && t.diferencia !== undefined) {
    diffAcumulada += Number(t.diferencia) || 0
} else if (t.monto_final !== null && t.monto_inicial !== null) {
    // Calcula diferencia si no está calculada
    const esperado = Number(t.monto_inicial) + ingresos - gastos
    const diferencia = Number(t.monto_final) - esperado
    diffAcumulada += diferencia
}
```

## 🎯 Resultado

Ahora el panel "Mi Equipo" muestra:
- ✅ **Ventas reales** calculadas desde la base de datos
- ✅ **Diferencia de caja real** acumulada
- ✅ **Datos precisos** que corresponden con las ventas realizadas

## 📝 Notas

- El cálculo considera las ventas de los **últimos 30 días**
- Solo cuenta ventas de turnos **cerrados** (con `fecha_cierre` no nula)
- Usa `precio_venta_historico` para mantener el precio al momento de la venta
- Multiplica por `cantidad` para obtener el total correcto

## ✅ Archivo Modificado

- `components/team-ranking.tsx` - Cálculo de ventas corregido

