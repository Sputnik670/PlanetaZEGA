# 📱 Guía para Probar Turnos desde el Celular

## 🎯 Método 1: Componente Integrado (MÁS FÁCIL) ⭐

### Paso 1: Acceder al Componente
1. Inicia sesión como **empleado** en tu celular
2. El componente de prueba aparece automáticamente en la pantalla principal
3. Solo funciona en modo desarrollo (localhost)

### Paso 2: Abrir Turno
1. Ingresa el monto inicial (ej: 50000)
2. Toca el botón **"Abrir Turno"**
3. Espera el mensaje de confirmación

### Paso 3: Cerrar Turno
1. Verás el estado del turno activo
2. Ingresa el monto final contado (ej: 75000)
3. Toca el botón **"Cerrar Turno"**
4. Verás el resultado con todos los cálculos

## 🎯 Método 2: Consola del Navegador

### Paso 1: Abrir Consola en Móvil

**Chrome Android:**
1. Abre Chrome
2. Toca el menú (3 puntos) → **Más herramientas** → **Consola de desarrollador**
3. O usa: `chrome://inspect` en tu computadora y conecta el celular

**Safari iOS:**
1. Activa "Inspección Web" en Configuración → Safari → Avanzado
2. Conecta el iPhone a una Mac
3. Abre Safari en Mac → Desarrollo → [Tu iPhone] → [Pestaña]

**Alternativa más fácil:**
- Usa Chrome Remote Debugging desde tu PC
- O usa la app en modo desarrollo y accede desde la misma red

### Paso 2: Cargar Funciones

Copia y pega este código simplificado (optimizado para móvil):

```javascript
// Versión móvil simplificada
async function abrir() {
  const {data:{user}} = await supabase.auth.getUser()
  const {data:p} = await supabase.from('perfiles').select('organization_id').eq('id',user.id).single()
  const {data:s} = await supabase.from('sucursales').select('id').eq('organization_id',p.organization_id).limit(1).single()
  const {data:t} = await supabase.from('caja_diaria').insert({organization_id:p.organization_id,sucursal_id:s.id,empleado_id:user.id,monto_inicial:50000,fecha_apertura:new Date().toISOString()}).select().single()
  console.log('✅ Turno:',t.id)
  alert('Turno abierto: '+t.id)
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
  console.log('✅ Cerrado. Diferencia:',diff)
  alert('Turno cerrado. Diferencia: $'+diff)
  return r
}

async function ver() {
  const {data:{user}} = await supabase.auth.getUser()
  const {data:s} = await supabase.from('sucursales').select('id').limit(1).single()
  const {data:t} = await supabase.from('caja_diaria').select('*').eq('empleado_id',user.id).eq('sucursal_id',s.id).is('fecha_cierre',null).maybeSingle()
  if(t) alert('Turno activo: $'+t.monto_inicial)
  else alert('No hay turno activo')
  return t
}

alert('Funciones cargadas! Usa: abrir(), cerrar(75000), ver()')
```

### Paso 3: Usar las Funciones

```javascript
// Abrir turno
await abrir()

// Ver turno activo
await ver()

// Cerrar turno con $75,000
await cerrar(75000)
```

## 🎯 Método 3: Usar desde PC (Chrome Remote Debugging)

### Paso 1: Conectar Celular a PC

1. **En tu PC:**
   - Abre Chrome
   - Ve a `chrome://inspect`
   - Marca "Discover USB devices"

2. **En tu celular:**
   - Activa "Depuración USB" en Opciones de desarrollador
   - Conecta el celular por USB
   - Acepta la conexión en el celular

3. **En Chrome (PC):**
   - Verás tu dispositivo listado
   - Haz clic en "inspect"
   - Se abrirá DevTools conectado a tu celular

### Paso 2: Usar las Funciones

Ahora puedes usar el script completo de `scripts/probar-turnos-consola.js` desde la consola de tu PC, pero ejecutándose en tu celular.

## 📱 Método 4: Crear Página de Prueba (Recomendado para Producción)

Si quieres probar en producción, podemos crear una página especial `/test-turnos` que solo sea accesible para desarrollo.

## ✅ Checklist para Móvil

- [ ] Iniciar sesión como empleado
- [ ] Ver componente de prueba (si está en desarrollo)
- [ ] O abrir consola del navegador
- [ ] Cargar funciones de prueba
- [ ] Abrir turno
- [ ] Verificar turno activo
- [ ] Cerrar turno
- [ ] Verificar resultados

## 💡 Tips para Móvil

1. **Usa el componente integrado** si estás en desarrollo (más fácil)
2. **Copia el código en partes** si la consola es difícil de usar
3. **Usa Chrome Remote Debugging** para mejor experiencia
4. **Guarda las funciones** en un archivo de notas para copiar rápido
5. **Usa valores simples** como 50000 y 75000 para pruebas rápidas

## 🐛 Solución de Problemas en Móvil

### No puedo abrir la consola
- Usa el componente integrado en su lugar
- O conecta el celular a una PC con Chrome Remote Debugging

### El código es muy largo para copiar
- Usa la versión simplificada de `scripts/probar-turnos-movil.js`
- O copia en partes pequeñas

### No veo el componente de prueba
- Solo aparece en modo desarrollo (localhost)
- Verifica que `NODE_ENV === 'development'`

### Las funciones no funcionan
- Verifica que estés logueado como empleado
- Verifica que tengas una sucursal asignada
- Revisa la consola para ver errores específicos

