# 🚀 Configurar Variables de Entorno en Vercel

## ⚠️ Error Actual

El build en Vercel está fallando con:
```
Error: supabaseUrl is required.
```

Esto ocurre porque las variables de entorno de Supabase no están configuradas en Vercel.

## ✅ Solución: Configurar Variables de Entorno

### Paso 1: Acceder a la Configuración de Vercel

1. Ve a tu proyecto en Vercel: https://vercel.com
2. Selecciona el proyecto **PlanetaZEGA**
3. Ve a **Settings** → **Environment Variables**

### Paso 2: Agregar Variables de Entorno

Agrega las siguientes variables de entorno:

#### Variable 1:
- **Name**: `NEXT_PUBLIC_SUPABASE_URL`
- **Value**: Tu URL de Supabase (ejemplo: `https://xxxxx.supabase.co`)
- **Environment**: Production, Preview, Development (marca todas)

#### Variable 2:
- **Name**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Value**: Tu Anon Key de Supabase
- **Environment**: Production, Preview, Development (marca todas)

### Paso 3: Obtener los Valores

Si no tienes los valores:

1. Ve a tu proyecto en Supabase: https://supabase.com/dashboard
2. Selecciona tu proyecto
3. Ve a **Settings** → **API**
4. Copia:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Paso 4: Redesplegar

Después de agregar las variables:

1. Ve a **Deployments** en Vercel
2. Haz clic en los tres puntos (⋯) del último deployment
3. Selecciona **Redeploy**
4. O simplemente haz un nuevo push a GitHub

## 📋 Variables Requeridas

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## ✅ Verificación

Después de configurar y redesplegar, el build debería completarse exitosamente.

## 🔒 Seguridad

- ✅ Las variables `NEXT_PUBLIC_*` son públicas (se incluyen en el bundle del cliente)
- ✅ La `ANON_KEY` está diseñada para ser pública
- ✅ Nunca uses la `SERVICE_ROLE_KEY` en variables públicas
- ✅ Vercel encripta las variables de entorno en repositorio

