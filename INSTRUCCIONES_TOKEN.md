# 🔑 Cómo Obtener el Token para Generar Tipos

## Opción 1: Personal Access Token (Recomendado) ✅

Este es el método recomendado y más seguro:

1. **Ve a Supabase:**
   - https://app.supabase.com

2. **Accede a Account Settings:**
   - Haz clic en tu **avatar/icono de perfil** (esquina superior derecha)
   - Selecciona **"Account Settings"** (NO "Project Settings")

3. **Encuentra Access Tokens:**
   - En el menú lateral izquierdo, busca **"Access Tokens"** o **"Personal Access Tokens"**
   - Si no lo ves, puede estar en una subsección de "Account" o "Security"

4. **Genera un nuevo token:**
   - Haz clic en **"Generate new token"** o **"Create new token"**
   - Dale un nombre descriptivo (ej: "Generar Tipos TypeScript")
   - Copia el token generado (⚠️ solo se muestra una vez, guárdalo bien)

5. **Úsalo:**
   ```powershell
   $env:SUPABASE_ACCESS_TOKEN="el_token_que_copiaste"
   npm run generate-types
   ```

## Opción 2: Service Role Key (Alternativa Temporal) ⚠️

Si no encuentras el Personal Access Token, puedes usar el Service Role Key temporalmente:

1. **Ve a tu proyecto en Supabase:**
   - https://app.supabase.com
   - Selecciona tu proyecto

2. **Settings → API:**
   - Ve a **Settings** (ícono de engranaje en el menú lateral)
   - Selecciona **API**

3. **Busca "service_role" key:**
   - En la sección **"Project API keys"**
   - Busca la key con el nombre **"service_role"** (está marcada como "secret")
   - Haz clic en el ícono de ojo para revelarla y cópiala

4. **⚠️ IMPORTANTE - Solo para generar tipos:**
   - Este key tiene permisos completos de administrador
   - **NUNCA** lo uses en código que se ejecute en producción
   - **NUNCA** lo subas a GitHub o repositorios públicos
   - Solo úsalo temporalmente para generar los tipos

5. **Úsalo:**
   ```powershell
   $env:SUPABASE_SERVICE_ROLE_KEY="el_service_role_key"
   npm run generate-types
   ```

## ¿Dónde está exactamente el Personal Access Token?

Si no lo encuentras en Account Settings, puede estar en:

- **Profile** → **Access Tokens**
- **Security** → **Access Tokens**  
- **Account** → **Personal Access Tokens**
- O busca en la barra de búsqueda de Supabase: "access token"

## Nota Importante

- Los tokens son sensibles, guárdalos de forma segura
- Si pierdes un Personal Access Token, puedes generar uno nuevo
- El Service Role Key no cambia, pero si lo comprometes, debes regenerarlo desde Settings → API

