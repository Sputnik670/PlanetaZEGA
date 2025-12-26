# 🚀 Subir a GitHub

## Opción 1: Si ya tienes un repositorio en GitHub

1. **Conecta tu repositorio local con GitHub:**
   ```bash
   git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git
   ```

2. **Sube el código:**
   ```bash
   git push -u origin main
   ```

## Opción 2: Si necesitas crear un nuevo repositorio

1. **Ve a GitHub** y crea un nuevo repositorio:
   - https://github.com/new
   - Dale un nombre (ej: `PlanetaZEGA`)
   - NO inicialices con README, .gitignore o licencia (ya los tenemos)

2. **Copia la URL del repositorio** (algo como: `https://github.com/TU_USUARIO/PlanetaZEGA.git`)

3. **En tu terminal, ejecuta:**
   ```bash
   git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git
   git push -u origin main
   ```

## Si usas autenticación con token personal

Si GitHub te pide autenticación, puedes usar un token personal:

1. Ve a GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Genera un nuevo token con permisos `repo`
3. Úsalo como contraseña cuando git te lo pida

## Verificación

Después de hacer push, puedes verificar en GitHub que todos los archivos estén ahí, especialmente:
- ✅ `supabase-schema.sql`
- ✅ `DATABASE_SETUP.md`
- ✅ `CHANGELOG_BD.md`
- ✅ Todos los componentes y archivos del proyecto

