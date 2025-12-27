# 📱 Instrucciones Rápidas para Probar Turnos en Móvil

## ⚡ Método Más Fácil: Componente Visual

### Paso 1: Abrir la App
1. Abre la app en tu celular (en modo desarrollo)
2. Inicia sesión como **empleado**
3. Verás automáticamente el componente **"🧪 Probar Turnos"** en la pantalla

### Paso 2: Abrir Turno
1. Ingresa el monto inicial (ej: `50000`)
2. Toca **"Abrir Turno"** (botón verde)
3. ✅ Verás confirmación y el ID del turno

### Paso 3: Cerrar Turno
1. Verás el estado del turno activo
2. Ingresa el monto final contado (ej: `75000`)
3. Toca **"Cerrar Turno"** (botón rojo)
4. ✅ Verás el resultado completo con cálculos

## 📋 Ejemplo Rápido

```
1. Abrir turno con $50,000
   → Toca "Abrir Turno"
   → ✅ Turno abierto: abc123...

2. Cerrar turno con $75,000
   → Ingresa 75000
   → Toca "Cerrar Turno"
   → ✅ Turno cerrado. Diferencia: $0
```

## 🔄 Si No Ves el Componente

El componente solo aparece en **modo desarrollo** (localhost).

Si estás en producción, usa el método de consola:

### Método Alternativo: Consola Móvil

1. Abre Chrome en tu celular
2. Menú (3 puntos) → **Más herramientas** → **Consola**
3. Copia y pega este código:

```javascript
async function abrir() {
  const {data:{user}} = await supabase.auth.getUser()
  const {data:p} = await supabase.from('perfiles').select('organization_id').eq('id',user.id).single()
  const {data:s} = await supabase.from('sucursales').select('id').eq('organization_id',p.organization_id).limit(1).single()
  const {data:t} = await supabase.from('caja_diaria').insert({organization_id:p.organization_id,sucursal_id:s.id,empleado_id:user.id,monto_inicial:50000,fecha_apertura:new Date().toISOString()}).select().single()
  alert('✅ Turno: '+t.id)
  return t
}

async function cerrar(m=75000) {
  const {data:{user}} = await supabase.auth.getUser()
  const {data:s} = await supabase.from('sucursales').select('id').limit(1).single()
  const {data:c} = await supabase.from('caja_diaria').select('id,monto_inicial').eq('empleado_id',user.id).eq('sucursal_id',s.id).is('fecha_cierre',null).single()
  const {data:v} = await supabase.from('stock').select('cantidad,precio_venta_historico').eq('caja_diaria_id',c.id).eq('metodo_pago','efectivo').eq('tipo_movimiento','salida')
  const {data:m} = await supabase.from('movimientos_caja').select('monto,tipo').eq('caja_diaria_id',c.id)
  const ventas = v?.reduce((s,v)=>s+((v.precio_venta_historico||0)*(v.cantidad||1)),0)||0
  const ing = m?.filter(x=>x.tipo==='ingreso').reduce((s,x)=>s+x.monto,0)||0
  const egr = m?.filter(x=>x.tipo==='egreso').reduce((s,x)=>s+x.monto,0)||0
  const esp = c.monto_inicial+ventas+ing-egr
  const diff = m-esp
  const {data:r} = await supabase.from('caja_diaria').update({monto_final:m,diferencia:diff,fecha_cierre:new Date().toISOString()}).eq('id',c.id).select().single()
  alert('✅ Cerrado. Diferencia: $'+diff)
  return r
}

alert('Listo! Usa: abrir() o cerrar(75000)')
```

4. Usa:
   - `await abrir()` - Para abrir turno
   - `await cerrar(75000)` - Para cerrar con $75,000

## ✅ Listo!

Ahora puedes probar turnos fácilmente desde tu celular.

