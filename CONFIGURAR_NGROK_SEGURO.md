# 🔒 Configuración Segura de ngrok para TestSprite

## ✅ ¿Es Seguro ngrok?

**Sí, ngrok es seguro cuando se usa correctamente:**

1. **URLs temporales** - Las URLs cambian cada vez que inicias ngrok (a menos que uses un plan pago)
2. **Solo mientras está activo** - El túnel solo funciona mientras ngrok está corriendo
3. **Control total** - Puedes cerrarlo en cualquier momento
4. **Autenticación opcional** - Puedes proteger el acceso con usuario/contraseña

## 📋 Pasos para Instalación Segura

### Paso 1: Descargar ngrok

1. Visita: https://ngrok.com/download
2. Descarga la versión para Windows
3. Extrae el archivo `ngrok.exe` a una carpeta (por ejemplo: `C:\ngrok\`)

### Paso 2: Configurar ngrok (Opcional pero Recomendado)

1. **Crea una cuenta gratuita** en https://dashboard.ngrok.com/signup
   - Esto te da un token de autenticación
   - Permite ver estadísticas de uso
   - Más seguro que usar ngrok sin autenticación

2. **Obtén tu token de autenticación:**
   - Ve a: https://dashboard.ngrok.com/get-started/your-authtoken
   - Copia el token

3. **Configura el token:**
   ```bash
   ngrok config add-authtoken TU_TOKEN_AQUI
   ```

### Paso 3: Usar ngrok de Forma Segura

#### Opción A: Básico (Solo para Testing)
```bash
ngrok http 3000
```

#### Opción B: Con Autenticación (Más Seguro)
```bash
ngrok http --auth="usuario:contraseña" 3000
```

#### Opción C: Con Dominio Fijo (Requiere Plan Pago)
Si tienes plan pago, puedes usar un dominio fijo:
```bash
ngrok http --domain=tu-dominio.ngrok.io 3000
```

## 🛡️ Medidas de Seguridad Recomendadas

### 1. Usar Solo para Testing
- ✅ Úsalo solo cuando necesites ejecutar pruebas con TestSprite
- ✅ Cierra ngrok inmediatamente después de las pruebas
- ❌ NO lo dejes corriendo indefinidamente

### 2. Proteger con Autenticación
```bash
ngrok http --auth="test:password123" 3000
```
Esto requiere usuario/contraseña antes de acceder.

### 3. Monitorear Accesos
Si tienes cuenta de ngrok, puedes ver:
- Quién accede a tu túnel
- Qué URLs se están usando
- Estadísticas de tráfico

### 4. Usar Variables de Entorno
No hardcodees credenciales en scripts. Usa variables de entorno.

### 5. Cerrar Después de Usar
Siempre cierra ngrok con `Ctrl+C` cuando termines.

## ⚠️ Advertencias Importantes

1. **NO uses ngrok en producción** - Es solo para desarrollo/testing
2. **NO expongas datos sensibles** - Asegúrate de que tu app local no tenga datos reales de producción
3. **Cierra ngrok cuando no lo uses** - No lo dejes corriendo 24/7
4. **Usa autenticación** - Especialmente si tu app tiene datos sensibles

## 🚀 Uso con TestSprite

Una vez que ngrok esté corriendo:

1. ngrok te dará una URL como: `https://abc123.ngrok.io`
2. Actualiza la configuración de TestSprite para usar esta URL en lugar de `localhost:3000`
3. Ejecuta las pruebas de TestSprite
4. Cierra ngrok cuando termines

## 📝 Script de Inicio Seguro

Puedo crear un script que:
- Inicia ngrok con autenticación
- Espera a que esté listo
- Muestra la URL
- Te permite ejecutar TestSprite
- Cierra ngrok automáticamente después

¿Quieres que cree este script?

