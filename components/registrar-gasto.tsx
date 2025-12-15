// components/registrar-gasto.tsx
"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Loader2, TrendingDown, Receipt } from "lucide-react"
import { toast } from "sonner"

export default function RegistrarGasto({ turnoId, empleadoId }: { turnoId: string, empleadoId: string }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [monto, setMonto] = useState("")
  const [descripcion, setDescripcion] = useState("")

  const handleGuardar = async () => {
    if (!monto || !descripcion) {
        toast.error("Datos incompletos", { description: "Ingresa el monto y el motivo del gasto." })
        return
    }

    setLoading(true)
    try {
        const { error } = await supabase
            .from('movimientos_caja')
            .insert({
                caja_diaria_id: turnoId,
                empleado_id: empleadoId,
                monto: parseFloat(monto),
                descripcion: descripcion,
                tipo: 'egreso'
            })

        if (error) throw error

        toast.success("Gasto Registrado", { description: `Se retiraron $${monto} de la caja.` })
        setOpen(false)
        setMonto("")
        setDescripcion("")
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
        <Button variant="destructive" className="w-full gap-2 shadow-sm border-2 border-red-200 hover:border-red-300">
            <TrendingDown className="h-4 w-4" />
            Registrar Salida / Gasto
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Receipt className="h-5 w-5" /> Registrar Salida de Dinero
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
            <div className="space-y-2">
                <Label>Monto ($)</Label>
                <Input 
                    type="number" 
                    placeholder="0.00" 
                    className="text-lg font-bold"
                    value={monto}
                    onChange={(e) => setMonto(e.target.value)}
                />
            </div>
            <div className="space-y-2">
                <Label>Motivo / Descripción</Label>
                <Input 
                    placeholder="Ej: Pago proveedor Coca-Cola, Hielo, Delivery..." 
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                />
            </div>
        </div>

        <DialogFooter>
            <Button onClick={handleGuardar} disabled={loading} variant="destructive" className="w-full">
                {loading ? <Loader2 className="animate-spin mr-2" /> : "Confirmar Retiro"}
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}