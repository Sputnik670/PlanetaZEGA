# PRD - Kiosco 24hs

## Descripción del Proyecto

Kiosco 24hs es un sistema completo de gestión de kioscos que incluye funcionalidades de venta, inventario, gestión de empleados, control de caja y reportes. El sistema está construido con Next.js 16, TypeScript, y utiliza Supabase como backend (PostgreSQL + Auth).

## Características Principales

### 1. Autenticación y Gestión de Usuarios
- Sistema de autenticación con Supabase Auth
- Roles: Dueño y Empleado
- Registro de dueños con creación automática de organización
- Sistema de invitaciones para empleados mediante Magic Links
- Perfiles de usuario con información de organización y sucursal

### 2. Gestión de Productos
- CRUD completo de productos
- Códigos de barras para identificación
- Categorización de productos
- Precios de venta y costos
- Control de stock mínimo

### 3. Gestión de Inventario
- Entradas y salidas de stock
- Control de vencimientos
- Alertas de stock crítico
- Historial de movimientos de stock

### 4. Sistema de Ventas
- Punto de venta (POS) completo
- Escáner de código de barras
- Múltiples métodos de pago
- Generación de tickets PDF
- Actualización automática de stock

### 5. Gestión de Caja
- Apertura y cierre de caja diaria
- Arqueo de caja con cálculo de diferencias
- Registro de movimientos de dinero (ingresos/egresos)
- Historial de cajas

### 6. Gestión de Proveedores
- CRUD de proveedores
- Control de saldos
- Registro de compras
- Historial de transacciones

### 7. Gestión de Sucursales
- Múltiples sucursales por organización
- Selección de sucursal al iniciar sesión
- Stock por sucursal

### 8. Sistema de Misiones (Gamificación)
- Asignación de misiones a empleados
- Sistema de XP y puntos
- Ranking de empleados
- Diferentes tipos de misiones (vencimiento, arqueo, manual)

### 9. Servicios Adicionales
- Venta de servicios
- Recarga de tarjetas SUBE
- Happy Hour (descuentos automáticos para stock crítico)

### 10. Control de Asistencia
- Fichaje de entrada/salida
- Control de horarios de empleados

## Tecnologías

- Frontend: Next.js 16, React 19, TypeScript, Tailwind CSS
- Backend: Supabase (PostgreSQL + Auth)
- UI: Radix UI Components
- Formularios: react-hook-form + zod
- Deploy: Vercel

## Requisitos de Testing

- Tests E2E para flujos críticos
- Tests de autenticación (login, registro, invitaciones)
- Tests de funcionalidades de negocio (ventas, stock, caja)
- Tests de UI/UX
- Validación de RLS (Row Level Security) de Supabase

