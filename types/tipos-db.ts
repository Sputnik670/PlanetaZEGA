export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          nombre: string
          plan: string | null
          created_at: string
        }
        Insert: {
          id?: string
          nombre: string
          plan?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          nombre?: string
          plan?: string | null
          created_at?: string
        }
      }
      perfiles: {
        Row: {
          id: string
          organization_id: string | null
          rol: 'dueño' | 'empleado'
          nombre: string | null
          email: string | null
          xp: number
          created_at: string
        }
        Insert: {
          id: string
          organization_id?: string | null
          rol: 'dueño' | 'empleado'
          nombre?: string | null
          email?: string | null
          xp?: number
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string | null
          rol?: 'dueño' | 'empleado'
          nombre?: string | null
          email?: string | null
          xp?: number
          created_at?: string
        }
      }
      sucursales: {
        Row: {
          id: string
          organization_id: string
          nombre: string
          direccion: string | null
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          nombre: string
          direccion?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          nombre?: string
          direccion?: string | null
          created_at?: string
        }
      }
      productos: {
        Row: {
          id: string
          organization_id: string
          nombre: string
          emoji: string | null
          categoria: string | null
          codigo_barras: string | null
          precio_venta: number
          costo: number
          stock_minimo: number
          vida_util_dias: number
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          nombre: string
          emoji?: string | null
          categoria?: string | null
          codigo_barras?: string | null
          precio_venta?: number
          costo?: number
          stock_minimo?: number
          vida_util_dias?: number
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          nombre?: string
          emoji?: string | null
          categoria?: string | null
          codigo_barras?: string | null
          precio_venta?: number
          costo?: number
          stock_minimo?: number
          vida_util_dias?: number
          created_at?: string
        }
      }
      caja_diaria: {
        Row: {
          id: string
          organization_id: string
          sucursal_id: string
          empleado_id: string | null
          fecha_apertura: string
          fecha_cierre: string | null
          monto_inicial: number
          monto_final: number | null
          diferencia: number | null
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          sucursal_id: string
          empleado_id?: string | null
          fecha_apertura?: string
          fecha_cierre?: string | null
          monto_inicial?: number
          monto_final?: number | null
          diferencia?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          sucursal_id?: string
          empleado_id?: string | null
          fecha_apertura?: string
          fecha_cierre?: string | null
          monto_inicial?: number
          monto_final?: number | null
          diferencia?: number | null
          created_at?: string
        }
      }
      compras: {
        Row: {
          id: string
          organization_id: string
          proveedor_id: string | null
          monto_total: number
          estado_pago: string | null
          medio_pago: string | null
          comprobante_nro: string | null
          fecha_compra: string | null
          vencimiento_pago: string | null
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          proveedor_id?: string | null
          monto_total: number
          estado_pago?: string | null
          medio_pago?: string | null
          comprobante_nro?: string | null
          fecha_compra?: string | null
          vencimiento_pago?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          proveedor_id?: string | null
          monto_total?: number
          estado_pago?: string | null
          medio_pago?: string | null
          comprobante_nro?: string | null
          fecha_compra?: string | null
          vencimiento_pago?: string | null
          created_at?: string
        }
      }
      stock: {
        Row: {
          id: string
          organization_id: string
          sucursal_id: string
          producto_id: string
          caja_diaria_id: string | null
          proveedor_id: string | null
          compra_id: string | null
          cantidad: number
          tipo_movimiento: 'entrada' | 'salida'
          metodo_pago: string | null
          precio_venta_historico: number | null
          costo_unitario_historico: number | null
          fecha_vencimiento: string | null
          estado: string | null
          fecha_venta: string | null
          fecha_ingreso: string
          notas: string | null
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          sucursal_id: string
          producto_id: string
          caja_diaria_id?: string | null
          proveedor_id?: string | null
          compra_id?: string | null
          cantidad: number
          tipo_movimiento: 'entrada' | 'salida'
          metodo_pago?: string | null
          precio_venta_historico?: number | null
          costo_unitario_historico?: number | null
          fecha_vencimiento?: string | null
          estado?: string | null
          fecha_venta?: string | null
          fecha_ingreso?: string
          notas?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          sucursal_id?: string
          producto_id?: string
          caja_diaria_id?: string | null
          proveedor_id?: string | null
          compra_id?: string | null
          cantidad?: number
          tipo_movimiento?: 'entrada' | 'salida'
          metodo_pago?: string | null
          precio_venta_historico?: number | null
          costo_unitario_historico?: number | null
          fecha_vencimiento?: string | null
          estado?: string | null
          fecha_venta?: string | null
          fecha_ingreso?: string
          notas?: string | null
          created_at?: string
        }
      }
      movimientos_caja: {
        Row: {
          id: string
          organization_id: string
          caja_diaria_id: string
          monto: number
          tipo: 'ingreso' | 'egreso'
          descripcion: string
          categoria: string | null
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          caja_diaria_id: string
          monto: number
          tipo: 'ingreso' | 'egreso'
          descripcion: string
          categoria?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          caja_diaria_id?: string
          monto?: number
          tipo?: 'ingreso' | 'egreso'
          descripcion?: string
          categoria?: string | null
          created_at?: string
        }
      }
      proveedores: {
        Row: {
          id: string
          organization_id: string
          sucursal_id: string | null // ✅ NUEVO: Permite global (null) o local
          nombre: string
          rubro: string | null
          contacto_nombre: string | null
          telefono: string | null
          email: string | null
          condicion_pago: string | null
          saldo_actual: number
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          sucursal_id?: string | null // ✅ NUEVO
          nombre: string
          rubro?: string | null
          contacto_nombre?: string | null
          telefono?: string | null
          email?: string | null
          condicion_pago?: string | null
          saldo_actual?: number
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          sucursal_id?: string | null // ✅ NUEVO
          nombre?: string
          rubro?: string | null
          contacto_nombre?: string | null
          telefono?: string | null
          email?: string | null
          condicion_pago?: string | null
          saldo_actual?: number
          created_at?: string
        }
      }
      misiones: {
        Row: {
          id: string
          organization_id: string
          empleado_id: string
          caja_diaria_id: string | null
          tipo: 'vencimiento' | 'arqueo_cierre' | 'manual'
          descripcion: string | null
          objetivo_unidades: number
          unidades_completadas: number
          es_completada: boolean
          puntos: number
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          empleado_id: string
          caja_diaria_id?: string | null
          tipo: 'vencimiento' | 'arqueo_cierre' | 'manual'
          descripcion?: string | null
          objetivo_unidades?: number
          unidades_completadas?: number
          es_completada?: boolean
          puntos?: number
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          empleado_id?: string
          caja_diaria_id?: string | null
          tipo?: 'vencimiento' | 'arqueo_cierre' | 'manual'
          descripcion?: string | null
          objetivo_unidades?: number
          unidades_completadas?: number
          es_completada?: boolean
          puntos?: number
          created_at?: string
        }
      }
      plantillas_misiones: {
        Row: {
          id: string
          organization_id: string
          sucursal_id: string | null // ✅ NUEVO: Para rutinas por local
          descripcion: string
          puntos: number
          activa: boolean
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          sucursal_id?: string | null
          descripcion: string
          puntos?: number
          activa?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          sucursal_id?: string | null
          descripcion?: string
          puntos?: number
          activa?: boolean
          created_at?: string
        }
      }
      historial_precios: {
        Row: {
          id: string
          organization_id: string
          producto_id: string | null
          empleado_id: string | null
          precio_venta_anterior: number | null
          precio_venta_nuevo: number | null
          costo_anterior: number | null
          costo_nuevo: number | null
          fecha_cambio: string
        }
        Insert: {
          id?: string
          organization_id: string
          producto_id?: string | null
          empleado_id?: string | null
          precio_venta_anterior?: number | null
          precio_venta_nuevo?: number | null
          costo_anterior?: number | null
          costo_nuevo?: number | null
          fecha_cambio?: string
        }
        Update: {
          id?: string
          organization_id?: string
          producto_id?: string | null
          empleado_id?: string | null
          precio_venta_anterior?: number | null
          precio_venta_nuevo?: number | null
          costo_anterior?: number | null
          costo_nuevo?: number | null
          fecha_cambio?: string
        }
      }
      asistencia: {
        Row: {
          id: string
          organization_id: string
          sucursal_id: string
          empleado_id: string
          entrada: string
          salida: string | null
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          sucursal_id: string
          empleado_id: string
          entrada?: string
          salida?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          sucursal_id?: string
          empleado_id?: string
          entrada?: string
          salida?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      view_productos_con_stock: {
        Row: {
          id: string
          organization_id: string
          nombre: string
          emoji: string | null
          categoria: string | null
          codigo_barras: string | null
          precio_venta: number
          costo: number
          stock_minimo: number
          sucursal_id: string | null
          stock_disponible: number
        }
      }
    }
  }
}