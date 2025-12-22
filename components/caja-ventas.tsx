// components/caja-ventas.tsx
"use client"

import { useState, useEffect, useMemo } from "react"
import { supabase } from "@/lib/supabase"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, ShoppingCart, Loader2, Minus, Plus, Trash2, X, Check, CreditCard, DollarSign, Wallet, Repeat2, ScanBarcode, Zap } from "lucide-react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { useZxing } from "react-zxing"
import { generarTicketVenta } from "@/lib/generar-ticket"
import { format } from "date-fns"
import WidgetSube from "@/components/widget-sube"

// --- COMPONENTE SCANNER ---
function BarcodeScanner({ onResult, onClose }: { onResult: (code: string) => void, onClose: () => void }) {
  const { ref } = useZxing({
    // @ts-ignore
    onDecodeResult(result: any) {
        if (result && typeof result.getText === 'function') {
            onResult(result.getText())
        } else {
            onResult(String(result))
        }
    },
    constraints: { video: { facingMode: "environment" } }
  } as any)

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

// ✅ MODIFICACIÓN 1: Agregamos 'categoria' a la interfaz
interface ProductoConStock {
  id: string
  nombre: string
  emoji: string
  categoria: string // <--- Nuevo campo
  precio_venta: number
  stock_disponible: number
  codigo_barras?: string
}

// ✅ MODIFICACIÓN 2: Agregamos 'categoria' al item del carrito
interface CartItem {
  id: string 
  nombre: string
  emoji: string
  categoria: string // <--- Nuevo campo
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

export default function CajaVentas({ turnoId, empleadoNombre = "Cajero" }: { turnoId?: string, empleadoNombre?: string }) {
  const [busqueda, setBusqueda] = useState("")
  const [productosBusqueda, setProductosBusqueda] = useState<ProductoConStock[]>([])
  const [loading, setLoading] = useState(false)
  const [cart, setCart] = useState<CartItem[]>([])
  const [procesandoVenta, setProcesandoVenta] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>('efectivo')
  const [showScanner, setShowScanner] = useState(false)

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
      let query = supabase.from('view_productos_con_stock').select('*')
      const isNumber = /^\d+$/.test(termino);
      
      if (isNumber) {
         query = query.or(`codigo_barras.eq.${termino},nombre.ilike.%${termino}%`)
      } else {
         query = query.ilike('nombre', `%${termino}%`)
      }
      
      const { data: prods, error } = await query.order('nombre', { ascending: true })
      if (error) throw error

      const productosConStock = (prods || []).map(p => ({
        ...p,
        stock_disponible: p.stock_disponible || 0,
        categoria: p.categoria || '', // ✅ Mapeamos la categoría
        precio_venta: parseFloat(p.precio_venta || 0)
      })) as ProductoConStock[]
      
      if (isNumber && productosConStock.length === 1 && productosConStock[0].codigo_barras === termino) {
          addToCart(productosConStock[0]);
          setBusqueda("");
          toast.success("Producto agregado");
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

  const handleScanResult = (code: string) => {
      setShowScanner(false);
      setBusqueda(code);
      toast.info("Código leído");
  }

  const totalCarrito = useMemo(() => {
    return cart.reduce((total, item) => total + item.precio_venta * item.cantidad, 0)
  }, [cart])
  
  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(amount)
  }

  const handlePagarClick = () => {
    if (cart.length === 0) return toast.error("Carrito vacío")
    if (!turnoId) {
        toast.error("Caja Cerrada", { description: "Abre un turno antes de cobrar." })
        return
    }
    setShowPaymentModal(true)
  }

  // ✅ MODIFICACIÓN 3: Lógica 'addToCart' permite Servicios sin stock
  const addToCart = (producto: ProductoConStock) => {
    const existingItem = cart.find(item => item.id === producto.id)
    
    // Si es servicio o Carga SUBE, ignoramos el stock 0
    const esServicio = producto.categoria === 'Servicios' || producto.nombre === 'Carga SUBE';
    
    if (!esServicio && producto.stock_disponible === 0) return toast.warning("Sin Stock")

    if (existingItem) {
        // Si es servicio, permitimos sumar siempre. Si es producto, validamos stock.
        if (esServicio || existingItem.cantidad < producto.stock_disponible) {
            setCart(prev => prev.map(item => item.id === producto.id ? { ...item, cantidad: item.cantidad + 1 } : item))
        } else {
            toast.warning("Límite de Stock alcanzado")
        }
    } else {
        setCart(prev => [...prev, {
            id: producto.id, 
            nombre: producto.nombre, 
            emoji: producto.emoji,
            categoria: producto.categoria, // Guardamos la categoría
            precio_venta: producto.precio_venta, 
            cantidad: 1, 
            stock_disponible: producto.stock_disponible
        }])
    }
  }

  // ✅ MODIFICACIÓN 4: Lógica 'updateCartItemQuantity' permite sumar Servicios libremente
  const updateCartItemQuantity = (productId: string, delta: number) => {
    setCart(prev => {
        const item = prev.find(i => i.id === productId)
        if (!item) return prev
        
        const newQuantity = item.cantidad + delta
        const esServicio = item.categoria === 'Servicios' || item.nombre === 'Carga SUBE';

        if (newQuantity < 1) return prev.filter(i => i.id !== productId)
        
        // Si NO es servicio y supera el stock, no dejamos subir
        if (!esServicio && newQuantity > item.stock_disponible) return prev
        
        return prev.map(i => i.id === productId ? { ...i, cantidad: newQuantity } : i)
    })
  }

  const removeCartItem = (productId: string) => setCart(prev => prev.filter(item => item.id !== productId))

  const confirmarVenta = async (metodo_pago: PaymentMethod) => {
    if (!turnoId) return
    setProcesandoVenta(true)
    try {
      const updates = []
      
      // NOTA: Para que los Servicios funcionen aquí, necesitaremos el "Stock Infinito"
      // o una lógica de inserción manual. Por ahora, asume que existen rows en stock.
      for (const item of cart) {
        const { data: stockItems, error: searchError } = await supabase
          .from('stock')
          .select('id')
          .eq('producto_id', item.id)
          .eq('estado', 'pendiente')
          .order('fecha_vencimiento', { ascending: true })
          .limit(item.cantidad)

        if (searchError) throw searchError
        updates.push(...stockItems.map(s => s.id))
      }

      // ✅ MODIFICACIÓN 5: Fix de Zona Horaria (El Parche Argentino)
      const fechaArgentina = new Date();
      fechaArgentina.setHours(fechaArgentina.getHours() - 3);

      const { error: updateError } = await supabase
        .from('stock')
        .update({ 
            estado: 'vendido',
            fecha_venta: fechaArgentina.toISOString(), // Usamos la fecha ajustada 
            metodo_pago: metodo_pago,
            caja_diaria_id: turnoId 
        }) 
        .in('id', updates)

      if (updateError) throw updateError
      
      toast.success("¡Venta Exitosa! 💰")
      setShowPaymentModal(false)

      setTimeout(() => {
          const deseaTicket = confirm("¿Imprimir Ticket de Venta?")
          if (deseaTicket) {
              generarTicketVenta({
                  organizacion: "Planeta ZEGA", 
                  fecha: format(new Date(), 'dd/MM/yyyy HH:mm'),
                  vendedor: empleadoNombre,
                  metodoPago: metodo_pago,
                  total: totalCarrito,
                  items: cart.map(i => ({
                      cantidad: i.cantidad,
                      producto: i.nombre,
                      precioUnitario: i.precio_venta,
                      subtotal: i.cantidad * i.precio_venta
                  }))
              })
          }
      }, 100)

      setCart([]) 
      
    } catch (error: any) {
      toast.error("Error al procesar")
    } finally {
      setProcesandoVenta(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full items-start">
      
      {/* COLUMNA IZQUIERDA: CAJA REGISTRADORA (Ocupa 2/3) */}
      <div className="lg:col-span-2 space-y-4">
          <Card className="p-4 space-y-4 shadow-lg border-2 border-primary/10">
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                        placeholder="Busca o escanea..."
                        className="h-12 pl-12 text-lg"
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        autoFocus
                    />
                    {loading && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-primary" />}
                </div>
                <Button size="icon" className="h-12 w-12 shrink-0 bg-blue-600 hover:bg-blue-700" onClick={() => setShowScanner(true)}>
                    <ScanBarcode className="h-6 w-6" />
                </Button>
            </div>

            {/* Resultados */}
            {busqueda.length > 0 && productosBusqueda.length > 0 && (
                <div className="border rounded-lg max-h-40 overflow-y-auto bg-white shadow-sm z-10">
                    {productosBusqueda.map((prod) => (
                        <div key={prod.id} className="flex items-center justify-between p-3 border-b last:border-b-0 cursor-pointer hover:bg-primary/5 transition-colors" onClick={() => addToCart(prod)}>
                            <div className="flex items-center gap-3">
                                <span className="text-xl">{prod.emoji}</span>
                                <div>
                                    <h3 className="font-semibold leading-none truncate">{prod.nombre}</h3>
                                    <p className="text-xs text-muted-foreground mt-0.5">Stock: {prod.stock_disponible} | {formatMoney(prod.precio_venta)}</p>
                                </div>
                            </div>
                            <Plus className="h-5 w-5 text-primary" />
                        </div>
                    ))}
                </div>
            )}

            {/* Carrito y Total */}
            {cart.length > 0 ? (
              <div className="space-y-3 pt-4 border-t">
                <h3 className="font-bold flex items-center gap-2 text-lg text-primary"><ShoppingCart className="h-5 w-5" /> Carrito ({cart.length})</h3>
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {cart.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-2 bg-slate-50/50 rounded-lg border border-slate-100">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="text-2xl">{item.emoji}</span>
                        <div className="flex-1 min-w-0">
                            <p className="font-semibold truncate text-sm">{item.nombre}</p>
                            <p className="text-xs text-muted-foreground">{formatMoney(item.precio_venta)} x {item.cantidad}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateCartItemQuantity(item.id, -1)}><Minus className="h-3 w-3" /></Button>
                        <span className="font-bold w-6 text-center text-sm">{item.cantidad}</span>
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateCartItemQuantity(item.id, 1)} disabled={item.cantidad >= item.stock_disponible && item.categoria !== 'Servicios'}><Plus className="h-3 w-3" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeCartItem(item.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="pt-3 border-t bg-slate-50 p-4 rounded-xl">
                  <div className="flex justify-between items-center mb-3"><span className="text-xl font-bold text-slate-700">TOTAL:</span><span className="text-3xl font-black text-emerald-600">{formatMoney(totalCarrito)}</span></div>
                  <Button onClick={handlePagarClick} disabled={procesandoVenta} className="w-full h-14 text-xl bg-emerald-600 hover:bg-emerald-700 font-bold shadow-md transition-all active:scale-95">COBRAR 💸</Button>
                </div>
              </div>
            ) : (
                <div className="h-40 flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed rounded-xl">
                    <ShoppingCart className="h-10 w-10 mb-2 opacity-20" />
                    <p>Carrito vacío</p>
                </div>
            )}
          </Card>
      </div>

      {/* COLUMNA DERECHA: SERVICIOS RÁPIDOS (Ocupa 1/3) */}
      <div className="space-y-4">
          {/* ✅ WIDGET SUBE INTEGRADO AQUÍ */}
          <WidgetSube onVentaRegistrada={() => {}} />
          
          {/* Aquí podrías agregar más widgets futuros: Carga Virtual, Retiro de Efectivo, etc. */}
          <Card className="p-4 border-dashed border-2 flex flex-col items-center justify-center text-muted-foreground opacity-50 hover:opacity-100 transition-opacity cursor-pointer">
              <Zap className="h-6 w-6 mb-2" />
              <p className="text-xs font-bold">Carga Virtual (Próx.)</p>
          </Card>
      </div>

      {/* --- MODALES (Fuera del grid) --- */}
      
      {/* Modal de Pago */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="text-center text-2xl">Método de Pago</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-3 py-4">
            {PAYMENT_OPTIONS.map((option) => (
                <Card key={option.key} className={cn("p-4 cursor-pointer hover:bg-slate-50 transition-colors", selectedPaymentMethod === option.key ? "border-2 border-primary bg-primary/5" : "border")} onClick={() => setSelectedPaymentMethod(option.key as PaymentMethod)}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <option.icon className={cn("h-6 w-6", selectedPaymentMethod === option.key ? "text-primary" : "text-muted-foreground")} />
                            <span className="font-semibold">{option.label}</span>
                        </div>
                        {selectedPaymentMethod === option.key && <Check className="h-5 w-5 text-primary" />}
                    </div>
                </Card>
            ))}
          </div>
          <DialogFooter><Button className="w-full h-12 text-lg bg-emerald-600 font-bold" onClick={() => confirmarVenta(selectedPaymentMethod)} disabled={procesandoVenta}>FINALIZAR VENTA</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL ESCANER */}
      <Dialog open={showScanner} onOpenChange={setShowScanner}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-black border-none text-white">
            {showScanner && <BarcodeScanner onResult={handleScanResult} onClose={() => setShowScanner(false)} />}
        </DialogContent>
      </Dialog>
    </div>
  )
}