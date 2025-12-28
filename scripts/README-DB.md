# 🗄️ Scripts de Base de Datos - Supabase

Scripts para conectarse, explorar y gestionar la base de datos de Supabase.

## 📋 Scripts Disponibles

### 1. **Conectar a Supabase** (`conectar-supabase.js`)

Script completo que hace una exploración exhaustiva de la base de datos.

```bash
npm run db:connect
```

**Muestra:**
- ✅ Test de conexión
- 📊 Organizaciones registradas
- 🏪 Sucursales con estado de QR
- 👥 Perfiles de usuarios (dueños y empleados)
- ⏰ Registros de asistencia (últimos 10)
- 📦 Productos (primeros 5)
- 💰 Cajas diarias (últimas 5)

---

### 2. **Verificar Esquema** (`verificar-esquema.js`)

Verifica que todas las tablas necesarias existan en la base de datos.

```bash
npm run db:check
```

**Verifica:**
- ✅ 14 tablas principales
- ✅ Campos QR en sucursales (`qr_entrada_url`, `qr_salida_url`)
- ✅ Vista SQL `view_productos_con_stock`

**Output:**
```
✅ Tablas existentes: 14/14
✅ Tabla sucursales: Campos QR presentes
✅ Vista view_productos_con_stock: Existe
🎉 El esquema está completo y listo para usar
```

---

### 3. **Query Interactivo** (`supabase-query.js`)

Script modular para consultar diferentes partes de la base de datos.

#### Comandos disponibles:

```bash
# Estadísticas generales
npm run db:stats

# Listar organizaciones
npm run db:orgs

# Listar usuarios (perfiles)
npm run db:users

# Listar sucursales
npm run db:sucursales

# Listar asistencias
npm run db:asistencia

# Listar productos
npm run db:productos

# Listar cajas diarias
npm run db:cajas

# Ver TODO (stats + orgs + users + sucursales + asistencia)
npm run db:query all
```

#### Ejemplos de output:

**Estadísticas:**
```
📊 ESTADÍSTICAS GENERALES
════════════════════════════════════════════════════════════

🏢 Organizaciones:         2
👥 Usuarios:               5
🏪 Sucursales:             3
📦 Productos:              45
📊 Movimientos de stock:   120
🚚 Proveedores:            8
🛒 Compras:                15
💰 Cajas diarias:          30
💵 Movimientos de caja:    85
🎯 Misiones:               12
⏰ Asistencias:            67
📧 Invitaciones pend.:     2

────────────────────────────────────────────────────────────
📈 Total de registros: 394
```

**Usuarios:**
```
👥 USUARIOS (PERFILES)
════════════════════════════════════════════════════════════

Total: 5 (2 dueños, 3 empleados)

🔑 DUEÑOS:

1. Juan Pérez
   Email: juan@example.com
   Organización: Kiosco Central
   Registrado: 15/12/2024, 10:30

👤 EMPLEADOS:

1. María García
   Email: maria@example.com
   Organización: Kiosco Central
   Sucursal: Kiosco Centro
   Nivel: 5 (XP: 1250)
   Registrado: 20/12/2024, 14:15
```

**Asistencias:**
```
⏰ REGISTROS DE ASISTENCIA
════════════════════════════════════════════════════════════

Mostrando últimos 10 registros

1. María García → Kiosco Centro
   Organización: Kiosco Central
   Estado: ✅ Finalizado
   📥 Entrada: 28/12/2024, 08:00
   📤 Salida:  28/12/2024, 16:30
   ⏱️  Duración: 8h 30m

2. Pedro López → Kiosco Sur
   Organización: Kiosco Central
   Estado: 🔵 En curso
   📥 Entrada: 28/12/2024, 14:00
   📤 Salida:  ⏳ En curso
   ⏱️  Duración: En curso

────────────────────────────────────────────────────────────
🔵 Asistencias activas: 1
```

---

## 🔧 Configuración

Los scripts leen las credenciales automáticamente desde `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key_aqui
```

---

## 📦 Dependencias

Los scripts requieren:
- `@supabase/supabase-js` (ya instalado)
- `dotenv` (ya instalado)

---

## 🚀 Casos de Uso

### Debugging en Desarrollo

```bash
# Verificar que el esquema está completo
npm run db:check

# Ver estadísticas rápidas
npm run db:stats

# Ver si hay usuarios registrados
npm run db:users
```

### Monitoreo de Producción

```bash
# Ver asistencias activas (empleados que están trabajando)
npm run db:asistencia

# Ver cajas abiertas
npm run db:cajas

# Verificar que los QR están configurados
npm run db:sucursales
```

### Troubleshooting

```bash
# Conexión completa para diagnóstico
npm run db:connect

# Verificar que las tablas existen
npm run db:check
```

---

## 🛠️ Personalización

Puedes modificar los scripts para agregar queries personalizadas:

### Ejemplo: Agregar query de ventas

Edita `scripts/supabase-query.js` y agrega:

```javascript
async function listarVentas() {
  console.log('\n💸 VENTAS RECIENTES');
  console.log('═'.repeat(60));

  const { data, error } = await supabase
    .from('stock')
    .select(`
      *,
      productos(nombre, emoji),
      perfiles(nombre),
      sucursales(nombre)
    `)
    .eq('tipo_movimiento', 'salida')
    .order('fecha_venta', { ascending: false })
    .limit(20);

  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }

  // ... formatear y mostrar datos
}
```

Luego en `main()`:

```javascript
case 'ventas':
  await listarVentas();
  break;
```

Y agregar al `package.json`:

```json
"db:ventas": "node scripts/supabase-query.js ventas"
```

---

## 🔒 Seguridad

**Importante:**
- Los scripts usan `NEXT_PUBLIC_SUPABASE_ANON_KEY` (clave pública)
- Esta clave solo permite operaciones autorizadas por RLS
- NO incluye credenciales de administrador
- Seguro para usar en desarrollo

**RLS está habilitado:**
- Solo puedes ver datos de tu organización
- Las políticas de seguridad aplican a todos los queries

---

## 📝 Notas

- Los scripts muestran datos **formateados** para facilitar lectura
- Fechas en formato argentino (`es-AR`)
- Límites por defecto para evitar sobrecarga:
  - Asistencias: últimas 20
  - Productos: primeros 20
  - Cajas: últimas 20

---

## 🆘 Troubleshooting

### Error: "Connection refused"

```bash
# Verificar que las credenciales son correctas
cat .env.local

# Verificar conectividad a internet
ping supabase.co
```

### Error: "column does not exist"

El esquema está desactualizado. Ejecutar:

```bash
npm run db:check
```

Si hay tablas faltantes, ejecutar el esquema SQL en Supabase Dashboard.

### Error: "dotenv not found"

```bash
npm install --save-dev dotenv
```

---

## 📚 Referencias

- [Documentación Supabase JS](https://supabase.com/docs/reference/javascript)
- [Supabase Dashboard](https://supabase.com/dashboard)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)

---

**Creado por:** Claude Code Assistant
**Última actualización:** 28/12/2024
