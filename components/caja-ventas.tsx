"use client"

import { useState, useEffect, useMemo } from "react"
import { supabase } from "@/lib/supabase"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, ShoppingCart, Loader2, Minus, Plus, Trash2, X, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"

// Tipado para el producto con stock (el que viene de la búsqueda)
interface ProductoConStock {
  id: string
  nombre: string
  emoji: string
  precio_venta: number
  stock_disponible: number
}

// Tipado para un ítem dentro del carrito
interface CartItem {
  id: string // producto_id
  nombre: string
  emoji: string
  precio_venta: number
  cantidad: number
  stock_disponible: number
}

export default function CajaVentas() {
  const [busqueda, setBusqueda] = useState("")
  const [productosBusqueda, setProductosBusqueda] = useState<ProductoConStock[]>([])
  const [loading, setLoading] = useState(false)
  
  // Nuevo estado para el carrito de compras
  const [cart, setCart] = useState<CartItem[]>([])

  const [procesandoVenta, setProcesandoVenta] = useState(false)

  // --- Lógica de Búsqueda y Fetch de Productos ---

  // Buscar productos mientras escribes (con debounce)
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (busqueda.length > 0) {
        buscarProductos()
      } else {
        setProductosBusqueda([])
      }
    }, 300) // Reducido a 300ms para una mejor UX

    return () => clearTimeout(delayDebounceFn)
  }, [busqueda])

  const buscarProductos = async () => {
    setLoading(true)
    try {
      // 1. Buscamos productos que coincidan con el nombre
      const { data: prods, error } = await supabase
        .from('productos')
        .select('*')
        .ilike('nombre', `%${busqueda}%`)
      
      if (error) throw error

      // 2. Procesamos para obtener el stock disponible para cada uno
      const productosConStock = await Promise.all(prods.map(async (p) => {
        const { count } = await supabase
          .from('stock')
          .select('*', { count: 'exact', head: true })
          .eq('producto_id', p.id)
          .eq('estado', 'pendiente')
        
        return { 
            ...p, 
            stock_disponible: count || 0,
            precio_venta: parseFloat(p.precio_venta || 0) // Asegurar formato numérico
        } as ProductoConStock
      }))

      setProductosBusqueda(productosConStock)
    } catch (error) {
      console.error("Error buscando productos:", error)
      toast.error("Error al buscar productos", { description: "Hubo un problema con la base de datos." })
    } finally {
      setLoading(false)
    }
  }

  // --- Lógica del Carrito ---

  const totalCarrito = useMemo(() => {
    return cart.reduce((total, item) => total + item.precio_venta * item.cantidad, 0)
  }, [cart])
  
  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(amount)
  }

  const addToCart = (producto: ProductoConStock) => {
    const existingItem = cart.find(item => item.id === producto.id)

    if (producto.stock_disponible === 0) {
        toast.warning("Sin Stock", { description: `${producto.nombre} no tiene unidades disponibles.` })
        return
    }

    if (existingItem) {
        // Si ya está en el carrito, incrementa la cantidad (máx: stock disponible)
        if (existingItem.cantidad < producto.stock_disponible) {
            setCart(prev => 
                prev.map(item => 
                    item.id === producto.id 
                        ? { ...item, cantidad: item.cantidad + 1 } 
                        : item
                )
            )
        } else {
            toast.warning("Límite de Stock", { description: `Solo puedes vender ${producto.stock_disponible} unidades.` })
        }
    } else {
        // Si es nuevo, agrégalo
        setCart(prev => [...prev, {
            id: producto.id,
            nombre: producto.nombre,
            emoji: producto.emoji,
            precio_venta: producto.precio_venta,
            cantidad: 1,
            stock_disponible: producto.stock_disponible
        }])
    }
    setBusqueda("") // Limpiar búsqueda después de agregar
    setProductosBusqueda([])
  }

  const updateCartItemQuantity = (productId: string, delta: number) => {
    setCart(prev => {
        const item = prev.find(i => i.id === productId)
        if (!item) return prev

        const newQuantity = item.cantidad + delta
        
        if (newQuantity < 1) {
            // Eliminar si la cantidad llega a cero o menos
            return prev.filter(i => i.id !== productId)
        }

        if (newQuantity > item.stock_disponible) {
            toast.warning("Límite de Stock", { description: `Solo hay ${item.stock_disponible} unidades.` })
            return prev
        }
        
        return prev.map(i => 
            i.id === productId 
                ? { ...i, cantidad: newQuantity } 
                : i
        )
    })
  }

  const removeCartItem = (productId: string) => {
    setCart(prev => prev.filter(item => item.id !== productId))
  }

  // --- Lógica de Confirmación de Venta (Bulk) ---
  const confirmarVenta = async () => {
    if (cart.length === 0) {
      toast.error("Carrito vacío", { description: "Agrega productos para vender." })
      return
    }
    setProcesandoVenta(true)

    try {
      const updates = []
      
      // Itera sobre cada producto en el carrito
      for (const item of cart) {
        // 1. Lógica FIFO: Buscar los IDs de los items más viejos disponibles
        const { data: stockItems, error: searchError } = await supabase
          .from('stock')
          .select('id')
          .eq('producto_id', item.id)
          .eq('estado', 'pendiente')
          .order('fecha_vencimiento', { ascending: true }) // FIFO: Vender lo más viejo primero
          .limit(item.cantidad)

        if (searchError) throw searchError

        if (!stockItems || stockItems.length < item.cantidad) {
            // Esto no debería pasar si se valida el stock al agregar, pero es un fallback
            toast.error("Stock insuficiente", { 
                description: `Error: Solo hay ${stockItems?.length || 0} unidades disponibles de ${item.nombre}.` 
            })
            setProcesandoVenta(false)
            return
        }

        // 2. Extraer los IDs a actualizar
        const idsAVender = stockItems.map(s => s.id)
        updates.push(...idsAVender)
      }

      // 3. Actualizar estado a 'vendido' en un solo bulk update (usando la lista de todos los IDs)
      const { error: updateError } = await supabase
        .from('stock')
        .update({ 
            estado: 'vendido',
            fecha_venta: new Date().toISOString() // Marcamos la hora de venta
        }) 
        .in('id', updates)

      if (updateError) throw updateError

      // 4. Éxito
      toast.success("¡Venta Exitosa! 💰", {
        description: `Se registró la venta de ${cart.length} productos por ${formatMoney(totalCarrito)}.`
      })
      
      // Resetear
      setCart([])
      setBusqueda("")
      setProductosBusqueda([])
      // Llamar a buscarProductos para refrescar el stock de la lista si es necesario, aunque limpiamos la lista de búsqueda
      // Si la lista de búsqueda está vacía, no es necesario llamar, pero si se quiere mantener el stock actualizado en otros componentes, hay que forzar un refresh global (esto se verá en pasos futuros).

    } catch (error: any) {
      console.error(error)
      toast.error("Error al procesar venta", { description: error.message || "Intenta de nuevo." })
    } finally {
      setProcesandoVenta(false)
    }
  }

  // Se eliminan los estados y funciones no utilizadas del componente original, como 'productoSeleccionado', 'cantidadVenta', 'abrirModalVenta', y el 'MODAL DE CONFIRMACIÓN DE VENTA'.

  return (
    <div className="space-y-4">
      {/* Buscador y Carrito */}
      <Card className="p-4 space-y-4 shadow-lg border-2 border-primary/10">
        {/* Buscador */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="🔍 Busca y agrega productos al carrito..."
            className="h-14 pl-12 text-lg"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            autoFocus
          />
          {loading && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-primary" />}
          {busqueda.length > 0 && (
             <X 
                className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground cursor-pointer hover:text-foreground" 
                onClick={() => setBusqueda("")}
            />
          )}
        </div>

        {/* Resultados de búsqueda (Previsualización) */}
        {busqueda.length > 0 && productosBusqueda.length > 0 && (
            <div className="border rounded-lg max-h-40 overflow-y-auto">
                {productosBusqueda.map((prod) => (
                    <div 
                        key={prod.id} 
                        className="flex items-center justify-between p-3 border-b last:border-b-0 cursor-pointer hover:bg-primary/5"
                        onClick={() => addToCart(prod)}
                    >
                        <div className="flex items-center gap-3">
                            <span className="text-xl">{prod.emoji}</span>
                            <div>
                                <h3 className="font-semibold leading-none truncate">{prod.nombre}</h3>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Stock: <span className={prod.stock_disponible > 0 ? "text-emerald-600 font-bold" : "text-destructive font-bold"}>
                                        {prod.stock_disponible} u.
                                    </span> | {formatMoney(prod.precio_venta)}
                                </p>
                            </div>
                        </div>
                        <Button 
                            size="sm" 
                            disabled={prod.stock_disponible === 0}
                            onClick={(e) => { e.stopPropagation(); addToCart(prod) }}
                        >
                            <Plus className="h-4 w-4 mr-1" />
                            Agregar
                        </Button>
                    </div>
                ))}
            </div>
        )}

        {/* Carrito (Solo visible si hay ítems o si se está buscando) */}
        {cart.length > 0 && (
          <div className="space-y-3 pt-4 border-t">
            <h3 className="font-bold flex items-center gap-2 text-lg text-primary">
                <ShoppingCart className="h-5 w-5" /> Carrito ({cart.length} producto{cart.length !== 1 ? 's' : ''})
            </h3>
            
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {cart.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-2 border-b last:border-b-0">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="text-2xl">{item.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold leading-none truncate">{item.nombre}</p>
                      <p className="text-xs text-muted-foreground">{formatMoney(item.precio_venta)} c/u</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="icon-sm" 
                      onClick={() => updateCartItemQuantity(item.id, -1)}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    
                    <span className="font-bold w-6 text-center">{item.cantidad}</span>
                    
                    <Button 
                      variant="outline" 
                      size="icon-sm" 
                      onClick={() => updateCartItemQuantity(item.id, 1)}
                      disabled={item.cantidad >= item.stock_disponible}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    
                    <Button 
                        variant="ghost" 
                        size="icon-sm" 
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => removeCartItem(item.id)}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Total y Botón de Pago */}
            <div className="pt-3 border-t">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xl font-bold">TOTAL:</span>
                <span className="text-2xl font-black text-emerald-600">{formatMoney(totalCarrito)}</span>
              </div>
              <Button 
                onClick={confirmarVenta} 
                disabled={procesandoVenta || cart.length === 0}
                className="w-full h-12 text-lg bg-emerald-600 hover:bg-emerald-700 font-bold"
              >
                {procesandoVenta ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : "CONFIRMAR VENTA 💸"}
              </Button>
            </div>
          </div>
        )}
        
        {cart.length === 0 && busqueda.length === 0 && !loading && (
            <div className="text-center p-8 text-muted-foreground bg-muted/20 rounded-lg border-dashed border">
                <ShoppingCart className="h-8 w-8 mx-auto mb-2" />
                <p>Tu carrito está vacío. Empieza a buscar para vender.</p>
            </div>
        )}

      </Card>
      
    </div>
  )
}