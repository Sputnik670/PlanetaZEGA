# Instrucciones para Ejecutar SQL de QR de Fichaje

## 📋 Paso 1: Ejecutar la Migración SQL en Supabase

Para que los QR de fichaje se guarden permanentemente en la base de datos, necesitas ejecutar el siguiente SQL en Supabase:

### Opción 1: Desde el Dashboard de Supabase

1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. Navega a **SQL Editor** (en el menú lateral)
3. Haz clic en **New Query**
4. Copia y pega el siguiente SQL:

```sql
-- Agregar columnas para URLs de QR de fichaje
ALTER TABLE public.sucursales
ADD COLUMN IF NOT EXISTS qr_entrada_url TEXT,
ADD COLUMN IF NOT EXISTS qr_salida_url TEXT;

-- Comentarios para documentación
COMMENT ON COLUMN public.sucursales.qr_entrada_url IS 'URL del QR de entrada para fichaje de empleados';
COMMENT ON COLUMN public.sucursales.qr_salida_url IS 'URL del QR de salida para fichaje de empleados';
```

5. Haz clic en **Run** (o presiona `Ctrl+Enter` / `Cmd+Enter`)

### Opción 2: Desde el archivo SQL

El archivo SQL está en: `supabase-migrations/agregar_qr_fichaje_sucursales.sql`

Puedes copiar su contenido y ejecutarlo en Supabase SQL Editor.

## ✅ Verificación

Después de ejecutar el SQL, verifica que las columnas se agregaron correctamente:

1. Ve a **Table Editor** en Supabase
2. Selecciona la tabla `sucursales`
3. Deberías ver las nuevas columnas: `qr_entrada_url` y `qr_salida_url`

## 🎯 Funcionalidad

Una vez ejecutado el SQL:

- Los QR generados desde "Mi Equipo" > "Generación QR" se guardarán permanentemente
- Cada local tendrá sus propios QR de entrada y salida fijos
- Los QR guardados se mostrarán con un indicador verde (punto verde) en los botones
- Los empleados podrán escanear los QR guardados para fichar

## 📝 Nota

Si no ejecutas el SQL, la aplicación seguirá funcionando pero:
- Los QR no se guardarán permanentemente
- Cada vez que generes un QR, será nuevo (aunque la URL será la misma)
- No verás el indicador de "QR guardado"

