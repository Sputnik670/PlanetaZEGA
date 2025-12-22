// components/asignar-mision.tsx
"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, PlusCircle, Gamepad2, Target, Repeat } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface AsignarMisionProps {
  turnoId?: string          
  empleadoNombre?: string   
  empleadoId?: string       
  onMisionCreated?: () => void
}

export default function AsignarMision({ turnoId, empleadoNombre, empleadoId, onMisionCreated }: AsignarMisionProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  
  // Formulario
  const [descripcion, setDescripcion] = useState("")
  const [xp, setXp] = useState("50")
  const [esRecurrente, setEsRecurrente] = useState(false)
  
  // Selección de Empleado
  const [selectedEmpId, setSelectedEmpId] = useState<string>(empleadoId || "")
  const [empleados, setEmpleados] = useState<{id: string, nombre: string}[]>([])

  useEffect(() => {
    if (open && !empleadoId) {
        const fetchEmpleados = async () => {
            const { data } = await supabase.from('perfiles').select('id, nombre').eq('rol', 'empleado')
            if (data) setEmpleados(data as any)
        }
        fetchEmpleados()
    }
  }, [open, empleadoId])

  useEffect(() => {
    if (empleadoId) setSelectedEmpId(empleadoId)
  }, [empleadoId])

  const handleAsignar = async () => {
    if (!descripcion || !xp || (!esRecurrente && !selectedEmpId)) {
        toast.error("Faltan datos", { description: "Revisa la descripción y a quién se asigna." })
        return
    }

    setLoading(true)
    try {
        const { data: { user } } = await supabase.auth.getUser()
        
        let orgId = ""
        let activeTurnoId = turnoId || null

        // Lógica para obtener Org ID
        if (!activeTurnoId && selectedEmpId) {
             const { data: turno } = await supabase.from('caja_diaria').select('id, organization_id').eq('empleado_id', selectedEmpId).is('fecha_cierre', null).maybeSingle()
             if (turno) { activeTurnoId = turno.id; orgId = turno.organization_id } 
             else { const { data: p } = await supabase.from('perfiles').select('organization_id').eq('id', selectedEmpId).single(); orgId = p?.organization_id }
        } else if (activeTurnoId) {
             const { data: t } = await supabase.from('caja_diaria').select('organization_id').eq('id', activeTurnoId).single(); orgId = t?.organization_id
        } else {
             const { data: p } = await supabase.from('perfiles').select('organization_id').eq('id', user?.id).single(); orgId = p?.organization_id
        }

        if (!orgId) throw new Error("No se pudo determinar la organización")

        if (esRecurrente) {
            const { error } = await supabase.from('plantillas_misiones').insert({
                organization_id: orgId,
                descripcion: descripcion,
                puntos: parseInt(xp),
                activa: true
            })
            if (error) throw error
            toast.success("Rutina Creada 🔄", { description: "Esta tarea aparecerá automáticamente en cada turno nuevo." })
        } else {
            const { error } = await supabase.from('misiones').insert({
                organization_id: orgId,
                caja_diaria_id: activeTurnoId, 
                empleado_id: selectedEmpId,
                tipo: 'manual',
                descripcion: descripcion,
                objetivo_unidades: 1,
                unidades_completadas: 0,
                es_completada: false,
                puntos: parseInt(xp)
            })
            if (error) throw error
            toast.success("Misión Asignada 🚀")
        }

        setOpen(false)
        setDescripcion("")
        setXp("50")
        setEsRecurrente(false)
        if (!empleadoId) setSelectedEmpId("")
        
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
        {empleadoId ? (
            <Button size="sm" variant="outline" className="gap-2 border-dashed border-primary/50 hover:border-primary hover:bg-primary/5">
                <PlusCircle className="h-4 w-4 text-primary" /> Asignar Tarea
            </Button>
        ) : (
            <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md">
                <Target className="h-4 w-4" /> Nueva Misión
            </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <Gamepad2 className="h-5 w-5" /> 
            {esRecurrente ? "Nueva Rutina Diaria" : (empleadoNombre ? `Misión para ${empleadoNombre}` : "Nueva Misión")}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
            {/* CHECKBOX DE RECURRENCIA */}
            <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border">
                <div className="flex items-center gap-2">
                    <div className={cn("p-2 rounded-full", esRecurrente ? "bg-indigo-100 text-indigo-600" : "bg-gray-200 text-gray-500")}>
                        <Repeat className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-700">Repetir en cada turno</span>
                        <span className="text-[10px] text-gray-500">Se crea auto. al abrir caja</span>
                    </div>
                </div>
                {/* Corrección de Accesibilidad: Se agrega aria-label */}
                <input 
                    type="checkbox" 
                    className="h-5 w-5 accent-indigo-600 cursor-pointer" 
                    checked={esRecurrente} 
                    onChange={(e) => setEsRecurrente(e.target.checked)} 
                    aria-label="Activar repetición en cada turno"
                />
            </div>

            {/* SELECTOR DE EMPLEADO */}
            {!empleadoId && !esRecurrente && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                    <Label>Asignar a:</Label>
                    <Select value={selectedEmpId} onValueChange={setSelectedEmpId}>
                        <SelectTrigger>
                            <SelectValue placeholder="Seleccionar empleado..." />
                        </SelectTrigger>
                        <SelectContent>
                            {empleados.map(emp => (
                                <SelectItem key={emp.id} value={emp.id}>{emp.nombre || "Sin nombre"}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}

            <div className="space-y-2">
                <Label>Descripción de la Tarea</Label>
                <Input 
                    placeholder={esRecurrente ? "Ej: Barrer vereda..." : "Ej: Reponer stock..."}
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    autoFocus
                />
            </div>
            <div className="space-y-2">
                <Label>Recompensa (XP)</Label>
                <div className="flex gap-2">
                    {[30, 50, 100, 200].map(val => (
                        <Button key={val} type="button" variant={parseInt(xp) === val ? "default" : "outline"} size="sm" onClick={() => setXp(val.toString())} className="flex-1">{val} XP</Button>
                    ))}
                </div>
                <Input type="number" placeholder="Otro valor..." value={xp} onChange={(e) => setXp(e.target.value)} className="mt-2 text-right font-mono"/>
            </div>
        </div>

        <DialogFooter>
            <Button onClick={handleAsignar} disabled={loading} className={cn("w-full transition-colors", esRecurrente ? "bg-indigo-600 hover:bg-indigo-800" : "bg-primary hover:bg-primary/90")}>
                {loading ? <Loader2 className="animate-spin mr-2" /> : (esRecurrente ? "Guardar Rutina" : "Enviar Misión")}
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}