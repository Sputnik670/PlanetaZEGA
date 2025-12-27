# 🔑 Configuración de TestSprite MCP en Cursor

## Pasos para Configurar la API Key

La API key de TestSprite debe configurarse en **Cursor > Configuración de MCP**, no solo como variable de entorno.

### 1. En Cursor:

1. Ve a **AI Sidebar > AI Management** (o **Settings > MCP**)
2. Busca **TestSprite** en la lista de MCPs
3. Si no está agregado, agrégalo desde el Marketplace
4. Configura la API Key en la configuración de TestSprite MCP

### 2. API Key a Configurar:

```
sk-sk-user-6dYk2p72awAbDTfrbW_X4BfzQMbxZbfvTCJEluiu8PYpRO5699mucKeRGFiHegptZSgHNZ_z-3Dw7wF8Kmejq95gzaiFScqg9EUHLf465ce_KEIfPbVDMrA5G0Fq9g536LA
```

### 3. Después de Configurar:

Una vez configurada la API key en Cursor MCP:
- Reinicia Cursor o recarga la ventana
- Prueba ejecutar comandos de TestSprite nuevamente

## Nota

El archivo `.env.local` también tiene la API key guardada como respaldo, pero TestSprite MCP lee la configuración desde Cursor directamente.

## Verificación

Después de configurar, deberías poder:
- ✅ Generar PRD estandarizado
- ✅ Generar plan de pruebas frontend
- ✅ Inicializar y ejecutar tests







