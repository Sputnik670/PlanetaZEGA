// components/caja-ventas.tsx
"use client"

import { useState, useEffect, useMemo } from "react"
import { supabase } from "@/lib/supabase"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, ShoppingCart, Loader2, Minus, Plus, Trash2, X, Check, CreditCard, DollarSign, Wallet, Repeat2, ScanBarcode } from "lucide-react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { useZxing } from "react-zxing"

// --- COMPONENTE SCANNER (Reutilizable) ---
function BarcodeScanner({ onResult, onClose }: { onResult: (code: string) => void, onClose: () => void }) {
  const { ref } = useZxing({
    onResult(result: any) {
        if (result && result.getText) onResult(result.getText())
        else onResult(String(result))
    },
    constraints: { video: { facingMode: "environment" } }
  })

  return (
    <div className="relative flex flex-col items-center justify-center bg-black w-full h-[400px]">
      <video ref={ref} className="w-full h-full object-cover" />
      <div className="absolute top-0 left-0 w-full h-full border-2 border-primary/50 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-40 border-2 border-white/80 rounded-lg shadow-[0_0_0_999px_rgba(0,0,0,0.5)]">
            <p className="absolute -top-8 w-full text-center text-white font-bold text-sm drop-shadow-md">
                Escanea para agregar
            </p>
        </div>
      </div>
      <Button type="button" variant="destructive" className="absolute bottom-6 rounded-full px-6 shadow-lg z-50" onClick={onClose}>
        <X className="mr-2 h-4 w-4" /> Cancelar
      </Button>
    </div>
  )
}

interface ProductoConStock {
  id: string
  nombre: string
  emoji: string
  precio_venta: number
  stock_disponible: number
  codigo_barras?: string // Agregado para validación
}

interface CartItem {
  id: string 
  nombre: string
  emoji: string
  precio_venta: number
  cantidad: number
  stock_disponible: number
}

type PaymentMethod = 'efectivo' | 'tarjeta' | 'transferencia' | 'otro' | 'billetera_virtual';

const PAYMENT_OPTIONS = [
    { key: 'efectivo', label: 'Efectivo', icon: DollarSign },
    { key: 'tarjeta', label: 'Tarjeta (Débito/Crédito)', icon: CreditCard },
    { key: 'billetera_virtual', label: 'Billetera Virtual (MP, Ualá, etc.)', icon: Wallet },
    { key: 'transferencia', label: 'Transferencia Bancaria', icon: Repeat2 },
    { key: 'otro', label: 'Otro / Cta. Corriente', icon: Wallet },
]

