"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Trash2, ShoppingCart, Plus, Minus, Loader2, ScanBarcode, ReceiptText, X } from "lucide-react"
import { toast } from "sonner"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { generarTicketVenta } from "@/lib/generar-ticket"
import { useZxing } from "react-zxing"

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
  onVentaCompletada?: () => void 
}

// --- COMPONENTE SCANNER PARA PRODUCTOS (CÓDIGO DE BARRAS) ---
function BarcodeScannerVentas({ onResult, onClose }: { onResult: (code: string) => void, onClose: () => void }) {
  const [loading, setLoading] = useState(true)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)

  const { ref } = useZxing({
    onDecodeResult(result: any) {
      const code = result.getText ? result.getText() : String(result)
      if (navigator.vibrate) navigator.vibrate(100)
      onResult(code)
    },
    onError(err: any) {
      if (err.name !== "NotFoundError") console.error("Error scanner:", err)
    },
    constraints: { 
      video: { 
        facingMode: { ideal: "environment" },
        width: { ideal: 1280 },
        height: { ideal: 720 }
      }, 
      audio: false 
    },
    paused: false
  } as any)

  useEffect(() => {
    const checkPermissions = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true })
        stream.getTracks().forEach(track => track.stop())
        setHasPermission(true)
      } catch (err) {
        setHasPermission(false)
        toast.error("No se pudo acceder a la cámara")
      } finally {
        setLoading(false)
      }
    }
    checkPermissions()
  }, [])

  return (
    <div className="relative flex flex-col items-center justify-center bg-black w-full min-h-[400px]">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-50 text-white">
          <Loader2 className="h-8 w-8 animate-spin mb-2" />
          <p>Cargando escáner...</p>
        </div>
      )}
      <video ref={ref} className="w-full h-full object-cover max-h-[70vh]" playsInline muted autoPlay />
      <div className="absolute inset-0 border-2 border-primary/50 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-40 border-2 border-white/80 rounded-lg shadow-[0_0_0_999px_rgba(0,0,0,0.5)]" />
      </div>
      <div className="absolute bottom-4 flex flex-col gap-2 z-50">
        <Button variant="destructive" className="rounded-full px-8" onClick={onClose}>
          <X className="mr-2 h-4 w-4" /> Cancelar
        </Button>
      </div>
    </div>
  )
}

