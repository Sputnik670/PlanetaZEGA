// components/crear-producto.tsx

"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Loader2, Package, Save, Plus, DollarSign, TrendingUp, Smile, ScanBarcode, X, Calendar as CalendarIcon } from "lucide-react"
import { toast } from "sonner"
import { addDays, format } from "date-fns"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useZxing } from "react-zxing"

// --- CONFIGURACIÓN DE ESCANER ---
function BarcodeScanner({ onResult, onClose }: { onResult: (code: string) => void, onClose: () => void }) {
  // Fix para compatibilidad con versiones nuevas de react-zxing
  const { ref } = useZxing({
    onDecodeResult(result: any) {
      if (result && result.getText) {
        onResult(result.getText())
      } else {
        onResult(String(result))
      }
    },
    // En iOS a veces ayuda especificar audio: false explícitamente
    constraints: { video: { facingMode: "environment" }, audio: false }
  } as any) 

  return (
    <div className="relative flex flex-col items-center justify-center bg-black w-full h-[400px]">
      {/* CORRECCIÓN IOS: Agregamos playsInline, muted y autoPlay */}
      <video 
        ref={ref} 
        className="w-full h-full object-cover" 
        playsInline 
        muted 
        autoPlay 
      />
      
      <div className="absolute top-0 left-0 w-full h-full border-2 border-primary/50 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-40 border-2 border-white/80 rounded-lg shadow-[0_0_0_999px_rgba(0,0,0,0.5)]">
            <p className="absolute -top-8 w-full text-center text-white font-bold text-sm drop-shadow-md">
                Apunta al código
            </p>
        </div>
      </div>

      <Button 
        type="button"
        variant="destructive" 
        className="absolute bottom-6 rounded-full px-6 shadow-lg z-50" 
        onClick={onClose}
      >
        <X className="mr-2 h-4 w-4" /> Cancelar
      </Button>
    </div>
  )
}

