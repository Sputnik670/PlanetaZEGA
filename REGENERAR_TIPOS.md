# 🔄 Regenerar Tipos TypeScript desde Supabase

Este documento explica cómo regenerar los tipos TypeScript automáticamente desde Supabase.

## ✅ Método Recomendado: Script Automático

Hemos creado un script que hace todo automáticamente. Solo necesitas un Access Token:

### Paso 1: Obtén tu Access Token

1. Ve a https://app.supabase.com
2. Selecciona tu proyecto
3. Ve a **Settings** → **Access Tokens**
4. Haz clic en **"Generate new token"**
5. Copia el token generado (⚠️ guárdalo en un lugar seguro)

### Paso 2: Ejecuta el script

**Windows (PowerShell):**
```powershell
$env:SUPABASE_ACCESS_TOKEN="tu_token_aqui"
npm run generate-types
```

**Mac/Linux:**
```bash
SUPABASE_ACCESS_TOKEN=tu_token_aqui npm run generate-types
```

¡Listo! Los tipos se generarán automáticamente en `types/tipos-db.ts`

---

## Opción Alternativa: Usando Supabase CLI

### Paso 1: Instalar Supabase CLI (si no lo tienes)

```bash
npm install -g supabase
```

O usar npx (no requiere instalación global):
```bash
npx supabase --version
```

### Paso 2: Autenticarte con Supabase

```bash
npx supabase login
```

Esto abrirá tu navegador para autenticarte.

### Paso 3: Vincular tu proyecto (si usas proyecto local) O usar Project ID directamente

**Opción A: Usar Project ID directamente (Más fácil)**

Necesitas tu Project ID de Supabase:
1. Ve a tu proyecto en https://app.supabase.com
2. Ve a Settings → General
3. Copia el "Reference ID" (es el Project ID)

Luego ejecuta:

```bash
npx supabase gen types typescript --project-id TU_PROJECT_ID > types/tipos-db.ts
```

**Opción B: Vincular proyecto local (si tienes supabase configurado localmente)**

```bash
npx supabase link --project-ref TU_PROJECT_ID
npx supabase gen types typescript --linked > types/tipos-db.ts
```

## Opción 2: Usando fetch directo (Sin CLI)

Si prefieres no instalar el CLI, puedes usar este script:

```bash
# Reemplaza TU_PROJECT_ID y TU_SUPABASE_ACCESS_TOKEN
curl -X GET 'https://api.supabase.com/v1/projects/TU_PROJECT_ID/types/typescript' \
  -H "Authorization: Bearer TU_SUPABASE_ACCESS_TOKEN" \
  -H "apikey: TU_SUPABASE_ACCESS_TOKEN" > types/tipos-db.ts
```

Para obtener el Access Token:
1. Ve a https://app.supabase.com
2. Ve a Settings → API
3. Copia el "service_role" key (⚠️ CUIDADO: No lo compartas públicamente)

## Opción 3: Script NPM (Más fácil de usar)

Podemos agregar un script en `package.json` para hacerlo más fácil:

```json
{
  "scripts": {
    "generate-types": "npx supabase gen types typescript --project-id TU_PROJECT_ID > types/tipos-db.ts"
  }
}
```

Luego simplemente ejecutas:
```bash
npm run generate-types
```

## Paso 4: Verificar los tipos generados

Después de generar los tipos, verifica que el archivo `types/tipos-db.ts` se haya actualizado correctamente.

## Paso 5: Limpiar los workarounds

Una vez que tengamos los tipos correctos, podemos eliminar todos los `as any` que agregamos temporalmente.

## Información que necesito de ti:

Para ayudarte mejor, por favor comparte:

1. **Tu Project ID de Supabase** (puedes encontrarlo en Settings → General → Reference ID)
   - O la URL de tu proyecto (algo como: `https://xxxxx.supabase.co`)

2. **¿Prefieres usar el CLI o el método con curl?**

3. **¿Quieres que agregue un script npm para hacerlo más fácil?**

Una vez que tengas los tipos regenerados, podremos eliminar todos los `as any` temporales y tener un código limpio y type-safe.

