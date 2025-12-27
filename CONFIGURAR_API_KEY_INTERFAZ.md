# 🔧 Configurar API Key de TestSprite desde la Interfaz de Cursor

## Situación Actual

TestSprite está **instalado y activo** en Cursor (7 herramientas habilitadas), pero la API key **no está configurada correctamente**, por eso sigue dando error de autenticación.

## Pasos Detallados para Configurar la API Key

### Paso 1: Abrir la Configuración de MCP en Cursor

1. **Abre la paleta de comandos:**
   - Presiona `Ctrl + Shift + P` (Windows)
   - O `Cmd + Shift + P` (Mac)

2. **Busca y selecciona:**
   - Escribe: `MCP` o `Model Context Protocol`
   - Selecciona algo como:
     - "MCP: Configure Servers"
     - "MCP: Open Settings"
     - "Preferences: Open MCP Settings"

### Paso 2: Editar TestSprite

En la ventana que se abre, deberías ver:
- "installed mcp servers"
- "testsprite" (7 tools enabled)

**Haz clic en "testsprite"** para abrir su configuración.

### Paso 3: Agregar la API Key

Una vez que hagas clic en "testsprite", deberías ver campos de configuración. Busca:

- Un campo llamado `apiKey` o `API_KEY`
- O un formulario con campos editables
- O un botón "Edit" o "Configure"

**Pega esta API key:**
```
sk-sk-user-6dYk2p72awAbDTfrbW_X4BfzQMbxZbfvTCJEluiu8PYpRO5699mucKeRGFiHegptZSgHNZ_z-3Dw7wF8Kmejq95gzaiFScqg9EUHLf465ce_KEIfPbVDMrA5G0Fq9g536LA
```

### Paso 4: Guardar

- Busca un botón "Save", "Guardar", o "Apply"
- O simplemente cierra la ventana (puede guardar automáticamente)

### Paso 5: Reiniciar Cursor (si es necesario)

Algunas veces necesitas reiniciar Cursor después de cambiar la configuración de MCP.

## Si No Puedes Encontrar el Campo de API Key

Si al hacer clic en "testsprite" no ves un campo para la API key, puede ser que:

1. **La configuración esté en otro lugar:**
   - Ve a `File > Preferences > Settings` (o `Ctrl + ,`)
   - Busca "MCP" en la barra de búsqueda
   - Busca "TestSprite" o "testsprite"

2. **Necesites agregar la configuración manualmente:**
   - Puede que necesites editar el archivo de configuración directamente
   - O usar el script de PowerShell que creamos

## Verificar que la API Key es Válida

Antes de continuar, verifica que tu API key sigue siendo válida:

1. Visita: https://www.testsprite.com/dashboard/settings/apikey
2. Verifica que la API key "CadenaKiosco" esté activa
3. Si no está activa o ha expirado, crea una nueva

## Después de Configurar

Una vez que hayas configurado la API key:

1. **Guarda los cambios**
2. **Reinicia Cursor** (por si acaso)
3. **Avísame** y yo intentaré usar TestSprite nuevamente

## ¿Qué Ves Exactamente?

Si puedes, describe qué ves cuando:
- Abres la configuración de MCP
- Haces clic en "testsprite"

Esto me ayudará a darte instrucciones más específicas.





