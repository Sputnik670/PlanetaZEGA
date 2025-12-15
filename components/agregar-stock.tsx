"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, Save, X, Calendar } from "lucide-react"

interface AgregarStockProps {
  productoId: number
  nombreProducto: string
  onClose: () => void
  onSaved: () => void
}

export default function AgregarStock({ productoId, nombreProducto, onClose, onSaved }: AgregarStockProps) {
  const [loading, setLoading] = useState(false)
  const [fechaVencimiento, setFechaVencimiento] = useState("")
  // Si no pones fecha, asumimos que es NULL (para la misión "Completar Datos")
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Insertamos UN lote. 
      // NOTA: Si quisieras agregar cantidad "10", deberíamos hacer un loop o cambiar la DB para soportar cantidad.
      // Por simplicidad del MVP gamificado, asumimos que cada ingreso es un lote/unidad clave o modificaremos esto luego.
      // Para este paso, insertaremos 1 registro de stock con esa fecha.
      
      const payload = {
        producto_id: productoId,
        fecha_vencimiento: fechaVencimiento || null, // Si está vacío, va null
        estado: 'pendiente'
      }

      const { error } = await supabase.from('stock').insert([payload])

      if (error) throw error

      onSaved() // Avisamos al padre que recargue
      onClose() // Cerramos modal

    } catch (error) {
      console.error("Error cargando stock:", error)
      alert("Error al cargar stock")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <Card className="w-full max-w-sm p-6 bg-background shadow-2xl relative animate-in zoom-in-95 duration-200">
        <Button 
          variant="ghost" 
          size="icon" 
          className="absolute right-2 top-2 hover:bg-muted"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>

        <h3 className="text-lg font-bold mb-1">Ingreso de Mercadería</h3>
        <p className="text-sm text-muted-foreground mb-4">Producto: <span className="text-primary font-semibold">{nombreProducto}</span></p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" /> Fecha de Vencimiento
            </label>
            <p className="text-xs text-muted-foreground">Déjalo vacío si no la encuentras.</p>
            <Input 
              type="date" 
              value={fechaVencimiento}
              onChange={(e) => setFechaVencimiento(e.target.value)}
              className="text-lg"
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
            Confirmar Ingreso
          </Button>
        </form>
      </Card>
    </div>
  )
}