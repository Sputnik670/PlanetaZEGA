# 🔑 Configurar API Key de TestSprite en Cursor

## Tu API Key

**Nombre**: CadenaKiosco  
**Valor**: 
```
sk-sk-user-6dYk2p72awAbDTfrbW_X4BfzQMbxZbfvTCJEluiu8PYpRO5699mucKeRGFiHegptZSgHNZ_z-3Dw7wF8Kmejq95gzaiFScqg9EUHLf465ce_KEIfPbVDMrA5G0Fq9g536LA
```

## Pasos para Configurar en Cursor

### Método 1: Desde la Paleta de Comandos (Recomendado)

1. **Abre la Paleta de Comandos:**
   - Presiona `Ctrl + Shift + P` (Windows/Linux)
   - O `Cmd + Shift + P` (Mac)

2. **Busca la configuración de MCP:**
   - Escribe: `MCP` o `Model Context Protocol`
   - Selecciona la opción que diga algo como:
     - "MCP: Configure Servers"
     - "MCP: Settings"
     - "Preferences: Open MCP Settings"

3. **Busca o agrega TestSprite:**
   - Si TestSprite ya está en la lista, haz clic para editarlo
   - Si no está, busca un botón "Add" o "+" para agregar un nuevo servidor

4. **Configura la API Key:**
   - Busca el campo `apiKey` o `API_KEY`
   - Pega el valor de tu API key:
     ```
     sk-sk-user-6dYk2p72awAbDTfrbW_X4BfzQMbxZbfvTCJEluiu8PYpRO5699mucKeRGFiHegptZSgHNZ_z-3Dw7wF8Kmejq95gzaiFScqg9EUHLf465ce_KEIfPbVDMrA5G0Fq9g536LA
     ```

5. **Guarda y reinicia:**
   - Guarda la configuración
   - **Cierra completamente Cursor** (todas las ventanas)
   - Vuelve a abrir Cursor

### Método 2: Desde Settings

1. **Abre Settings:**
   - Presiona `Ctrl + ,` (Windows/Linux)
   - O `Cmd + ,` (Mac)
   - O ve a: **File > Preferences > Settings**

2. **Busca "MCP" en la barra de búsqueda**

3. **Busca la sección de MCP Servers o TestSprite**

4. **Configura la API Key** como se describe arriba

5. **Guarda y reinicia Cursor**

### Método 3: Archivo de Configuración Directo

Si conoces la ubicación del archivo de configuración de MCP en Cursor:

1. **Ubicación típica en Windows:**
   ```
   %APPDATA%\Cursor\User\globalStorage\mcp.json
   ```
   O:
   ```
   C:\Users\Rram\AppData\Roaming\Cursor\User\globalStorage\mcp.json
   ```

2. **Edita el archivo** (si existe) y agrega:
   ```json
   {
     "mcpServers": {
       "testsprite": {
         "apiKey": "sk-sk-user-6dYk2p72awAbDTfrbW_X4BfzQMbxZbfvTCJEluiu8PYpRO5699mucKeRGFiHegptZSgHNZ_z-3Dw7wF8Kmejq95gzaiFScqg9EUHLf465ce_KEIfPbVDMrA5G0Fq9g536LA"
       }
     }
   }
   ```

3. **Reinicia Cursor**

## Estructura de Configuración Esperada

La configuración debería verse así (en formato JSON o formulario):

```json
{
  "mcpServers": {
    "testsprite": {
      "apiKey": "sk-sk-user-6dYk2p72awAbDTfrbW_X4BfzQMbxZbfvTCJEluiu8PYpRO5699mucKeRGFiHegptZSgHNZ_z-3Dw7wF8Kmejq95gzaiFScqg9EUHLf465ce_KEIfPbVDMrA5G0Fq9g536LA"
    }
  }
}
```

O en formato de formulario:
- **Server Name**: `testsprite` o `TestSprite`
- **API Key**: `sk-sk-user-6dYk2p72awAbDTfrbW_X4BfzQMbxZbfvTCJEluiu8PYpRO5699mucKeRGFiHegptZSgHNZ_z-3Dw7wF8Kmejq95gzaiFScqg9EUHLf465ce_KEIfPbVDMrA5G0Fq9g536LA`
- **Enabled**: ✓ (marcado)

## ⚠️ Importante

- **Debes reiniciar Cursor completamente** después de configurar la API key
- Cierra todas las ventanas de Cursor y vuelve a abrirlo
- Los cambios no surten efecto hasta que reinicies

## ✅ Verificación

Después de configurar y reiniciar, puedo intentar ejecutar TestSprite nuevamente para verificar que funciona.

## 📝 Nota

Si tienes problemas encontrando la configuración de MCP en Cursor, puedes:
1. Revisar la documentación oficial de Cursor sobre MCP
2. Buscar en la configuración de Cursor cualquier menú relacionado con "Extensions", "Integrations", o "Servers"
3. Verificar si hay un archivo de configuración JSON en la carpeta de Cursor






