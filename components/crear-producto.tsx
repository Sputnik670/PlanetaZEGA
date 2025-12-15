"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, Plus, Package, Save } from "lucide-react"

// Si no tienes el componente Label instalado, avísame y lo cambiamos por un <div> normal.
// O puedes instalarlo con: npx shadcn@latest add label

export default function CrearProducto({ onProductCreated }: { onProductCreated?: () => void }) {
  const [loading, setLoading] = useState(false)
  const [mensaje, setMensaje] = useState("")

  // Estado del formulario
  const [formData, setFormData] = useState({
    nombre: "",
    categoria: "",
    precio_venta: "",
    vida_util_dias: "30", // Valor por defecto sugerido
    emoji: "📦"
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMensaje("")

    try {
      // Insertamos en la tabla 'productos' (Catálogo)
      const { error } = await supabase.from('productos').insert([
        {
          nombre: formData.nombre,
          categoria: formData.categoria,
          precio_venta: parseFloat(formData.precio_venta),
          vida_util_dias: parseInt(formData.vida_util_dias),
          emoji: formData.emoji
        }
      ])

      if (error) throw error

      setMensaje("¡Producto creado con éxito! ✅")
      
      // Limpiar formulario
      setFormData({
        nombre: "",
        categoria: "",
        precio_venta: "",
        vida_util_dias: "30",
        emoji: "📦"
      })

      // Avisar al componente padre si es necesario
      if (onProductCreated) onProductCreated()

    } catch (error: any) {
      console.error("Error al crear:", error)
      setMensaje("❌ Error: " + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="p-6 w-full max-w-md mx-auto bg-white shadow-lg">
      <div className="flex items-center gap-2 mb-6 text-primary">
        <Package className="h-6 w-6" />
        <h2 className="text-xl font-bold">Nuevo Producto</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        
        {/* Nombre y Emoji */}
        <div className="flex gap-4">
          <div className="flex-1 space-y-2">
            <label className="text-sm font-medium">Nombre</label>
            <Input 
              name="nombre" 
              placeholder="Ej: Alfajor Jorgito" 
              value={formData.nombre} 
              onChange={handleChange} 
              required 
            />
          </div>
          <div className="w-20 space-y-2">
            <label className="text-sm font-medium">Emoji</label>
            <Input 
              name="emoji" 
              placeholder="🍫" 
              className="text-center text-2xl"
              value={formData.emoji} 
              onChange={handleChange} 
            />
          </div>
        </div>

        {/* Categoría */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Categoría</label>
          <Input 
            name="categoria" 
            placeholder="Ej: Golosinas / Bebidas" 
            value={formData.categoria} 
            onChange={handleChange} 
            required 
          />
        </div>

        {/* Precio y Vida Útil */}
        <div className="flex gap-4">
          <div className="flex-1 space-y-2">
            <label className="text-sm font-medium">Precio Venta ($)</label>
            <Input 
              name="precio_venta" 
              type="number" 
              placeholder="0.00" 
              value={formData.precio_venta} 
              onChange={handleChange} 
              required 
            />
          </div>
          <div className="flex-1 space-y-2">
            <label className="text-sm font-medium">Vida Útil (Días)</label>
            <Input 
              name="vida_util_dias" 
              type="number" 
              value={formData.vida_util_dias} 
              onChange={handleChange} 
            />
          </div>
        </div>

        {mensaje && (
          <p className={`text-sm text-center font-medium ${mensaje.includes("Error") ? "text-red-500" : "text-green-600"}`}>
            {mensaje}
          </p>
        )}

        <Button type="submit" className="w-full mt-2" disabled={loading}>
          {loading ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2 h-4 w-4" />}
          Guardar en Catálogo
        </Button>
      </form>
    </Card>
  )
}