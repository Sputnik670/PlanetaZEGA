"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Trash2, ShoppingCart, Plus, Minus, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

// Tipos
interface Producto {
  id: string
  nombre: string
  precio: number
  stock: number
  codigo_barras?: string
}

interface ItemVenta extends Producto {
  cantidad: number
}

interface CajaVentasProps {
  turnoId: string
  empleadoNombre: string
}

export default function CajaVentas({ turnoId, empleadoNombre }: CajaVentasProps) {
  const [busqueda, setBusqueda] = useState("")
  const [productos, setProductos] = useState<Producto[]>([])
  const [carrito, setCarrito] = useState<ItemVenta[]>([])
  const [loading, setLoading] = useState(false)
  const [procesandoVenta, setProcesandoVenta] = useState(false)
  const [metodoPago, setMetodoPago] = useState<"efectivo" | "tarjeta" | "billetera_virtual">("efectivo")

  // Buscar productos (excluyendo los servicios como SUBE/Cargas que ya tienen widgets)
  const buscarProductos = useCallback(async (query: string) => {
    if (!query) {
      setProductos([])
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('productos')
        .select('*')
        .ilike('nombre', `%${query}%`)
        .not('nombre', 'in', '("Carga SUBE","Carga Virtual")') 
        .limit(5)

      if (error) throw error
      setProductos(data || [])
    } catch (error) {
      console.error("Error buscando:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  // Debounce búsqueda
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      buscarProductos(busqueda)
    }, 300)
    return () => clearTimeout(timeoutId)
  }, [busqueda, buscarProductos])

  const agregarAlCarrito = (producto: Producto) => {
    setCarrito(prev => {
      const existe = prev.find(p => p.id === producto.id)
      if (existe) {
        return prev.map(p => p.id === producto.id ? { ...p, cantidad: p.cantidad + 1 } : p)
      }
      return [...prev, { ...producto, cantidad: 1 }]
    })
    setBusqueda("") // Limpiar búsqueda al agregar
    setProductos([])
  }

  const removerDelCarrito = (id: string) => {
    setCarrito(prev => prev.filter(p => p.id !== id))
  }

  const cambiarCantidad = (id: string, delta: number) => {
    setCarrito(prev => prev.map(p => {
      if (p.id === id) {
        const nuevaCant = Math.max(1, p.cantidad + delta)
        return { ...p, cantidad: nuevaCant }
      }
      return p
    }))
  }

  const calcularTotal = () => {
    return carrito.reduce((total, item) => total + (item.precio * item.cantidad), 0)
  }

  const procesarVenta = async () => {
    if (carrito.length === 0) return
    setProcesandoVenta(true)

    try {
      const total = calcularTotal()
      const fechaArgentina = new Date()
      fechaArgentina.setHours(fechaArgentina.getHours() - 3)

      const { data: { user } } = await supabase.auth.getUser()
      
      const { data: turnoData } = await supabase
        .from('caja_diaria')
        .select('organization_id')
        .eq('id', turnoId)
        .single()
        
      if (!turnoData) throw new Error("Error de turno")

      // 1. Registrar movimientos en Stock
      const movimientosStock = carrito.map(item => ({
        organization_id: turnoData.organization_id,
        caja_diaria_id: turnoId,
        producto_id: item.id,
        estado: 'vendido',
        cantidad: item.cantidad,
        fecha_venta: fechaArgentina.toISOString(),
        metodo_pago: metodoPago,
        precio_venta: item.precio, 
        costo_unitario_historico: 0 
      }))

      const { error: errorStock } = await supabase.from('stock').insert(movimientosStock)
      if (errorStock) throw errorStock

      // 2. Registrar Ingreso en Caja (Solo si es efectivo)
      if (metodoPago === 'efectivo') {
        const { error: errorCaja } = await supabase.from('movimientos_caja').insert({
          organization_id: turnoData.organization_id,
          caja_diaria_id: turnoId,
          empleado_id: user?.id,
          tipo: 'ingreso',
          monto: total,
          descripcion: `Venta Productos (x${carrito.length} items)`
        })
        if (errorCaja) throw errorCaja
      }

      toast.success("Venta Exitosa", { description: `Total: $${total}` })
      setCarrito([])
      setBusqueda("")
      
    } catch (error: any) {
      console.error(error)
      toast.error("Error al procesar venta", { description: error.message })
    } finally {
      setProcesandoVenta(false)
    }
  }

  return (
    <Card className="flex flex-col h-full shadow-md border-0 bg-slate-50/50">
      {/* Header del Carrito */}
      <div className="p-4 border-b bg-white rounded-t-lg">
        <h3 className="font-bold flex items-center gap-2 text-lg">
          <ShoppingCart className="h-5 w-5 text-primary" />
          Carrito de Ventas
        </h3>
      </div>

      <div className="p-4 space-y-4 flex-1">
        {/* Buscador */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar golosinas, bebidas..." 
            className="pl-9 bg-white"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          
          {/* Resultados Búsqueda (Dropdown) */}
          {productos.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-md shadow-xl border z-50 overflow-hidden">
              {productos.map(p => (
                <button
                  key={p.id}
                  onClick={() => agregarAlCarrito(p)}
                  className="w-full text-left px-4 py-3 hover:bg-slate-50 flex justify-between items-center border-b last:border-0"
                >
                  <span className="font-medium text-sm">{p.nombre}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">${p.precio}</Badge>
                    <Plus className="h-4 w-4 text-green-600" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Lista del Carrito */}
        <div className="space-y-2 min-h-[200px]">
          {carrito.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground border-2 border-dashed rounded-lg bg-slate-100/50">
              <ShoppingCart className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">Listo para vender</p>
            </div>
          ) : (
            carrito.map(item => (
              <div key={item.id} className="flex items-center justify-between bg-white p-3 rounded-lg shadow-sm border">
                <div className="flex-1">
                  <p className="font-bold text-sm line-clamp-1">{item.nombre}</p>
                  <p className="text-xs text-muted-foreground">${item.precio} u.</p>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 bg-slate-100 rounded-md p-0.5">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => cambiarCantidad(item.id, -1)}>
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-6 text-center text-sm font-bold">{item.cantidad}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => cambiarCantidad(item.id, 1)}>
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="text-right min-w-[60px]">
                    <p className="font-bold text-sm">${item.precio * item.cantidad}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => removerDelCarrito(item.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Footer Total y Pago */}
      <div className="p-4 bg-white border-t mt-auto rounded-b-lg space-y-4 shadow-inner">
        <div className="flex justify-between items-end">
          <span className="text-muted-foreground font-medium">Total a Cobrar</span>
          <span className="text-3xl font-black text-primary">${calcularTotal().toLocaleString()}</span>
        </div>

        <div className="grid grid-cols-3 gap-2">
            <button 
                onClick={() => setMetodoPago('efectivo')}
                className={cn("text-xs py-2 rounded border font-bold transition-all", metodoPago === 'efectivo' ? "bg-green-100 border-green-500 text-green-800" : "bg-white text-gray-500")}
            >Efectivo</button>
            <button 
                onClick={() => setMetodoPago('billetera_virtual')}
                className={cn("text-xs py-2 rounded border font-bold transition-all", metodoPago === 'billetera_virtual' ? "bg-blue-100 border-blue-500 text-blue-800" : "bg-white text-gray-500")}
            >Digital</button>
             <button 
                onClick={() => setMetodoPago('tarjeta')}
                className={cn("text-xs py-2 rounded border font-bold transition-all", metodoPago === 'tarjeta' ? "bg-purple-100 border-purple-500 text-purple-800" : "bg-white text-gray-500")}
            >Tarjeta</button>
        </div>

        <Button 
          className="w-full h-12 text-lg font-bold shadow-lg bg-gradient-to-r from-primary to-primary/90"
          onClick={procesarVenta}
          disabled={carrito.length === 0 || procesandoVenta}
        >
          {procesandoVenta ? <Loader2 className="animate-spin mr-2" /> : <ShoppingCart className="mr-2 h-5 w-5" />}
          COBRAR
        </Button>
      </div>
    </Card>
  )
}