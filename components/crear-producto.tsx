"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, Package, Save, Plus } from "lucide-react"
import { toast } from "sonner"
import { addDays, format } from "date-fns"

export default function CrearProducto({ onProductCreated }: { onProductCreated?: () => void }) {
  const [loading, setLoading] = useState(false)

  // Estado del formulario
  const [formData, setFormData] = useState({
    nombre: "",
    categoria: "",
    precio_venta: "",
    vida_util_dias: "30",
    cantidad_inicial: "0", // <--- NUEVO CAMPO
    emoji: "📦"
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // 1. Insertamos el PRODUCTO en el catálogo y pedimos que nos devuelva el ID creado (.select().single())
      const { data: nuevoProducto, error: errorProd } = await supabase
        .from('productos')
        .insert([
          {
            nombre: formData.nombre,
            categoria: formData.categoria,
            precio_venta: parseFloat(formData.precio_venta),
            vida_util_dias: parseInt(formData.vida_util_dias),
            emoji: formData.emoji
          }
        ])
        .select()
        .single()

      if (errorProd) throw errorProd

      // 2. Si definieron cantidad inicial, insertamos el STOCK automáticamente
      const cantidad = parseInt(formData.cantidad_inicial) || 0
      
      if (cantidad > 0 && nuevoProducto) {
        // Calculamos vencimiento automático: Hoy + Vida Útil
        const diasVida = parseInt(formData.vida_util_dias) || 30
        const fechaVencimientoAuto = format(addDays(new Date(), diasVida), 'yyyy-MM-dd')

        // Creamos el array para inserción masiva
        const stockItems = Array.from({ length: cantidad }).map(() => ({
          producto_id: nuevoProducto.id,
          fecha_vencimiento: fechaVencimientoAuto,
          estado: 'pendiente'
        }))

        const { error: errorStock } = await supabase
          .from('stock')
          .insert(stockItems)

        if (errorStock) throw errorStock
      }

      toast.success("¡Producto creado!", {
        description: cantidad > 0 
          ? `Se creó "${formData.nombre}" y se agregaron ${cantidad} unidades.`
          : `Se creó la ficha de "${formData.nombre}" en el catálogo.`
      })
      
      // Limpiar formulario
      setFormData({
        nombre: "",
        categoria: "",
        precio_venta: "",
        vida_util_dias: "30",
        cantidad_inicial: "0",
        emoji: "📦"
      })

      if (onProductCreated) onProductCreated()

    } catch (error: any) {
      console.error("Error al crear:", error)
      toast.error("Error al crear producto", { description: error.message })
    } finally {
      setLoading(false)
    }
  }

  return (
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
        
        {/* Nombre y Emoji */}
        <div className="flex gap-3">
          <div className="flex-1 space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase">Nombre</label>
            <Input 
              name="nombre" 
              placeholder="Ej: Alfajor Jorgito" 
              value={formData.nombre} 
              onChange={handleChange} 
              className="font-medium"
              required 
            />
          </div>
          <div className="w-20 space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase">Emoji</label>
            <Input 
              name="emoji" 
              placeholder="🍫" 
              className="text-center text-xl"
              value={formData.emoji} 
              onChange={handleChange} 
            />
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

        {/* Precio y Vida Útil */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase">Precio Venta ($)</label>
            <Input 
              name="precio_venta" 
              type="number" 
              placeholder="0.00" 
              value={formData.precio_venta} 
              onChange={handleChange} 
              className="font-mono"
              required 
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase">Vida Útil (Días)</label>
            <Input 
              name="vida_util_dias" 
              type="number" 
              value={formData.vida_util_dias} 
              onChange={handleChange} 
            />
          </div>
        </div>

        {/* SECCIÓN NUEVA: Stock Inicial */}
        <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 mt-2">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <Plus className="h-4 w-4 text-emerald-600" />
              Stock Inicial (Opcional)
            </label>
          </div>
          <div className="flex items-center gap-3">
            <Input 
              name="cantidad_inicial" 
              type="number" 
              min="0"
              placeholder="0"
              value={formData.cantidad_inicial} 
              onChange={handleChange} 
              className="bg-white text-lg font-bold text-center w-full"
            />
            <p className="text-xs text-muted-foreground leading-tight flex-1">
              Unidades físicas que ya tienes en el local.
            </p>
          </div>
        </div>

        <Button type="submit" className="w-full h-12 text-md font-bold shadow-sm" disabled={loading}>
          {loading ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2 h-5 w-5" />}
          Guardar Todo
        </Button>
      </form>
    </Card>
  )
}