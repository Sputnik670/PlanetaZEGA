# 📱 Guía para Generar QR de Fichaje (iOS Compatible)

## 🎯 Problema con iOS

iOS Safari tiene restricciones más estrictas con la cámara y la descarga de archivos. Esta guía te ayudará a generar QR codes que funcionen perfectamente en iOS.

## ✅ Opción 1: Usar qr.io (Recomendado para iOS)

### Paso 1: Obtener el JSON del QR

1. Ve al panel de **"Mi Equipo"** en el dashboard del dueño
2. Selecciona la sucursal
3. Haz clic en **"Copiar"** para copiar el JSON del QR

El JSON se ve así:
```json
{"sucursal_id":"uuid-aqui","tipo":"entrada"}
```

### Paso 2: Generar QR en qr.io

1. Ve a [https://qr.io/es/](https://qr.io/es/)
2. Selecciona **"Texto"** como tipo de QR
3. Pega el JSON completo en el campo de texto
4. Personaliza el QR (colores, logo, etc.)
5. Haz clic en **"Generar código QR"**
6. Descarga el QR (funciona perfectamente en iOS)

### Paso 3: Imprimir y Colocar

1. Imprime el QR descargado
2. Colócalo en el local en un lugar visible
3. Etiqueta claramente si es "ENTRADA" o "SALIDA"

## ✅ Opción 2: Usar la App (Funciona en Android y Desktop)

Si estás en Android o Desktop, puedes usar directamente la función de descarga en la app:

1. Ve a **"Mi Equipo"** → **"Generar QR de Fichaje"**
2. Selecciona la sucursal
3. Elige "Entrada" o "Salida"
4. Haz clic en **"Descargar"**

## 🔧 Solución de Problemas iOS

### Problema: El scanner no funciona en iOS

**Causas posibles:**
- La app no está en HTTPS
- Permisos de cámara no otorgados
- Safari bloquea el acceso a la cámara

**Soluciones:**
1. Asegúrate de que la app esté en HTTPS (Vercel lo hace automáticamente)
2. Ve a Configuración → Safari → Cámara → Permitir
3. Intenta usar Chrome o Firefox en iOS

### Problema: No puedo descargar el QR en iOS

**Solución:**
- Usa qr.io para generar el QR (Opción 1)
- O copia el JSON y úsalo en cualquier generador de QR online

## 📋 Formato del QR

El QR debe contener un JSON con este formato exacto:

```json
{
  "sucursal_id": "uuid-de-la-sucursal",
  "tipo": "entrada"
}
```

O para salida:
```json
{
  "sucursal_id": "uuid-de-la-sucursal",
  "tipo": "salida"
}
```

## 🎨 Personalización en qr.io

Puedes personalizar tus QR en qr.io:
- **Colores**: Elige colores que coincidan con tu marca
- **Logo**: Agrega el logo de tu negocio
- **Forma**: Redondo, cuadrado, etc.
- **Tamaño**: Ajusta el tamaño para impresión

## 📱 Probar el QR

1. Genera el QR usando qr.io
2. Abre la app en tu iPhone
3. Ve a la pantalla de fichaje
4. Escanea el QR
5. Debería funcionar correctamente

## ⚠️ Importante

- **Cada sucursal necesita 2 QR**: Uno para entrada y otro para salida
- **No compartas QR entre sucursales**: Cada QR es único para cada sucursal
- **Mantén los QR seguros**: No los compartas públicamente
- **Actualiza si cambias de sucursal**: Si una sucursal se elimina, genera nuevos QR

## 🆘 Soporte

Si tienes problemas:
1. Verifica que el JSON esté correcto
2. Asegúrate de usar HTTPS
3. Prueba en otro navegador
4. Verifica los permisos de cámara en iOS

