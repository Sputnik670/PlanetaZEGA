"use client"

import { useState } from "react"
// ELIMINADO: import { createClientComponentClient } ...
// AGREGADO: Importamos tu cliente centralizado
import { supabase } from "@/lib/supabase" 

import { CalendarIcon, PlusIcon, MinusIcon, PackagePlus } from "lucide-react" 
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { toast } from "sonner" 

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

interface Producto {
  id: string
  nombre: string
}

interface AgregarStockProps {
  producto: Producto
  onStockAdded?: () => void 
}

export function AgregarStock({ producto, onStockAdded }: AgregarStockProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  
  // Estado local para el formulario
  const [cantidad, setCantidad] = useState(1)
  const [fechaVencimiento, setFechaVencimiento] = useState<Date | undefined>(undefined)
  
  // ELIMINADO: const supabase = createClientComponentClient() 
  // (Ya no hace falta inicializarlo aquí, usamos el importado arriba)

  // Helpers para botones grandes (+ / -)
  const incrementar = () => setCantidad((prev) => prev + 1)
  const decrementar = () => setCantidad((prev) => (prev > 1 ? prev - 1 : 1))

  const handleGuardar = async () => {
    // 1. Validaciones
    if (!fechaVencimiento) {
      toast.error("Falta fecha", { description: "Selecciona cuándo vence el producto." })
      return
    }
    if (cantidad < 1) {
      toast.error("Error", { description: "La cantidad debe ser mayor a 0." })
      return
    }

    setLoading(true)

    try {
      // 2. Lógica de "Bulk Insert"
      const stockItems = Array.from({ length: cantidad }).map(() => ({
        producto_id: producto.id,
        fecha_vencimiento: format(fechaVencimiento, 'yyyy-MM-dd'),
        estado: 'pendiente'
      }))

      // 3. Enviamos todo junto a Supabase (usando 'supabase' importado)
      const { error } = await supabase
        .from('stock')
        .insert(stockItems)

      if (error) throw error

      // 4. Éxito
      toast.success("Stock guardado", { 
        description: `Se ingresaron ${cantidad} unidades de ${producto.nombre}.` 
      })
      
      // Reset del formulario
      setCantidad(1)
      setFechaVencimiento(undefined)
      setOpen(false)
      
      if (onStockAdded) onStockAdded()

    } catch (error: any) {
      console.error(error)
      toast.error("Error al guardar", { description: error.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full gap-2 bg-slate-900 text-white hover:bg-slate-800">
          <PackagePlus className="h-4 w-4" />
          Ingresar Lote
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md bg-white">
        <DialogHeader>
          <DialogTitle>Ingresar: {producto.nombre}</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col gap-6 py-4">
          
          {/* CONTROL DE CANTIDAD */}
          <div className="space-y-2">
            <Label className="text-center block">Cantidad a ingresar</Label>
            <div className="flex items-center justify-center gap-4">
              <Button variant="outline" size="icon" onClick={decrementar} className="h-12 w-12 rounded-full">
                <MinusIcon className="h-6 w-6" />
              </Button>
              
              <Input
                type="number"
                min="1"
                value={cantidad}
                onChange={(e) => setCantidad(parseInt(e.target.value) || 0)}
                className="h-12 w-24 text-center text-xl font-bold"
              />
              
              <Button variant="outline" size="icon" onClick={incrementar} className="h-12 w-12 rounded-full">
                <PlusIcon className="h-6 w-6" />
              </Button>
            </div>
          </div>

          {/* FECHA DE VENCIMIENTO */}
          <div className="flex flex-col gap-2">
            <Label>Fecha de Vencimiento</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "h-12 w-full justify-start text-left font-normal",
                    !fechaVencimiento && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-5 w-5" />
                  {fechaVencimiento ? format(fechaVencimiento, "PPP", { locale: es }) : "Seleccionar fecha"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={fechaVencimiento}
                  onSelect={setFechaVencimiento}
                  initialFocus
                  locale={es}
                />
              </PopoverContent>
            </Popover>
          </div>

          <Button onClick={handleGuardar} disabled={loading} size="lg" className="w-full text-lg mt-2">
            {loading ? "Guardando..." : "Confirmar"}
          </Button>

        </div>
      </DialogContent>
    </Dialog>
  )
}