# 🧪 Ejemplos Prácticos para Probar Turnos

## 🚀 Método Rápido: Consola del Navegador

### Paso 1: Abrir la App
1. Inicia sesión como **empleado**
2. Abre la consola del navegador (F12)
3. Ve a la pestaña "Console"

### Paso 2: Cargar las Funciones
Copia y pega el contenido completo de `scripts/probar-turnos-consola.js` en la consola.

### Paso 3: Usar las Funciones

#### Ejemplo 1: Abrir un Turno
```javascript
// Abre un turno con $50,000 de monto inicial
await abrirTurno(50000)
```

#### Ejemplo 2: Ver Turno Activo
```javascript
// Ver si hay un turno activo
await obtenerTurnoActivo()
```

#### Ejemplo 3: Cerrar Turno
```javascript
// Cierra el turno activo con $75,000 contados
await cerrarTurno(null, 75000)
```

#### Ejemplo 4: Listar Turnos
```javascript
// Ver los últimos 5 turnos
await listarTurnos(5)
```

## 📝 Escenarios Completos

### Escenario 1: Turno Simple
```javascript
// 1. Abrir turno
const turno = await abrirTurno(50000)

// 2. Esperar un momento (simular trabajo)
await new Promise(r => setTimeout(r, 2000))

// 3. Cerrar turno (sin ventas, mismo monto)
await cerrarTurno(turno.id, 50000)
```

### Escenario 2: Turno con Ventas
```javascript
// 1. Abrir turno
const turno = await abrirTurno(50000)

// 2. Aquí harías ventas normalmente desde la app
// (o puedes crear ventas manualmente desde Supabase)

// 3. Cerrar turno (asumiendo $25,000 en ventas)
await cerrarTurno(turno.id, 75000)
```

### Escenario 3: Turno con Diferencia
```javascript
// 1. Abrir turno
const turno = await abrirTurno(50000)

// 2. Cerrar con diferencia (falta $500)
await cerrarTurno(turno.id, 74500)
// Resultado: diferencia = -$500
```

## 🔧 Crear Ventas de Prueba

Para probar turnos con ventas, puedes crear ventas manualmente:

```javascript
// Obtener turno activo
const turno = await obtenerTurnoActivo()

// Obtener un producto
const { data: producto } = await supabase
  .from('productos')
  .select('id, precio_venta')
  .limit(1)
  .single()

// Crear una venta en efectivo
const { data: venta } = await supabase
  .from('stock')
  .insert({
    organization_id: 'tu-org-id',
    sucursal_id: 'tu-sucursal-id',
    producto_id: producto.id,
    caja_diaria_id: turno.id,
    cantidad: 1,
    tipo_movimiento: 'salida',
    estado: 'vendido',
    metodo_pago: 'efectivo',
    precio_venta_historico: producto.precio_venta,
    fecha_venta: new Date().toISOString()
  })
  .select()
  .single()

console.log('Venta creada:', venta)
```

## 📊 Verificar Resultados

### Ver Turno en Base de Datos
```javascript
// Ver detalles completos de un turno
const { data: turno } = await supabase
  .from('caja_diaria')
  .select(`
    *,
    movimientos_caja(*),
    stock(*)
  `)
  .eq('id', 'tu-turno-id')
  .single()

console.log('Turno completo:', turno)
```

### Calcular Totales Manualmente
```javascript
const turnoId = 'tu-turno-id'

// Ventas en efectivo
const { data: ventas } = await supabase
  .from('stock')
  .select('cantidad, precio_venta_historico')
  .eq('caja_diaria_id', turnoId)
  .eq('metodo_pago', 'efectivo')
  .eq('tipo_movimiento', 'salida')

const totalVentas = ventas?.reduce(
  (sum, v) => sum + (v.precio_venta_historico * v.cantidad), 
  0
) || 0

console.log('Total ventas efectivo:', totalVentas)

// Movimientos
const { data: movimientos } = await supabase
  .from('movimientos_caja')
  .select('monto, tipo')
  .eq('caja_diaria_id', turnoId)

const ingresos = movimientos?.filter(m => m.tipo === 'ingreso')
  .reduce((sum, m) => sum + m.monto, 0) || 0

const egresos = movimientos?.filter(m => m.tipo === 'egreso')
  .reduce((sum, m) => sum + m.monto, 0) || 0

console.log('Ingresos:', ingresos)
console.log('Egresos:', egresos)
```

## ⚠️ Errores Comunes

### "No hay sesión activa"
- Asegúrate de estar logueado como empleado
- Refresca la página y vuelve a intentar

### "No se encontró la organización"
- Verifica que el perfil del empleado tenga `organization_id`
- Revisa en Supabase la tabla `perfiles`

### "No se encontró sucursal"
- Asegúrate de que exista al menos una sucursal
- Verifica que la sucursal pertenezca a la organización

### "No hay turno activo para cerrar"
- Primero debes abrir un turno
- O proporciona el `turnoId` explícitamente

## ✅ Checklist de Pruebas

- [ ] Abrir turno con monto inicial
- [ ] Verificar turno activo
- [ ] Crear ventas en efectivo
- [ ] Registrar movimientos manuales
- [ ] Cerrar turno con monto final
- [ ] Verificar cálculo de diferencia
- [ ] Verificar que el turno aparece cerrado
- [ ] Probar con diferencia positiva
- [ ] Probar con diferencia negativa
- [ ] Verificar que no se pueden abrir dos turnos simultáneos

