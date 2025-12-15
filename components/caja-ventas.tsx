"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, ShoppingCart, Loader2, Minus, Plus, RefreshCcw } from "lucide-react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"

export default function CajaVentas() {
  const [busqueda, setBusqueda] = useState("")
  const [productos, setProductos] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  
  // Estado para el modal de venta
  const [productoSeleccionado, setProductoSeleccionado] = useState<any | null>(null)
  const [cantidadVenta, setCantidadVenta] = useState(1)
  const [procesandoVenta, setProcesandoVenta] = useState(false)

  // Buscar productos mientras escribes
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (busqueda.length > 0) {
        buscarProductos()
      } else {
        setProductos([])
      }
    }, 500)

    return () => clearTimeout(delayDebounceFn)
  }, [busqueda])

  const buscarProductos = async () => {
    setLoading(true)
    try {
      // 1. Buscamos productos que coincidan con el nombre
      const { data: prods, error } = await supabase
        .from('productos')
        .select('*, stock(count)') // Pedimos el conteo de stock
        .ilike('nombre', `%${busqueda}%`)
        .eq('stock.estado', 'pendiente') // Solo contamos lo pendiente
        // Nota: El conteo exacto a veces requiere configuración extra en Supabase, 
        // pero para empezar esto nos dará una idea o devolverá el array.
      
      if (error) throw error

      // Procesamos para tener el stock numérico real
      const productosConStock = await Promise.all(prods.map(async (p) => {
        const { count } = await supabase
          .from('stock')
          .select('*', { count: 'exact', head: true })
          .eq('producto_id', p.id)
          .eq('estado', 'pendiente')
        
        return { ...p, stock_disponible: count || 0 }
      }))

      setProductos(productosConStock)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const abrirModalVenta = (producto: any) => {
    setProductoSeleccionado(producto)
    setCantidadVenta(1)
  }

  const confirmarVenta = async () => {
    if (!productoSeleccionado) return
    setProcesandoVenta(true)

    try {
      // 1. Lógica FIFO: Buscar los IDs de los items más viejos disponibles
      const { data: stockItems, error: searchError } = await supabase
        .from('stock')
        .select('id')
        .eq('producto_id', productoSeleccionado.id)
        .eq('estado', 'pendiente')
        .order('fecha_vencimiento', { ascending: true }) // <--- CLAVE: Vender lo más viejo primero
        .limit(cantidadVenta)

      if (searchError) throw searchError

      if (!stockItems || stockItems.length < cantidadVenta) {
        toast.error("Stock insuficiente", { 
          description: `Solo hay ${stockItems?.length || 0} unidades disponibles.` 
        })
        setProcesandoVenta(false)
        return
      }

      // 2. Extraer los IDs a actualizar
      const idsAVender = stockItems.map(item => item.id)

      // 3. Actualizar estado a 'vendido'
      const { error: updateError } = await supabase
        .from('stock')
        .update({ estado: 'vendido' }) // Podríamos agregar fecha_venta: new Date() si modificamos la tabla
        .in('id', idsAVender)

      if (updateError) throw updateError

      // 4. Éxito
      toast.success("¡Venta registrada! 💰", {
        description: `Se vendieron ${cantidadVenta} u. de ${productoSeleccionado.nombre}`
      })
      
      // Actualizar la lista visualmente
      buscarProductos()
      setProductoSeleccionado(null)

    } catch (error: any) {
      console.error(error)
      toast.error("Error al procesar venta")
    } finally {
      setProcesandoVenta(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Buscador Grande */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          placeholder="🔍 Buscar producto para vender..."
          className="h-14 pl-12 text-lg"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          autoFocus
        />
        {loading && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-primary" />}
      </div>

      {/* Resultados */}
      <div className="space-y-2">
        {productos.map((prod) => (
          <Card key={prod.id} className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{prod.emoji}</span>
              <div>
                <h3 className="font-bold text-lg leading-none">{prod.nombre}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Stock: <span className={prod.stock_disponible > 0 ? "text-emerald-600 font-bold" : "text-red-500 font-bold"}>
                    {prod.stock_disponible} u.
                  </span>
                </p>
              </div>
            </div>
            
            <Button 
              size="lg" 
              disabled={prod.stock_disponible === 0}
              onClick={() => abrirModalVenta(prod)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              Vender
            </Button>
          </Card>
        ))}
        
        {busqueda.length > 0 && productos.length === 0 && !loading && (
          <div className="text-center p-8 text-muted-foreground">
            <p>No se encontraron productos.</p>
          </div>
        )}
      </div>

      {/* MODAL DE CONFIRMACIÓN DE VENTA */}
      <Dialog open={!!productoSeleccionado} onOpenChange={(open) => !open && setProductoSeleccionado(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl flex flex-col items-center gap-2">
              <span className="text-4xl">{productoSeleccionado?.emoji}</span>
              Vender {productoSeleccionado?.nombre}
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex flex-col items-center gap-6 py-4">
            <div className="flex items-center gap-4">
              <Button 
                variant="outline" 
                size="icon" 
                className="h-12 w-12 rounded-full"
                onClick={() => setCantidadVenta(Math.max(1, cantidadVenta - 1))}
              >
                <Minus className="h-6 w-6" />
              </Button>
              
              <span className="text-4xl font-bold w-16 text-center tabular-nums">
                {cantidadVenta}
              </span>
              
              <Button 
                variant="outline" 
                size="icon" 
                className="h-12 w-12 rounded-full"
                onClick={() => setCantidadVenta(Math.min(productoSeleccionado?.stock_disponible || 99, cantidadVenta + 1))}
              >
                <Plus className="h-6 w-6" />
              </Button>
            </div>
            
            <p className="text-sm text-muted-foreground">
              Total estimado: <strong className="text-foreground">${(productoSeleccionado?.precio_venta * cantidadVenta).toLocaleString()}</strong>
            </p>
          </div>

          <DialogFooter>
            <Button 
              className="w-full h-12 text-lg bg-emerald-600 hover:bg-emerald-700 font-bold" 
              onClick={confirmarVenta}
              disabled={procesandoVenta}
            >
              {procesandoVenta ? <Loader2 className="animate-spin" /> : "CONFIRMAR VENTA 💸"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}