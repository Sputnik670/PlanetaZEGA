# 🔧 Solución Alternativa: Configurar TestSprite

Si no puedes configurar la API key desde la interfaz de Cursor, aquí hay varias alternativas:

## Opción 1: Usar el Script de PowerShell (Más Fácil)

He creado un script que intentará configurar la API key automáticamente:

1. **Abre PowerShell como Administrador:**
   - Presiona `Win + X`
   - Selecciona "Windows PowerShell (Admin)" o "Terminal (Admin)"

2. **Navega a la carpeta del proyecto:**
   ```powershell
   cd C:\Users\Rram\Desktop\PlanetaZEGA-main
   ```

3. **Ejecuta el script:**
   ```powershell
   .\configurar-testsprite.ps1
   ```

4. **Si PowerShell bloquea el script:**
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   .\configurar-testsprite.ps1
   ```

5. **Reinicia Cursor completamente**

## Opción 2: Configuración Manual en settings.json

1. **Cierra Cursor completamente**

2. **Abre el archivo de configuración:**
   ```
   C:\Users\Rram\AppData\Roaming\Cursor\User\settings.json
   ```

3. **Agrega esta configuración:**
   ```json
   {
       "window.commandCenter": true,
       "workbench.colorTheme": "Cursor Dark Midnight",
       "mcp.servers": {
           "testsprite": {
               "apiKey": "sk-sk-user-6dYk2p72awAbDTfrbW_X4BfzQMbxZbfvTCJEluiu8PYpRO5699mucKeRGFiHegptZSgHNZ_z-3Dw7wF8Kmejq95gzaiFScqg9EUHLf465ce_KEIfPbVDMrA5G0Fq9g536LA"
           }
       }
   }
   ```

4. **Guarda el archivo**

5. **Reabre Cursor**

## Opción 3: Variable de Entorno (Si TestSprite lo soporta)

1. **Abre PowerShell como Administrador**

2. **Configura la variable de entorno:**
   ```powershell
   [System.Environment]::SetEnvironmentVariable('TESTSPRITE_API_KEY', 'sk-sk-user-6dYk2p72awAbDTfrbW_X4BfzQMbxZbfvTCJEluiu8PYpRO5699mucKeRGFiHegptZSgHNZ_z-3Dw7wF8Kmejq95gzaiFScqg9EUHLf465ce_KEIfPbVDMrA5G0Fq9g536LA', 'User')
   ```

3. **Reinicia Cursor**

## Opción 4: Usar Playwright en su lugar

Si TestSprite sigue dando problemas, ya tienes Playwright completamente configurado y funcionando:

```bash
npm run test:e2e:ui  # Interfaz gráfica
npm run test:e2e      # Ejecutar todos los tests
```

## Verificación

Después de cualquier método, reinicia Cursor y luego puedo intentar ejecutar TestSprite nuevamente para verificar que funciona.

## ¿Qué método prefieres probar?

1. Script de PowerShell (automático)
2. Edición manual de settings.json
3. Variable de entorno
4. Usar Playwright en su lugar






