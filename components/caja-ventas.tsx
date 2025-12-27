"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Trash2, ShoppingCart, Plus, Minus, Loader2, ScanBarcode, ReceiptText, X } from "lucide-react"
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

// --- COMPONENTE SCANNER PARA CAJA DE VENTAS ---
function BarcodeScannerVentas({ onResult, onClose }: { onResult: (code: string) => void, onClose: () => void }) {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [manualInput, setManualInput] = useState("")
  const [showManualInput, setShowManualInput] = useState(false)

  useEffect(() => {
    const checkPermissions = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setError("Tu navegador no soporta el acceso a la cámara")
          setHasPermission(false)
          setLoading(false)
          return
        }

        try {
          const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: "environment" } 
          })
          stream.getTracks().forEach(track => track.stop())
          setHasPermission(true)
        } catch (err: any) {
          if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
            setError("Se necesita permiso para acceder a la cámara. Por favor, permite el acceso en la configuración de tu navegador.")
            setHasPermission(false)
          } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
            setError("No se encontró ninguna cámara en tu dispositivo")
            setHasPermission(false)
          } else {
            setError(`Error al acceder a la cámara: ${err.message}`)
            setHasPermission(false)
          }
        }
        setLoading(false)
      } catch (err) {
        setError("Error al verificar permisos de cámara")
        setHasPermission(false)
        setLoading(false)
      }
    }

    checkPermissions()
  }, [])

  const { ref } = useZxing({
    onDecodeResult(result: any) {
      if (result && result.getText) {
        const code = result.getText()
        if (navigator.vibrate) {
          navigator.vibrate(100)
        }
        onResult(code)
      } else {
        onResult(String(result))
      }
    },
    onError(err: any) {
      console.error("Error del scanner:", err)
      if (err.name !== "NotFoundError") {
        setError("Error al escanear. Intenta nuevamente o usa entrada manual.")
      }
    },
    constraints: { 
      video: { 
        facingMode: "environment",
        width: { ideal: 1280 },
        height: { ideal: 720 }
      }, 
      audio: false 
    }
  } as any)

  const handleManualSubmit = () => {
    if (manualInput.trim()) {
      onResult(manualInput.trim())
      setManualInput("")
      setShowManualInput(false)
    }
  }

  if (hasPermission === false || error) {
    return (
      <div className="relative flex flex-col items-center justify-center bg-black min-h-[400px] p-6">
        <div className="text-center space-y-4 text-white">
          <X className="h-16 w-16 mx-auto text-red-400" />
          <div>
            <p className="font-bold text-lg mb-2">No se puede acceder a la cámara</p>
            <p className="text-sm text-gray-300 mb-4">{error}</p>
          </div>
          
          {!showManualInput ? (
            <div className="space-y-3">
              <Button 
                onClick={() => setShowManualInput(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Ingresar código manualmente
              </Button>
              <Button 
                variant="outline" 
                onClick={onClose}
                className="border-white text-white hover:bg-white/10"
              >
                Cancelar
              </Button>
            </div>
          ) : (
            <div className="space-y-3 w-full max-w-xs">
              <Input
                type="text"
                placeholder="Ingresa el código de barras"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleManualSubmit()}
                className="bg-white text-black"
                autoFocus
              />
              <div className="flex gap-2">
                <Button 
                  onClick={handleManualSubmit}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  disabled={!manualInput.trim()}
                >
                  Confirmar
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    setShowManualInput(false)
                    setManualInput("")
                  }}
                  className="border-white text-white hover:bg-white/10"
                >
                  Volver
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex flex-col items-center justify-center bg-black w-full min-h-[400px] max-h-[70vh]">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-50">
          <div className="text-center text-white">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
            <p className="text-sm">Iniciando cámara...</p>
          </div>
        </div>
      )}
      
      <video 
        ref={ref} 
        className="w-full h-full object-cover" 
        playsInline 
        muted 
        autoPlay
        style={{ maxHeight: "70vh" }}
      />
      
      <div className="absolute top-0 left-0 w-full h-full border-2 border-primary/50 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-40 border-2 border-white/80 rounded-lg shadow-[0_0_0_999px_rgba(0,0,0,0.5)]">
          <p className="absolute -top-8 w-full text-center text-white font-bold text-sm drop-shadow-md">
            Apunta al código
          </p>
        </div>
      </div>
      
      <div className="absolute bottom-4 left-0 right-0 flex flex-col items-center gap-2 z-50">
        <Button 
          type="button" 
          variant="outline"
          size="sm"
          className="bg-white/10 border-white/20 text-white hover:bg-white/20"
          onClick={() => setShowManualInput(!showManualInput)}
        >
          {showManualInput ? "Ocultar entrada manual" : "Ingresar manualmente"}
        </Button>
        
        {showManualInput && (
          <div className="w-full max-w-xs px-4 space-y-2">
            <Input
              type="text"
              placeholder="Código de barras"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleManualSubmit()}
              className="bg-white text-black"
              autoFocus
            />
            <Button 
              onClick={handleManualSubmit}
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={!manualInput.trim()}
            >
              Confirmar
            </Button>
          </div>
        )}
        
        <Button 
          type="button" 
          variant="destructive" 
          className="rounded-full px-6 shadow-lg" 
          onClick={onClose}
        >
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
                  codigo_barras: prod.codigo_barras ?? undefined
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
    toast.success(`+1 ${producto.nombre}`, { position: 'bottom-center', duration: 800 })
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
        e.preventDefault() 
        if (busqueda) { buscarProductos(busqueda, true) }
    }
  }

  const handleBarcodeScanned = async (code: string) => {
    setShowScanner(false)
    // Buscar producto por código de barras y agregarlo automáticamente
    await buscarProductos(code, true)
    toast.success("Código escaneado", { description: "Buscando producto..." })
  }

  const cambiarCantidad = (id: string, delta: number) => {
    setCarrito(prev => prev.map(p => 
      p.id === id ? { ...p, cantidad: Math.max(1, p.cantidad + delta) } : p
    ))
  }

  // ✅ CORREGIDO: Función reintegrada
  const removerDelCarrito = (id: string) => {
    setCarrito(prev => prev.filter(item => item.id !== id))
    toast.info("Producto eliminado del carrito")
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
      const result = data as { success?: boolean; message?: string } | null
      if (!result || !result.success) throw new Error(result?.message || "Error al procesar la venta")

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
      setBusqueda("")
      if (onVentaCompletada) onVentaCompletada()
      setTimeout(() => inputRef.current?.focus(), 100) 
      
    } catch (error: any) {
      toast.error("Error en venta", { description: error.message })
    } finally {
      setProcesandoVenta(false)
    }
  }

  return (
    <Card className="flex flex-col h-full shadow-2xl border-0 bg-white rounded-[2rem] overflow-hidden">
      <div className="p-6 border-b bg-slate-900 text-white">
        <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500 rounded-xl">
                    <ShoppingCart className="h-5 w-5 text-white" />
                </div>
                <div>
                    <h3 className="font-black uppercase text-sm tracking-tighter">Punto de Venta</h3>
                    <p className="text-[9px] text-blue-300 font-bold uppercase tracking-widest">ID: {sucursalId.slice(0,5)}</p>
                </div>
            </div>
            <Badge className="bg-blue-500/20 text-blue-400 border-0 font-black text-[10px]">OPERATIVO</Badge>
        </div>
      </div>

      <div className="p-6 space-y-6 flex-1 bg-slate-50/50">
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 z-10">
             <ScanBarcode className="h-6 w-6" />
          </div>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 z-10">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setShowScanner(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white border-0 h-10 px-4 rounded-xl shadow-sm"
            >
              <ScanBarcode className="h-4 w-4 mr-2" />
              Escanear
            </Button>
          </div>
          <Input 
            ref={inputRef}
            autoFocus
            placeholder="ESCANEAR O BUSCAR PRODUCTO..." 
            className="pl-12 pr-32 bg-white font-black border-2 border-slate-100 focus-visible:ring-blue-500 h-16 rounded-2xl shadow-sm text-lg"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            onKeyDown={handleKeyDown} 
          />
          
          {productos.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border-2 border-slate-100 z-50 overflow-hidden">
              {productos.map(p => (
                <button
                  key={p.id}
                  onClick={() => agregarAlCarrito(p)}
                  className="w-full text-left px-5 py-4 hover:bg-blue-50 flex justify-between items-center border-b last:border-0"
                >
                  <div>
                    <span className="font-black text-slate-700 text-sm uppercase">{p.nombre}</span>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Stock Local: {p.stock}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-black text-blue-600">$ {p.precio}</span>
                    <Plus className="h-4 w-4 text-blue-600" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-3 min-h-[300px] max-h-[400px] overflow-y-auto pr-2 scrollbar-hide">
          {carrito.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-300 border-4 border-dashed rounded-[2.5rem] bg-white">
              <ShoppingCart className="h-12 w-12 opacity-20 mb-4" />
              <p className="text-xs font-black uppercase tracking-widest">Esperando Productos</p>
            </div>
          ) : (
            carrito.map(item => (
              <div key={item.id} className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm border-2 border-transparent hover:border-blue-100 transition-all">
                <div className="flex-1">
                  <p className="font-black text-slate-800 text-sm uppercase leading-tight">{item.nombre}</p>
                  <p className="text-[10px] font-bold text-slate-400 mt-1">$ {item.precio} u.</p>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 bg-slate-100 rounded-xl p-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white rounded-lg" onClick={() => cambiarCantidad(item.id, -1)}>
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-6 text-center text-sm font-black text-slate-700">{item.cantidad}</span>
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white rounded-lg" onClick={() => cambiarCantidad(item.id, 1)}>
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <p className="font-black text-slate-900 text-base min-w-[80px] text-right">$ {item.precio * item.cantidad}</p>
                  <Button variant="ghost" size="icon" className="h-10 w-10 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl" onClick={() => removerDelCarrito(item.id)}>
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="p-6 bg-white border-t space-y-6">
        <div className="flex justify-between items-center px-2">
          <span className="text-slate-400 font-black text-xs uppercase tracking-widest">Total a Cobrar</span>
          <span className="text-4xl font-black text-slate-900 tracking-tighter">
            $ {calcularTotal().toLocaleString('es-AR')}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3">
            {(['efectivo', 'billetera_virtual', 'tarjeta'] as const).map((m) => (
                <button 
                    key={m}
                    onClick={() => setMetodoPago(m)}
                    className={cn(
                        "flex flex-col items-center gap-2 py-4 rounded-2xl border-2 font-black text-[10px] uppercase transition-all", 
                        metodoPago === m ? "bg-slate-900 border-slate-900 text-white shadow-lg scale-105" : "bg-white border-slate-100 text-slate-400"
                    )}
                >
                    {m === 'efectivo' && 'Efectivo 💵'}
                    {m === 'billetera_virtual' && 'Virtual 📱'}
                    {m === 'tarjeta' && 'Tarjeta 💳'}
                </button>
            ))}
        </div>

        <Button 
          className="w-full h-20 text-xl font-black rounded-[1.5rem] shadow-xl bg-blue-600 hover:bg-blue-700"
          onClick={procesarVenta}
          disabled={carrito.length === 0 || procesandoVenta}
        >
          {procesandoVenta ? <Loader2 className="animate-spin h-8 w-8" /> : (
            <div className="flex items-center gap-3">
                <ReceiptText className="h-7 w-7" />
                <span>CONFIRMAR Y EMITIR TICKET</span>
            </div>
          )}
        </Button>
      </div>

      <Dialog open={showScanner} onOpenChange={setShowScanner}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-black border-none text-white">
          {showScanner && (
            <BarcodeScannerVentas 
              onResult={handleBarcodeScanned} 
              onClose={() => setShowScanner(false)} 
            />
          )}
        </DialogContent>
      </Dialog>
    </Card>
  )
}