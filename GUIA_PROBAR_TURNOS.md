# 🧪 Guía para Probar Apertura y Cierre de Turnos

## 📋 Información Necesaria

Para probar turnos necesitas:
1. **ID de un empleado** (que tenga sesión activa)
2. **ID de una sucursal** (donde trabajará el empleado)
3. **ID de la organización** (a la que pertenece el empleado)
4. **Monto inicial** (efectivo en caja al abrir)
5. **Monto final** (efectivo contado al cerrar)

## 🔍 Paso 1: Obtener IDs Necesarios

### Opción A: Desde Supabase Dashboard

1. Ve a tu proyecto en Supabase
2. Abre las tablas:
   - `perfiles` → Copia el `id` de un empleado
   - `sucursales` → Copia el `id` de una sucursal
   - `organizations` → Copia el `id` de la organización

### Opción B: Desde la App

1. Inicia sesión como empleado
2. Abre la consola del navegador (F12)
3. Ejecuta:
```javascript
const { data: { user } } = await supabase.auth.getUser()
const { data: perfil } = await supabase.from('perfiles').select('*').eq('id', user.id).single()
const { data: sucursal } = await supabase.from('sucursales').select('*').eq('organization_id', perfil.organization_id).limit(1).single()

console.log('Empleado ID:', user.id)
console.log('Sucursal ID:', sucursal.id)
console.log('Organización ID:', perfil.organization_id)
```

## 📝 Paso 2: Estructura de Datos

### Para Abrir un Turno:
```json
{
  "organization_id": "uuid-de-organizacion",
  "sucursal_id": "uuid-de-sucursal",
  "empleado_id": "uuid-de-empleado",
  "monto_inicial": 50000,
  "fecha_apertura": "2025-01-15T10:00:00.000Z"
}
```

### Para Cerrar un Turno:
```json
{
  "monto_final": 75000,
  "diferencia": 0,
  "fecha_cierre": "2025-01-15T18:00:00.000Z"
}
```

## 🧪 Paso 3: Scripts de Prueba

### Script 1: Abrir Turno

```typescript
// abrir-turno.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'TU_SUPABASE_URL'
const supabaseKey = 'TU_SUPABASE_ANON_KEY'
const supabase = createClient(supabaseUrl, supabaseKey)

async function abrirTurno() {
  const organizationId = 'uuid-organizacion'
  const sucursalId = 'uuid-sucursal'
  const empleadoId = 'uuid-empleado'
  const montoInicial = 50000

  const { data, error } = await supabase
    .from('caja_diaria')
    .insert({
      organization_id: organizationId,
      sucursal_id: sucursalId,
      empleado_id: empleadoId,
      monto_inicial: montoInicial,
      fecha_apertura: new Date().toISOString()
    })
    .select()
    .single()

  if (error) {
    console.error('Error al abrir turno:', error)
    return
  }

  console.log('✅ Turno abierto:', data.id)
  return data.id
}

abrirTurno()
```

### Script 2: Cerrar Turno

```typescript
// cerrar-turno.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'TU_SUPABASE_URL'
const supabaseKey = 'TU_SUPABASE_ANON_KEY'
const supabase = createClient(supabaseUrl, supabaseKey)

async function cerrarTurno(turnoId: string, montoFinal: number) {
  // 1. Obtener datos del turno
  const { data: turno } = await supabase
    .from('caja_diaria')
    .select('monto_inicial')
    .eq('id', turnoId)
    .single()

  if (!turno) {
    console.error('Turno no encontrado')
    return
  }

  // 2. Calcular ventas en efectivo
  const { data: ventas } = await supabase
    .from('stock')
    .select('cantidad, precio_venta_historico')
    .eq('caja_diaria_id', turnoId)
    .eq('metodo_pago', 'efectivo')
    .eq('tipo_movimiento', 'salida')

  const totalVentasEfectivo = ventas?.reduce(
    (sum, v) => sum + ((v.precio_venta_historico || 0) * (v.cantidad || 1)), 
    0
  ) || 0

  // 3. Calcular movimientos manuales
  const { data: movimientos } = await supabase
    .from('movimientos_caja')
    .select('monto, tipo')
    .eq('caja_diaria_id', turnoId)

  const totalIngresos = movimientos?.filter(m => m.tipo === 'ingreso')
    .reduce((sum, m) => sum + m.monto, 0) || 0
  
  const totalEgresos = movimientos?.filter(m => m.tipo === 'egreso')
    .reduce((sum, m) => sum + m.monto, 0) || 0

  // 4. Calcular dinero esperado
  const dineroEsperado = turno.monto_inicial + totalVentasEfectivo + totalIngresos - totalEgresos
  const diferencia = montoFinal - dineroEsperado

  // 5. Cerrar turno
  const { data, error } = await supabase
    .from('caja_diaria')
    .update({
      monto_final: montoFinal,
      diferencia: diferencia,
      fecha_cierre: new Date().toISOString()
    })
    .eq('id', turnoId)
    .select()
    .single()

  if (error) {
    console.error('Error al cerrar turno:', error)
    return
  }

  console.log('✅ Turno cerrado:', data.id)
  console.log('💰 Diferencia:', diferencia)
  return data
}

// Uso:
// cerrarTurno('uuid-del-turno', 75000)
```

