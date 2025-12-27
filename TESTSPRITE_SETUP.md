# 🧪 Configuración de TestSprite para Kiosco 24hs

## Requisitos Previos

1. **Servidor de desarrollo corriendo**
   ```bash
   npm run dev
   ```
   El servidor debe estar en `http://localhost:3001`

2. **Variables de entorno configuradas**
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Opcionalmente: Credenciales de usuario de prueba

## Estado Actual

✅ Resumen del código generado en `testsprite_tests/tmp/code_summary.json`
✅ PRD creado en `testsprite_tests/tmp/prd_files/PRD.md`

## Próximos Pasos

1. Asegurar que el servidor de desarrollo esté corriendo en puerto 3001
2. Generar plan de pruebas con TestSprite
3. Ejecutar los tests generados

## Información del Proyecto

- **Tipo**: Frontend (Next.js)
- **Puerto**: 3001
- **URL Base**: http://localhost:3001
- **Requiere Login**: Sí (Supabase Auth)
- **Alcance**: Todo el código base (codebase)

## Funcionalidades a Testear

### Prioridad Alta
- ✅ Autenticación (Login, Registro, Invitaciones)
- ✅ Gestión de Productos (CRUD)
- ✅ Sistema de Ventas (POS)
- ✅ Gestión de Stock

### Prioridad Media
- ✅ Gestión de Caja (Apertura, Cierre, Arqueo)
- ✅ Gestión de Proveedores
- ✅ Gestión de Sucursales

### Prioridad Baja
- ✅ Sistema de Misiones
- ✅ Happy Hour
- ✅ Control de Asistencia

