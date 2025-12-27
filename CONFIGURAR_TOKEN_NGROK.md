# 🔑 Configurar Token de Autenticación de ngrok

## Pasos Rápidos

### Paso 1: Crear Cuenta (si no tienes una)
1. El navegador debería haberse abierto en: https://dashboard.ngrok.com/signup
2. Completa el registro (es gratis)
3. Verifica tu email si es necesario

### Paso 2: Obtener tu Token
1. Una vez registrado, ve a: https://dashboard.ngrok.com/get-started/your-authtoken
2. Copia el token que aparece (es una cadena larga de caracteres)

### Paso 3: Configurar el Token
Una vez que tengas el token, ejecuta este comando:

```powershell
cd C:\ngrok
.\ngrok.exe config add-authtoken TU_TOKEN_AQUI
```

Reemplaza `TU_TOKEN_AQUI` con el token que copiaste.

## Script Automático

O puedes decirme el token y yo lo configuro automáticamente.

## ⚠️ Importante

- El token es personal y no debe compartirse públicamente
- Una vez configurado, ngrok funcionará sin problemas
- Solo necesitas hacerlo una vez

## Después de Configurar

Una vez configurado el token, podremos:
1. Iniciar ngrok correctamente
2. Obtener la URL pública
3. Configurar TestSprite
4. Ejecutar las pruebas

¿Ya tienes el token? Si lo tienes, compártelo y lo configuro automáticamente.