## 🎯 Escenarios de Prueba

### Escenario 1: Turno Simple (Sin Ventas)
1. Abrir turno con $50,000
2. No hacer ventas
3. Cerrar turno con $50,000
4. ✅ Diferencia debe ser $0

### Escenario 2: Turno con Ventas
1. Abrir turno con $50,000
2. Hacer ventas en efectivo por $25,000
3. Cerrar turno con $75,000
4. ✅ Diferencia debe ser $0

### Escenario 3: Turno con Diferencia
1. Abrir turno con $50,000
2. Hacer ventas en efectivo por $25,000
3. Cerrar turno con $74,500 (falta $500)
4. ✅ Diferencia debe ser -$500

### Escenario 4: Turno con Movimientos Manuales
1. Abrir turno con $50,000
2. Registrar ingreso manual de $5,000
3. Registrar egreso manual de $2,000
4. Hacer ventas en efectivo por $20,000
5. Cerrar turno con $73,000
6. ✅ Diferencia debe ser $0

## 📊 Verificar en Base de Datos

Después de cada prueba, verifica en Supabase:

```sql
-- Ver turnos abiertos
SELECT * FROM caja_diaria 
WHERE fecha_cierre IS NULL;

-- Ver turnos cerrados
SELECT * FROM caja_diaria 
WHERE fecha_cierre IS NOT NULL
ORDER BY fecha_cierre DESC
LIMIT 10;

-- Ver diferencia de un turno específico
SELECT 
  id,
  monto_inicial,
  monto_final,
  diferencia,
  fecha_apertura,
  fecha_cierre
FROM caja_diaria
WHERE id = 'uuid-del-turno';
```

## 🔧 Usar desde la Consola del Navegador

Si estás en la app, puedes ejecutar directamente en la consola:

```javascript
// Abrir turno
const { data: { user } } = await supabase.auth.getUser()
const { data: perfil } = await supabase.from('perfiles').select('organization_id').eq('id', user.id).single()
const { data: sucursal } = await supabase.from('sucursales').select('id').eq('organization_id', perfil.organization_id).limit(1).single()

const { data: turno } = await supabase
  .from('caja_diaria')
  .insert({
    organization_id: perfil.organization_id,
    sucursal_id: sucursal.id,
    empleado_id: user.id,
    monto_inicial: 50000,
    fecha_apertura: new Date().toISOString()
  })
  .select()
  .single()

console.log('Turno abierto:', turno)

// Cerrar turno
const { data: turnoCerrado } = await supabase
  .from('caja_diaria')
  .update({
    monto_final: 75000,
    diferencia: 0,
    fecha_cierre: new Date().toISOString()
  })
  .eq('id', turno.id)
  .select()
  .single()

console.log('Turno cerrado:', turnoCerrado)
```

## ✅ Checklist de Pruebas

- [ ] Abrir turno con monto inicial
- [ ] Verificar que el turno aparece como activo
- [ ] Hacer algunas ventas en efectivo
- [ ] Registrar movimientos manuales (ingresos/egresos)
- [ ] Cerrar turno con monto final correcto
- [ ] Verificar que la diferencia se calcula correctamente
- [ ] Verificar que el turno aparece como cerrado
- [ ] Probar con diferencia positiva (sobra dinero)
- [ ] Probar con diferencia negativa (falta dinero)
- [ ] Verificar que no se puede abrir dos turnos simultáneos

