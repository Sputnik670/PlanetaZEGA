# 🚀 Usar ngrok con TestSprite - Guía Completa

## 📋 Resumen de Seguridad

**ngrok es seguro si:**
- ✅ Solo lo usas durante las pruebas
- ✅ Lo cierras inmediatamente después
- ✅ Usas autenticación (recomendado)
- ✅ No expones datos de producción

**NO es seguro si:**
- ❌ Lo dejas corriendo 24/7
- ❌ Expones datos sensibles sin protección
- ❌ Lo usas en producción

## 🔧 Instalación Rápida

### Paso 1: Descargar ngrok
1. Visita: https://ngrok.com/download
2. Descarga la versión Windows
3. Extrae `ngrok.exe` a `C:\ngrok\`

### Paso 2: (Opcional) Crear cuenta
1. Regístrate en: https://dashboard.ngrok.com/signup
2. Obtén tu token de: https://dashboard.ngrok.com/get-started/your-authtoken
3. Configura: `ngrok config add-authtoken TU_TOKEN`

## 🎯 Uso con TestSprite

### Método 1: Script Automático (Recomendado)

```powershell
# Inicia ngrok de forma segura
.\iniciar-ngrok-seguro.ps1
```

El script:
- ✅ Verifica que el servidor esté corriendo
- ✅ Te permite elegir autenticación
- ✅ Inicia ngrok automáticamente

### Método 2: Manual

1. **Inicia ngrok:**
   ```bash
   cd C:\ngrok
   .\ngrok.exe http 3000
   ```

2. **Copia la URL que ngrok genera:**
   ```
   Forwarding: https://abc123.ngrok.io -> http://localhost:3000
   ```

3. **Actualiza TestSprite:**
   - Necesitamos actualizar la configuración para usar la URL de ngrok
   - O usar el bootstrap de TestSprite con la nueva URL

4. **Ejecuta TestSprite:**
   ```bash
   # TestSprite debería poder acceder ahora
   ```

5. **Cierra ngrok:**
   - Presiona `Ctrl+C` en la terminal de ngrok
   - Esto cierra el túnel inmediatamente

## 🔒 Configuración Segura Recomendada

### Con Autenticación (Más Seguro)

```bash
ngrok http --auth="test:password123" 3000
```

Esto requiere usuario/contraseña antes de acceder.

### Ver Estadísticas (Con Cuenta)

Si tienes cuenta, puedes ver:
- Quién accede: http://localhost:4040
- Estadísticas de uso
- Logs de acceso

## ⚠️ Checklist de Seguridad

Antes de iniciar ngrok:
- [ ] El servidor local NO tiene datos de producción
- [ ] Tienes autenticación configurada (recomendado)
- [ ] Sabes cómo cerrar ngrok (Ctrl+C)

Durante el uso:
- [ ] Solo lo usas para pruebas
- [ ] No compartes la URL públicamente
- [ ] Monitoreas los accesos (si tienes cuenta)

Después de usar:
- [ ] Cierras ngrok inmediatamente (Ctrl+C)
- [ ] Verificas que el túnel esté cerrado
- [ ] No guardas la URL en código

## 🛠️ Solución de Problemas

### ngrok no inicia
- Verifica que esté en `C:\ngrok\ngrok.exe`
- O agrega ngrok al PATH del sistema

### No puedo acceder
- Verifica que el servidor local esté corriendo
- Verifica que ngrok esté corriendo
- Revisa la URL en la consola de ngrok

### TestSprite sigue sin conectar
- Verifica que la URL de ngrok sea correcta
- Asegúrate de usar `https://` no `http://`
- Verifica que ngrok esté activo (debería mostrar "Online")

## 📝 Próximos Pasos

1. **Instala ngrok** siguiendo los pasos arriba
2. **Inicia ngrok** con el script o manualmente
3. **Copia la URL** que ngrok genera
4. **Actualiza TestSprite** para usar esa URL
5. **Ejecuta las pruebas**
6. **Cierra ngrok** cuando termines

¿Listo para empezar? Ejecuta:
```powershell
.\iniciar-ngrok-seguro.ps1
```

