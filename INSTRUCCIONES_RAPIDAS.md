# ⚡ INSTRUCCIONES RÁPIDAS - Fix Procesar Venta

## 🔴 PROBLEMA
Error al hacer ventas: `Could not find the function public.procesar_venta`

## ✅ SOLUCIÓN (3 PASOS)

### 1️⃣ Ejecutar en Supabase SQL Editor

Abre tu proyecto de Supabase → SQL Editor → Ejecuta este archivo:
```
FIX_PROCESAR_VENTA.sql
```

Esto eliminará la versión anterior de la función y creará la correcta.

### 2️⃣ (Opcional) Arreglar tabla organizations

Si tienes errores relacionados con "activo", ejecuta:
```
FIX_ORGANIZATIONS_TABLE.sql
```

### 3️⃣ Regenerar tipos TypeScript

```bash
# Opción A: Con Supabase CLI
npx supabase gen types typescript --project-id TU_PROJECT_ID > types/database.types.ts

# Opción B: Desde Dashboard
# Settings > API > Generate Types > copiar y pegar en types/database.types.ts
```

---

## 🧪 VERIFICAR QUE FUNCIONÓ

Después de ejecutar los scripts, verifica en Supabase SQL Editor:

```sql
SELECT
    p.proname as nombre_funcion,
    pg_get_function_arguments(p.oid) as argumentos
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
    AND p.proname = 'procesar_venta';
```

**Resultado esperado:**
```
nombre_funcion: procesar_venta
argumentos: p_sucursal_id uuid, p_caja_id uuid, p_items jsonb, p_metodo_pago_global text, p_monto_total_cliente numeric
```

---

## 📋 ¿QUÉ CAUSÓ EL PROBLEMA?

1. ✅ Tu código TypeScript está **correcto**
2. ✅ Tu definición SQL está **correcta**
3. ❌ Supabase tenía **cacheada una versión anterior** de la función con otro orden de parámetros
4. ❌ Los tipos TypeScript estaban **desactualizados**

La solución fuerza la actualización del schema cache.

---

## 📁 ARCHIVOS CREADOS

- `AUDITORIA_SQL.md` - Auditoría completa del esquema
- `FIX_PROCESAR_VENTA.sql` - Script de corrección (EJECUTAR ESTE)
- `FIX_ORGANIZATIONS_TABLE.sql` - Fix opcional
- `INSTRUCCIONES_RAPIDAS.md` - Este archivo

---

## 🆘 SI EL PROBLEMA PERSISTE

1. **Reinicia el pooler de Supabase:**
   - Dashboard > Settings > Database > Restart

2. **Verifica que la función se ejecutó:**
   ```sql
   \df public.procesar_venta
   ```

3. **Prueba manualmente:**
   ```sql
   SELECT public.procesar_venta(
       'UUID_SUCURSAL'::uuid,
       'UUID_CAJA'::uuid,
       '[]'::jsonb,
       'efectivo',
       0
   );
   ```

---

**¡Ejecuta FIX_PROCESAR_VENTA.sql y listo!** 🚀
