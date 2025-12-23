// components/caja-ventas.tsx
"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Trash2, ShoppingCart, Plus, Minus, Loader2, ScanBarcode } from "lucide-react"
import { toast } from "sonner"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

// Tipos locales
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
  sucursalId: string 
}

export default function CajaVentas({ turnoId, empleadoNombre, sucursalId }: CajaVentasProps) {
  const [busqueda, setBusqueda] = useState("")
  const [productos, setProductos] = useState<Producto[]>([])
  const [carrito, setCarrito] = useState<ItemVenta[]>([])
  const [loading, setLoading] = useState(false)
  const [procesandoVenta, setProcesandoVenta] = useState(false)
  const [metodoPago, setMetodoPago] = useState<"efectivo" | "tarjeta" | "billetera_virtual">("efectivo")
  
  const inputRef = useRef<HTMLInputElement>(null)

  const buscarProductos = useCallback(async (query: string, autoAdd: boolean = false) => {
    if (!query) {
      setProductos([])
      return
    }

    setLoading(true)
    try {
      // 🎯 Consulta a la vista filtrando por sucursal actual
      const { data, error } = await supabase
        .from('view_productos_con_stock') 
        .select('*')
        .eq('sucursal_id', sucursalId) 
        .or(`nombre.ilike.%${query}%,codigo_barras.eq.${query}`)
        .not('nombre', 'in', '("Carga SUBE","Carga Virtual")') 
        .limit(5)

      if (error) throw error
      
      const resultados: Producto[] = (data || []).map((p: any) => ({
        id: p.id,
        nombre: p.nombre,
        precio: p.precio_venta,
        stock: p.stock_disponible, 
        codigo_barras: p.codigo_barras
      }))

      // Lógica de "Stock 0" para productos que no están en la vista de esa sucursal
      if (resultados.length === 0) {
          const { data: catalogo } = await supabase
            .from('productos')
            .select('*')
            .or(`nombre.ilike.%${query}%,codigo_barras.eq.${query}`)
            .limit(1)
          
          if (catalogo && catalogo.length > 0) {
              const prod = catalogo[0]
              resultados.push({
                  id: prod.id,
                  nombre: prod.nombre,
                  precio: prod.precio_venta,
                  stock: 0,
                  codigo_barras: prod.codigo_barras
              })
          }
      }

      setProductos(resultados)

      if (autoAdd && resultados.length > 0) {
        const matchExacto = resultados.find(p => p.codigo_barras === query)
        if (matchExacto) { agregarAlCarrito(matchExacto) } 
        else if (resultados.length === 1) { agregarAlCarrito(resultados[0]) }
      }

    } catch (error) {
      console.error("Error buscando:", error)
    } finally {
      setLoading(false)
    }
  }, [sucursalId])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (busqueda.length > 2) buscarProductos(busqueda, false) 
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
    setBusqueda("") 
    setProductos([])
    toast.success(`Agregado: ${producto.nombre}`, { position: 'bottom-center', duration: 1000 })
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
        e.preventDefault() 
        if (busqueda) { buscarProductos(busqueda, true) }
    }
  }

  const removerDelCarrito = (id: string) => { setCarrito(prev => prev.filter(p => p.id !== id)) }

  const cambiarCantidad = (id: string, delta: number) => {
    setCarrito(prev => prev.map(p => {
      if (p.id === id) {
        const nuevaCant = Math.max(1, p.cantidad + delta)
        return { ...p, cantidad: nuevaCant }
      }
      return p
    }))
  }

  const calcularTotal = () => carrito.reduce((total, item) => total + (item.precio * item.cantidad), 0)

  const procesarVenta = async () => {
    if (carrito.length === 0) return
    setProcesandoVenta(true)

    try {
      const total = calcularTotal()
      const { data: { user } } = await supabase.auth.getUser()
      const { data: perfil } = await supabase.from('perfiles').select('organization_id').eq('id', user?.id).single()
      
      if (!perfil?.organization_id) throw new Error("No se encontró organización")

      // ✅ REGISTRAR SALIDA (Sincronizado con SQL Maestro)
      const movimientosStock = carrito.map(item => ({
        organization_id: perfil.organization_id,
        sucursal_id: sucursalId, 
        caja_diaria_id: turnoId,
        producto_id: item.id,
        cantidad: item.cantidad,
        tipo_movimiento: 'salida',
        fecha_venta: new Date().toISOString(),
        metodo_pago: metodoPago,
        precio_venta_historico: item.precio, // 👈 CORREGIDO: Nombre de campo histórico
        estado: 'vendido'
      }))

      const { error: errorStock } = await supabase.from('stock').insert(movimientosStock)
      if (errorStock) throw errorStock

      if (metodoPago === 'efectivo') {
        // ✅ REGISTRAR EN CAJA (Sincronizado con SQL Maestro)
        const { error: errorCaja } = await supabase.from('movimientos_caja').insert({
          organization_id: perfil.organization_id,
          caja_diaria_id: turnoId,
          // empleado_id removido porque no está en el nuevo esquema minimalista de movimientos_caja
          tipo: 'ingreso',
          monto: total,
          descripcion: `Venta: ${carrito.length} items`
        })
        if (errorCaja) throw errorCaja
      }

      toast.success("Venta Exitosa", { description: `Total: $${total}` })
      setCarrito([])
      setBusqueda("")
      setTimeout(() => inputRef.current?.focus(), 100) 
      
    } catch (error: any) {
      console.error(error)
      toast.error("Error al procesar venta", { description: error.message })
    } finally {
      setProcesandoVenta(false)
    }
  }

  return (
    <Card className="flex flex-col h-full shadow-md border-0 bg-slate-50/50">
      <div className="p-4 border-b bg-white rounded-t-lg">
        <h3 className="font-bold flex items-center gap-2 text-lg">
          <ShoppingCart className="h-5 w-5 text-primary" />
          Carrito de Ventas
        </h3>
        <p className="text-[10px] text-muted-foreground mt-1 uppercase font-bold tracking-wider">
          Sucursal ID: {sucursalId.slice(0,8)}...
        </p>
      </div>

      <div className="p-4 space-y-4 flex-1">
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2 text-muted-foreground">
             <ScanBarcode className="h-4 w-4" />
          </div>
          <Input 
            ref={inputRef}
            autoFocus
            placeholder="Escanear producto o buscar..." 
            className="pl-10 bg-white font-medium border-primary/30 focus-visible:ring-primary h-12"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            onKeyDown={handleKeyDown} 
          />
          
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
                    <span className={cn("text-[10px] font-bold", p.stock <= 0 ? "text-red-500" : "text-emerald-600")}>
                        STK: {p.stock}
                    </span>
                    <Plus className="h-4 w-4 text-green-600" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2 min-h-[200px]">
          {carrito.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground border-2 border-dashed rounded-lg bg-slate-100/50">
              <ScanBarcode className="h-10 w-10 mb-2 opacity-50" />
              <p className="text-sm font-medium">Carrito Vacío</p>
              <p className="text-xs">Escanea o busca productos</p>
            </div>
          ) : (
            carrito.map(item => (
              <div key={item.id} className="flex items-center justify-between bg-white p-3 rounded-lg shadow-sm border animate-in fade-in slide-in-from-left-2 duration-300">
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
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => removerDelCarrito(item.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="p-4 bg-white border-t mt-auto rounded-b-lg space-y-4 shadow-inner">
        <div className="flex justify-between items-end">
          <span className="text-muted-foreground font-medium text-sm">Total</span>
          <span className="text-3xl font-black text-primary">${calcularTotal().toLocaleString()}</span>
        </div>

        <div className="grid grid-cols-3 gap-2">
            {(['efectivo', 'billetera_virtual', 'tarjeta'] as const).map((m) => (
                <button 
                    key={m}
                    onClick={() => setMetodoPago(m)}
                    className={cn("text-[10px] py-2 rounded border font-bold uppercase transition-all", 
                        metodoPago === m ? "bg-primary text-white border-primary" : "bg-white text-gray-500")}
                >
                    {m.replace('_', ' ')}
                </button>
            ))}
        </div>

        <Button 
          className="w-full h-14 text-lg font-black shadow-lg"
          onClick={procesarVenta}
          disabled={carrito.length === 0 || procesandoVenta}
        >
          {procesandoVenta ? <Loader2 className="animate-spin mr-2" /> : <ShoppingCart className="mr-2 h-5 w-5" />}
          CONFIRMAR VENTA
        </Button>
      </div>
    </Card>
  )
}