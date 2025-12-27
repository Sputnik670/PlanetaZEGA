# 🔑 Solución: API Key de TestSprite No Válida

## Problema

TestSprite sigue dando error de autenticación incluso después de:
- ✅ Configurar la API key en `settings.json`
- ✅ Crear `mcp.json` en la ubicación correcta
- ✅ Reiniciar Cursor completamente

Esto indica que **la API key no es válida o ha expirado**.

## Solución: Verificar o Crear Nueva API Key

### Paso 1: Verificar API Key Actual

1. **Visita el dashboard de TestSprite:**
   ```
   https://www.testsprite.com/dashboard/settings/apikey
   ```

2. **Busca la API key "CadenaKiosco"** en la lista

3. **Verifica:**
   - ¿Está activa?
   - ¿No ha expirado?
   - ¿Tiene permisos suficientes?

### Paso 2: Si la API Key No Es Válida

Si la API key "CadenaKiosco" no está activa o ha expirado:

1. **Crea una nueva API key:**
   - En el dashboard, haz clic en "Create New API Key" o "Crear Nueva API Key"
   - Dale un nombre (por ejemplo: "CadenaKiosco-v2")
   - Copia la nueva API key que se genera

2. **Actualiza la configuración:**
   
   **Opción A: Desde la interfaz de Cursor**
   - Abre la configuración de MCP (`Ctrl + Shift + P` → "MCP")
   - Haz clic en "testsprite"
   - Reemplaza la API key antigua con la nueva
   - Guarda

   **Opción B: Actualizar archivos manualmente**
   
   Actualiza estos dos archivos con la nueva API key:
   
   **1. `settings.json`:**
   ```
   C:\Users\Rram\AppData\Roaming\Cursor\User\settings.json
   ```
   
   **2. `mcp.json`:**
   ```
   C:\Users\Rram\AppData\Roaming\Cursor\User\globalStorage\mcp.json
   ```

3. **Reinicia Cursor** después de actualizar

### Paso 3: Si la API Key Es Válida

Si la API key está activa pero sigue sin funcionar:

1. **Verifica que esté copiada correctamente** (sin espacios extra)
2. **Asegúrate de que esté en ambos archivos** (`settings.json` y `mcp.json`)
3. **Intenta crear una nueva API key de todas formas** (a veces ayuda)

## Después de Actualizar

Una vez que tengas una API key válida y actualizada:

1. **Reinicia Cursor**
2. **Avísame** y yo intentaré usar TestSprite nuevamente
3. **Continuaremos con:**
   - Generar PRD estandarizado
   - Generar plan de pruebas frontend
   - Ejecutar las pruebas

## ¿Qué Necesito de Ti?

1. **Visita:** https://www.testsprite.com/dashboard/settings/apikey
2. **Verifica** si "CadenaKiosco" está activa
3. **Si no está activa o no existe**, crea una nueva API key
4. **Copia la nueva API key** y avísame
5. **O actualiza los archivos** con la nueva API key y reinicia Cursor