// Helper para buscar en Open Food Facts
async function fetchProductFromApi(barcode: string) {
  try {
    const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`)
    const data = await response.json()
    if (data.status === 1) {
      return {
        found: true,
        nombre: data.product.product_name_es || data.product.product_name,
        marca: data.product.brands,
        image: data.product.image_front_small_url
      }
    }
    return { found: false }
  } catch (e) {
    console.error("Error API externa:", e)
    return { found: false }
  }
}

// Lista de emojis rápidos
const QUICK_EMOJIS = ["🍫", "🍬", "🍭", "🍪", "🥤", "🧃", "🍺", "🧊", "🚬", "🔋", "🧼", "🧴", "🥖", "🥐", "🥪", "📦", "🍦", "🍎", "🍌", "⚡"]

export default function CrearProducto({ onProductCreated }: { onProductCreated?: () => void }) {
  const [loading, setLoading] = useState(false)
  const [showScanner, setShowScanner] = useState(false)

  // Estado del formulario
  const [formData, setFormData] = useState({
    codigo_barras: "",
    nombre: "",
    categoria: "",
    precio_venta: "",
    costo: "", 
    fecha_vencimiento: "", // Fecha exacta
    cantidad_inicial: "0",
    emoji: "📦"
  })

  // Cálculo de Margen en vivo
  const precioNum = parseFloat(formData.precio_venta) || 0
  const costoNum = parseFloat(formData.costo) || 0
  const ganancia = precioNum - costoNum
  const margen = costoNum > 0 ? ((ganancia / costoNum) * 100).toFixed(1) : "0.0"

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  // Lógica cuando se detecta un código
  const handleBarcodeDetected = async (code: string) => {
    setShowScanner(false) // Cerramos cámara
    if (code === formData.codigo_barras) return;

    toast.info("Código detectado", { description: "Verificando producto..." })

    try {
        // 1. Verificar si ya existe en TU base de datos
        const { data: existente } = await supabase
            .from('productos')
            .select('nombre, precio_venta')
            .eq('codigo_barras', code)
            .maybeSingle() 

        if (existente) {
            toast.warning("¡Este producto ya existe!", { 
                description: `Ya tienes "${existente.nombre}" registrado.` 
            })
            return;
        }

        // 2. Si es nuevo, buscar en Internet (Open Food Facts)
        const apiData = await fetchProductFromApi(code)

        setFormData(prev => ({
            ...prev,
            codigo_barras: code,
            nombre: apiData.found 
                ? `${apiData.marca ? apiData.marca + ' ' : ''}${apiData.nombre}` 
                : prev.nombre,
            emoji: apiData.found ? "🥫" : "📦" 
        }))

        if (apiData.found) {
            toast.success("Información encontrada")
        } else {
            toast("Código nuevo", { description: "No se encontraron datos online." })
        }

    } catch (error) {
        console.error("Error scan flow:", error)
        toast.error("Error al verificar código")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // 1. Insertamos el PRODUCTO
      const { data: nuevoProducto, error: errorProd } = await supabase
        .from('productos')
        .insert([
          {
            nombre: formData.nombre,
            categoria: formData.categoria,
            precio_venta: parseFloat(formData.precio_venta),
            costo: parseFloat(formData.costo) || 0,
            vida_util_dias: 0, 
            emoji: formData.emoji,
            codigo_barras: formData.codigo_barras || null 
          }
        ])
        .select()
        .single()

      if (errorProd) throw errorProd

      // 2. Stock Inicial con FECHA EXACTA
      const cantidad = parseInt(formData.cantidad_inicial) || 0
      
      if (cantidad > 0 && nuevoProducto) {
        
        const fechaVencimientoFinal = formData.fecha_vencimiento || null

        const stockItems = Array.from({ length: cantidad }).map(() => ({
          producto_id: nuevoProducto.id,
          fecha_vencimiento: fechaVencimientoFinal,
          estado: 'pendiente'
        }))

        const { error: errorStock } = await supabase
          .from('stock')
          .insert(stockItems)

        if (errorStock) throw errorStock
      }

      toast.success("¡Producto creado!")
      
      // Limpiar formulario
      setFormData({
        codigo_barras: "",
        nombre: "",
        categoria: "",
        precio_venta: "",
        costo: "",
        fecha_vencimiento: "",
        cantidad_inicial: "0",
        emoji: "📦"
      })

      if (onProductCreated) onProductCreated()

    } catch (error: any) {
      console.error("Error al crear:", error)
      toast.error("Error al guardar", { description: error.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
        <Card className="p-6 w-full max-w-md mx-auto bg-white shadow-lg border-2 border-primary/10">
        <div className="flex items-center gap-2 mb-6 text-primary">
            <div className="p-2 bg-primary/10 rounded-lg">
            <Package className="h-6 w-6" />
            </div>
            <div>
            <h2 className="text-xl font-bold leading-none">Nuevo Producto</h2>
            <p className="text-xs text-muted-foreground mt-1">Alta de catálogo + Stock inicial</p>
            </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* ESCANER Y NOMBRE */}
            <div className="space-y-1.5">
                 <div className="flex justify-between items-end">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Nombre del Producto</label>
                    <Button 
                        type="button" 
                        size="sm" 
                        variant={formData.codigo_barras ? "secondary" : "default"}
                        onClick={() => setShowScanner(true)}
                        className={`h-7 text-xs gap-1.5 ${!formData.codigo_barras ? "bg-blue-600 hover:bg-blue-700 text-white" : ""}`}
                    >
                        <ScanBarcode className="h-3.5 w-3.5" />
                        {formData.codigo_barras ? "Código Cargado" : "Escanear Código"}
                    </Button>
                 </div>

                 {formData.codigo_barras && (
                     <p className="text-[10px] text-blue-600 font-mono text-right">Código: {formData.codigo_barras}</p>
                 )}

                 <div className="flex gap-2">
                    <Input 
                        name="nombre" 
                        placeholder="Ej: Alfajor Jorgito" 
                        value={formData.nombre} 
                        onChange={handleChange} 
                        className="font-medium flex-1"
                        required 
                    />
                    
                    {/* Selector Emoji */}
                    <div className="w-16 shrink-0">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full text-xl px-0 shadow-none border-dashed" type="button">
                                    {formData.emoji}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-64 p-3" align="end">
                                <p className="text-xs font-bold text-muted-foreground mb-2">Icono Rápido</p>
                                <div className="grid grid-cols-5 gap-2">
                                    {QUICK_EMOJIS.map(em => (
                                        <button 
                                            key={em} 
                                            type="button"
                                            onClick={() => setFormData({...formData, emoji: em})}
                                            className="text-2xl hover:bg-slate-100 p-1 rounded transition-colors"
                                        >
                                            {em}
                                        </button>
                                    ))}
                                </div>
                                <div className="mt-3 border-t pt-2">
                                    <Input 
                                        placeholder="Emoji manual..." 
                                        className="h-8 text-sm"
                                        value={formData.emoji}
                                        onChange={(e) => setFormData({...formData, emoji: e.target.value})}
                                    />
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>
                 </div>
            </div>

            {/* Categoría */}
            <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase">Categoría</label>
            <Input 
                name="categoria" 
                placeholder="Ej: Golosinas / Bebidas" 
                value={formData.categoria} 
                onChange={handleChange} 
                required 
            />
            </div>

            {/* --- SECCIÓN DE PRECIOS --- */}
            <div className="grid grid-cols-2 gap-3 p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1">
                        Costo <span className="text-[10px] font-normal">(Compra)</span>
                    </label>
                    <div className="relative">
                        <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                        <Input 
                            name="costo" 
                            type="number" 
                            placeholder="0.00" 
                            className="pl-6 bg-white h-9"
                            value={formData.costo} 
                            onChange={handleChange} 
                        />
                    </div>
                </div>
                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-primary uppercase">Precio Venta</label>
                    <div className="relative">
                        <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-primary" />
                        <Input 
                            name="precio_venta" 
                            type="number" 
                            placeholder="0.00" 
                            className="pl-6 border-primary/30 bg-white h-9 font-bold"
                            value={formData.precio_venta} 
                            onChange={handleChange} 
                            required 
                        />
                    </div>
                </div>
                
                {/* Indicador de Margen */}
                {(precioNum > 0 && costoNum > 0) && (
                    <div className={`col-span-2 text-xs flex justify-between items-center px-3 py-1.5 rounded border bg-white ${
                        parseFloat(margen) < 30 ? "text-red-600 border-red-200" : "text-emerald-700 border-emerald-200"
                    }`}>
                        <span className="font-bold flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" /> Margen: {margen}%
                        </span>
                        <span>Ganancia: <strong>${ganancia.toFixed(0)}</strong></span>
                    </div>
                )}
            </div>

            {/* Stock Inicial */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 mt-2 space-y-3">
                <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <Plus className="h-4 w-4 text-emerald-600" /> Stock Inicial
                    </label>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Cantidad</label>
                        <Input 
                            name="cantidad_inicial" 
                            type="number" 
                            min="0"
                            placeholder="0"
                            value={formData.cantidad_inicial} 
                            onChange={handleChange} 
                            className="bg-white text-lg font-bold text-center"
                        />
                    </div>

                    {/* Selector de Fecha */}
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                            <CalendarIcon className="h-3 w-3" /> Vencimiento
                        </label>
                        <Input 
                            type="date"
                            name="fecha_vencimiento"
                            value={formData.fecha_vencimiento}
                            onChange={handleChange}
                            className="bg-white text-sm"
                        />
                    </div>
                </div>
            </div>

            <Button type="submit" className="w-full h-12 text-md font-bold shadow-sm" disabled={loading}>
            {loading ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2 h-5 w-5" />}
            Guardar Todo
            </Button>
        </form>
        </Card>

        {/* --- MODAL DEL ESCANER --- */}
        <Dialog open={showScanner} onOpenChange={setShowScanner}>
            <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-black border-none text-white">
                {showScanner && (
                    <BarcodeScanner 
                        onResult={handleBarcodeDetected} 
                        onClose={() => setShowScanner(false)} 
                    />
                )}
            </DialogContent>
        </Dialog>
    </>
  )
}