"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Loader2, PlusCircle, Gamepad2 } from "lucide-react"
import { toast } from "sonner"

interface AsignarMisionProps {
  turnoId: string
  empleadoNombre: string
  empleadoId: string
  onMisionCreated?: () => void
}

export default function AsignarMision({ turnoId, empleadoNombre, empleadoId, onMisionCreated }: AsignarMisionProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [descripcion, setDescripcion] = useState("")
  const [xp, setXp] = useState("50") // Valor por defecto

  const handleAsignar = async () => {
    if (!descripcion || !xp) {
        toast.error("Faltan datos", { description: "Escribe una descripción y los puntos de experiencia." })
        return
    }

    setLoading(true)
    try {
        const { error } = await supabase
            .from('misiones')
            .insert({
                caja_diaria_id: turnoId,
                empleado_id: empleadoId,
                tipo: 'manual',
                descripcion: descripcion,
                objetivo_unidades: 1, // Tarea binaria: hecha o no hecha
                unidades_completadas: 0,
                es_completada: false,
                puntos: parseInt(xp)
            })

        if (error) throw error

        toast.success("Misión Asignada", { description: `Se envió la tarea a ${empleadoNombre}.` })
        setOpen(false)
        setDescripcion("")
        setXp("50")
        
        if (onMisionCreated) onMisionCreated()

    } catch (error: any) {
        console.error(error)
        toast.error("Error", { description: error.message })
    } finally {
        setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-2 border-dashed border-primary/50 hover:border-primary hover:bg-primary/5">
            <PlusCircle className="h-4 w-4 text-primary" />
            Asignar Tarea
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <Gamepad2 className="h-5 w-5" /> Nueva Misión para {empleadoNombre}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
            <div className="space-y-2">
                <Label>Descripción de la Tarea</Label>
                <Input 
                    placeholder="Ej: Reponer heladera de bebidas..." 
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                />
            </div>
            <div className="space-y-2">
                <Label>Recompensa (XP)</Label>
                <div className="flex gap-2">
                    {[30, 50, 100].map(val => (
                        <Button 
                            key={val} 
                            type="button" 
                            variant={parseInt(xp) === val ? "default" : "outline"}
                            size="sm"
                            onClick={() => setXp(val.toString())}
                            className="flex-1"
                        >
                            {val} XP
                        </Button>
                    ))}
                </div>
                <Input 
                    type="number" 
                    placeholder="Otro valor..." 
                    value={xp}
                    onChange={(e) => setXp(e.target.value)}
                    className="mt-2"
                />
            </div>
        </div>

        <DialogFooter>
            <Button onClick={handleAsignar} disabled={loading} className="w-full">
                {loading ? <Loader2 className="animate-spin mr-2" /> : "Enviar Misión 🚀"}
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}