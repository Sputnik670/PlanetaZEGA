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
          created_at: string
          plan: string | null
        }
        Insert: {
          id?: string
          nombre: string
          created_at?: string
          plan?: string | null
        }
        Update: {
          id?: string
          nombre?: string
          created_at?: string
          plan?: string | null
        }
      }
      perfiles: {
        Row: {
          id: string
          organization_id: string | null
          rol: 'dueño' | 'empleado'
          nombre: string | null
          email: string | null // ✅ CORREGIDO: Campo agregado
          xp: number
          created_at: string
        }
        Insert: {
          id: string
          organization_id?: string | null
          rol?: 'dueño' | 'empleado'
          nombre?: string | null
          email?: string | null // ✅ CORREGIDO
          xp?: number
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string | null
          rol?: 'dueño' | 'empleado'
          nombre?: string | null
          email?: string | null // ✅ CORREGIDO
          xp?: number
          created_at?: string
        }
      }
      proveedores: {
        Row: {
          id: string
          organization_id: string
          nombre: string
          rubro: string | null
          contacto_nombre: string | null
          telefono: string | null
          email: string | null
          condicion_pago: string | null
          saldo_actual: number          // ✅ NUEVO
          saldo_minimo_alerta: number   // ✅ NUEVO
          created_at: string
        }
        Insert: {
          id?: string
          organization_id?: string
          nombre: string
          rubro?: string | null
          contacto_nombre?: string | null
          telefono?: string | null
          email?: string | null
          condicion_pago?: string | null
          saldo_actual?: number         // ✅ NUEVO
          saldo_minimo_alerta?: number  // ✅ NUEVO
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          nombre?: string
          rubro?: string | null
          contacto_nombre?: string | null
          telefono?: string | null
          email?: string | null
          condicion_pago?: string | null
          saldo_actual?: number         // ✅ NUEVO
          saldo_minimo_alerta?: number  // ✅ NUEVO
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
          organization_id?: string
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
          organization_id?: string
          empleado_id?: string | null
          fecha_apertura?: string
          fecha_cierre?: string | null
          monto_inicial?: number
          monto_final?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          empleado_id?: string | null
          fecha_apertura?: string
          fecha_cierre?: string | null
          monto_inicial?: number
          monto_final?: number | null
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
        }
        Insert: {
          id?: string
          organization_id?: string
          proveedor_id?: string | null
          monto_total: number
          estado_pago?: string | null
          medio_pago?: string | null
          comprobante_nro?: string | null
          fecha_compra?: string | null
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
        }
      }
      stock: {
        Row: {
          id: string
          organization_id: string
          producto_id: string | null
          proveedor_id: string | null
          compra_id: string | null
          caja_diaria_id: string | null
          fecha_ingreso: string | null
          fecha_vencimiento: string | null
          estado: string | null
          fecha_venta: string | null
          metodo_pago: 'efectivo' | 'tarjeta' | 'transferencia' | 'billetera_virtual' | 'otro' | null
          fecha_mermado: string | null
          costo_unitario_historico: number | null
          notas: string | null
        }
        Insert: {
          id?: string
          organization_id?: string
          producto_id?: string | null
          proveedor_id?: string | null
          compra_id?: string | null
          caja_diaria_id?: string | null
          fecha_ingreso?: string | null
          fecha_vencimiento?: string | null
          estado?: string | null
          fecha_venta?: string | null
          metodo_pago?: 'efectivo' | 'tarjeta' | 'transferencia' | 'billetera_virtual' | 'otro' | null
          fecha_mermado?: string | null
          costo_unitario_historico?: number | null
          notas?: string | null
        }
        Update: {
          id?: string
          organization_id?: string
          producto_id?: string | null
          proveedor_id?: string | null
          compra_id?: string | null
          caja_diaria_id?: string | null
          fecha_ingreso?: string | null
          fecha_vencimiento?: string | null
          estado?: string | null
          fecha_venta?: string | null
          metodo_pago?: 'efectivo' | 'tarjeta' | 'transferencia' | 'billetera_virtual' | 'otro' | null
          fecha_mermado?: string | null
          costo_unitario_historico?: number | null
          notas?: string | null
        }
      }
      movimientos_caja: {
        Row: {
          id: string
          organization_id: string
          caja_diaria_id: string
          empleado_id: string | null
          monto: number
          descripcion: string
          tipo: 'ingreso' | 'egreso'
          created_at: string
        }
        Insert: {
          id?: string
          organization_id?: string
          caja_diaria_id: string
          empleado_id?: string | null
          monto: number
          descripcion: string
          tipo?: 'ingreso' | 'egreso'
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          caja_diaria_id?: string
          empleado_id?: string | null
          monto?: number
          descripcion?: string
          tipo?: 'ingreso' | 'egreso'
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
          organization_id?: string
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
          organization_id?: string
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
          stock_disponible: number
        }
      }
    }
  }
}