export default function CajaVentas({ turnoId, empleadoNombre, sucursalId, onVentaCompletada }: CajaVentasProps) {
  const [busqueda, setBusqueda] = useState("")
  const [productos, setProductos] = useState<Producto[]>([])
  const [carrito, setCarrito] = useState<ItemVenta[]>([])
  const [loading, setLoading] = useState(false)
  const [procesandoVenta, setProcesandoVenta] = useState(false)
  const [metodoPago, setMetodoPago] = useState<"efectivo" | "tarjeta" | "billetera_virtual">("efectivo")
  const [showScanner, setShowScanner] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const agregarAlCarrito = useCallback((producto: Producto) => {
    setCarrito(prev => {
      const existe = prev.find(p => p.id === producto.id)
      if (existe) {
        return prev.map(p => p.id === producto.id ? { ...p, cantidad: p.cantidad + 1 } : p)
      }
      return [...prev, { ...producto, cantidad: 1 }]
    })
    setBusqueda("") 
    setProductos([])
    toast.success(`+1 ${producto.nombre}`, { position: 'bottom-center', duration: 800 })
    setTimeout(() => inputRef.current?.focus(), 100)
  }, [])

  const buscarProductos = useCallback(async (query: string, autoAdd: boolean = false) => {
    if (!query) {
      setProductos([])
      return
    }
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('view_productos_con_stock') 
        .select('*')
        .eq('sucursal_id', sucursalId) 
        .or(`nombre.ilike.%${query}%,codigo_barras.eq.${query}`)
        .limit(5)

      if (error) throw error
      
      const resultados: Producto[] = (data || []).map((p: any) => ({
        id: p.id,
        nombre: p.nombre,
        precio: p.precio_venta,
        stock: p.stock_disponible, 
        codigo_barras: p.codigo_barras
      }))

      setProductos(resultados)

      if (autoAdd && resultados.length > 0) {
        const matchExacto = resultados.find(p => p.codigo_barras === query)
        if (matchExacto) agregarAlCarrito(matchExacto)
        else if (resultados.length === 1) agregarAlCarrito(resultados[0])
      }
    } catch (error) {
      console.error("Error buscando:", error)
    } finally {
      setLoading(false)
    }
  }, [sucursalId, agregarAlCarrito])

  const handleBarcodeScanned = (code: string) => {
    setShowScanner(false)
    buscarProductos(code, true)
  }

  const cambiarCantidad = (id: string, delta: number) => {
    setCarrito(prev => prev.map(p => 
      p.id === id ? { ...p, cantidad: Math.max(1, p.cantidad + delta) } : p
    ))
  }

  const removerDelCarrito = (id: string) => {
    setCarrito(prev => prev.filter(item => item.id !== id))
  }

  const calcularTotal = () => carrito.reduce((total, item) => total + (item.precio * item.cantidad), 0)

  const procesarVenta = async () => {
    if (carrito.length === 0) return
    setProcesandoVenta(true)
    try {
      const itemsSimplificados = carrito.map(item => ({
        producto_id: item.id,
        cantidad: item.cantidad
      }))

      const { data, error } = await supabase.rpc('procesar_venta', {
        p_sucursal_id: sucursalId,
        p_items: itemsSimplificados,
        p_metodo_pago_global: metodoPago,
        p_monto_total_cliente: calcularTotal()
      })

      if (error) throw error
      
      generarTicketVenta({
        organizacion: "Kiosco 24hs",
        fecha: new Date().toLocaleString('es-AR'),
        items: carrito.map(i => ({
            cantidad: i.cantidad,
            producto: i.nombre,
            precioUnitario: i.precio,
            subtotal: i.precio * i.cantidad
        })),
        total: calcularTotal(),
        metodoPago: metodoPago,
        vendedor: empleadoNombre
      })

      toast.success("Venta Exitosa")
      setCarrito([])
      if (onVentaCompletada) onVentaCompletada()
    } catch (error: any) {
      toast.error("Error", { description: error.message })
    } finally {
      setProcesandoVenta(false)
    }
  }

  return (
    <Card className="flex flex-col h-full shadow-2xl border-0 bg-white rounded-[2rem] overflow-hidden">
      <div className="p-6 border-b bg-slate-900 text-white flex justify-between items-center">
        <div>
          <h3 className="font-black uppercase text-sm tracking-tighter">Punto de Venta</h3>
          <p className="text-[9px] text-blue-300 font-bold uppercase tracking-widest">ID: {sucursalId.slice(0,5)}</p>
        </div>
        <Badge className="bg-blue-500">OPERATIVO</Badge>
      </div>

      <div className="p-6 space-y-6 flex-1 bg-slate-50/50">
        <div className="relative">
          <Input 
            ref={inputRef}
            placeholder="BUSCAR O ESCANEAR..." 
            className="pl-4 pr-32 bg-white font-black h-16 rounded-2xl border-2 border-slate-100"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && buscarProductos(busqueda, true)} 
          />
          <Button
            onClick={() => setShowScanner(true)}
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-blue-600 hover:bg-blue-700 h-10 rounded-xl"
          >
            <ScanBarcode className="h-4 w-4 mr-2" /> Escanear
          </Button>

          {productos.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border-2 z-50 overflow-hidden">
              {productos.map(p => (
                <button key={p.id} onClick={() => agregarAlCarrito(p)} className="w-full text-left px-5 py-4 hover:bg-blue-50 flex justify-between items-center border-b last:border-0 uppercase font-bold text-xs">
                  <span>{p.nombre}</span>
                  <span className="text-blue-600">$ {p.precio}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-3 max-h-[400px] overflow-y-auto scrollbar-hide">
          {carrito.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-300 border-4 border-dashed rounded-[2.5rem] bg-white">
              <ShoppingCart className="h-12 w-12 opacity-20 mb-4" />
              <p className="text-xs font-black uppercase tracking-widest text-center">Esperando Productos</p>
            </div>
          ) : (
            carrito.map(item => (
              <div key={item.id} className="flex items-center justify-between bg-white p-4 rounded-2xl border-2 border-transparent shadow-sm">
                <div className="flex-1">
                  <p className="font-black text-slate-800 text-sm uppercase">{item.nombre}</p>
                  <p className="text-[10px] font-bold text-slate-400">$ {item.precio} u.</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 bg-slate-100 rounded-xl p-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => cambiarCantidad(item.id, -1)}><Minus className="h-3 w-3" /></Button>
                    <span className="w-6 text-center text-sm font-black">{item.cantidad}</span>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => cambiarCantidad(item.id, 1)}><Plus className="h-3 w-3" /></Button>
                  </div>
                  <Button variant="ghost" size="icon" className="text-red-400" onClick={() => removerDelCarrito(item.id)}><Trash2 className="h-5 w-5" /></Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="p-6 bg-white border-t space-y-4">
        <div className="flex justify-between font-black text-2xl tracking-tighter">
          <span className="text-slate-400 text-xs uppercase">Total</span>
          <span>$ {calcularTotal().toLocaleString('es-AR')}</span>
        </div>
        <Button 
          className="w-full h-20 text-xl font-black rounded-[1.5rem] bg-blue-600 hover:bg-blue-700" 
          onClick={procesarVenta}
          disabled={carrito.length === 0 || procesandoVenta}
        >
          {procesandoVenta ? <Loader2 className="animate-spin h-8 w-8" /> : (
            <div className="flex items-center gap-3">
              <ReceiptText className="h-7 w-7" />
              <span>CONFIRMAR VENTA</span>
            </div>
          )}
        </Button>
      </div>

      <Dialog open={showScanner} onOpenChange={setShowScanner}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-black border-none">
          {showScanner && <BarcodeScannerVentas onResult={handleBarcodeScanned} onClose={() => setShowScanner(false)} />}
        </DialogContent>
      </Dialog>
    </Card>
  )
}