export default function CajaVentas({ turnoId }: { turnoId?: string }) {
  const [busqueda, setBusqueda] = useState("")
  const [productosBusqueda, setProductosBusqueda] = useState<ProductoConStock[]>([])
  const [loading, setLoading] = useState(false)
  const [cart, setCart] = useState<CartItem[]>([])
  const [procesandoVenta, setProcesandoVenta] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>('efectivo')
  
  // Estado para el escaner
  const [showScanner, setShowScanner] = useState(false)

  // --- Búsqueda (OPTIMIZADA) ---
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (busqueda.length > 0) buscarProductos(busqueda)
      else setProductosBusqueda([])
    }, 300)
    return () => clearTimeout(delayDebounceFn)
  }, [busqueda])

  const buscarProductos = async (termino: string) => {
    setLoading(true)
    try {
      // Lógica inteligente: Si parece un código de barras (solo números), buscamos exacto primero
      let query = supabase.from('view_productos_con_stock').select('*')
      
      // Usamos el filtro OR para buscar por nombre O por código de barras
      const isNumber = /^\d+$/.test(termino);
      
      if (isNumber) {
         // Prioridad al código de barras
         query = query.or(`codigo_barras.eq.${termino},nombre.ilike.%${termino}%`)
      } else {
         query = query.ilike('nombre', `%${termino}%`)
      }
      
      const { data: prods, error } = await query.order('nombre', { ascending: true })
      
      if (error) throw error

      const productosConStock = (prods || []).map(p => ({
        ...p,
        stock_disponible: p.stock_disponible || 0,
        precio_venta: parseFloat(p.precio_venta || 0)
      })) as ProductoConStock[]
      
      // Auto-agregar si es búsqueda exacta por código de barras (UX Mágica)
      if (isNumber && productosConStock.length === 1 && productosConStock[0].codigo_barras === termino) {
          addToCart(productosConStock[0]);
          setBusqueda(""); // Limpiamos búsqueda para seguir escaneando
          toast.success("Producto agregado", { duration: 1500 });
      } else {
          setProductosBusqueda(productosConStock)
      }

    } catch (error) {
      console.error(error)
      toast.error("Error al buscar")
    } finally {
      setLoading(false)
    }
  }

  // Callback del escaner
  const handleScanResult = (code: string) => {
      setShowScanner(false);
      setBusqueda(code); // Esto disparará el useEffect que busca automáticamente
      toast.info("Código leído", { description: "Procesando..." });
  }

  // --- Carrito ---
  const totalCarrito = useMemo(() => {
    return cart.reduce((total, item) => total + item.precio_venta * item.cantidad, 0)
  }, [cart])
  
  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(amount)
  }

  const handlePagarClick = () => {
    if (cart.length === 0) return toast.error("Carrito vacío")
    if (!turnoId) {
        toast.error("Caja Cerrada", { description: "Debes abrir un turno de caja antes de poder cobrar." })
        return
    }
    setShowPaymentModal(true)
  }

  const addToCart = (producto: ProductoConStock) => {
    const existingItem = cart.find(item => item.id === producto.id)
    if (producto.stock_disponible === 0) return toast.warning("Sin Stock", { description: `${producto.nombre} no tiene unidades.` })

    if (existingItem) {
        if (existingItem.cantidad < producto.stock_disponible) {
            setCart(prev => prev.map(item => item.id === producto.id ? { ...item, cantidad: item.cantidad + 1 } : item))
        } else {
            toast.warning("Límite de Stock", { description: `Solo hay ${producto.stock_disponible} unidades.` })
        }
    } else {
        setCart(prev => [...prev, {
            id: producto.id, nombre: producto.nombre, emoji: producto.emoji,
            precio_venta: producto.precio_venta, cantidad: 1, stock_disponible: producto.stock_disponible
        }])
    }
    // No limpiamos búsqueda aquí si fue manual, para permitir ver resultados.
    // Si fue por scanner, ya se limpió en la lógica de `buscarProductos`.
  }

  const updateCartItemQuantity = (productId: string, delta: number) => {
    setCart(prev => {
        const item = prev.find(i => i.id === productId)
        if (!item) return prev
        const newQuantity = item.cantidad + delta
        if (newQuantity < 1) return prev.filter(i => i.id !== productId)
        if (newQuantity > item.stock_disponible) {
            toast.warning("Límite de Stock")
            return prev
        }
        return prev.map(i => i.id === productId ? { ...i, cantidad: newQuantity } : i)
    })
  }

  const removeCartItem = (productId: string) => setCart(prev => prev.filter(item => item.id !== productId))

  // --- Confirmación ---
  const confirmarVenta = async (metodo_pago: PaymentMethod) => {
    if (!turnoId) return toast.error("Error crítico", { description: "No se detectó un turno activo." })
    setProcesandoVenta(true)
    try {
      const updates = []
      for (const item of cart) {
        const { data: stockItems, error: searchError } = await supabase
          .from('stock')
          .select('id')
          .eq('producto_id', item.id)
          .eq('estado', 'pendiente')
          .order('fecha_vencimiento', { ascending: true })
          .limit(item.cantidad)

        if (searchError) throw searchError
        if (!stockItems || stockItems.length < item.cantidad) {
            toast.error(`Stock insuficiente de ${item.nombre}`, { description: `Quedan ${stockItems?.length || 0} unidades.` })
            setProcesandoVenta(false); setShowPaymentModal(false); return
        }
        updates.push(...stockItems.map(s => s.id))
      }

      const { error: updateError } = await supabase
        .from('stock')
        .update({ 
            estado: 'vendido',
            fecha_venta: new Date().toISOString(), 
            metodo_pago: metodo_pago,
            caja_diaria_id: turnoId 
        }) 
        .in('id', updates)

      if (updateError) throw updateError

      const formattedMethod = metodo_pago.toUpperCase().replace('_', ' ');
      toast.success("¡Venta Exitosa! 💰", { description: `Venta registrada por ${formatMoney(totalCarrito)} (${formattedMethod}).` })
      
      setCart([])
      setShowPaymentModal(false)

    } catch (error: any) {
      console.error(error)
      toast.error("Error al procesar venta", { description: error.message || "Intenta de nuevo." })
    } finally {
      setProcesandoVenta(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-4 shadow-lg border-2 border-primary/10">
        <div className="flex gap-2">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                    placeholder="Busca o escanea..."
                    className="h-12 pl-12 text-lg"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                />
                {loading && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-primary" />}
                {busqueda.length > 0 && !loading && (
                    <X className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground cursor-pointer hover:text-foreground" onClick={() => setBusqueda("")} />
                )}
            </div>
            
            {/* BOTÓN ESCANER */}
            <Button 
                size="icon" 
                className="h-12 w-12 shrink-0 bg-blue-600 hover:bg-blue-700" 
                onClick={() => setShowScanner(true)}
            >
                <ScanBarcode className="h-6 w-6" />
            </Button>
        </div>

        {/* Resultados */}
        {busqueda.length > 0 && productosBusqueda.length > 0 && (
            <div className="border rounded-lg max-h-40 overflow-y-auto bg-white shadow-sm z-10">
                {productosBusqueda.map((prod) => (
                    <div key={prod.id} className="flex items-center justify-between p-3 border-b last:border-b-0 cursor-pointer hover:bg-primary/5 active:bg-primary/10 transition-colors" onClick={() => addToCart(prod)}>
                        <div className="flex items-center gap-3">
                            <span className="text-xl">{prod.emoji}</span>
                            <div>
                                <h3 className="font-semibold leading-none truncate">{prod.nombre}</h3>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Stock: <span className={prod.stock_disponible > 0 ? "text-emerald-600 font-bold" : "text-destructive font-bold"}>{prod.stock_disponible} u.</span> | {formatMoney(prod.precio_venta)}
                                </p>
                            </div>
                        </div>
                        <Button size="sm" variant="ghost" disabled={prod.stock_disponible === 0} onClick={(e) => { e.stopPropagation(); addToCart(prod) }}>
                            <Plus className="h-5 w-5 text-primary" />
                        </Button>
                    </div>
                ))}
            </div>
        )}

        {/* Carrito */}
        {cart.length > 0 && (
          <div className="space-y-3 pt-4 border-t">
            <h3 className="font-bold flex items-center gap-2 text-lg text-primary">
                <ShoppingCart className="h-5 w-5" /> Carrito ({cart.length})
            </h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {cart.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-2 border-b last:border-b-0 bg-slate-50/50 rounded-lg mb-1">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="text-2xl">{item.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{item.nombre}</p>
                      <p className="text-xs text-muted-foreground">{formatMoney(item.precio_venta)} c/u</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateCartItemQuantity(item.id, -1)}><Minus className="h-3 w-3" /></Button>
                    <span className="font-bold w-6 text-center text-sm">{item.cantidad}</span>
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateCartItemQuantity(item.id, 1)} disabled={item.cantidad >= item.stock_disponible}><Plus className="h-3 w-3" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => removeCartItem(item.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="pt-3 border-t">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xl font-bold">TOTAL:</span>
                <span className="text-2xl font-black text-emerald-600">{formatMoney(totalCarrito)}</span>
              </div>
              <Button onClick={handlePagarClick} disabled={procesandoVenta || cart.length === 0} className="w-full h-12 text-lg bg-emerald-600 hover:bg-emerald-700 font-bold shadow-md">
                {procesandoVenta ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : "COBRAR 💸"}
              </Button>
            </div>
          </div>
        )}
        
        {cart.length === 0 && busqueda.length === 0 && !loading && (
            <div className="text-center p-8 text-muted-foreground bg-muted/20 rounded-lg border-dashed border">
                <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Tu carrito está vacío.</p>
                <p className="text-xs mt-1">Usa el buscador o el escáner para empezar.</p>
            </div>
        )}
      </Card>

      {/* Modal de Pago */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl flex flex-col items-center gap-2">
              <Wallet className="h-6 w-6 text-primary" /> Método de Pago
            </DialogTitle>
            <p className="text-center text-muted-foreground">Total a Cobrar: <span className="font-black text-emerald-600">{formatMoney(totalCarrito)}</span></p>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-4">
            {PAYMENT_OPTIONS.map((option) => {
                const Icon = option.icon
                return (
                    <Card key={option.key} className={cn("p-4 cursor-pointer hover:shadow-md transition-all", selectedPaymentMethod === option.key ? "border-2 border-primary ring-2 ring-primary/20 bg-primary/5" : "border")} onClick={() => setSelectedPaymentMethod(option.key as PaymentMethod)}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Icon className={cn("h-6 w-6", selectedPaymentMethod === option.key ? "text-primary" : "text-muted-foreground")} />
                                <span className="font-semibold">{option.label}</span>
                            </div>
                            {selectedPaymentMethod === option.key && <Check className="h-5 w-5 text-primary" />}
                        </div>
                    </Card>
                )
            })}
          </div>
          <DialogFooter>
            <Button className="w-full h-12 text-lg bg-emerald-600 hover:bg-emerald-700 font-bold" onClick={() => confirmarVenta(selectedPaymentMethod)} disabled={procesandoVenta}>
              {procesandoVenta ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : "FINALIZAR VENTA"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL ESCANER */}
      <Dialog open={showScanner} onOpenChange={setShowScanner}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-black border-none text-white">
            {showScanner && (
                <BarcodeScanner 
                    onResult={handleScanResult} 
                    onClose={() => setShowScanner(false)} 
                />
            )}
        </DialogContent>
      </Dialog>
    </div>
  )
}