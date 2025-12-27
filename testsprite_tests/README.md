# TestSprite Configuration

## API Key Setup

La API key de TestSprite debe estar configurada como variable de entorno.

### Opción 1: Archivo .env.local (ya configurado)
```
TESTSPRITE_API_KEY=tu_api_key_aqui
```

### Opción 2: Variable de entorno del sistema
En Windows PowerShell:
```powershell
$env:TESTSPRITE_API_KEY = "tu_api_key_aqui"
```

En Windows CMD:
```cmd
set TESTSPRITE_API_KEY=tu_api_key_aqui
```

### Opción 3: Para el servidor MCP
El servidor MCP de TestSprite puede requerir que la variable esté configurada antes de iniciar el servidor.

## Verificación

Para verificar que la API key está configurada:
```powershell
echo $env:TESTSPRITE_API_KEY
```

## Notas

- La API key actual es una clave de prueba
- El archivo .env.local está en .gitignore y es seguro
- Para producción, usa variables de entorno del sistema o un gestor de secretos







