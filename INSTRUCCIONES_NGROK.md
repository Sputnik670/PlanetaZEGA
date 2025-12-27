# 📥 Instrucciones para Instalar ngrok

## Paso 1: Descargar ngrok

El navegador debería haberse abierto en la página de descarga de ngrok.

Si no se abrió, visita: https://ngrok.com/download

## Paso 2: Instalar ngrok

1. **Descarga el archivo ZIP** para Windows
2. **Extrae el contenido** del ZIP
3. **Copia `ngrok.exe`** a la carpeta: `C:\ngrok\`
   - Si la carpeta no existe, créala primero

## Paso 3: (Opcional pero Recomendado) Crear Cuenta

1. Visita: https://dashboard.ngrok.com/signup
2. Crea una cuenta gratuita
3. Obtén tu token de autenticación desde: https://dashboard.ngrok.com/get-started/your-authtoken
4. Configura el token ejecutando:
   ```bash
   cd C:\ngrok
   .\ngrok.exe config add-authtoken TU_TOKEN_AQUI
   ```

## Paso 4: Verificar Instalación

Una vez que hayas instalado ngrok, ejecuta:

```powershell
.\instalar-ngrok.ps1
```

Debería confirmar que ngrok está instalado.

## Paso 5: Iniciar ngrok de Forma Segura

Cuando esté instalado, ejecuta:

```powershell
.\iniciar-ngrok-seguro.ps1
```

Este script:
- ✅ Verifica que el servidor esté corriendo
- ✅ Te permite elegir autenticación (recomendado)
- ✅ Inicia ngrok y muestra la URL

## ⚠️ Importante

Después de instalar ngrok y extraerlo a `C:\ngrok\`, avísame y continuamos con la configuración para TestSprite.

